-- 051_cc_unification.sql
-- Phase 1 of Change Control Unification (see V2DOCS/v2.2/build-plans/Change Control Unification Build Plan.md)
--
-- ADDITIVE ONLY — deliberately non-breaking and safe to apply on its own:
--   * adds an `origin` marker so we can tell request-raised CCs from
--     SOP-revision-issued CCs while keeping ONE lifecycle;
--   * guarantees every CC that targets an SOP has a child
--     change_control_documents row (closes the defect where the 6-arg
--     create_change_control made a parent CC with no child document);
--   * adds lifecycle indexes.
--
-- It does NOT remap status values, change the status CHECK constraint, or
-- rewrite any function. The status-model collapse + producer/consumer rewrites
-- are done atomically in Phase 2 so the app is never left inconsistent.
--
-- Idempotent: safe to re-run.

-- 1. Origin marker -----------------------------------------------------------
ALTER TABLE change_controls
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'request'
    CHECK (origin IN ('request', 'sop_revision'));

-- A CC that carries a single sop_id was auto-issued from an SOP revision.
UPDATE change_controls
SET origin = 'sop_revision'
WHERE sop_id IS NOT NULL
  AND origin <> 'sop_revision';

-- 2. Guarantee a child document for every SOP-linked CC ----------------------
INSERT INTO change_control_documents (
  change_control_id,
  document_id,
  document_number,
  document_title,
  document_level,
  document_type,
  department,
  old_revision,
  new_revision,
  old_file_url,
  new_file_url,
  reason_for_change,
  review_status,
  training_required,
  effective_date
)
SELECT
  cc.id,
  s.id,
  s.sop_number,
  s.title,
  COALESCE(s.document_level, 'level_2'),
  'sop',
  s.department,
  cc.old_version,
  cc.new_version,
  cc.old_file_url,
  cc.new_file_url,
  COALESCE(cc.delta_summary, cc.rationale),
  -- legacy terminal/active states map to an approved document; everything
  -- else stays pending until per-document review (Phase 4).
  CASE
    WHEN cc.status IN ('complete', 'pending_activation', 'effective', 'closed', 'pending_reconciliation', 'pending_training')
    THEN 'approved'
    ELSE 'pending'
  END,
  COALESCE(s.training_required, false),
  s.effective_date
FROM change_controls cc
JOIN sops s ON s.id = cc.sop_id
WHERE NOT EXISTS (
  SELECT 1 FROM change_control_documents ccd
  WHERE ccd.change_control_id = cc.id
);

-- 3. Indexes for lifecycle queries -------------------------------------------
CREATE INDEX IF NOT EXISTS change_controls_status_idx ON change_controls(status);
CREATE INDEX IF NOT EXISTS change_controls_origin_idx ON change_controls(origin);
