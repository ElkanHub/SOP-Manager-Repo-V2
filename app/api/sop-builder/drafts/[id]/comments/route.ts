import { NextRequest, NextResponse } from "next/server"
import { requireSopBuilderUser } from "@/lib/sop-builder/access"
import { cleanText, isRouteError, loadDraftForUser } from "@/lib/sop-builder/api"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireSopBuilderUser()
  if ("error" in ctx) return ctx.error
  const { id } = await params
  const draft = await loadDraftForUser(ctx.service, id)
  if (isRouteError(draft)) return draft

  const { data, error } = await ctx.service
    .from("sop_builder_comments")
    .select("*")
    .eq("draft_id", draft.id)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comments: data || [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireSopBuilderUser()
  if ("error" in ctx) return ctx.error
  const { id } = await params
  const draft = await loadDraftForUser(ctx.service, id)
  if (isRouteError(draft)) return draft

  const body = await request.json()
  const commentText = cleanText(body.comment_text)
  if (!commentText) return NextResponse.json({ error: "Comment instruction is required." }, { status: 400 })

  const { data, error } = await ctx.service
    .from("sop_builder_comments")
    .insert({
      session_id: draft.session_id,
      draft_id: draft.id,
      created_by: ctx.user.id,
      comment_text: commentText,
      quoted_text: cleanText(body.quoted_text) || null,
      section_heading: cleanText(body.section_heading) || null,
      status: "open",
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comment: data })
}

