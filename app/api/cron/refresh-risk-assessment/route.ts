import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { refreshAllRiskAssessments } from "@/actions/risk-assessment"

export const dynamic = "force-dynamic"
// AI calls can take several seconds per scope; give the cron headroom.
export const maxDuration = 120

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET

  const authHeader = request.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "")

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 })
  }
  if (process.env.NODE_ENV === "production") {
    if (token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const service = await createServiceClient()
    const results = await refreshAllRiskAssessments(service)

    const ok = results.filter((r) => r.ok).length
    const failed = results.length - ok

    return NextResponse.json({
      ok: true,
      scopes: results.length,
      succeeded: ok,
      failed,
      results,
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
