-- 040_audit_log_hardening.sql
-- Strengthen audit_log for the Reports revamp:
--   • Add a (created_at DESC) index for time-scan browsing in the Audit Trail report.
--   • Add an (action) index for filtering by action type.
--   • Explicitly reject INSERT/UPDATE/DELETE from non-service roles. Writes MUST go
--     through the service client via lib/audit.ts (or SECURITY DEFINER RPCs).

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx
  ON audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS audit_log_action_created_idx
  ON audit_log (action, created_at DESC);

-- ── Explicit write lockdown ───────────────────────────────────────────────────
-- audit_log already has SELECT policies for QA + Admin. There are no INSERT/
-- UPDATE/DELETE policies, which under RLS means those operations are denied
-- for non-service roles — but we add explicit restrictive policies here so the
-- intent is readable in the schema and any accidental permissive policy added
-- later would not unlock writes.
DROP POLICY IF EXISTS "audit_log no inserts" ON audit_log;
CREATE POLICY "audit_log no inserts"
  ON audit_log
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS "audit_log no updates" ON audit_log;
CREATE POLICY "audit_log no updates"
  ON audit_log
  AS RESTRICTIVE
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "audit_log no deletes" ON audit_log;
CREATE POLICY "audit_log no deletes"
  ON audit_log
  AS RESTRICTIVE
  FOR DELETE
  USING (false);

-- Note: the service role (used by createServiceClient in the server) bypasses
-- RLS entirely, so these restrictive policies apply only to anon and
-- authenticated roles. SECURITY DEFINER functions (e.g. approve_sop_request,
-- complete_pm_task) also bypass RLS when their owner is postgres.
