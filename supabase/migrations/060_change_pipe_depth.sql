-- 060_change_pipe_depth.sql
-- Spec v2.2 alignment — Phase 4/5/10: give the change pipe its compliance depth.
--
-- Gap-register #6 (mandatory impact assessment), #7 (risk classification, data-driven),
-- #8 (classification-driven signature set), #9 (concurrency / lock conflict + queued),
-- #10 (effectiveness review before closure), #16 (remove dead states).
--
-- The rigor is risk-based (§1.5): a typo and a validated-parameter change no longer
-- get identical handling. The classification matrix is DATA (QA-editable), not code.
--
-- Idempotent.

-- 1. Final CC status set (§4.3): add impact/classified/queued/effectiveness_review,
--    drop dead draft + qa_screening. -----------------------------------------
ALTER TABLE change_controls DROP CONSTRAINT IF EXISTS change_controls_status_check;
ALTER TABLE change_controls ADD CONSTRAINT change_controls_status_check
  CHECK (status IN (
    'submitted',
    'clarification_requested',
    'impact_pending',
    'classified',
    'queued',
    'approved_for_document_work',
    'documents_in_review',
    'signatures_pending',
    'pending_reconciliation',
    'pending_training',
    'effective',
    'effectiveness_review',
    'closed',
    'rejected'
  ));

ALTER TABLE change_controls
  ADD COLUMN IF NOT EXISTS classification text
    CHECK (classification IN ('minor','major','critical')),
  ADD COLUMN IF NOT EXISTS impact_assessment_structured jsonb,
  ADD COLUMN IF NOT EXISTS classification_reason text,
  ADD COLUMN IF NOT EXISTS effectiveness_review_due date,
  ADD COLUMN IF NOT EXISTS closed_outcome text,
  ADD COLUMN IF NOT EXISTS effectiveness_reviewed_by uuid REFERENCES profiles(id);

