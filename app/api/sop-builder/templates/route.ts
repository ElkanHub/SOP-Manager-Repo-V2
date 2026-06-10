import { NextRequest, NextResponse } from "next/server"
import { requireSopBuilderTemplateManager, requireSopBuilderUser } from "@/lib/sop-builder/access"
import { cleanText } from "@/lib/sop-builder/api"

export async function GET() {
  const ctx = await requireSopBuilderUser()
  if ("error" in ctx) return ctx.error

  const { data, error } = await ctx.service
    .from("sop_builder_templates")
    .select("*")
    .eq("status", "active")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: data || [] })
}

export async function POST(request: NextRequest) {
  const ctx = await requireSopBuilderTemplateManager()
  if ("error" in ctx) return ctx.error

  const formData = await request.formData()
  const file = formData.get("file")
  const name = cleanText(formData.get("name"))
  const version = cleanText(formData.get("version"))
  const makeDefault = formData.get("is_default") === "true"

  if (!(file instanceof File)) return NextResponse.json({ error: "Template file is required." }, { status: 400 })
  if (!file.name.toLowerCase().endsWith(".docx")) return NextResponse.json({ error: "Only .docx templates are supported." }, { status: 400 })
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Template must be 10MB or smaller." }, { status: 400 })

  const templateId = crypto.randomUUID()
  const path = `sop-builder/templates/${templateId}.docx`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await ctx.service.storage
    .from("documents")
    .upload(path, buffer, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: false,
    })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  if (makeDefault) {
    await ctx.service.from("sop_builder_templates").update({ is_default: false }).eq("is_default", true)
  }

  const { data, error } = await ctx.service
    .from("sop_builder_templates")
    .insert({
      id: templateId,
      name: name || file.name.replace(/\.docx$/i, ""),
      file_path: path,
      file_size_bytes: file.size,
      version: version || null,
      is_default: makeDefault,
      status: "active",
      validation_status: "valid",
      validation_notes: "Basic DOCX validation passed.",
      uploaded_by: ctx.user.id,
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}

