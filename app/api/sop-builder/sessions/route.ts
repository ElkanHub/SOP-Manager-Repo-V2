import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { requireSopBuilderUser } from "@/lib/sop-builder/access"
import { cleanText } from "@/lib/sop-builder/api"

export async function GET() {
  const ctx = await requireSopBuilderUser()
  if ("error" in ctx) return ctx.error

  const { data, error } = await ctx.service
    .from("sop_builder_sessions")
    .select(`
      *,
      active_draft:sop_builder_drafts!sop_builder_sessions_active_draft_fk(id, version, status, docx_path, created_at)
    `)
    .order("updated_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sessions: data || [] })
}

export async function POST(request: NextRequest) {
  const ctx = await requireSopBuilderUser()
  if ("error" in ctx) return ctx.error

  const body = await request.json()
  const title = cleanText(body.title)
  const purpose = cleanText(body.purpose)

  if (!title || !purpose) {
    return NextResponse.json({ error: "Title and purpose are required." }, { status: 400 })
  }

  const { data, error } = await ctx.service
    .from("sop_builder_sessions")
    .insert({
      created_by: ctx.user.id,
      title,
      department: cleanText(body.department) || ctx.profile.department,
      purpose,
      objective: cleanText(body.objective) || null,
      scope_text: cleanText(body.scope_text) || null,
      intended_users: cleanText(body.intended_users) || null,
      equipment: cleanText(body.equipment) || null,
      risks: cleanText(body.risks) || null,
      records_forms: cleanText(body.records_forms) || null,
      regulatory_refs: cleanText(body.regulatory_refs) || null,
      selected_template_id: cleanText(body.selected_template_id) || null,
      status: "intake",
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await ctx.service.from("sop_builder_messages").insert({
    session_id: data.id,
    sender: "system",
    message: "SOP Builder session created.",
    message_type: "system_notice",
  })

  await logAudit({
    actorId: ctx.user.id,
    action: "sop_builder_session_created",
    entityType: "system",
    entityId: data.id,
    metadata: { title, department: data.department },
  })

  return NextResponse.json({ session: data })
}

