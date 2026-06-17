import { Document, Packer } from "docx"
import PizZip from "pizzip"
import Docxtemplater from "docxtemplater"
import { buildSopBodyContent } from "./docx-generator"
import type { SopStructuredContent } from "./types"

/**
 * Per-tenant Word template fill (§11.3 of the Collaborative Agent Plan).
 *
 * A tenant uploads their own controlled `.docx` SOP template. The template owns
 * the header/footer, title block, approval table and styles; it marks where the
 * generated body should land with placeholder tokens:
 *   {title}        — the SOP title           (plain text)
 *   {department}   — the owning department    (plain text)
 *   {@sop_body}    — the generated SOP body   (raw OOXML: numbered sections + tables)
 *
 * `{@sop_body}` MUST sit alone in its own paragraph (docxtemplater replaces the
 * whole paragraph with the raw XML). If the template has no body token, this
 * throws so the caller falls back to the in-code default template.
 */
export async function fillTenantTemplate(
  templateBuffer: Buffer,
  content: SopStructuredContent,
): Promise<Buffer> {
  const zip = new PizZip(templateBuffer)
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })

  // getFullText() joins runs, so a token Word split across runs is still seen.
  const fullText = doc.getFullText()
  if (!/sop_body/.test(fullText)) {
    throw new Error("Template has no {@sop_body} placeholder")
  }

  const bodyXml = await buildBodyXml(content)

  doc.render({
    title: content.title,
    department: content.department || "",
    ai_draft_warning: content.ai_draft_warning,
    sop_body: bodyXml,
  })

  return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer
}

/**
 * Validate an uploaded tenant template: it must be a readable .docx and carry
 * the {@sop_body} placeholder. Returns a status + human-readable note stored on
 * the template row so the uploader gets clear feedback.
 */
export function validateTenantTemplate(templateBuffer: Buffer): { valid: boolean; notes: string } {
  try {
    const doc = new Docxtemplater(new PizZip(templateBuffer), { paragraphLoop: true, linebreaks: true })
    const fullText = doc.getFullText()
    if (!/sop_body/.test(fullText)) {
      return { valid: false, notes: "Template is missing the {@sop_body} placeholder where the generated SOP body should go." }
    }
    return { valid: true, notes: "Template contains the {@sop_body} placeholder." }
  } catch (err) {
    return { valid: false, notes: `Could not parse the .docx template: ${err instanceof Error ? err.message : "unknown error"}` }
  }
}

/**
 * Render the SOP body to a raw OOXML string suitable for `{@sop_body}` raw-XML
 * insertion. We build a throwaway docx containing only the body content (reusing
 * the tested `buildSopBodyContent`), then lift the `<w:body>` children out of it.
 * The runs are fully self-contained (inline bold/size/borders, manual numbering),
 * so they render correctly inside the tenant document without external styles.
 */
async function buildBodyXml(content: SopStructuredContent): Promise<string> {
  const bodyDoc = new Document({
    creator: "QMS-MANAJA",
    sections: [{ properties: {}, children: buildSopBodyContent(content) }],
  })
  const buffer = await Packer.toBuffer(bodyDoc)
  const documentXml = new PizZip(buffer).file("word/document.xml")?.asText() || ""

  const open = documentXml.indexOf("<w:body>")
  const close = documentXml.lastIndexOf("</w:body>")
  if (open === -1 || close === -1) return ""
  let inner = documentXml.slice(open + "<w:body>".length, close)

  // Drop the trailing section properties — the tenant template owns page setup.
  inner = inner.replace(/<w:sectPr[\s\S]*?<\/w:sectPr>/g, "").replace(/<w:sectPr[^>]*\/>/g, "")
  return inner.trim()
}