-- 2. Classification matrix (data-driven, QA-editable, §10.10) ----------------
CREATE TABLE IF NOT EXISTS classification_matrix (
  classification text PRIMARY KEY CHECK (classification IN ('minor','major','critical')),
  require_qa boolean NOT NULL DEFAULT true,
  require_owning_managers boolean NOT NULL DEFAULT true,
  require_site_quality_head boolean NOT NULL DEFAULT false,
  require_revalidation boolean NOT NULL DEFAULT false,
  require_regulatory_notification boolean NOT NULL DEFAULT false,
  description text,
  updated_by uuid REFERENCES profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed PLACEHOLDER defaults. §14 #1: the client's QA must ratify the real matrix.
INSERT INTO classification_matrix (classification, require_qa, require_owning_managers, require_site_quality_head, require_revalidation, require_regulatory_notification, description)
VALUES
  ('minor',    true, true,  false, false, false, 'Typo, formatting, clarification with no procedural effect. Reduced signing path.'),
  ('major',    true, true,  false, false, false, 'Procedural step / role / form change. Full review, training-on-change.'),
  ('critical', true, true,  true,  true,  true,  'Validated-parameter / safety / filing-relevant change. Heaviest signing + revalidation.')
ON CONFLICT (classification) DO NOTHING;

ALTER TABLE classification_matrix ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "classification_matrix readable" ON classification_matrix;
CREATE POLICY "classification_matrix readable" ON classification_matrix FOR SELECT USING (is_active_user(auth.uid()));
DROP POLICY IF EXISTS "classification_matrix editable by qa" ON classification_matrix;
CREATE POLICY "classification_matrix editable by qa" ON classification_matrix FOR UPDATE
  USING (is_qa_manager(auth.uid())) WITH CHECK (is_qa_manager(auth.uid()));

-- 3. Impact-completeness gate ------------------------------------------------
-- Required structured fields (§7.2). The RPC below refuses to classify until these
-- are present — there is no "submit anyway".
CREATE OR REPLACE FUNCTION cc_impact_complete(p_impact jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_impact IS NOT NULL
     AND p_impact ? 'affected_documents'
     AND p_impact ? 'training_required'
     AND p_impact ? 'records_affected'
     AND p_impact ? 'systems_equipment'
     AND p_impact ? 'revalidation_needed';
$$;

-- 4. Classify a submitted change (impact_pending -> classified) --------------
CREATE OR REPLACE FUNCTION classify_change_control(
  p_cc_id uuid, p_actor_id uuid, p_classification text,
  p_impact jsonb, p_reason text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE cc change_controls%ROWTYPE;
BEGIN
  IF NOT is_qa_manager(p_actor_id) AND NOT is_admin(p_actor_id) THEN
    RAISE EXCEPTION 'Only QA can classify a Change Control';
  END IF;
  IF p_classification NOT IN ('minor','major','critical') THEN
    RAISE EXCEPTION 'Invalid classification: %', p_classification;
  END IF;

  SELECT * INTO cc FROM change_controls WHERE id = p_cc_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Change Control not found'; END IF;
  IF cc.status NOT IN ('submitted','impact_pending','classified','clarification_requested') THEN
    RAISE EXCEPTION 'Change Control cannot be classified from status %', cc.status;
  END IF;
  IF NOT cc_impact_complete(p_impact) THEN
    RAISE EXCEPTION 'Impact assessment is incomplete — all required fields must be present before classification';
  END IF;

  UPDATE change_controls
  SET classification = p_classification,
      impact_assessment_structured = p_impact,
      classification_reason = p_reason,
      status = 'classified',
      qa_owner_id = COALESCE(qa_owner_id, p_actor_id),
      screened_at = COALESCE(screened_at, now())
  WHERE id = p_cc_id;

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, new_value, reason, metadata)
  VALUES (p_actor_id, 'change_control_classified', 'change_control', p_cc_id,
    jsonb_build_object('classification', p_classification, 'status','classified'), p_reason, p_impact);
END;
$$;

-- 5. Concurrency / lock-conflict check (§7.4) --------------------------------
-- Does any document affected by this CC already sit under a DIFFERENT open CC?
CREATE OR REPLACE FUNCTION cc_has_lock_conflict(p_cc_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM change_control_documents mine
    JOIN change_control_documents other
      ON other.document_id = mine.document_id AND other.change_control_id <> mine.change_control_id
    JOIN change_controls occ ON occ.id = other.change_control_id
    WHERE mine.change_control_id = p_cc_id
      AND mine.document_id IS NOT NULL
      AND occ.status NOT IN ('effective','closed','rejected','effectiveness_review')
  );
$$;

-- Approve-for-work: classified -> queued (if conflict) | approved_for_document_work
CREATE OR REPLACE FUNCTION approve_cc_for_work(p_cc_id uuid, p_actor_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE cc change_controls%ROWTYPE; v_next text;
BEGIN
  IF NOT is_qa_manager(p_actor_id) AND NOT is_admin(p_actor_id) THEN
    RAISE EXCEPTION 'Only QA can approve a Change Control for work';
  END IF;
  SELECT * INTO cc FROM change_controls WHERE id = p_cc_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Change Control not found'; END IF;
  IF cc.status NOT IN ('classified','queued') THEN
    RAISE EXCEPTION 'Change Control must be classified before approval for work (current: %)', cc.status;
  END IF;

  IF cc_has_lock_conflict(p_cc_id) THEN
    v_next := 'queued';
  ELSE
    v_next := 'approved_for_document_work';
    -- Lock the affected SOPs so a later CC sees the conflict.
    UPDATE sops SET status = 'pending_cc', locked = true
    WHERE id IN (SELECT document_id FROM change_control_documents WHERE change_control_id = p_cc_id AND document_id IS NOT NULL)
      AND status = 'active';
  END IF;

  UPDATE change_controls SET status = v_next WHERE id = p_cc_id;

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, new_value)
  VALUES (p_actor_id, CASE WHEN v_next='queued' THEN 'change_control_queued' ELSE 'change_control_approved_for_document_work' END,
    'change_control', p_cc_id, jsonb_build_object('status', v_next));

  RETURN v_next;
END;
$$;

-- When a CC frees its documents, promote any queued CC whose conflicts have cleared.
CREATE OR REPLACE FUNCTION release_queued_change_controls()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE q record;
BEGIN
  FOR q IN SELECT id FROM change_controls WHERE status = 'queued' LOOP
    IF NOT cc_has_lock_conflict(q.id) THEN
      UPDATE change_controls SET status = 'approved_for_document_work' WHERE id = q.id;
      UPDATE sops SET status = 'pending_cc', locked = true
      WHERE id IN (SELECT document_id FROM change_control_documents WHERE change_control_id = q.id AND document_id IS NOT NULL)
        AND status = 'active';
      INSERT INTO audit_log (actor_id, action, entity_type, entity_id)
      VALUES (NULL, 'change_control_unqueued', 'change_control', q.id);
    END IF;
  END LOOP;
END;
$$;

-- 6. Classification-driven signatory snapshot (extends 053) ------------------
CREATE OR REPLACE FUNCTION cc_snapshot_signatories(p_cc_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_depts text[];
  v_qa_dept text;
  v_class text;
  v_rule classification_matrix%ROWTYPE;
  signatories jsonb;
BEGIN
  SELECT name INTO v_qa_dept FROM departments WHERE is_qa = true LIMIT 1;
  SELECT classification INTO v_class FROM change_controls WHERE id = p_cc_id;

  -- Resolve the matrix rule for this class; if unclassified (sop_revision origin),
  -- fall back to the historical behaviour (owning managers + QA).
  IF v_class IS NOT NULL THEN
    SELECT * INTO v_rule FROM classification_matrix WHERE classification = v_class;
  END IF;

  SELECT ARRAY(
    SELECT DISTINCT d FROM (
      SELECT unnest(COALESCE(affected_departments, '{}')) AS d FROM change_controls WHERE id = p_cc_id
      UNION
      SELECT department FROM change_control_documents WHERE change_control_id = p_cc_id AND department IS NOT NULL
    ) x WHERE d IS NOT NULL
  ) INTO v_depts;

  SELECT jsonb_agg(jsonb_build_object(
    'user_id', p.id, 'full_name', p.full_name, 'role', p.role, 'department', p.department, 'waived', false
  ))
  INTO signatories
  FROM profiles p
  WHERE p.is_active = true
    AND p.role = 'manager'
    AND (
      -- QA always included when the rule requires it (default true / unclassified)
      (COALESCE(v_rule.require_qa, true) AND p.department = v_qa_dept)
      -- Owning managers of affected departments when the rule requires it
      OR (COALESCE(v_rule.require_owning_managers, true) AND p.department = ANY(v_depts))
    );

  UPDATE change_controls SET required_signatories = COALESCE(signatories, '[]'::jsonb) WHERE id = p_cc_id;
END;
$$;

-- 7. Effectiveness review before closure (§7.12) -----------------------------
-- A change is NOT closed when it goes effective. enter_effectiveness_review opens the
-- window; close_change_control requires an INDEPENDENT approver (≠ requester).
CREATE OR REPLACE FUNCTION enter_effectiveness_review(p_cc_id uuid, p_actor_id uuid, p_due date DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE cc change_controls%ROWTYPE;
BEGIN
  IF NOT is_qa_manager(p_actor_id) AND NOT is_admin(p_actor_id) THEN
    RAISE EXCEPTION 'Only QA can open an effectiveness review';
  END IF;
  SELECT * INTO cc FROM change_controls WHERE id = p_cc_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Change Control not found'; END IF;
  IF cc.status <> 'effective' THEN RAISE EXCEPTION 'Only an effective change can enter effectiveness review'; END IF;

  UPDATE change_controls SET status = 'effectiveness_review',
    effectiveness_review_due = COALESCE(p_due, (CURRENT_DATE + INTERVAL '30 days')::date)
  WHERE id = p_cc_id;

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id)
  VALUES (p_actor_id, 'change_control_effectiveness_review_opened', 'change_control', p_cc_id);
END;
$$;

CREATE OR REPLACE FUNCTION close_change_control(p_cc_id uuid, p_actor_id uuid, p_outcome text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE cc change_controls%ROWTYPE;
BEGIN
  IF NOT is_qa_manager(p_actor_id) AND NOT is_admin(p_actor_id) THEN
    RAISE EXCEPTION 'Only QA can close a Change Control';
  END IF;
  IF length(coalesce(p_outcome,'')) < 5 THEN RAISE EXCEPTION 'An effectiveness outcome statement is required'; END IF;

  SELECT * INTO cc FROM change_controls WHERE id = p_cc_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Change Control not found'; END IF;
  IF cc.status NOT IN ('effective','effectiveness_review') THEN
    RAISE EXCEPTION 'Only an effective change under review can be closed (current: %)', cc.status;
  END IF;
  -- Independent approver: the reviewer cannot be the change requester.
  IF cc.requester_id = p_actor_id THEN
    RAISE EXCEPTION 'The effectiveness reviewer must be independent of the change requester';
  END IF;

  UPDATE change_controls
  SET status = 'closed', closed_at = now(), closed_outcome = p_outcome, effectiveness_reviewed_by = p_actor_id
  WHERE id = p_cc_id;

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, reason)
  VALUES (p_actor_id, 'change_control_closed', 'change_control', p_cc_id, p_outcome);
END;
$$;

-- 8. Free queued CCs whenever a package frees its documents -------------------
-- Hook the release into reconciliation + training-completion by re-defining the two
-- functions to call release_queued_change_controls() at the end.
CREATE OR REPLACE FUNCTION cc_recheck_effective(p_cc_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_pending int;
BEGIN
  SELECT count(*) INTO v_pending
  FROM change_control_documents
  WHERE change_control_id = p_cc_id AND document_id IS NOT NULL AND review_status <> 'effective';

  IF v_pending = 0 THEN
    UPDATE change_controls SET status = 'effective', completed_at = COALESCE(completed_at, now())
    WHERE id = p_cc_id AND status = 'pending_training';

    INSERT INTO audit_log (actor_id, action, entity_type, entity_id)
    SELECT NULL, 'change_control_effective', 'change_control', p_cc_id
    WHERE EXISTS (SELECT 1 FROM change_controls WHERE id = p_cc_id AND status = 'effective');

    PERFORM release_queued_change_controls();
  END IF;
END;
$$;

-- 9. Canonical choke point: free queued CCs whenever any package frees its docs.
-- A trigger catches every terminal transition (reconciliation, training completion,
-- close, reject) without duplicating the long RPC bodies. The recursive UPDATE inside
-- release_queued_change_controls sets status='approved_for_document_work', which is not
-- in the WHEN set, so the trigger does not re-fire — no infinite recursion.
CREATE OR REPLACE FUNCTION trg_release_queued_ccs()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM release_queued_change_controls();
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS change_controls_release_queued ON change_controls;
CREATE TRIGGER change_controls_release_queued
AFTER UPDATE OF status ON change_controls
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('effective','closed','rejected'))
EXECUTE FUNCTION trg_release_queued_ccs();
