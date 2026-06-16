-- 053_cc_package_lifecycle.sql
-- Phases 3 + 4 of Change Control Unification.
-- Make the multi-document package flow real:
--   * per-document review with auto-advance to signatures_pending,
--   * package-level signatory snapshot,
--   * reconciliation that loops EVERY child document and activates EVERY
--     linked SOP (this is the "one CC holds many SOPs" core).
-- The single-document SOP-revision path uses the exact same functions (it just
-- has one child document), so there is one code path for everything.
--
-- Idempotent (CREATE OR REPLACE / no destructive ops).

-- 1. Snapshot required signatories for a package -----------------------------
-- Active managers in the union of affected_departments + child-document
-- departments, plus the QA department. Snapshotted (not live) for audit stability.
CREATE OR REPLACE FUNCTION cc_snapshot_signatories(p_cc_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_depts text[];
  v_qa_dept text;
  signatories jsonb;
BEGIN
  SELECT name INTO v_qa_dept FROM departments WHERE is_qa = true LIMIT 1;

  SELECT ARRAY(
    SELECT DISTINCT d FROM (
      SELECT unnest(COALESCE(affected_departments, '{}')) AS d
        FROM change_controls WHERE id = p_cc_id
      UNION
      SELECT department FROM change_control_documents
        WHERE change_control_id = p_cc_id AND department IS NOT NULL
    ) x WHERE d IS NOT NULL
  ) INTO v_depts;

  SELECT jsonb_agg(jsonb_build_object(
    'user_id',    p.id,
    'full_name',  p.full_name,
    'role',       p.role,
    'department', p.department,
    'waived',     false
  ))
  INTO signatories
  FROM profiles p
  WHERE p.is_active = true
    AND p.role = 'manager'
    AND (p.department = ANY(v_depts) OR p.department = v_qa_dept);

  UPDATE change_controls
  SET required_signatories = COALESCE(signatories, '[]'::jsonb)
  WHERE id = p_cc_id;
END;
$$;

-- 2. Set the draft (new revision + file) for a child document ----------------
CREATE OR REPLACE FUNCTION set_cc_document_draft(
  p_doc_id uuid, p_actor uuid,
  p_new_revision text, p_new_file_url text, p_training_required boolean DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cc_id uuid;
BEGIN
  IF NOT is_qa_manager(p_actor) AND NOT is_admin(p_actor) THEN
    RAISE EXCEPTION 'Only QA can set change control document drafts';
  END IF;

  UPDATE change_control_documents
  SET new_revision     = COALESCE(p_new_revision, new_revision),
      new_file_url     = COALESCE(p_new_file_url, new_file_url),
      training_required = COALESCE(p_training_required, training_required),
      review_status    = CASE WHEN review_status = 'pending' THEN 'in_review' ELSE review_status END
  WHERE id = p_doc_id
  RETURNING change_control_id INTO v_cc_id;

  IF v_cc_id IS NULL THEN RAISE EXCEPTION 'Change control document not found'; END IF;

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_actor, 'cc_document_draft_set', 'change_control_document', p_doc_id,
    jsonb_build_object('change_control_id', v_cc_id, 'new_revision', p_new_revision));
END;
$$;

-- 3. Per-document review decision + auto-advance to signatures ---------------
CREATE OR REPLACE FUNCTION set_cc_document_review(
  p_doc_id uuid, p_actor uuid, p_decision text, p_comment text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cc_id uuid;
  v_total int;
  v_approved int;
BEGIN
  IF NOT is_qa_manager(p_actor) AND NOT is_admin(p_actor) THEN
    RAISE EXCEPTION 'Only QA can review change control documents';
  END IF;
  IF p_decision NOT IN ('in_review', 'approved', 'changes_requested', 'rejected') THEN
    RAISE EXCEPTION 'Invalid review decision: %', p_decision;
  END IF;

  UPDATE change_control_documents
  SET review_status = p_decision
  WHERE id = p_doc_id
  RETURNING change_control_id INTO v_cc_id;

  IF v_cc_id IS NULL THEN RAISE EXCEPTION 'Change control document not found'; END IF;

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_actor, 'cc_document_reviewed', 'change_control_document', p_doc_id,
    jsonb_build_object('decision', p_decision, 'comment', p_comment, 'change_control_id', v_cc_id));

  -- Auto-advance: when EVERY document is approved, snapshot signatories and
  -- move the package to signatures_pending.
  SELECT count(*), count(*) FILTER (WHERE review_status = 'approved')
  INTO v_total, v_approved
  FROM change_control_documents
  WHERE change_control_id = v_cc_id;

  IF v_total > 0 AND v_total = v_approved THEN
    PERFORM cc_snapshot_signatories(v_cc_id);
    UPDATE change_controls
    SET status = 'signatures_pending'
    WHERE id = v_cc_id
      AND status IN ('approved_for_document_work', 'documents_in_review');

    INSERT INTO audit_log (actor_id, action, entity_type, entity_id)
    VALUES (p_actor, 'change_control_ready_for_signatures', 'change_control', v_cc_id);
  END IF;
END;
$$;

-- 4. Generalized reconciliation — activate EVERY linked SOP ------------------
-- Replaces the single-SOP version from migration 052. Loops the child
-- documents so a CC that covers many SOPs activates them all in one step.
CREATE OR REPLACE FUNCTION confirm_cc_reconciliation(
  p_cc_id uuid,
  p_actor_id uuid,
  p_note text DEFAULT NULL,
  p_effective_date date DEFAULT CURRENT_DATE
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  cc  change_controls%ROWTYPE;
  doc change_control_documents%ROWTYPE;
  v_any_training boolean := false;
  v_eff date := COALESCE(p_effective_date, CURRENT_DATE);
  v_deadline date;
BEGIN
  IF NOT is_qa_manager(p_actor_id) AND NOT is_admin(p_actor_id) THEN
    RAISE EXCEPTION 'Only QA Managers or Admins can confirm reconciliation';
  END IF;

  SELECT * INTO cc FROM change_controls WHERE id = p_cc_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Change Control not found'; END IF;
  IF cc.status <> 'pending_reconciliation' THEN
    RAISE EXCEPTION 'Change Control is not ready for reconciliation confirmation';
  END IF;

  v_deadline := sop_add_working_days(v_eff, 15);

  FOR doc IN
    SELECT * FROM change_control_documents WHERE change_control_id = p_cc_id
  LOOP
    -- Only documents that target an existing SOP and have a new file can be
    -- activated here. Brand-new documents (no document_id) are out of scope.
    CONTINUE WHEN doc.document_id IS NULL OR doc.new_file_url IS NULL;

    IF COALESCE(doc.training_required, false) THEN
      v_any_training := true;

      UPDATE sops
      SET version = doc.new_revision,
          file_url = doc.new_file_url,
          date_revised = CURRENT_DATE,
          status = 'approved_pending_training',
          training_required = true,
          training_deadline = v_deadline,
          locked = false,
          updated_at = now()
      WHERE id = doc.document_id;

      UPDATE change_control_documents
      SET training_status = 'pending', training_deadline = v_deadline
      WHERE id = doc.id;

      PERFORM append_sop_revision_history(doc.document_id, doc.old_revision, doc.new_revision,
        p_cc_id, CURRENT_DATE, NULL, 'revision', p_actor_id, doc.reason_for_change);
    ELSE
      UPDATE sops
      SET version = doc.new_revision,
          file_url = doc.new_file_url,
          date_revised = CURRENT_DATE,
          locked = false,
          updated_at = now()
      WHERE id = doc.document_id;

      PERFORM append_sop_revision_history(doc.document_id, doc.old_revision, doc.new_revision,
        p_cc_id, CURRENT_DATE, v_eff, 'revision', p_actor_id, doc.reason_for_change);

      PERFORM activate_sop_effective(doc.document_id, v_eff, p_actor_id, 'change_control_reconciled_and_activated');

      UPDATE change_control_documents
      SET review_status = 'effective', effective_date = v_eff
      WHERE id = doc.id;
    END IF;

    INSERT INTO pulse_items (sender_id, type, title, body, entity_type, entity_id, audience, target_department)
    SELECT p_actor_id, 'sop_active',
      CASE WHEN doc.training_required THEN 'SOP approved pending training: ' || s.title ELSE 'SOP Updated: ' || s.title END,
      CASE WHEN doc.training_required THEN 'Revision ' || doc.new_revision || ' reconciled; awaits training completion.' ELSE 'Revision ' || doc.new_revision || ' is now active.' END,
      'sop', doc.document_id, 'department', s.department
    FROM sops s WHERE s.id = doc.document_id;
  END LOOP;

  UPDATE change_controls
  SET status = CASE WHEN v_any_training THEN 'pending_training' ELSE 'effective' END,
      reconciliation_confirmed_by = p_actor_id,
      reconciliation_confirmed_at = now(),
      reconciliation_note = p_note,
      completed_at = COALESCE(completed_at, now())
  WHERE id = p_cc_id;

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_actor_id, 'cc_reconciliation_confirmed', 'change_control', p_cc_id,
    jsonb_build_object('note', p_note, 'any_training', v_any_training));
END;
$$;
