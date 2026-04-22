"use server"

import { createClient, createServiceClient } from "@/lib/supabase/server"
import { generateJson, AIError } from "@/lib/ai/client"

const STALE_AFTER_MS = 6 * 60 * 60 * 1000 // 6 hours

export interface RiskSignal {
  name: string
  severity: "info" | "warn" | "critical"
  count: number
  blurb: string
  /** Optional deep-link target so the UI can jump to the related view. */
  href?: string
}

export interface RiskSnapshot {
  id: string
  scope: string
  risk_level: "low" | "medium" | "high"
  risk_score: number
  metrics: Record<string, number>
  signals: RiskSignal[]
  insights: string[]
  model_used: string | null
  tier_used: string | null
  latency_ms: number | null
  generated_at: string
  is_stale: boolean
}

type Metrics = {
  scope: string
  computed_at: string
  active_users_total: number
  active_sops_total: number
  overdue_pm_count: number
  overdue_pm_avg_days: number
  pending_cc_past_deadline_count: number
  pending_cc_near_deadline_count: number
  sops_due_for_revision_count: number
  active_sops_under_80pct_ack_count: number
  failed_approvals_last_30d: number
  ai_failure_rate_last_7d: number
  inactive_equipment_count: number
}

async function requireQaOrAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Not authenticated" }
  const service = await createServiceClient()
  const [{ data: isQa }, { data: isAdmin }] = await Promise.all([
    service.rpc("is_qa_manager", { user_id: user.id }),
    service.rpc("is_admin", { user_id: user.id }),
  ])
  if (!isQa && !isAdmin) return { ok: false as const, error: "Forbidden" }
  return { ok: true as const, userId: user.id, isAdmin: !!isAdmin, isQa: !!isQa, service }
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Not authenticated" }
  const service = await createServiceClient()
  const { data: isAdmin } = await service.rpc("is_admin", { user_id: user.id })
  if (!isAdmin) return { ok: false as const, error: "Forbidden — admin only" }
  return { ok: true as const, userId: user.id, service }
}

/**
 * Score + level are derived deterministically from metrics. The model never
 * sees this responsibility — it only narrates. This makes the risk score
 * reproducible: run the function twice, get the same answer.
 */
