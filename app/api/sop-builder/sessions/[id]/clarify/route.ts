import { NextRequest, NextResponse } from "next/server"
import { requireSopBuilderUser } from "@/lib/sop-builder/access"
import { cleanText, isRouteError, loadSessionForUser } from "@/lib/sop-builder/api"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireSopBuilderUser()
  if ("error" in ctx) return ctx.error
  const { id } = await params
  const session = await loadSessionForUser(ctx.service, id)
  if (isRouteError(session)) return session

  const body = await request.json()
  const message = cleanText(body.message)
  if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 })

  const { error } = await ctx.service.from("sop_builder_messages").insert({
    session_id: session.id,
    sender: "user",
    message,
    message_type: "clarification_answer",
    related_draft_id: session.active_draft_id || null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await ctx.service
    .from("sop_builder_sessions")
    .update({ status: "outline_ready" })
    .eq("id", session.id)

  return NextResponse.json({ success: true })
}

