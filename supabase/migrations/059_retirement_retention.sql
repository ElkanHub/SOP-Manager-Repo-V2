-- 059_retirement_retention.sql
-- Spec v2.2 alignment — Phase 3: retirement pipe + retention time-gate.
--
-- Gap-register #3 (retirement workflow) and #4 (retention time-gate). The current
-- destruction RPCs (mark_sop_pending_destruction/destroy_sop_record) were unreachable
-- because nothing ever set `superseded`. This migration adds the proper retirement
-- pipe (§8): request → QA approval with pre-checks → retention hold → time-gated
-- destruction. Version rows move effective → retained → destroyed; the document moves
-- active → retired. Metadata/audit are retained after destruction (§8.5).
--
-- Idempotent.

-- 1. Retirement records table -----------------------------------------------
CREATE TABLE IF NOT EXISTS retirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES sops(id),
  status text NOT NULL DEFAULT 'retirement_requested'
    CHECK (status IN ('retirement_requested','retirement_approved','pending_destruction','destroyed','rejected')),
  justification text NOT NULL,
  requester_id uuid NOT NULL REFERENCES profiles(id),
  approver_id uuid REFERENCES profiles(id),
  precheck_results jsonb,
  rejection_reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  retention_until date,
  destroyed_at timestamptz,
  destruction_method text,
  destruction_approver_id uuid REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS retirements_document_idx ON retirements(document_id);
CREATE INDEX IF NOT EXISTS retirements_status_idx ON retirements(status);
-- At most one open retirement per document.
CREATE UNIQUE INDEX IF NOT EXISTS retirements_one_open_per_doc
  ON retirements(document_id)
  WHERE status IN ('retirement_requested','retirement_approved','pending_destruction');

ALTER TABLE retirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "retirements viewable by active users" ON retirements;
CREATE POLICY "retirements viewable by active users"
  ON retirements FOR SELECT USING (is_active_user(auth.uid()));

DROP POLICY IF EXISTS "retirements insertable by active users" ON retirements;
CREATE POLICY "retirements insertable by active users"
  ON retirements FOR INSERT WITH CHECK (requester_id = auth.uid() AND is_active_user(auth.uid()));

DROP POLICY IF EXISTS "retirements updatable by qa" ON retirements;
CREATE POLICY "retirements updatable by qa"
  ON retirements FOR UPDATE USING (is_qa_manager(auth.uid())) WITH CHECK (is_qa_manager(auth.uid()));

