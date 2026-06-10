import { NextRequest, NextResponse } from "next/server"
import { requireSopBuilderUser } from "@/lib/sop-builder/access"
import { isRouteError, loadSessionForUser } from "@/lib/sop-builder/api"
import { SopBuilderHarness, sopBuilderErrorMessage } from "@/lib/sop-builder/harness"
import { normalizeOutline } from "@/lib/sop-builder/markdown"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireSopBuilderUser()
  if ("error" in ctx) return ctx.error
  const { id } = await params
  const session = await loadSessionForUser(ctx.service, id)
  if (isRouteError(session)) return session

  const body = await request.json().catch(() => ({}))
  const outlineSource = body.outline || await loadLatestOutline(ctx.service, session.id)
  const outline = normalizeOutline(outlineSource, session.title)

  try {
    await ctx.service.from("sop_builder_sessions").update({ status: "drafting" }).eq("id", session.id)
    const draft = await new SopBuilderHarness(ctx.service, ctx.user.id).generateDraft(session, outline)
    return NextResponse.json({ draft })
  } catch (error) {
    await ctx.service.from("sop_builder_sessions").update({ status: "outline_ready" }).eq("id", session.id)
    return NextResponse.json({ error: sopBuilderErrorMessage(error) }, { status: 500 })
  }
}

async function loadLatestOutline(service: Awaited<ReturnType<typeof import("@/lib/supabase/server").createServiceClient>>, sessionId: string) {
  const { data } = await service
    .from("sop_builder_drafts")
    .select("outline_json")
    .eq("session_id", sessionId)
    .not("outline_json", "is", null)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.outline_json
}

