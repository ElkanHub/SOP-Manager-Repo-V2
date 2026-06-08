import { NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { requireSopBuilderUser } from "@/lib/sop-builder/access"
import { isRouteError, loadDraftForUser } from "@/lib/sop-builder/api"
import { generateSopDocx } from "@/lib/sop-builder/docx-generator"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireSopBuilderUser()
  if ("error" in ctx) return ctx.error
  const { id } = await params
  const draft = await loadDraftForUser(ctx.service, id)
  if (isRouteError(draft)) return draft

  const buffer = await generateSopDocx(draft.structured_content_json)
  const path = `sop-builder/sessions/${draft.session_id}/draft-${draft.version}.docx`

  const { error: uploadError } = await ctx.service.storage
    .from("documents")
    .upload(path, buffer, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: true,
    })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: signed } = await ctx.service.storage.from("documents").createSignedUrl(path, 3600)

  await ctx.service
    .from("sop_builder_drafts")
    .update({ status: "word_generated", docx_path: path, preview_url: signed?.signedUrl || null })
    .eq("id", draft.id)

  await ctx.service
    .from("sop_builder_sessions")
    .update({ status: "word_generated" })
    .eq("id", draft.session_id)

  await ctx.service.from("sop_builder_exports").insert({
    session_id: draft.session_id,
    draft_id: draft.id,
    exported_by: ctx.user.id,
    file_path: path,
    export_type: "word_generation",
  })

  await logAudit({
    actorId: ctx.user.id,
    action: "sop_builder_word_generated",
    entityType: "system",
    entityId: draft.session_id,
    metadata: { draft_id: draft.id, file_path: path },
  })

  return NextResponse.json({ path, signedUrl: signed?.signedUrl || null })
}

