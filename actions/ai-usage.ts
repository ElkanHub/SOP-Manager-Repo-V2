"use server"

import { createClient, createServiceClient } from "@/lib/supabase/server"

export interface AiUsageSummary {
  scope: string
  from: string
  to: string
  total_calls: number
  total_credits: number
  total_tokens: number
  success_rate: number
  by_purpose: { purpose: string; calls: number; credits: number; tokens: number }[]
}

/**
 * QA/Admin read of AI consumption (credits + tokens) over a window, optionally
 * scoped to a department. Backed by the `ai_usage_summary` RPC over the single
 * `ai_usage_events` metering ledger. This is the trackable view of AI usage.
 */
export async function getAiUsageSummary(
  scope: string = "org",
  fromIso?: string,
  toIso?: string,
): Promise<{ success: true; summary: AiUsageSummary } | { success: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const service = await createServiceClient()
  const [{ data: isQa }, { data: isAdmin }] = await Promise.all([
    service.rpc("is_qa_manager", { user_id: user.id }),
    service.rpc("is_admin", { user_id: user.id }),
  ])
  if (!isQa && !isAdmin) return { success: false, error: "Forbidden" }

  const args: Record<string, unknown> = { p_scope: scope }
  if (fromIso) args.p_from = fromIso
  if (toIso) args.p_to = toIso

  const { data, error } = await service.rpc("ai_usage_summary", args)
  if (error) return { success: false, error: error.message }

  return { success: true, summary: data as AiUsageSummary }
}
