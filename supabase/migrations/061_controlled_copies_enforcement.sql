-- 061_controlled_copies_enforcement.sql
-- Spec v2.2 alignment — Phase 6/7: controlled-copy register + enforcement helpers.
--
-- Gap-register #5 (controlled-copy register; reconciliation reads real data) and the
-- helper backing #12 (training-execution block). §14 #3: whether physical copies are
-- issued is a client decision — if the client is fully paperless this register simply
-- stays empty and reconciliation is near-trivial, but the control exists for when it
-- isn't. Idempotent.

-- 1. Controlled-copy register (§10.6) ---------------------------------------
CREATE TABLE IF NOT EXISTS controlled_copies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES sops(id),
  document_version text NOT NULL,
  copy_number int NOT NULL,
  holder text NOT NULL,
  issued_by uuid REFERENCES profiles(id),
  issued_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','reconciled')),
  reconciled_at timestamptz,
  reconciled_by uuid REFERENCES profiles(id),
  reconciled_method text CHECK (reconciled_method IN ('returned','destroyed','force_overridden')),
  reconciliation_reason text,
  UNIQUE (document_id, document_version, copy_number)
);

CREATE INDEX IF NOT EXISTS controlled_copies_doc_idx ON controlled_copies(document_id, document_version, status);

ALTER TABLE controlled_copies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "controlled_copies readable" ON controlled_copies;
CREATE POLICY "controlled_copies readable" ON controlled_copies FOR SELECT USING (is_active_user(auth.uid()));
DROP POLICY IF EXISTS "controlled_copies writable by qa" ON controlled_copies;
CREATE POLICY "controlled_copies writable by qa" ON controlled_copies FOR ALL
  USING (is_qa_manager(auth.uid())) WITH CHECK (is_qa_manager(auth.uid()));

-- 2. Are any issued copies of a CC's outgoing versions still outstanding? -----
-- Reconciliation (§7.9) cannot complete until every issued copy of the OUTGOING
-- version (old_revision) is accounted for (returned / destroyed / force-overridden).
CREATE OR REPLACE FUNCTION cc_copies_outstanding(p_cc_id uuid)
RETURNS int LANGUAGE sql STABLE AS $$
  SELECT COALESCE(count(*), 0)::int
  FROM controlled_copies cpy
  JOIN change_control_documents ccd
    ON ccd.document_id = cpy.document_id
   AND ccd.document_version = cpy.document_version
  WHERE ccd.change_control_id = p_cc_id
    AND cpy.status = 'issued';
$$;

-- 3. Reconcile / force-reconcile a single copy -------------------------------
CREATE OR REPLACE FUNCTION reconcile_controlled_copy(
  p_copy_id uuid, p_actor_id uuid, p_method text, p_reason text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_qa_manager(p_actor_id) AND NOT is_admin(p_actor_id) THEN
    RAISE EXCEPTION 'Only QA Managers or Admins can reconcile controlled copies';
  END IF;
  IF p_method NOT IN ('returned','destroyed','force_overridden') THEN
    RAISE EXCEPTION 'Invalid reconciliation method: %', p_method;
  END IF;
  -- Block-by-default / override-by-exception: a force-override demands a reason (§1.8).
  IF p_method = 'force_overridden' AND length(coalesce(p_reason,'')) < 5 THEN
    RAISE EXCEPTION 'A reason is required to force-reconcile a controlled copy';
  END IF;

  UPDATE controlled_copies
  SET status = 'reconciled', reconciled_at = now(), reconciled_by = p_actor_id,
      reconciled_method = p_method, reconciliation_reason = p_reason
  WHERE id = p_copy_id AND status = 'issued';

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, reason, metadata)
  VALUES (p_actor_id, 'controlled_copy_reconciled', 'controlled_copy', p_copy_id, p_reason,
    jsonb_build_object('method', p_method));
END;
$$;

-- 4. Training-execution block helper (§6.5, gap #12) -------------------------
-- True if the user may execute/acknowledge the SOP: either training is not required,
-- or the user has completed training for it. Used by acknowledgeSop to BLOCK (not just
-- flag) untrained users on an effective SOP.
CREATE OR REPLACE FUNCTION is_user_trained_on_sop(p_user_id uuid, p_sop_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE AS $$
DECLARE v_required boolean; v_has_modules boolean; v_completed boolean;
BEGIN
  SELECT training_required INTO v_required FROM sops WHERE id = p_sop_id;
  IF NOT COALESCE(v_required, false) THEN RETURN true; END IF;

  SELECT EXISTS (
    SELECT 1 FROM training_modules WHERE sop_id = p_sop_id AND status <> 'archived'
  ) INTO v_has_modules;
  IF NOT v_has_modules THEN RETURN true; END IF;  -- required but nothing to take yet

  SELECT EXISTS (
    SELECT 1 FROM training_assignments ta
    JOIN training_modules tm ON tm.id = ta.module_id
    WHERE tm.sop_id = p_sop_id AND tm.status <> 'archived'
      AND ta.assignee_id = p_user_id AND ta.status = 'completed'
  ) INTO v_completed;

  RETURN v_completed;
END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE controlled_copies;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;
