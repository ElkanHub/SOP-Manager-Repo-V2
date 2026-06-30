-- 058_version_lifecycle_model.sql
-- Spec v2.2 alignment — Phase 2 (KEYSTONE): separate the document from its versions.
--
-- Gap-register #1, #2, #13. The architectural correction every other phase assumes.
--
-- Approach (per the gap-analysis recommendation): we do NOT introduce a greenfield
-- documents/document_versions pair. `sops` stays the document identity + lifecycle
-- pointer; `sop_versions` is PROMOTED into the version-state carrier. This keeps every
-- existing query/RLS/screen working and confines the change to sop_versions + the one
-- activation choke point.
--
-- What changes:
--   * sop_versions gains the §4.2 state set + effective/superseded/retention timestamps.
--   * EXACTLY ONE effective version per document — enforced by a partial unique index.
--   * Supersession is ATOMIC and happens in activate_sop_effective (the single function
--     every "SOP becomes effective" path already flows through).
--   * Future effective dates produce a real `scheduled` state, flipped by a dated job.
--   * `retired` document state added (used by the retirement pipe, migration 059).
--
-- Idempotent. No hard deletes.

-- 0. Configurable periodic-review cadence (replaces hardcoded 3-year) --------
-- §14 #4: review interval per document class is a client decision. Stored per-SOP,
-- default 36 months, QA-adjustable. Used by activate_sop_effective below.
ALTER TABLE sops
  ADD COLUMN IF NOT EXISTS periodic_review_interval_months int NOT NULL DEFAULT 36
    CHECK (periodic_review_interval_months BETWEEN 1 AND 120);

-- 1. Document lifecycle pointer: add scheduled + retired ---------------------
ALTER TABLE sops DROP CONSTRAINT IF EXISTS sops_status_check;
ALTER TABLE sops ADD CONSTRAINT sops_status_check CHECK (status IN (
  'draft',
  'draft_in_review',
  'pending_hod',
  'pending_qa',
  'approved_pending_training',
  'scheduled',                -- NEW: approved, future effective date, not yet live
  'pending_cc',
  'active',
  'superseded',
  'pending_destruction',
  'destroyed',
  'retired'                   -- NEW: deliberately discontinued (retirement pipe)
));

-- 2. Promote sop_versions into the version-state carrier --------------------
-- Dedupe (sop_id, version) first so the unique index below is safe. Keep newest row.
DELETE FROM sop_versions sv
USING sop_versions dup
WHERE sv.sop_id = dup.sop_id
  AND sv.version = dup.version
  AND sv.created_at < dup.created_at;

ALTER TABLE sop_versions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'in_approval'
    CHECK (status IN ('draft','in_approval','approved','effective','superseded','retained','destroyed')),
  ADD COLUMN IF NOT EXISTS effective_from date,
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz,
  ADD COLUMN IF NOT EXISTS retention_until date,
  ADD COLUMN IF NOT EXISTS reason_for_change text;

CREATE UNIQUE INDEX IF NOT EXISTS sop_versions_sop_version_key
  ON sop_versions(sop_id, version);

-- 3. Backfill state onto historical rows ------------------------------------
-- The row matching each live SOP's current version becomes 'effective'; every other
-- row for that SOP becomes 'superseded'. SOPs that never went effective keep the
-- 'in_approval' default. This produces exactly one effective row per SOP.
UPDATE sop_versions sv
SET status = 'effective',
    effective_from = s.effective_date,
    retention_until = s.retention_expires_at
FROM sops s
WHERE sv.sop_id = s.id
  AND sv.version = s.version
  AND s.status IN ('active','scheduled','superseded','pending_destruction','destroyed','retired');

UPDATE sop_versions sv
SET status = 'superseded',
    superseded_at = COALESCE(sv.superseded_at, now())
FROM sops s
WHERE sv.sop_id = s.id
  AND sv.version <> s.version
  AND s.status IN ('active','scheduled','superseded','pending_destruction','destroyed','retired')
  AND sv.status <> 'effective';

-- Seed a synthetic effective row for any live SOP that has no version row at all
-- (CC-reconciliation path historically wrote none — gap analysis §3).
INSERT INTO sop_versions (sop_id, version, file_url, uploaded_by, status, effective_from, retention_until)
SELECT s.id, s.version, s.file_url, s.approved_by, 'effective', s.effective_date, s.retention_expires_at
FROM sops s
WHERE s.status IN ('active','scheduled','superseded','pending_destruction','destroyed','retired')
  AND NOT EXISTS (SELECT 1 FROM sop_versions sv WHERE sv.sop_id = s.id AND sv.version = s.version);

