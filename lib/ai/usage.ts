import { createServiceClient } from "@/lib/supabase/server"

// server-only module (pulls next/headers transitively via createServiceClient).

export interface AiUsageRecord {
  purpose: string
  model: string
  tier: string
  credits: number
  promptTokens?: number | null
  completionTokens?: number | null
  totalTokens?: number | null
  success: boolean
  errorCode?: string | null
  latencyMs?: number | null
  actorId?: string | null
  department?: string | null
  orgId?: string | null
}

/**
 * Append one row to the AI usage ledger (`ai_usage_events`). This is the single
 * metering point for every AI call routed through lib/ai/client.ts.
 *
 * Fire-and-forget: a metering failure must never break the user's AI action.
 */
export async function recordAiUsage(entry: AiUsageRecord): Promise<void> {
  try {
    const service = await createServiceClient()
    const { error } = await service.from("ai_usage_events").insert({
      org_id: entry.orgId ?? null,
      actor_id: entry.actorId ?? null,
      department: entry.department ?? null,
      purpose: entry.purpose,
      model: entry.model,
      tier: entry.tier,
      credits: entry.success ? entry.credits : 0,
      prompt_tokens: entry.promptTokens ?? null,
      completion_tokens: entry.completionTokens ?? null,
      total_tokens: entry.totalTokens ?? null,
      success: entry.success,
      error_code: entry.errorCode ?? null,
      latency_ms: entry.latencyMs ?? null,
    })
    if (error) {
      // eslint-disable-next-line no-console
      console.error("[ai-usage] insert failed", { purpose: entry.purpose, error: error.message })
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[ai-usage] unexpected failure", err)
  }
}
