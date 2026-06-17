import { generateSopDocx } from "./docx-generator"
import { fillTenantTemplate } from "./docx-template-fill"
import type { SopStructuredContent } from "./types"

type ServiceClient = Awaited<ReturnType<typeof import("@/lib/supabase/server").createServiceClient>>

/**
 * Render the SOP draft to a Word buffer. If the session selects a tenant
 * template — or the workspace has a default active template — and that template
 * carries the `{@sop_body}` placeholder, the body is inserted into it. Anything
 * missing or malformed falls back to the clean in-code default template, so a
 * download never fails on a template problem.
 */
export async function renderSopWord(
  service: ServiceClient,
  sessionId: string,
  content: SopStructuredContent,
): Promise<{ buffer: Buffer; usedTemplateId: string | null }> {
  try {
    const template = await resolveTemplate(service, sessionId)
    if (template?.file_path) {
      const { data, error } = await service.storage.from("documents").download(template.file_path)
      if (!error && data) {
        const templateBuffer = Buffer.from(await data.arrayBuffer())
        const buffer = await fillTenantTemplate(templateBuffer, content)
        return { buffer, usedTemplateId: template.id }
      }
    }
  } catch (err) {
    // Template missing the token, malformed, or storage error → fall back.
    console.error("[sop-builder] tenant template fill failed, using default:", err instanceof Error ? err.message : err)
  }

  const buffer = await generateSopDocx(content)
  return { buffer, usedTemplateId: null }
}

async function resolveTemplate(service: ServiceClient, sessionId: string) {
  const { data: session } = await service
    .from("sop_builder_sessions")
    .select("selected_template_id")
    .eq("id", sessionId)
    .maybeSingle()

  const selectedId = (session as { selected_template_id?: string | null } | null)?.selected_template_id || null

  if (selectedId) {
    const { data } = await service
      .from("sop_builder_templates")
      .select("id, file_path")
      .eq("id", selectedId)
      .eq("status", "active")
      .maybeSingle()
    if (data) return data as { id: string; file_path: string }
  }

  const { data: fallback } = await service
    .from("sop_builder_templates")
    .select("id, file_path")
    .eq("status", "active")
    .eq("is_default", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return (fallback as { id: string; file_path: string } | null) || null
}
