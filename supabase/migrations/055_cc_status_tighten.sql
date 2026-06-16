-- 055_cc_status_tighten.sql
-- Phase 9 final lock of Change Control Unification.
-- Every producer now emits canonical statuses (migrations 052–054), so the
-- permissive constraint (which still allowed the legacy values from migration
-- 047) can be tightened to reject anything outside the canonical lifecycle.
-- Includes a re-remap guard in case any legacy value slipped in beforehand.
-- Idempotent.

UPDATE change_controls SET status = 'signatures_pending'     WHERE status IN ('pending', 'waived');
UPDATE change_controls SET status = 'pending_reconciliation' WHERE status = 'pending_activation';
UPDATE change_controls
  SET status = 'closed', closed_at = COALESCE(closed_at, completed_at, now())
  WHERE status = 'complete';

ALTER TABLE change_controls DROP CONSTRAINT IF EXISTS change_controls_status_check;
ALTER TABLE change_controls ADD CONSTRAINT change_controls_status_check
  CHECK (status IN (
    'draft',
    'submitted',
    'qa_screening',
    'clarification_requested',
    'approved_for_document_work',
    'documents_in_review',
    'signatures_pending',
    'pending_reconciliation',
    'pending_training',
    'effective',
    'closed',
    'rejected'
  ));