function scoreAndLevel(m: Metrics): { score: number; level: "low" | "medium" | "high"; signals: RiskSignal[] } {
  let score = 0
  const signals: RiskSignal[] = []

  if (m.pending_cc_past_deadline_count > 0) {
    score += 30
    signals.push({
      name: "Change controls past deadline",
      severity: "critical",
      count: m.pending_cc_past_deadline_count,
      blurb: `${m.pending_cc_past_deadline_count} change control${m.pending_cc_past_deadline_count === 1 ? "" : "s"} past deadline — signatures still outstanding.`,
      href: "/change-control",
    })
  } else if (m.pending_cc_near_deadline_count >= 3) {
    score += 15
    signals.push({
      name: "Change controls near deadline",
      severity: "warn",
      count: m.pending_cc_near_deadline_count,
      blurb: `${m.pending_cc_near_deadline_count} change controls have deadlines in the next 7 days.`,
      href: "/change-control",
    })
  }

  if (m.overdue_pm_count >= 10) {
    score += 30
    signals.push({
      name: "Overdue PM tasks",
      severity: "critical",
      count: m.overdue_pm_count,
      blurb: `${m.overdue_pm_count} overdue PM tasks, average ${m.overdue_pm_avg_days} days late.`,
      href: "/equipment",
    })
  } else if (m.overdue_pm_count > 0) {
    score += 15
    signals.push({
      name: "Overdue PM tasks",
      severity: "warn",
      count: m.overdue_pm_count,
      blurb: `${m.overdue_pm_count} overdue PM task${m.overdue_pm_count === 1 ? "" : "s"} (avg ${m.overdue_pm_avg_days} days late).`,
      href: "/equipment",
    })
  }

  if (m.active_sops_under_80pct_ack_count >= 5) {
    score += 20
    signals.push({
      name: "SOPs under 80% acknowledged",
      severity: "critical",
      count: m.active_sops_under_80pct_ack_count,
      blurb: `${m.active_sops_under_80pct_ack_count} active SOPs have below 80% acknowledgement from scope users.`,
      href: "/reports",
    })
  } else if (m.active_sops_under_80pct_ack_count > 0) {
    score += 10
    signals.push({
      name: "SOPs under 80% acknowledged",
      severity: "warn",
      count: m.active_sops_under_80pct_ack_count,
      blurb: `${m.active_sops_under_80pct_ack_count} active SOP${m.active_sops_under_80pct_ack_count === 1 ? "" : "s"} trailing on acknowledgement (<80%).`,
      href: "/reports",
    })
  }

  if (m.sops_due_for_revision_count >= 5) {
    score += 10
    signals.push({
      name: "SOPs due for revision",
      severity: "warn",
      count: m.sops_due_for_revision_count,
      blurb: `${m.sops_due_for_revision_count} active SOPs are due for revision within 30 days.`,
      href: "/library",
    })
  } else if (m.sops_due_for_revision_count > 0) {
    score += 5
    signals.push({
      name: "SOPs due for revision",
      severity: "info",
      count: m.sops_due_for_revision_count,
      blurb: `${m.sops_due_for_revision_count} SOP${m.sops_due_for_revision_count === 1 ? "" : "s"} approaching the revision window.`,
      href: "/library",
    })
  }

  if (m.failed_approvals_last_30d >= 5) {
    score += 10
    signals.push({
      name: "Repeated approval failures",
      severity: "warn",
      count: m.failed_approvals_last_30d,
      blurb: `${m.failed_approvals_last_30d} SOP approvals were rejected or returned for changes in the last 30 days.`,
      href: "/approvals",
    })
  }

  if (m.ai_failure_rate_last_7d >= 0.2) {
    score += 5
    signals.push({
      name: "AI call failure rate",
      severity: "info",
      count: Math.round(m.ai_failure_rate_last_7d * 100),
      blurb: `AI generation has been failing ${Math.round(m.ai_failure_rate_last_7d * 100)}% of the time over the last 7 days.`,
    })
  }

  if (m.inactive_equipment_count > 0) {
    signals.push({
      name: "Inactive equipment",
      severity: "info",
      count: m.inactive_equipment_count,
      blurb: `${m.inactive_equipment_count} equipment record${m.inactive_equipment_count === 1 ? "" : "s"} currently marked inactive.`,
      href: "/equipment",
    })
  }

  const clamped = Math.max(0, Math.min(100, score))
  const level: "low" | "medium" | "high" =
    clamped >= 60 ? "high" : clamped >= 25 ? "medium" : "low"
  return { score: clamped, level, signals }
}

interface NarrativeOutput {
  insights: string[]
}

function isNarrative(v: unknown): v is NarrativeOutput {
  return (
    !!v &&
    typeof v === "object" &&
    Array.isArray((v as any).insights) &&
    (v as any).insights.every((x: unknown) => typeof x === "string")
  )
}

/**
 * Internal — runs metrics RPC, scores deterministically, asks the model for a
 * short narrative, writes a snapshot, returns it. Admin-only callers.
 */
