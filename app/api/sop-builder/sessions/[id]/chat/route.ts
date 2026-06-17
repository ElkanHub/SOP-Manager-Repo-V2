import { NextRequest, NextResponse } from "next/server"
import { requireSopBuilderUser } from "@/lib/sop-builder/access"
import { cleanText, isRouteError, loadSessionForUser } from "@/lib/sop-builder/api"
import { SopBuilderHarness, sopBuilderErrorMessage } from "@/lib/sop-builder/harness"

const PURPOSE_PLACEHOLDER = "Pending — described in chat"

/**
 * Single conversational endpoint for the SOP Builder. One user message drives
 * the agent: the first turn produces a complete draft, later turns revise it.
 */
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
  const message = cleanText(body.message)
  if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 })
  if (message.length > 6000) return NextResponse.json({ error: "Message is too long." }, { status: 400 })

  // Record the user turn first so it is part of the conversation the agent sees.
  await ctx.service.from("sop_builder_messages").insert({
    session_id: session.id,
    sender: "user",
    message,
    message_type: "chat",
  })

  // Capture the first request into the session purpose if it is not set yet.
  const hasPurpose = Boolean((session.purpose || "").trim()) && session.purpose !== PURPOSE_PLACEHOLDER
  if (!hasPurpose) {
    await ctx.service.from("sop_builder_sessions").update({ purpose: message.slice(0, 2000) }).eq("id", session.id)
    session.purpose = message.slice(0, 2000)
  }

  try {
    const { draft, assistantMessage } = await new SopBuilderHarness(ctx.service, ctx.user.id).chatTurn(session, message)

    // Adopt the AI-derived title while the session is still untitled.
    const aiTitle = (draft.structured_content_json?.title || "").trim()
    if (aiTitle && (!session.title || session.title === "Untitled SOP")) {
      await ctx.service.from("sop_builder_sessions").update({ title: aiTitle }).eq("id", session.id)
    }

    const [{ data: refreshedSession }, { data: drafts }, { data: messages }] = await Promise.all([
      ctx.service.from("sop_builder_sessions").select("*").eq("id", session.id).maybeSingle(),
      ctx.service.from("sop_builder_drafts").select("*").eq("session_id", session.id).order("version", { ascending: false }),
      ctx.service.from("sop_builder_messages").select("*").eq("session_id", session.id).order("created_at", { ascending: true }),
    ])

    return NextResponse.json({
      session: refreshedSession,
      draft,
      drafts: drafts || [],
      messages: messages || [],
      assistantMessage,
    })
  } catch (error) {
    return NextResponse.json({ error: sopBuilderErrorMessage(error) }, { status: 500 })
  }
}
