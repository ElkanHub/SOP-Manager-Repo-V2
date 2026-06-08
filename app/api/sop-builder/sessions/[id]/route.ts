import { NextResponse } from "next/server"
import { requireSopBuilderUser } from "@/lib/sop-builder/access"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireSopBuilderUser()
  if ("error" in ctx) return ctx.error
  const { id } = await params

  const [{ data: session, error: sessionError }, { data: drafts, error: draftsError }, { data: messages, error: messagesError }] = await Promise.all([
    ctx.service.from("sop_builder_sessions").select("*").eq("id", id).maybeSingle(),
    ctx.service.from("sop_builder_drafts").select("*").eq("session_id", id).order("version", { ascending: false }),
    ctx.service.from("sop_builder_messages").select("*").eq("session_id", id).order("created_at", { ascending: true }),
  ])

  const error = sessionError || draftsError || messagesError
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!session) return NextResponse.json({ error: "SOP Builder session not found" }, { status: 404 })

  return NextResponse.json({ session, drafts: drafts || [], messages: messages || [] })
}

