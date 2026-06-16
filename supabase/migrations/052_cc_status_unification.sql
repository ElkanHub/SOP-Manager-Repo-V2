-- 052_cc_status_unification.sql
-- Phase 2 of Change Control Unification.
-- Collapse the legacy status values into the canonical lifecycle and rewrite the
-- PRODUCER functions so every CC (request-raised or SOP-revision-issued) speaks
-- the same status language and carries child documents. The status CHECK is left
-- PERMISSIVE (it already allows both legacy + canonical from migration 047) and is
-- tightened only in the final verification phase, once nothing emits legacy values.
--
-- Idempotent. No hard deletes; legacy rows are remapped, not removed.

-- 1. Remap existing rows to canonical ---------------------------------------
UPDATE change_controls SET status = 'signatures_pending'     WHERE status IN ('pending', 'waived');
UPDATE change_controls SET status = 'pending_reconciliation' WHERE status = 'pending_activation';
UPDATE change_controls
  SET status = 'closed', closed_at = COALESCE(closed_at, completed_at, now())
  WHERE status = 'complete';

-- 2. Remove the unused 9-arg create_change_control overload (defect #4) ------
DROP FUNCTION IF EXISTS create_change_control(uuid, text, text, text, text, text, jsonb, timestamptz, uuid);

-- 3. Canonical 6-arg create_change_control ----------------------------------
-- Now also populates package fields + origin + a child document row so the CC is
-- a proper one-document package the moment it is issued from an SOP revision.
CREATE OR REPLACE FUNCTION create_change_control(
  p_sop_id uuid, p_qa_user_id uuid, p_old_version text,
  p_new_version text, p_old_file_url text, p_new_file_url text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_cc_id uuid;
  signatories jsonb;
  v_sop sops%ROWTYPE;
BEGIN
  SELECT * INTO v_sop FROM sops WHERE id = p_sop_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'SOP not found'; END IF;

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
    AND (p.department = v_sop.department OR p.id = p_qa_user_id);

  INSERT INTO change_controls (
    sop_id, old_version, new_version, old_file_url, new_file_url,
    required_signatories, deadline, issued_by,
    status, origin, title, requester_id, originating_department,
    rationale, affected_departments, submitted_at
  ) VALUES (
    p_sop_id, p_old_version, p_new_version, p_old_file_url, p_new_file_url,
    COALESCE(signatories, '[]'::jsonb), CURRENT_DATE + 14, p_qa_user_id,
    'signatures_pending', 'sop_revision',
    'SOP Change Control - ' || v_sop.sop_number, p_qa_user_id, v_sop.department,
    COALESCE(v_sop.reason_for_change, 'SOP revision'), ARRAY[v_sop.department], now()
  ) RETURNING id INTO new_cc_id;

  INSERT INTO change_control_documents (
    change_control_id, document_id, document_number, document_title,
    document_level, document_type, department, old_revision, new_revision,
    old_file_url, new_file_url, reason_for_change, review_status,
    training_required, effective_date
  ) VALUES (
    new_cc_id, v_sop.id, v_sop.sop_number, v_sop.title,
    COALESCE(v_sop.document_level, 'level_2'), 'sop', v_sop.department,
    p_old_version, p_new_version, p_old_file_url, p_new_file_url,
    COALESCE(v_sop.reason_for_change, 'SOP revision'), 'approved',
    COALESCE(v_sop.training_required, false), NULL
  );

  UPDATE sops SET status = 'pending_cc', locked = true WHERE id = p_sop_id;

  RETURN new_cc_id;
END;
$$;

-- 4. check_cc_completion -> moves package to canonical pending_reconciliation -
CREATE OR REPLACE FUNCTION check_cc_completion(p_cc_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  cc change_controls%ROWTYPE;
  signatory jsonb;
  all_signed boolean := true;
  sig_exists boolean;
BEGIN
  SELECT * INTO cc FROM change_controls WHERE id = p_cc_id;
  IF cc.status IN ('pending_reconciliation', 'pending_training', 'effective', 'closed') THEN RETURN; END IF;

  FOR signatory IN SELECT * FROM jsonb_array_elements(cc.required_signatories) LOOP
    IF COALESCE((signatory->>'waived')::boolean, false) = false THEN
      SELECT EXISTS (
        SELECT 1 FROM signature_certificates
        WHERE change_control_id = p_cc_id AND user_id = (signatory->>'user_id')::uuid
      ) INTO sig_exists;
      IF NOT sig_exists THEN all_signed := false; EXIT; END IF;
    END IF;
  END LOOP;

  IF all_signed THEN
    UPDATE change_controls SET status = 'pending_reconciliation', completed_at = now() WHERE id = p_cc_id;
    INSERT INTO audit_log (actor_id, action, entity_type, entity_id)
    VALUES (NULL, 'change_control_signatures_completed', 'change_control', p_cc_id);

    INSERT INTO pulse_items (sender_id, type, title, body, entity_type, entity_id, audience, target_department)
    SELECT NULL, 'cc_deadline',
      'Copy reconciliation required: ' || s.title,
      'All signatures are complete. QA must confirm issued copies of ' || cc.old_version || ' are reconciled before activation.',
      'change_control', p_cc_id, 'department', s.department
    FROM sops s WHERE s.id = cc.sop_id;
  END IF;
END;
$$;

-- 5. confirm_cc_reconciliation -> canonical statuses + update child document --
CREATE OR REPLACE FUNCTION confirm_cc_reconciliation(
  p_cc_id uuid,
  p_actor_id uuid,
  p_note text DEFAULT NULL,
  p_effective_date date DEFAULT CURRENT_DATE
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  cc change_controls%ROWTYPE;
  sop_rec sops%ROWTYPE;
  v_requires_training boolean;
BEGIN
  IF NOT is_qa_manager(p_actor_id) AND NOT is_admin(p_actor_id) THEN
    RAISE EXCEPTION 'Only QA Managers or Admins can confirm reconciliation';
  END IF;

  SELECT * INTO cc FROM change_controls WHERE id = p_cc_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Change Control not found'; END IF;
  IF cc.status <> 'pending_reconciliation' THEN
    RAISE EXCEPTION 'Change Control is not ready for reconciliation confirmation';
  END IF;

  SELECT * INTO sop_rec FROM sops WHERE id = cc.sop_id;
  v_requires_training := COALESCE(sop_rec.training_required, false);

  UPDATE change_controls
  SET status = CASE WHEN v_requires_training THEN 'pending_training' ELSE 'effective' END,
      reconciliation_confirmed_by = p_actor_id,
      reconciliation_confirmed_at = now(),
      reconciliation_note = p_note,
      completed_at = COALESCE(completed_at, now())
  WHERE id = p_cc_id;

  UPDATE sops
  SET version = cc.new_version,
      file_url = cc.new_file_url,
      date_revised = CURRENT_DATE,
      status = CASE WHEN v_requires_training THEN 'approved_pending_training' ELSE 'active' END,
      locked = false,
      updated_at = now()
  WHERE id = cc.sop_id;

  -- Reflect activation on the child document row(s)
  UPDATE change_control_documents
  SET review_status = CASE WHEN v_requires_training THEN review_status ELSE 'effective' END,
      effective_date = CASE WHEN v_requires_training THEN effective_date ELSE COALESCE(p_effective_date, CURRENT_DATE) END,
      training_status = CASE WHEN v_requires_training THEN 'pending' ELSE training_status END
  WHERE change_control_id = p_cc_id;

  IF NOT v_requires_training THEN
    PERFORM activate_sop_effective(cc.sop_id, COALESCE(p_effective_date, CURRENT_DATE), p_actor_id, 'change_control_reconciled_and_activated');
  END IF;

  UPDATE sops
  SET revision_history = (
    SELECT jsonb_agg(
      CASE
        WHEN item->>'change_control_id' = p_cc_id::text
        THEN item || jsonb_build_object('effective_date', CASE WHEN v_requires_training THEN NULL ELSE COALESCE(p_effective_date, CURRENT_DATE) END)
        ELSE item
      END
    )
    FROM jsonb_array_elements(COALESCE(revision_history, '[]'::jsonb)) item
  )
  WHERE id = cc.sop_id;

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_actor_id, 'cc_reconciliation_confirmed', 'change_control', p_cc_id,
    jsonb_build_object('sop_id', cc.sop_id, 'old_version', cc.old_version, 'new_version', cc.new_version, 'note', p_note));

  INSERT INTO pulse_items (sender_id, type, title, body, entity_type, entity_id, audience, target_department)
  SELECT p_actor_id, 'sop_active',
    CASE WHEN v_requires_training THEN 'SOP approved pending training: ' || s.title ELSE 'SOP Updated: ' || s.title END,
    CASE WHEN v_requires_training THEN 'Version ' || cc.new_version || ' is reconciled and awaits training completion.' ELSE 'Version ' || cc.new_version || ' is now active.' END,
    'sop', cc.sop_id, 'department', s.department
  FROM sops s WHERE s.id = cc.sop_id;
END;
$$;

-- 6. compute_risk_metrics -> count in-flight (non-terminal) CCs past/near due -
CREATE OR REPLACE FUNCTION compute_risk_metrics(p_scope text DEFAULT 'org')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today                 date := CURRENT_DATE;
  v_dept_filter           text := NULLIF(p_scope, 'org');
  v_overdue_pm_count      int  := 0;
  v_overdue_pm_avg_days   numeric := 0;
  v_pending_cc_past       int  := 0;
  v_pending_cc_near       int  := 0;
  v_sops_due_rev          int  := 0;
  v_sops_unack_count      int  := 0;
  v_active_sops           int  := 0;
  v_active_users          int  := 0;
  v_ai_fail_rate          numeric := 0;
  v_inactive_equipment    int  := 0;
  v_failed_approvals_30d  int  := 0;
BEGIN
  SELECT
    count(*),
    COALESCE(AVG(v_today - pt.due_date), 0)
  INTO v_overdue_pm_count, v_overdue_pm_avg_days
  FROM pm_tasks pt
  JOIN equipment eq ON eq.id = pt.equipment_id
  WHERE pt.status = 'overdue'
    AND (v_dept_filter IS NULL OR eq.department = v_dept_filter);

  -- Change controls: in-flight past deadline
  SELECT count(*)
  INTO v_pending_cc_past
  FROM change_controls cc
  JOIN sops s ON s.id = cc.sop_id
  WHERE cc.status NOT IN ('effective', 'closed', 'rejected')
    AND cc.deadline < v_today
    AND (v_dept_filter IS NULL OR s.department = v_dept_filter);

  -- Change controls: in-flight with deadline in next 7 days
  SELECT count(*)
  INTO v_pending_cc_near
  FROM change_controls cc
  JOIN sops s ON s.id = cc.sop_id
  WHERE cc.status NOT IN ('effective', 'closed', 'rejected')
    AND cc.deadline BETWEEN v_today AND v_today + INTERVAL '7 days'
    AND (v_dept_filter IS NULL OR s.department = v_dept_filter);

  SELECT count(*)
  INTO v_sops_due_rev
  FROM sops
  WHERE status = 'active'
    AND due_for_revision IS NOT NULL
    AND due_for_revision < v_today + INTERVAL '30 days'
    AND (v_dept_filter IS NULL OR department = v_dept_filter);

  SELECT count(*) INTO v_active_users
  FROM profiles
  WHERE is_active = true
    AND (v_dept_filter IS NULL OR department = v_dept_filter);

  SELECT count(*) INTO v_active_sops
  FROM sops
  WHERE status = 'active'
    AND (v_dept_filter IS NULL OR department = v_dept_filter);

  IF v_active_users > 0 THEN
    SELECT count(*)
    INTO v_sops_unack_count
    FROM sops s
    WHERE s.status = 'active'
      AND (v_dept_filter IS NULL OR s.department = v_dept_filter)
      AND (
        SELECT count(*) FROM sop_acknowledgements a
        WHERE a.sop_id = s.id AND a.version = s.version
      )::numeric / v_active_users::numeric < 0.8;
  END IF;

  WITH ai_calls AS (
    SELECT action FROM audit_log
    WHERE action IN ('ai_call_succeeded','ai_call_failed')
      AND created_at >= now() - INTERVAL '7 days'
  )
  SELECT
    CASE WHEN count(*) = 0 THEN 0
         ELSE (count(*) FILTER (WHERE action = 'ai_call_failed'))::numeric / count(*)::numeric
    END
  INTO v_ai_fail_rate
  FROM ai_calls;

  SELECT count(*) INTO v_inactive_equipment
  FROM equipment
  WHERE status = 'inactive'
    AND (v_dept_filter IS NULL OR department = v_dept_filter);

  SELECT count(*)
  INTO v_failed_approvals_30d
  FROM sop_approval_requests r
  JOIN sops s ON s.id = r.sop_id
  WHERE r.status IN ('rejected','changes_requested')
    AND r.updated_at >= now() - INTERVAL '30 days'
    AND (v_dept_filter IS NULL OR s.department = v_dept_filter);

  RETURN jsonb_build_object(
    'scope', p_scope,
    'computed_at', now(),
    'active_users_total', v_active_users,
    'active_sops_total', v_active_sops,
    'overdue_pm_count', v_overdue_pm_count,
    'overdue_pm_avg_days', round(v_overdue_pm_avg_days, 1),
    'pending_cc_past_deadline_count', v_pending_cc_past,
    'pending_cc_near_deadline_count', v_pending_cc_near,
    'sops_due_for_revision_count', v_sops_due_rev,
    'active_sops_under_80pct_ack_count', v_sops_unack_count,
    'failed_approvals_last_30d', v_failed_approvals_30d,
    'ai_failure_rate_last_7d', round(v_ai_fail_rate, 3),
    'inactive_equipment_count', v_inactive_equipment
  );
END;
$$;

REVOKE ALL ON FUNCTION compute_risk_metrics(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION compute_risk_metrics(text) FROM anon;
REVOKE ALL ON FUNCTION compute_risk_metrics(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION compute_risk_metrics(text) TO service_role;
