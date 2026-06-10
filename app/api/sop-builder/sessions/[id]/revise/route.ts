import { NextRequest, NextResponse } from "next/server"
import { requireSopBuilderUser } from "@/lib/sop-builder/access"
import { cleanText, isRouteError, loadSessionForUser } from "@/lib/sop-builder/api"
import { SopBuilderHarness, sopBuilderErrorMessage } from "@/lib/sop-builder/harness"
import type { SopBuilderComment, SopBuilderDraft } from "@/lib/sop-builder/types"

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
  const instruction = cleanText(body.instruction)

  const { data: currentDraft } = await ctx.service
    .from("sop_builder_drafts")
    .select("*")
    .eq("id", session.active_draft_id)
    .maybeSingle()

  if (!currentDraft) return NextResponse.json({ error: "No active draft is available to revise." }, { status: 400 })

  const { data: comments } = await ctx.service
    .from("sop_builder_comments")
    .select("*")
    .eq("draft_id", currentDraft.id)
    .eq("status", "open")
    .order("created_at", { ascending: true })

  if (!instruction && !(comments || []).length) {
    return NextResponse.json({ error: "Add a comment or revision instruction before revising." }, { status: 400 })
  }

  try {
    await ctx.service.from("sop_builder_sessions").update({ status: "revising" }).eq("id", session.id)
    const draft = await new SopBuilderHarness(ctx.service, ctx.user.id).reviseDraft({
      session,
      currentDraft: currentDraft as SopBuilderDraft,
      comments: (comments || []) as SopBuilderComment[],
      instruction,
    })
    return NextResponse.json({ draft })
  } catch (error) {
    await ctx.service.from("sop_builder_sessions").update({ status: "draft_ready" }).eq("id", session.id)
    return NextResponse.json({ error: sopBuilderErrorMessage(error) }, { status: 500 })
  }
}