-- 2. Pre-checks (§8.4) -------------------------------------------------------
-- Returns a jsonb verdict. Blocks: (a) an open change control against the doc,
-- (b) incomplete training assignments on its modules. The "no active document
-- references this one" check is a placeholder — the system has no document-to-document
-- reference graph yet, so it always passes and is flagged as not-enforced.
CREATE OR REPLACE FUNCTION sop_retirement_prechecks(p_document_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_open_cc int;
  v_open_training int;
BEGIN
  SELECT count(*) INTO v_open_cc
  FROM change_control_documents ccd
  JOIN change_controls cc ON cc.id = ccd.change_control_id
  WHERE ccd.document_id = p_document_id
    AND cc.status NOT IN ('effective','closed','rejected');

  SELECT count(*) INTO v_open_training
  FROM training_assignments ta
  JOIN training_modules tm ON tm.id = ta.module_id
  WHERE tm.sop_id = p_document_id
    AND tm.status <> 'archived'
    AND ta.status <> 'completed';

  RETURN jsonb_build_object(
    'no_open_change_control', (v_open_cc = 0),
    'open_change_control_count', v_open_cc,
    'no_open_training', (v_open_training = 0),
    'open_training_count', v_open_training,
    'no_active_references', true,
    'references_check_enforced', false,
    'passed', (v_open_cc = 0 AND v_open_training = 0)
  );
END;
$$;

-- 3. Request retirement ------------------------------------------------------
CREATE OR REPLACE FUNCTION request_sop_retirement(
  p_document_id uuid, p_actor_id uuid, p_justification text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
  v_status text;
BEGIN
  IF length(coalesce(p_justification,'')) < 10 THEN
    RAISE EXCEPTION 'A retirement justification (min 10 chars) is required';
  END IF;

  SELECT status INTO v_status FROM sops WHERE id = p_document_id;
  IF v_status IS NULL THEN RAISE EXCEPTION 'Document not found'; END IF;
  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'Only an active document can be retired (current: %)', v_status;
  END IF;

  INSERT INTO retirements (document_id, status, justification, requester_id)
  VALUES (p_document_id, 'retirement_requested', p_justification, p_actor_id)
  RETURNING id INTO v_id;

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, reason)
  VALUES (p_actor_id, 'retirement_requested', 'retirement', v_id, p_justification);

  RETURN v_id;
END;
$$;

-- 4. Approve retirement (QA, ≠ requester, pre-checks must pass) --------------
-- Approves, withdraws the document from use (sops → retired), moves the effective
-- version to `retained`, and starts the retention hold (pending_destruction).
CREATE OR REPLACE FUNCTION approve_sop_retirement(
  p_retirement_id uuid, p_actor_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r retirements%ROWTYPE;
  v_checks jsonb;
  v_retention_until date;
  v_years int;
BEGIN
  IF NOT is_qa_manager(p_actor_id) AND NOT is_admin(p_actor_id) THEN
    RAISE EXCEPTION 'Only QA Managers or Admins can approve retirement';
  END IF;

  SELECT * INTO r FROM retirements WHERE id = p_retirement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Retirement record not found'; END IF;
  IF r.status <> 'retirement_requested' THEN
    RAISE EXCEPTION 'Retirement is not awaiting approval (current: %)', r.status;
  END IF;
  IF r.requester_id = p_actor_id THEN
    RAISE EXCEPTION 'You cannot approve your own retirement request';
  END IF;

  v_checks := sop_retirement_prechecks(r.document_id);
  IF NOT (v_checks->>'passed')::boolean THEN
    RAISE EXCEPTION 'Retirement pre-checks failed: %', v_checks::text;
  END IF;

  SELECT COALESCE(retention_period_years, 3) INTO v_years FROM sops WHERE id = r.document_id;
  v_retention_until := (CURRENT_DATE + (v_years || ' years')::interval)::date;

  -- Withdraw the document from use.
  UPDATE sops SET status = 'retired', locked = true, updated_at = now()
  WHERE id = r.document_id;

  -- The currently-effective version moves to retained for the retention period.
  UPDATE sop_versions
  SET status = 'retained', superseded_at = COALESCE(superseded_at, now()), retention_until = v_retention_until
  WHERE sop_id = r.document_id AND status = 'effective';

  UPDATE retirements
  SET status = 'pending_destruction',
      approver_id = p_actor_id,
      approved_at = now(),
      precheck_results = v_checks,
      retention_until = v_retention_until
  WHERE id = p_retirement_id;

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, new_value, metadata)
  VALUES (p_actor_id, 'retirement_approved', 'retirement', p_retirement_id,
    jsonb_build_object('document_status','retired'),
    jsonb_build_object('document_id', r.document_id, 'retention_until', v_retention_until, 'prechecks', v_checks));
END;
$$;

-- 5. Reject retirement -------------------------------------------------------
CREATE OR REPLACE FUNCTION reject_sop_retirement(
  p_retirement_id uuid, p_actor_id uuid, p_reason text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE r retirements%ROWTYPE;
BEGIN
  IF NOT is_qa_manager(p_actor_id) AND NOT is_admin(p_actor_id) THEN
    RAISE EXCEPTION 'Only QA Managers or Admins can reject retirement';
  END IF;
  IF length(coalesce(p_reason,'')) < 5 THEN RAISE EXCEPTION 'A rejection reason is required'; END IF;

  SELECT * INTO r FROM retirements WHERE id = p_retirement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Retirement record not found'; END IF;
  IF r.status <> 'retirement_requested' THEN RAISE EXCEPTION 'Retirement is not awaiting approval'; END IF;
  IF r.requester_id = p_actor_id THEN RAISE EXCEPTION 'You cannot reject your own retirement request'; END IF;

  UPDATE retirements SET status = 'rejected', approver_id = p_actor_id, rejection_reason = p_reason, approved_at = now()
  WHERE id = p_retirement_id;

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, reason)
  VALUES (p_actor_id, 'retirement_rejected', 'retirement', p_retirement_id, p_reason);
END;
$$;

-- 6. Destroy a retained document — TIME-GATED (§8.5) -------------------------
-- Destruction cannot fire until the retention clock has elapsed. Content reference
-- is cleared; metadata + audit are retained so we can still prove it existed and was
-- destroyed properly.
CREATE OR REPLACE FUNCTION destroy_retired_document(
  p_retirement_id uuid, p_actor_id uuid, p_method text DEFAULT 'secure_deletion'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE r retirements%ROWTYPE;
BEGIN
  IF NOT is_qa_manager(p_actor_id) AND NOT is_admin(p_actor_id) THEN
    RAISE EXCEPTION 'Only QA Managers or Admins can authorize destruction';
  END IF;

  SELECT * INTO r FROM retirements WHERE id = p_retirement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Retirement record not found'; END IF;
  IF r.status <> 'pending_destruction' THEN
    RAISE EXCEPTION 'Document is not in retention hold (current: %)', r.status;
  END IF;
  IF r.retention_until IS NULL OR r.retention_until > CURRENT_DATE THEN
    RAISE EXCEPTION 'Retention period has not elapsed (retained until %)', r.retention_until;
  END IF;

  UPDATE sop_versions SET status = 'destroyed'
  WHERE sop_id = r.document_id AND status = 'retained';

  UPDATE sops SET status = 'destroyed', destroyed_by = p_actor_id, destroyed_at = now(), updated_at = now()
  WHERE id = r.document_id;

  UPDATE retirements
  SET status = 'destroyed', destroyed_at = now(), destruction_method = p_method, destruction_approver_id = p_actor_id
  WHERE id = p_retirement_id;

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, reason, metadata)
  VALUES (p_actor_id, 'document_destroyed', 'retirement', p_retirement_id, r.justification,
    jsonb_build_object('document_id', r.document_id, 'method', p_method, 'retention_until', r.retention_until));
END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE retirements;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;
