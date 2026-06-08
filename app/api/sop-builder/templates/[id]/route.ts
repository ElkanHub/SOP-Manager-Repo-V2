import { NextRequest, NextResponse } from "next/server"
import { requireSopBuilderTemplateManager } from "@/lib/sop-builder/access"
import { cleanText } from "@/lib/sop-builder/api"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireSopBuilderTemplateManager()
  if ("error" in ctx) return ctx.error
  const { id } = await params
  const body = await request.json()

  if (body.is_default === true) {
    await ctx.service.from("sop_builder_templates").update({ is_default: false }).eq("is_default", true)
  }

  const { data, error } = await ctx.service
    .from("sop_builder_templates")
    .update({
      ...(body.name !== undefined ? { name: cleanText(body.name) } : {}),
      ...(body.version !== undefined ? { version: cleanText(body.version) || null } : {}),
      ...(body.is_default !== undefined ? { is_default: Boolean(body.is_default) } : {}),
    })
    .eq("id", id)
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireSopBuilderTemplateManager()
  if ("error" in ctx) return ctx.error
  const { id } = await params

  const { error } = await ctx.service
    .from("sop_builder_templates")
    .update({ status: "archived", is_default: false })
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