async function generateAndStore(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  scope: string,
): Promise<RiskSnapshot> {
  const { data: rawMetrics, error: rpcErr } = await service.rpc("compute_risk_metrics", {
    p_scope: scope,
  })
  if (rpcErr || !rawMetrics) {
    throw new Error(rpcErr?.message || "Failed to compute metrics")
  }
  const metrics = rawMetrics as Metrics
  const { score, level, signals } = scoreAndLevel(metrics)

  // ── AI narrative (small prompt, Flash tier, strict schema) ─────────────────
  let insights: string[] = []
  let modelUsed: string | null = null
  let tierUsed: string | null = null
  let latencyMs: number | null = null

  try {
    const prompt = [
      `You are writing executive risk insights for a pharmaceutical QA team.`,
      `Scope: ${scope === "org" ? "whole organization" : `department "${scope}"`}.`,
      `Heuristic risk level has already been computed as "${level}" (score ${score}/100).`,
      ``,
      `Pre-aggregated signals (do NOT invent other signals or counts):`,
      signals.length === 0
        ? `- No elevated signals. The workspace is operating within normal ranges.`
        : signals
            .map((s) => `- [${s.severity}] ${s.name}: ${s.count} — ${s.blurb}`)
            .join("\n"),
      ``,
      `Write 3 short, action-oriented insights (one sentence each). Reference only the signals above.`,
      `Return ONLY JSON: { "insights": ["...", "...", "..."] }`,
    ].join("\n")

    const result = await generateJson<NarrativeOutput>({
      purpose: "risk-insights",
      tier: "fast",
      prompt,
      temperature: 0.3,
      maxOutputTokens: 400,
      validate: isNarrative,
      audit: true,
    })
    insights = result.data.insights.slice(0, 5)
    modelUsed = result.modelUsed
    tierUsed = result.tier
    latencyMs = result.latencyMs
  } catch (err) {
    // AI failure is non-fatal — the deterministic score + signals are still useful.
    if (err instanceof AIError) {
      insights = [
        `AI narrative unavailable (${err.code}). Deterministic risk score is ${score}/100 with level "${level}".`,
        ...signals.slice(0, 3).map((s) => s.blurb),
      ]
    } else {
      insights = [
        `AI narrative unavailable. Deterministic risk score is ${score}/100 with level "${level}".`,
        ...signals.slice(0, 3).map((s) => s.blurb),
      ]
    }
  }

  const { data: snapshot, error: insErr } = await service
    .from("risk_assessment_snapshots")
    .insert({
      scope,
      risk_level: level,
      risk_score: score,
      metrics: metrics as unknown as Record<string, number>,
      signals,
      insights,
      model_used: modelUsed,
      tier_used: tierUsed,
      latency_ms: latencyMs,
    })
    .select("*")
    .single()

  if (insErr || !snapshot) {
    throw new Error(insErr?.message || "Failed to store risk snapshot")
  }

  return hydrateSnapshot(snapshot)
}

function hydrateSnapshot(row: any): RiskSnapshot {
  const ageMs = Date.now() - new Date(row.generated_at).getTime()
  return {
    id: row.id,
    scope: row.scope,
    risk_level: row.risk_level,
    risk_score: row.risk_score,
    metrics: row.metrics ?? {},
    signals: (row.signals ?? []) as RiskSignal[],
    insights: (row.insights ?? []) as string[],
    model_used: row.model_used,
    tier_used: row.tier_used,
    latency_ms: row.latency_ms,
    generated_at: row.generated_at,
    is_stale: ageMs > STALE_AFTER_MS,
  }
}

/**
 * Public read. QA+Admin. Returns the latest snapshot for the scope, generating
 * one on-demand if no snapshot exists yet. Stale-but-present snapshots are
 * returned as-is with `is_stale: true` so the UI can show the age and surface
 * a manual refresh button (for admins).
 */
export async function getLatestRiskAssessment(
  scope: string = "org",
): Promise<{ success: true; snapshot: RiskSnapshot } | { success: false; error: string }> {
  const auth = await requireQaOrAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const { data: existing } = await auth.service
    .from("risk_assessment_snapshots")
    .select("*")
    .eq("scope", scope)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    return { success: true, snapshot: hydrateSnapshot(existing) }
  }

  // First ever call for this scope — generate synchronously.
  try {
    const snapshot = await generateAndStore(auth.service, scope)
    return { success: true, snapshot }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

/**
 * Manual regenerate. Admin-only to cap cost — QA managers see cached results
 * and can request a refresh via an admin.
 */
export async function regenerateRiskAssessment(
  scope: string = "org",
): Promise<{ success: true; snapshot: RiskSnapshot } | { success: false; error: string }> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  try {
    const snapshot = await generateAndStore(auth.service, scope)
    return { success: true, snapshot }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

/**
 * Used by the cron endpoint. Refreshes org-wide + per-department. Requires the
 * caller to have already validated CRON_SECRET — this function takes a service
 * client directly and does no auth of its own.
 */
export async function refreshAllRiskAssessments(
  service: Awaited<ReturnType<typeof createServiceClient>>,
): Promise<{ scope: string; ok: boolean; error?: string }[]> {
  const scopes: string[] = ["org"]
  const { data: depts } = await service.from("departments").select("name")
  for (const d of depts ?? []) {
    if (d?.name) scopes.push(d.name as string)
  }

  const results: { scope: string; ok: boolean; error?: string }[] = []
  for (const scope of scopes) {
    try {
      await generateAndStore(service, scope)
      results.push({ scope, ok: true })
    } catch (err) {
      results.push({
        scope,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
  return results
}
