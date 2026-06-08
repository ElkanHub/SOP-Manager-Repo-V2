import type { SopOutline, SopStructuredContent } from "./types"

const DRAFT_WARNING =
  "AI-generated draft only. Not approved, not effective, and not released for operational use."

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
    title: safeText(raw.title) || fallbackTitle,
    ai_draft_warning: safeText(raw.ai_draft_warning) || DRAFT_WARNING,
    department: safeText(raw.department) || null,
    sections: sections.map(normalizeSection).filter(Boolean) as SopStructuredContent["sections"],
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
  const heading = safeText(raw.heading)
  const type = safeText(raw.type)
  if (!heading) return null

  if (type === "steps") {
    const steps = Array.isArray(raw.steps) ? raw.steps.map(safeText).filter(Boolean) : []
    return { heading, type: "steps", steps }
  }

  if (type === "table") {
    const rows = Array.isArray(raw.rows)
      ? raw.rows
          .filter(Array.isArray)
          .map((row) => (row as unknown[]).map(safeText))
          .filter((row) => row.some(Boolean))
      : []
    return { heading, type: "table", rows }
  }

  return { heading, type: "text", content: safeText(raw.content) }
}

function safeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

