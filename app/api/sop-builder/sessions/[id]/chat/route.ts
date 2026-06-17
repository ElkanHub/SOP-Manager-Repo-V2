import { NextRequest } from "next/server"
import { requireSopBuilderUser } from "@/lib/sop-builder/access"
import { cleanText, isRouteError, loadSessionForUser } from "@/lib/sop-builder/api"
import { SopBuilderHarness, sopBuilderErrorMessage } from "@/lib/sop-builder/harness"

const PURPOSE_PLACEHOLDER = "Pending — described in chat"

/**
 * Single conversational endpoint for the SOP Builder. Responds with a stream of
 * newline-delimited JSON events so the chat reply renders as it is generated:
 *   { type: "status", action }       — the resolved turn action (drives the status line)
 *   { type: "reply", delta }         — a chunk of the agent's conversational reply
 *   { type: "done", session, draft, drafts, messages, assistantMessage, action }
 *   { type: "error", error }
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
  if (!message) return Response.json({ error: "Message is required." }, { status: 400 })
  if (message.length > 6000) return Response.json({ error: "Message is too long." }, { status: 400 })

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

  // Optional highlight-to-comment selection from the document view.
  const selectionRaw = body.selection && typeof body.selection === "object" ? (body.selection as Record<string, unknown>) : null
  const selection = selectionRaw && cleanText(selectionRaw.quoted)
    ? {
        quoted: cleanText(selectionRaw.quoted).slice(0, 2000),
        sectionHeading: cleanText(selectionRaw.sectionHeading).slice(0, 200) || null,
      }
    : null

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"))
      }

      try {
        const { draft } = await new SopBuilderHarness(ctx.service, ctx.user.id).agentTurnStream(
          session,
          message,
          selection,
          {
            onStatus: (action) => send({ type: "status", action }),
            onReplyDelta: (delta) => send({ type: "reply", delta }),
          },
        )

        // Adopt the AI-derived title while the session is still untitled.
        const aiTitle = (draft?.structured_content_json?.title || "").trim()
        if (aiTitle && (!session.title || session.title === "Untitled SOP")) {
          await ctx.service.from("sop_builder_sessions").update({ title: aiTitle }).eq("id", session.id)
        }

        const [{ data: refreshedSession }, { data: drafts }, { data: messages }] = await Promise.all([
          ctx.service.from("sop_builder_sessions").select("*").eq("id", session.id).maybeSingle(),
          ctx.service.from("sop_builder_drafts").select("*").eq("session_id", session.id).order("version", { ascending: false }),
          ctx.service.from("sop_builder_messages").select("*").eq("session_id", session.id).order("created_at", { ascending: true }),
        ])

        send({
          type: "done",
          session: refreshedSession,
          draft,
          drafts: drafts || [],
          messages: messages || [],
        })
      } catch (error) {
        send({ type: "error", error: sopBuilderErrorMessage(error) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  })
}
