-- 056_ai_usage_metering.sql
-- Single metering ledger for ALL AI usage. Every call through the central AI
-- client (lib/ai/client.ts) records one row here with the credits charged and
-- the actual token usage, so AI can be tracked and metered per the credits
-- pricing model. Append-only. Tenant-ready: org_id is nullable now and will be
-- populated once multi-tenancy lands.
-- Idempotent.

CREATE TABLE IF NOT EXISTS ai_usage_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid,                       -- tenant-ready (nullable until tenancy)
  actor_id          uuid REFERENCES profiles(id),
  department        text,
  purpose           text NOT NULL,              -- delta-summary | risk-insights | training-questionnaire | training-slides | sop-builder-* | ...
  model             text,
  tier              text,                        -- fast | quality
  credits           int NOT NULL DEFAULT 0,      -- credits charged (0 on failure)
  prompt_tokens     int,
  completion_tokens int,
  total_tokens      int,
  success           boolean NOT NULL DEFAULT true,
  error_code        text,
  latency_ms        int,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_events_org_time_idx   ON ai_usage_events(org_id, created_at);
CREATE INDEX IF NOT EXISTS ai_usage_events_actor_idx      ON ai_usage_events(actor_id);
CREATE INDEX IF NOT EXISTS ai_usage_events_purpose_idx    ON ai_usage_events(purpose);
CREATE INDEX IF NOT EXISTS ai_usage_events_time_idx       ON ai_usage_events(created_at);

ALTER TABLE ai_usage_events ENABLE ROW LEVEL SECURITY;

-- Read: QA managers + admins only. Writes happen via the service client (which
-- bypasses RLS); there are deliberately no insert/update/delete policies, so the
-- ledger is effectively append-only from any non-service role.
DROP POLICY IF EXISTS "ai_usage_events readable by qa/admin" ON ai_usage_events;
CREATE POLICY "ai_usage_events readable by qa/admin"
ON ai_usage_events FOR SELECT
USING (is_qa_manager(auth.uid()) OR is_admin(auth.uid()));

-- ── Usage summary RPC ────────────────────────────────────────────────────────
-- Returns a single JSONB object with totals + a per-purpose breakdown over a
-- window. Scope = 'org' (everything) or a department name. SECURITY DEFINER so
-- it can aggregate across RLS; access is gated by the GRANT below.
CREATE OR REPLACE FUNCTION ai_usage_summary(
  p_scope text DEFAULT 'org',
  p_from  timestamptz DEFAULT (now() - interval '30 days'),
  p_to    timestamptz DEFAULT now()
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dept text := NULLIF(p_scope, 'org');
  v_result jsonb;
  v_by_purpose jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_calls',   COUNT(*),
    'total_credits', COALESCE(SUM(credits), 0),
    'total_tokens',  COALESCE(SUM(total_tokens), 0),
    'success_rate',  CASE WHEN COUNT(*) = 0 THEN 1
                          ELSE ROUND(COUNT(*) FILTER (WHERE success)::numeric / COUNT(*)::numeric, 3) END
  )
  INTO v_result
  FROM ai_usage_events
  WHERE created_at BETWEEN p_from AND p_to
    AND (v_dept IS NULL OR department = v_dept);

  SELECT COALESCE(jsonb_agg(row), '[]'::jsonb)
  INTO v_by_purpose
  FROM (
    SELECT jsonb_build_object(
      'purpose', purpose,
      'calls',   COUNT(*),
      'credits', COALESCE(SUM(credits), 0),
      'tokens',  COALESCE(SUM(total_tokens), 0)
    ) AS row
    FROM ai_usage_events
    WHERE created_at BETWEEN p_from AND p_to
      AND (v_dept IS NULL OR department = v_dept)
    GROUP BY purpose
    ORDER BY SUM(credits) DESC
  ) s;

  RETURN v_result || jsonb_build_object('scope', p_scope, 'from', p_from, 'to', p_to, 'by_purpose', v_by_purpose);
END;
$$;

REVOKE ALL ON FUNCTION ai_usage_summary(text, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION ai_usage_summary(text, timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION ai_usage_summary(text, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION ai_usage_summary(text, timestamptz, timestamptz) TO service_role;
