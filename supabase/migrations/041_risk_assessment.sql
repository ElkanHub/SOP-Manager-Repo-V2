-- 041_risk_assessment.sql
-- Deterministic risk metrics + AI narrative snapshot cache.
--
-- Design: SQL does the counting (reproducible, free). AI only narrates.
-- Snapshots are cached in risk_assessment_snapshots keyed by scope and served
-- from the DB for 6h before regeneration — so reads don't hit the AI on the
-- hot path.

-- ── Snapshots table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS risk_assessment_snapshots (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope          text NOT NULL,                    -- 'org' or department name
  risk_level     text NOT NULL CHECK (risk_level IN ('low','medium','high')),
  risk_score     int  NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  metrics        jsonb NOT NULL,                   -- raw signal counts
  signals        jsonb NOT NULL,                   -- [{ name, severity, count, blurb }]
  insights       jsonb NOT NULL,                   -- AI narrative bullets (string[])
  model_used     text,
  tier_used      text,
  latency_ms     int,
  generated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS risk_snapshots_scope_generated_idx
  ON risk_assessment_snapshots (scope, generated_at DESC);

ALTER TABLE risk_assessment_snapshots ENABLE ROW LEVEL SECURITY;

-- SELECT: QA + Admin only. Writes are service-client-only (same pattern as audit_log).
DROP POLICY IF EXISTS risk_snapshots_select_qa ON risk_assessment_snapshots;
CREATE POLICY risk_snapshots_select_qa
  ON risk_assessment_snapshots FOR SELECT
  USING (is_qa_manager(auth.uid()));

DROP POLICY IF EXISTS risk_snapshots_select_admin ON risk_assessment_snapshots;
CREATE POLICY risk_snapshots_select_admin
  ON risk_assessment_snapshots FOR SELECT
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS risk_snapshots_no_inserts ON risk_assessment_snapshots;
CREATE POLICY risk_snapshots_no_inserts
  ON risk_assessment_snapshots AS RESTRICTIVE FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS risk_snapshots_no_updates ON risk_assessment_snapshots;
CREATE POLICY risk_snapshots_no_updates
  ON risk_assessment_snapshots AS RESTRICTIVE FOR UPDATE USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS risk_snapshots_no_deletes ON risk_assessment_snapshots;
CREATE POLICY risk_snapshots_no_deletes
  ON risk_assessment_snapshots AS RESTRICTIVE FOR DELETE USING (false);

-- ── Metrics function ─────────────────────────────────────────────────────────
-- Returns a single JSONB object with pre-aggregated risk signals. Scope can be
-- 'org' (whole workspace) or a department name. SECURITY DEFINER so it can
-- aggregate across RLS-scoped tables; access is controlled by the GRANT below.

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
  -- Overdue PM tasks + average lateness in days
  SELECT
    count(*),
    COALESCE(AVG(v_today - pt.due_date), 0)
  INTO v_overdue_pm_count, v_overdue_pm_avg_days
  FROM pm_tasks pt
  JOIN equipment eq ON eq.id = pt.equipment_id
  WHERE pt.status = 'overdue'
    AND (v_dept_filter IS NULL OR eq.department = v_dept_filter);

  -- Change controls: pending past deadline
  SELECT count(*)
  INTO v_pending_cc_past
  FROM change_controls cc
  JOIN sops s ON s.id = cc.sop_id
  WHERE cc.status = 'pending'
    AND cc.deadline < v_today
    AND (v_dept_filter IS NULL OR s.department = v_dept_filter);

  -- Change controls: pending with deadline in next 7 days
  SELECT count(*)
  INTO v_pending_cc_near
  FROM change_controls cc
  JOIN sops s ON s.id = cc.sop_id
  WHERE cc.status = 'pending'
    AND cc.deadline BETWEEN v_today AND v_today + INTERVAL '7 days'
    AND (v_dept_filter IS NULL OR s.department = v_dept_filter);

  -- SOPs approaching revision date (next 30 days)
  SELECT count(*)
  INTO v_sops_due_rev
  FROM sops
  WHERE status = 'active'
    AND due_for_revision IS NOT NULL
    AND due_for_revision < v_today + INTERVAL '30 days'
    AND (v_dept_filter IS NULL OR department = v_dept_filter);

  -- Active users and active SOPs within scope
  SELECT count(*) INTO v_active_users
  FROM profiles
  WHERE is_active = true
    AND (v_dept_filter IS NULL OR department = v_dept_filter);

  SELECT count(*) INTO v_active_sops
  FROM sops
  WHERE status = 'active'
    AND (v_dept_filter IS NULL OR department = v_dept_filter);

  -- Active SOPs with <80% acknowledgement rate (approximation at scope level)
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

  -- AI call failure rate over the last 7 days (uses audit_log from lib/ai/client.ts)
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

  -- Inactive equipment (scoped)
  SELECT count(*) INTO v_inactive_equipment
  FROM equipment
  WHERE status = 'inactive'
    AND (v_dept_filter IS NULL OR department = v_dept_filter);

  -- Rejected / changes_requested SOP approvals in last 30 days (scoped via sop dept)
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

-- Lock down execution. service_role is used by createServiceClient() server-side.
REVOKE ALL ON FUNCTION compute_risk_metrics(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION compute_risk_metrics(text) FROM anon;
REVOKE ALL ON FUNCTION compute_risk_metrics(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION compute_risk_metrics(text) TO service_role;
