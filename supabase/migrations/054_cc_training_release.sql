-- 054_cc_training_release.sql
-- Phase 5 of Change Control Unification.
-- When a multi-document CC has training-required SOPs, it sits at pending_training
-- after reconciliation. Each SOP is released to effective via the normal training
-- gate; this helper flips the parent package to effective once every affected
-- document is effective.
-- Idempotent.

CREATE OR REPLACE FUNCTION cc_recheck_effective(p_cc_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pending int;
BEGIN
  SELECT count(*) INTO v_pending
  FROM change_control_documents
  WHERE change_control_id = p_cc_id
    AND document_id IS NOT NULL
    AND review_status <> 'effective';

  IF v_pending = 0 THEN
    UPDATE change_controls
    SET status = 'effective', completed_at = COALESCE(completed_at, now())
    WHERE id = p_cc_id AND status = 'pending_training';

    INSERT INTO audit_log (actor_id, action, entity_type, entity_id)
    SELECT NULL, 'change_control_effective', 'change_control', p_cc_id
    WHERE EXISTS (SELECT 1 FROM change_controls WHERE id = p_cc_id AND status = 'effective');
  END IF;
END;
$$;
