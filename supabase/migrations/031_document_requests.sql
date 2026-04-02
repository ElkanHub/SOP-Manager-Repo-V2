-- ─── TABLE ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS document_requests (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Requester identity (auto-filled, never editable after submission)
  requester_id          uuid          NOT NULL REFERENCES profiles(id),
  requester_name        text          NOT NULL,
  requester_email       text          NOT NULL,
  requester_department  text          NOT NULL,
  requester_role        text          NOT NULL,
  requester_job_title   text,
  requester_employee_id text,

  -- Request content (the only thing the user writes)
  request_body          text          NOT NULL,

  -- Lifecycle status
  status                text          NOT NULL DEFAULT 'submitted'
                        CHECK (status IN ('submitted','received','approved','fulfilled')),

  -- Stage timestamps — each set exactly once when that stage is reached
  submitted_at          timestamptz   NOT NULL DEFAULT now(),
  received_at           timestamptz,
  approved_at           timestamptz,
  fulfilled_at          timestamptz,

  -- QA actor tracking — who performed each action
  received_by           uuid          REFERENCES profiles(id),
  approved_by           uuid          REFERENCES profiles(id),
  fulfilled_by          uuid          REFERENCES profiles(id),

  -- QA notes (optional — QA can add a note when approving or fulfilling)
  qa_notes              text,

  -- Reference number for traceability (auto-generated: REQ-YYYY-NNNN)
  reference_number      text          UNIQUE,

  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now()
);

-- ─── REFERENCE NUMBER GENERATOR ───────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS document_request_seq START 1;

CREATE OR REPLACE FUNCTION generate_request_reference()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  year_str  text := to_char(now(), 'YYYY');
  seq_num   int;
BEGIN
  SELECT nextval('document_request_seq') INTO seq_num;
  NEW.reference_number := 'REQ-' || year_str || '-' || lpad(seq_num::text, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_request_reference ON document_requests;
CREATE TRIGGER trg_generate_request_reference
BEFORE INSERT ON document_requests
FOR EACH ROW
WHEN (NEW.reference_number IS NULL)
EXECUTE FUNCTION generate_request_reference();

-- ─── UPDATED_AT TRIGGER ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_request_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_request_updated_at ON document_requests;
CREATE TRIGGER trg_request_updated_at
BEFORE UPDATE ON document_requests
FOR EACH ROW EXECUTE FUNCTION update_request_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;

-- Any active user can INSERT their own request
DROP POLICY IF EXISTS "active users can submit requests" ON document_requests;
CREATE POLICY "active users can submit requests"
ON document_requests FOR INSERT
WITH CHECK (
  requester_id = auth.uid()
  AND is_active_user(auth.uid())
);

-- Requesters can see their own requests only
DROP POLICY IF EXISTS "requesters see own requests" ON document_requests;
CREATE POLICY "requesters see own requests"
ON document_requests FOR SELECT
USING (
  requester_id = auth.uid()
  AND is_active_user(auth.uid())
);

-- QA Managers see ALL requests
DROP POLICY IF EXISTS "qa managers see all requests" ON document_requests;
CREATE POLICY "qa managers see all requests"
ON document_requests FOR SELECT
USING (
  is_qa_manager(auth.uid())
);

-- Admins see ALL requests
DROP POLICY IF EXISTS "admins see all requests" ON document_requests;
CREATE POLICY "admins see all requests"
ON document_requests FOR SELECT
USING (
  is_admin(auth.uid())
);

-- No UPDATE or DELETE policy — all updates go via SECURITY DEFINER functions using service role

-- ─── SERVER FUNCTIONS (all updates go through these — called by server actions via service role) ─

-- mark_request_received: QA only
CREATE OR REPLACE FUNCTION mark_request_received(
  p_request_id  uuid,
  p_qa_user_id  uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_qa_manager(p_qa_user_id) THEN
    RAISE EXCEPTION 'Only QA Managers can mark requests as received';
  END IF;

  UPDATE document_requests
  SET
    status      = 'received',
    received_at = now(),
    received_by = p_qa_user_id
  WHERE id = p_request_id
    AND status = 'submitted';  -- idempotency guard

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id)
  VALUES (p_qa_user_id, 'request_received', 'document_request', p_request_id);
END;
$$;

-- mark_request_approved: QA only
CREATE OR REPLACE FUNCTION mark_request_approved(
  p_request_id  uuid,
  p_qa_user_id  uuid,
  p_qa_notes    text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_qa_manager(p_qa_user_id) THEN
    RAISE EXCEPTION 'Only QA Managers can approve requests';
  END IF;

  UPDATE document_requests
  SET
    status      = 'approved',
    approved_at = now(),
    approved_by = p_qa_user_id,
    qa_notes    = p_qa_notes
  WHERE id = p_request_id
    AND status IN ('submitted', 'received');  -- can approve from either state

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_qa_user_id, 'request_approved', 'document_request', p_request_id,
    jsonb_build_object('qa_notes', p_qa_notes));
END;
$$;

-- mark_request_fulfilled: QA only
CREATE OR REPLACE FUNCTION mark_request_fulfilled(
  p_request_id  uuid,
  p_qa_user_id  uuid,
  p_qa_notes    text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_qa_manager(p_qa_user_id) THEN
    RAISE EXCEPTION 'Only QA Managers can fulfil requests';
  END IF;

  UPDATE document_requests
  SET
    status       = 'fulfilled',
    fulfilled_at = now(),
    fulfilled_by = p_qa_user_id,
    qa_notes     = COALESCE(p_qa_notes, qa_notes)  -- keep existing notes if no new ones
  WHERE id = p_request_id
    AND status = 'approved';  -- can only fulfil an approved request

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id)
  VALUES (p_qa_user_id, 'request_fulfilled', 'document_request', p_request_id);
END;
$$;

-- ─── PULSE ITEM TYPE UPDATE ────────────────────────────────────────────────────
-- Add 'request_update' to the pulse_items type CHECK constraint

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'pulse_items'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%type%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE pulse_items DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;
END;
$$;

ALTER TABLE pulse_items ADD CONSTRAINT pulse_items_type_check
CHECK (type IN (
  'notice', 'approval_request', 'approval_update', 'cc_signature', 'cc_deadline',
  'pm_due', 'pm_overdue', 'sop_active', 'system', 'todo', 'message',
  'new_signup', 'request_update'
));

-- ─── REALTIME ─────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE document_requests;
