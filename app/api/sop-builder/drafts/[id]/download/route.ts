import { NextResponse } from "next/server"
import { requireSopBuilderUser } from "@/lib/sop-builder/access"
import { isRouteError, loadDraftForUser } from "@/lib/sop-builder/api"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireSopBuilderUser()
  if ("error" in ctx) return ctx.error
  const { id } = await params
  const draft = await loadDraftForUser(ctx.service, id)
  if (isRouteError(draft)) return draft
  if (!draft.docx_path) return NextResponse.json({ error: "Generate the Word file before downloading." }, { status: 400 })

  const { data, error } = await ctx.service.storage.from("documents").createSignedUrl(draft.docx_path, 300, {
    download: `${sanitizeFileName(draft.structured_content_json.title || "AI SOP Draft")}.docx`,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await ctx.service.from("sop_builder_exports").insert({
    session_id: draft.session_id,
    draft_id: draft.id,
    exported_by: ctx.user.id,
    file_path: draft.docx_path,
    export_type: "download",
  })

  return NextResponse.json({ signedUrl: data.signedUrl })
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-z0-9-_ ]/gi, "").trim().replace(/\s+/g, "-") || "AI-SOP-Draft"
}

