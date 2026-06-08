import type { SopBuilderComment, SopBuilderSession, SopOutline } from "./types"

export function buildSystemInstruction(templateContext?: string | null) {
  return `You are a compliance-aware SOP drafting agent for QMS-MANAJA.
You generate DRAFT SOPs only. Never write as if a document is approved, effective, or released.
Every draft must include this exact warning field: "AI-generated draft only. Not approved, not effective, and not released for operational use."
If intake information is insufficient, ask concise clarification questions. Do not invent facts.
Responsibilities must be explicit. If unclear, use [CONFIRM OWNER].
Acceptance criteria, frequencies, limits, regulatory claims, and ownership assignments must be confirmed. If unclear, use [CONFIRM VALUE], [CONFIRM FREQUENCY], or [CONFIRM ACCEPTANCE CRITERIA].
Write procedure steps using clear imperative language such as "Verify", "Record", "Ensure", and "Notify".
Return JSON only for outline, draft, and revision operations. Do not wrap JSON in markdown.
Use a practical industrial compliance tone. Keep wording direct and auditable.
${templateContext ? `Template context:\n${templateContext}` : "No tenant template context is available. Use the QMS-MANAJA default SOP structure."}`
}

export function buildIntakeContext(session: SopBuilderSession) {
  return `SOP title: ${session.title}
Department: ${session.department || "Not provided"}
Purpose: ${session.purpose}
Objective: ${session.objective || "Not provided"}
Scope: ${session.scope_text || "Not provided"}
Intended users: ${session.intended_users || "Not provided"}
Equipment/materials: ${session.equipment || "Not provided"}
Risks/hazards: ${session.risks || "Not provided"}
Records/forms/logbooks: ${session.records_forms || "Not provided"}
Regulatory/internal references: ${session.regulatory_refs || "Not provided"}`
}

export function buildOutlinePrompt(session: SopBuilderSession, messages: Array<{ sender: string; message: string }>) {
  return `Create an SOP outline as JSON from this intake.

${buildIntakeContext(session)}

Conversation so far:
${formatMessages(messages)}

Return this shape:
{
  "title": "string",
  "sections": [
    { "heading": "1. Purpose", "intent": "what this section should cover" }
  ],
  "questions": ["only include if critical information is missing"]
}`
}

export function buildDraftPrompt(session: SopBuilderSession, outline: SopOutline, messages: Array<{ sender: string; message: string }>) {
  return `Generate the full SOP draft as structured JSON from the approved outline.

${buildIntakeContext(session)}

Approved outline:
${JSON.stringify(outline, null, 2)}

Conversation/context:
${formatMessages(messages)}

Return this shape:
{
  "title": "string",
  "ai_draft_warning": "AI-generated draft only. Not approved, not effective, and not released for operational use.",
  "department": "string",
  "sections": [
    { "heading": "1. Purpose", "type": "text", "content": "..." },
    { "heading": "2. Responsibilities", "type": "table", "rows": [["Role", "Responsibility"], ["...", "..."]] },
    { "heading": "3. Procedure", "type": "steps", "steps": ["Verify ...", "Record ..."] }
  ]
}`
}

export function buildRevisionPrompt(args: {
  session: SopBuilderSession
  currentDraftJson: unknown
  comments: SopBuilderComment[]
  extraInstruction?: string
}) {
  const commentText = args.comments.length
    ? args.comments.map((comment, index) => {
        return `COMMENT ${index + 1}
Section: ${comment.section_heading || "Not specified"}
Quoted text: ${comment.quoted_text || "Not specified"}
Instruction: ${comment.comment_text}`
      }).join("\n\n")
    : "No anchored comments were provided."

  return `Revise the current SOP draft and return the complete revised SOP JSON.

${buildIntakeContext(args.session)}

Current draft JSON:
${JSON.stringify(args.currentDraftJson, null, 2)}

Revision comments:
${commentText}

Additional instruction:
${args.extraInstruction || "None"}

Address every comment specifically. Keep confirmation flags where facts are still not confirmed.
Return the same structured SOP JSON shape.`
}

function formatMessages(messages: Array<{ sender: string; message: string }>) {
  if (!messages.length) return "None"
  return messages.map((message) => `${message.sender}: ${message.message}`).join("\n")
}