-- 4. THE invariant: exactly one effective version per document --------------
CREATE UNIQUE INDEX IF NOT EXISTS sop_versions_one_effective_per_doc
  ON sop_versions(sop_id)
  WHERE status = 'effective';

CREATE INDEX IF NOT EXISTS sop_versions_status_idx ON sop_versions(status);

-- 5. Rewrite activate_sop_effective: atomic supersession + scheduled handling
-- Single choke point for "this SOP becomes effective". Every caller (new-SOP approval,
-- minor activation, CC reconciliation, training release) routes through here, so the
-- one-effective-version invariant and the supersession write live in exactly one place.
CREATE OR REPLACE FUNCTION activate_sop_effective(
  p_sop_id uuid,
  p_effective_date date,
  p_actor_id uuid,
  p_audit_action text DEFAULT 'sop_effective_date_set'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  sop_rec sops%ROWTYPE;
  next_due date;
  retention_due date;
  v_eff date := COALESCE(p_effective_date, CURRENT_DATE);
  v_future boolean;
BEGIN
  SELECT * INTO sop_rec FROM sops WHERE id = p_sop_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'SOP not found'; END IF;

  v_future := v_eff > CURRENT_DATE;
  next_due := (v_eff + (COALESCE(sop_rec.periodic_review_interval_months, 36) || ' months')::interval)::date;
  retention_due := sop_retention_expiry(v_eff, sop_rec.retention_period_years);

  IF v_future THEN
    -- Decouple approval from effectiveness: hold in `scheduled` until the date.
    UPDATE sops
    SET status = 'scheduled',
        locked = false,
        effective_date = v_eff,
        due_for_revision = next_due,
        retention_expires_at = retention_due,
        updated_at = now()
    WHERE id = p_sop_id;

    -- Version row is 'approved' (signed, not yet in force) while scheduled.
    INSERT INTO sop_versions (sop_id, version, file_url, uploaded_by, status, reason_for_change)
    VALUES (p_sop_id, sop_rec.version, sop_rec.file_url, p_actor_id, 'approved', sop_rec.reason_for_change)
    ON CONFLICT (sop_id, version)
    DO UPDATE SET status = 'approved', reason_for_change = COALESCE(EXCLUDED.reason_for_change, sop_versions.reason_for_change);

    INSERT INTO audit_log (actor_id, action, entity_type, entity_id, new_value, metadata)
    VALUES (p_actor_id, 'sop_scheduled', 'sop', p_sop_id,
      jsonb_build_object('status','scheduled'),
      jsonb_build_object('effective_date', v_eff));
    RETURN;
  END IF;

  -- Atomic supersession: demote the outgoing effective version, promote the new one.
  UPDATE sop_versions
  SET status = 'superseded', superseded_at = now()
  WHERE sop_id = p_sop_id AND status = 'effective' AND version <> sop_rec.version;

  INSERT INTO sop_versions (sop_id, version, file_url, uploaded_by, status, effective_from, retention_until, reason_for_change)
  VALUES (p_sop_id, sop_rec.version, sop_rec.file_url, p_actor_id, 'effective', v_eff, retention_due, sop_rec.reason_for_change)
  ON CONFLICT (sop_id, version)
  DO UPDATE SET status = 'effective', effective_from = v_eff, retention_until = retention_due, superseded_at = NULL;

  UPDATE sops
  SET status = 'active',
      locked = false,
      effective_date = v_eff,
      due_for_revision = next_due,
      retention_expires_at = retention_due,
      updated_at = now()
  WHERE id = p_sop_id;

  PERFORM append_sop_revision_history(
    p_sop_id, NULL, sop_rec.version, NULL,
    sop_rec.approved_date, v_eff, NULL, p_actor_id, sop_rec.reason_for_change
  );

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, new_value, metadata)
  VALUES (p_actor_id, p_audit_action, 'sop', p_sop_id,
    jsonb_build_object('status','active','version',sop_rec.version),
    jsonb_build_object('effective_date', v_eff, 'due_for_revision', next_due, 'retention_expires_at', retention_due));
END;
$$;

-- 6. Dated job: flip scheduled SOPs live when their effective date arrives ----
-- Called by a cron endpoint (app/api/cron/scheduled-activation). Idempotent.
CREATE OR REPLACE FUNCTION activate_scheduled_sops()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r record;
  v_count int := 0;
BEGIN
  FOR r IN
    SELECT id, effective_date FROM sops
    WHERE status = 'scheduled' AND effective_date IS NOT NULL AND effective_date <= CURRENT_DATE
  LOOP
    PERFORM activate_sop_effective(r.id, r.effective_date, NULL, 'sop_scheduled_activation');
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

COMMENT ON INDEX sop_versions_one_effective_per_doc IS 'Spec §9 invariant: at most one effective version per document, enforced at the DB layer.';
