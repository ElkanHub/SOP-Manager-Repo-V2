import type { SopOutline, SopStructuredContent } from "./types"

const DRAFT_WARNING =
  "AI-generated draft only. Not approved, not effective, and not released for operational use."

// Output bounds — defence against runaway model output (cost + DoS). The model
// is asked for a reasonable SOP; anything past these limits is truncated, not
// rejected, so a slightly over-long draft still renders.
const MAX_SECTIONS = 25
const MAX_STEPS = 60
const MAX_TABLE_ROWS = 60
const MAX_TABLE_COLS = 10
const MAX_TITLE = 300
const MAX_HEADING = 200
const MAX_CONTENT = 20_000
const MAX_STEP = 4_000
const MAX_CELL = 2_000

export function structuredSopToMarkdown(content: SopStructuredContent): string {
  const lines: string[] = []
  lines.push(`# ${content.title}`)
  lines.push("")
  lines.push(`> ${content.ai_draft_warning || DRAFT_WARNING}`)
  lines.push("")

  for (const section of content.sections || []) {
    lines.push(`## ${section.heading}`)
    lines.push("")
    if (section.type === "steps") {
      section.steps.forEach((step, index) => {
        lines.push(`${index + 1}. ${step}`)
      })
    } else if (section.type === "table") {
      const rows = section.rows.filter((row) => row.length > 0)
      if (rows.length > 0) {
        const maxCells = Math.max(...rows.map((row) => row.length))
        const normalized = rows.map((row) => Array.from({ length: maxCells }, (_, i) => row[i] || ""))
        lines.push(`| ${normalized[0].join(" | ")} |`)
        lines.push(`| ${normalized[0].map(() => "---").join(" | ")} |`)
        normalized.slice(1).forEach((row) => lines.push(`| ${row.join(" | ")} |`))
      }
    } else {
      lines.push(section.content)
    }
    lines.push("")
  }

  return lines.join("\n").trim() + "\n"
}

export function outlineToMarkdown(outline: SopOutline): string {
  const lines = [`# ${outline.title}`, "", "> Outline for user review.", ""]
  outline.sections.forEach((section, index) => {
    lines.push(`${index + 1}. **${section.heading}**`)
    lines.push(`   ${section.intent}`)
  })
  if (outline.questions?.length) {
    lines.push("", "## Clarifications")
    outline.questions.forEach((question) => lines.push(`- ${question}`))
  }
  return lines.join("\n")
}

export function normalizeStructuredSop(value: unknown, fallbackTitle: string): SopStructuredContent {
  const raw = typeof value === "object" && value !== null ? value as Record<string, unknown> : {}
  const sections = Array.isArray(raw.sections) ? raw.sections : []

  return {
    title: clamp(safeText(raw.title) || fallbackTitle, MAX_TITLE),
    ai_draft_warning: safeText(raw.ai_draft_warning) || DRAFT_WARNING,
    department: clamp(safeText(raw.department), MAX_HEADING) || null,
    sections: (sections.slice(0, MAX_SECTIONS).map(normalizeSection).filter(Boolean) as SopStructuredContent["sections"]),
  }
}

export function normalizeOutline(value: unknown, fallbackTitle: string): SopOutline {
  const raw = typeof value === "object" && value !== null ? value as Record<string, unknown> : {}
  const sections = Array.isArray(raw.sections) ? raw.sections : []
  const questions = Array.isArray(raw.questions)
    ? raw.questions.map(safeText).filter(Boolean)
    : []

  return {
    title: safeText(raw.title) || fallbackTitle,
    sections: sections.map((item) => {
      const section = typeof item === "object" && item !== null ? item as Record<string, unknown> : {}
      return {
        heading: safeText(section.heading) || "Section",
        intent: safeText(section.intent) || "Draft this section from the approved intake.",
      }
    }),
    questions,
  }
}

function normalizeSection(value: unknown): SopStructuredContent["sections"][number] | null {
  const raw = typeof value === "object" && value !== null ? value as Record<string, unknown> : {}
  const heading = clamp(safeText(raw.heading), MAX_HEADING)
  const type = safeText(raw.type)
  if (!heading) return null

  if (type === "steps") {
    const steps = Array.isArray(raw.steps)
      ? raw.steps.map((s) => clamp(safeText(s), MAX_STEP)).filter(Boolean).slice(0, MAX_STEPS)
      : []
    return { heading, type: "steps", steps }
  }

  if (type === "table") {
    const rows = Array.isArray(raw.rows)
      ? raw.rows
          .filter(Array.isArray)
          .slice(0, MAX_TABLE_ROWS)
          .map((row) => (row as unknown[]).slice(0, MAX_TABLE_COLS).map((c) => clamp(safeText(c), MAX_CELL)))
          .filter((row) => row.some(Boolean))
      : []
    return { heading, type: "table", rows }
  }

  return { heading, type: "text", content: clamp(safeText(raw.content), MAX_CONTENT) }
}

function safeText(value: unknown): string {
  if (typeof value !== "string") return ""
  // Strip control characters (except newline/tab) that can corrupt the docx/markdown render.
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim()
}

function clamp(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) : text
}

