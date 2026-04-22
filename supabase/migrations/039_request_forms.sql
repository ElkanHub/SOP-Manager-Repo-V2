-- ═══════════════════════════════════════════════════════════════════════════════
-- REQUEST FORM BUILDER
-- QA builds reusable request form templates; other departments submit responses.
-- Everything is auditable; state transitions are SECURITY DEFINER only.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── TABLE: request_forms ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS request_forms (
  id                      uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Form identity
  title                   text          NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  description             text          CHECK (description IS NULL OR length(description) <= 2000),

  -- Optional target: forms can be tagged for a specific department (informational)
  target_department       text          REFERENCES departments(name) ON UPDATE CASCADE,

  -- Lifecycle
  is_published            boolean       NOT NULL DEFAULT false,
  is_archived             boolean       NOT NULL DEFAULT false,
  version                 integer       NOT NULL DEFAULT 1,

  -- Creator metadata snapshot (for audit review without joins)
  created_by              uuid          NOT NULL REFERENCES profiles(id),
  created_by_name         text          NOT NULL,
  created_by_department   text          NOT NULL,
  created_by_role         text          NOT NULL,
  created_by_job_title    text,
  created_by_employee_id  text,

  -- Last modifier snapshot (edits)
  last_modified_by        uuid          REFERENCES profiles(id),
  last_modified_by_name   text,

  -- Publish / archive tracking
  published_at            timestamptz,
  published_by            uuid          REFERENCES profiles(id),
  archived_at             timestamptz,
  archived_by             uuid          REFERENCES profiles(id),

  created_at              timestamptz   NOT NULL DEFAULT now(),
  updated_at              timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_forms_published ON request_forms(is_published, is_archived);
CREATE INDEX IF NOT EXISTS idx_request_forms_created_by ON request_forms(created_by);

-- ─── TABLE: request_form_fields ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS request_form_fields (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id       uuid          NOT NULL REFERENCES request_forms(id) ON DELETE CASCADE,

  position      integer       NOT NULL CHECK (position >= 0),
  label         text          NOT NULL CHECK (length(label) BETWEEN 1 AND 200),
  helper_text   text          CHECK (helper_text IS NULL OR length(helper_text) <= 500),

  field_type    text          NOT NULL CHECK (field_type IN (
                    'short_text','long_text','number','date',
                    'dropdown','radio','checkbox_single','checkbox_multi',
                    'note_display'
                )),

  is_required   boolean       NOT NULL DEFAULT false,

  -- Type-specific config, e.g. { "options": ["A","B"] }, { "min": 0, "max": 100 }
  config        jsonb         NOT NULL DEFAULT '{}'::jsonb,

  created_at    timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_form_fields_form ON request_form_fields(form_id, position);
CREATE UNIQUE INDEX IF NOT EXISTS idx_request_form_fields_form_position
  ON request_form_fields(form_id, position);

-- ─── TABLE: request_form_submissions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS request_form_submissions (
  id                      uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id                 uuid          NOT NULL REFERENCES request_forms(id),

  -- Frozen copy of the form+fields at submit time (survives future edits)
  form_snapshot           jsonb         NOT NULL,

  -- Answers keyed by field id: { "<field_id>": <value> }
  answers                 jsonb         NOT NULL,

  -- Requester identity snapshot
  requester_id            uuid          NOT NULL REFERENCES profiles(id),
  requester_name          text          NOT NULL,
  requester_email         text          NOT NULL,
  requester_department    text          NOT NULL,
  requester_role          text          NOT NULL,
  requester_job_title     text,
  requester_employee_id   text,

  -- Lifecycle (same four stages as document_requests)
  status                  text          NOT NULL DEFAULT 'submitted'
                          CHECK (status IN ('submitted','received','approved','fulfilled','rejected')),

  submitted_at            timestamptz   NOT NULL DEFAULT now(),
  received_at             timestamptz,
  approved_at             timestamptz,
  fulfilled_at            timestamptz,
  rejected_at             timestamptz,

  received_by             uuid          REFERENCES profiles(id),
  approved_by             uuid          REFERENCES profiles(id),
  fulfilled_by            uuid          REFERENCES profiles(id),
  rejected_by             uuid          REFERENCES profiles(id),

  qa_notes                text          CHECK (qa_notes IS NULL OR length(qa_notes) <= 1000),

  reference_number        text          UNIQUE,

  created_at              timestamptz   NOT NULL DEFAULT now(),
  updated_at              timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rfs_requester ON request_form_submissions(requester_id);
CREATE INDEX IF NOT EXISTS idx_rfs_form ON request_form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_rfs_status ON request_form_submissions(status);
CREATE INDEX IF NOT EXISTS idx_rfs_submitted_at ON request_form_submissions(submitted_at DESC);

-- ─── REFERENCE NUMBER GENERATOR ───────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS request_form_submission_seq START 1;

CREATE OR REPLACE FUNCTION generate_rfs_reference()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  year_str  text := to_char(now(), 'YYYY');
  seq_num   int;
BEGIN
  SELECT nextval('request_form_submission_seq') INTO seq_num;
  NEW.reference_number := 'RFS-' || year_str || '-' || lpad(seq_num::text, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_rfs_reference ON request_form_submissions;
CREATE TRIGGER trg_generate_rfs_reference
BEFORE INSERT ON request_form_submissions
FOR EACH ROW
WHEN (NEW.reference_number IS NULL)
EXECUTE FUNCTION generate_rfs_reference();

-- ─── UPDATED_AT TRIGGERS ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_request_form_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rf_updated_at ON request_forms;
CREATE TRIGGER trg_rf_updated_at
BEFORE UPDATE ON request_forms
FOR EACH ROW EXECUTE FUNCTION touch_request_form_updated_at();

DROP TRIGGER IF EXISTS trg_rfs_updated_at ON request_form_submissions;
CREATE TRIGGER trg_rfs_updated_at
BEFORE UPDATE ON request_form_submissions
FOR EACH ROW EXECUTE FUNCTION touch_request_form_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE request_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_form_submissions ENABLE ROW LEVEL SECURITY;

-- ── request_forms ──
DROP POLICY IF EXISTS "active users read published forms" ON request_forms;
CREATE POLICY "active users read published forms"
ON request_forms FOR SELECT
USING (
  is_active_user(auth.uid())
  AND is_published = true
  AND is_archived = false
);

DROP POLICY IF EXISTS "qa and admin read all forms" ON request_forms;
CREATE POLICY "qa and admin read all forms"
ON request_forms FOR SELECT
USING ( is_qa_manager(auth.uid()) OR is_admin(auth.uid()) );

-- All writes go through service-role-backed actions (no direct INSERT/UPDATE/DELETE policy)

-- ── request_form_fields ──
DROP POLICY IF EXISTS "fields readable when form is" ON request_form_fields;
CREATE POLICY "fields readable when form is"
ON request_form_fields FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM request_forms rf
    WHERE rf.id = form_id
      AND (
        (is_active_user(auth.uid()) AND rf.is_published = true AND rf.is_archived = false)
        OR is_qa_manager(auth.uid())
        OR is_admin(auth.uid())
      )
  )
);

-- ── request_form_submissions ──
DROP POLICY IF EXISTS "requesters insert own submissions" ON request_form_submissions;
CREATE POLICY "requesters insert own submissions"
ON request_form_submissions FOR INSERT
WITH CHECK (
  requester_id = auth.uid()
  AND is_active_user(auth.uid())
);

DROP POLICY IF EXISTS "requesters see own submissions" ON request_form_submissions;
CREATE POLICY "requesters see own submissions"
ON request_form_submissions FOR SELECT
USING ( requester_id = auth.uid() AND is_active_user(auth.uid()) );

DROP POLICY IF EXISTS "qa sees all submissions" ON request_form_submissions;
CREATE POLICY "qa sees all submissions"
ON request_form_submissions FOR SELECT
USING ( is_qa_manager(auth.uid()) OR is_admin(auth.uid()) );

-- No UPDATE / DELETE policies — all state changes via SECURITY DEFINER RPCs

-- ─── SERVER FUNCTIONS (state transitions) ─────────────────────────────────────

CREATE OR REPLACE FUNCTION mark_rfs_received(
  p_submission_id uuid,
  p_qa_user_id    uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_qa_manager(p_qa_user_id) THEN
    RAISE EXCEPTION 'Only QA Managers can mark submissions as received';
  END IF;

  UPDATE request_form_submissions
  SET status = 'received', received_at = now(), received_by = p_qa_user_id
  WHERE id = p_submission_id AND status = 'submitted';

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id)
  VALUES (p_qa_user_id, 'rfs_received', 'request_form_submission', p_submission_id);
END;
$$;

CREATE OR REPLACE FUNCTION mark_rfs_approved(
  p_submission_id uuid,
  p_qa_user_id    uuid,
  p_qa_notes      text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_qa_manager(p_qa_user_id) THEN
    RAISE EXCEPTION 'Only QA Managers can approve submissions';
  END IF;

  UPDATE request_form_submissions
  SET status = 'approved', approved_at = now(), approved_by = p_qa_user_id,
      qa_notes = COALESCE(p_qa_notes, qa_notes)
  WHERE id = p_submission_id AND status IN ('submitted','received');

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_qa_user_id, 'rfs_approved', 'request_form_submission', p_submission_id,
    jsonb_build_object('qa_notes', p_qa_notes));
END;
$$;

CREATE OR REPLACE FUNCTION mark_rfs_fulfilled(
  p_submission_id uuid,
  p_qa_user_id    uuid,
  p_qa_notes      text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_qa_manager(p_qa_user_id) THEN
    RAISE EXCEPTION 'Only QA Managers can fulfil submissions';
  END IF;

  UPDATE request_form_submissions
  SET status = 'fulfilled', fulfilled_at = now(), fulfilled_by = p_qa_user_id,
      qa_notes = COALESCE(p_qa_notes, qa_notes)
  WHERE id = p_submission_id AND status = 'approved';

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_qa_user_id, 'rfs_fulfilled', 'request_form_submission', p_submission_id,
    jsonb_build_object('qa_notes', p_qa_notes));
END;
$$;

CREATE OR REPLACE FUNCTION mark_rfs_rejected(
  p_submission_id uuid,
  p_qa_user_id    uuid,
  p_qa_notes      text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_qa_manager(p_qa_user_id) THEN
    RAISE EXCEPTION 'Only QA Managers can reject submissions';
  END IF;

  IF p_qa_notes IS NULL OR length(trim(p_qa_notes)) < 3 THEN
    RAISE EXCEPTION 'A rejection reason is required';
  END IF;

  UPDATE request_form_submissions
  SET status = 'rejected', rejected_at = now(), rejected_by = p_qa_user_id,
      qa_notes = p_qa_notes
  WHERE id = p_submission_id AND status IN ('submitted','received');

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_qa_user_id, 'rfs_rejected', 'request_form_submission', p_submission_id,
    jsonb_build_object('reason', p_qa_notes));
END;
$$;

-- ─── PULSE TYPE EXTENSION ─────────────────────────────────────────────────────
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
  'notice','approval_request','approval_update','cc_signature','cc_deadline',
  'pm_due','pm_overdue','sop_active','system','todo','message',
  'new_signup','request_update','rfs_update'
)) NOT VALID;
-- NOT VALID: skip checking pre-existing rows. If you want to enforce later,
-- first reconcile any orphan `type` values, then run:
--   ALTER TABLE pulse_items VALIDATE CONSTRAINT pulse_items_type_check;

-- ─── REALTIME ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE request_forms';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE request_form_submissions';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
