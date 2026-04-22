import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { subDays } from "date-fns"
import { generateJson, isAiConfigured, friendlyAiMessage } from "@/lib/ai/client"

interface RiskInsight {
  risk_level: "low" | "medium" | "high"
  insights: string[]
}

function isRiskInsight(v: unknown): v is RiskInsight {
  if (!v || typeof v !== "object") return false
  const o = v as any
  return (
    (o.risk_level === "low" || o.risk_level === "medium" || o.risk_level === "high") &&
    Array.isArray(o.insights) &&
    o.insights.every((x: unknown) => typeof x === "string")
  )
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: isQa } = await serviceClient.rpc("is_qa_manager", { user_id: user.id })
  const { data: isAdmin } = await serviceClient.rpc("is_admin", { user_id: user.id })

  if (!isQa && !isAdmin) {
    return NextResponse.json({ error: "Forbidden - QA or Admin access required" }, { status: 403 })
  }

  if (!isAiConfigured()) {
    return NextResponse.json({
      risk_level: "medium",
      insights: [
        "AI features are not configured for this workspace",
        "Pending change controls should be prioritized for signature collection",
        "Regular review of overdue PM tasks is recommended",
      ],
      generated_at: new Date().toISOString(),
    })
  }

  const thirtyDaysAgo = subDays(new Date(), 30).toISOString()

  const [{ data: auditLog }, { data: pendingCCs }, { data: overduePMs }] = await Promise.all([
    serviceClient
      .from("audit_log")
      .select("action, entity_type, created_at")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(100),
    serviceClient
      .from("change_controls")
      .select("id, status, deadline, required_signatories")
      .eq("status", "pending"),
    serviceClient
      .from("pm_tasks")
      .select("id, due_date, status, equipment:equipment_id(name, department)")
      .eq("status", "overdue"),
  ])

  const prompt = `Analyze the following organizational data and provide risk insights for an industrial SOP management system.

Recent Audit Log (last 30 days):
${auditLog?.map((entry) => `- ${entry.action} on ${entry.entity_type} at ${entry.created_at}`).join("\n") || "No recent entries"}

Pending Change Controls:
${pendingCCs?.map((cc) => `- CC ID: ${cc.id}, Status: ${cc.status}, Deadline: ${cc.deadline}`).join("\n") || "None"}

Overdue PM Tasks:
${(overduePMs as any[])?.map((t: any) => `- ${t.equipment?.name} (${t.equipment?.department}) - Due: ${t.due_date}`).join("\n") || "None"}

Based on this data, provide:
1. A risk level assessment (low, medium, or high)
2. 3-5 specific insights about potential risks or areas needing attention

Respond in JSON format:
{ "risk_level": "low|medium|high", "insights": ["insight 1", "insight 2", "insight 3"] }`

  try {
    const { data } = await generateJson<RiskInsight>({
      purpose: "risk-insights",
      tier: "fast",
      prompt,
      temperature: 0.7,
      maxOutputTokens: 500,
      validate: isRiskInsight,
      actorId: user.id,
    })
    return NextResponse.json({ ...data, generated_at: new Date().toISOString() })
  } catch (error) {
    console.error("Risk insights error:", error)
    return NextResponse.json(
      {
        risk_level: "medium",
        insights: [friendlyAiMessage(error)],
        generated_at: new Date().toISOString(),
      },
      { status: 200 },
    )
  }
}
