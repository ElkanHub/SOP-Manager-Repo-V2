import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx"
import type { SopSection, SopStructuredContent } from "./types"

export async function generateSopDocx(content: SopStructuredContent) {
  const children = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: content.title, bold: true })],
    }),
    new Paragraph({
      spacing: { after: 240 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: content.ai_draft_warning,
          bold: true,
          color: "B45309",
        }),
      ],
    }),
    ...content.sections.flatMap(sectionToDocx),
    revisionHistoryFallback(content.sections),
  ].filter(Boolean) as Array<Paragraph | Table>

  const document = new Document({
    creator: "QMS-MANAJA",
    description: "AI-generated draft SOP",
    title: content.title,
    sections: [{
      properties: {},
      children,
    }],
  })

  return Packer.toBuffer(document)
}

function sectionToDocx(section: SopSection): Array<Paragraph | Table> {
  const heading = new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text: section.heading, bold: true })],
  })

  if (section.type === "steps") {
    return [
      heading,
      ...section.steps.map((step, index) =>
        new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun(`${index + 1}. ${step}`)],
        })
      ),
    ]
  }

  if (section.type === "table") {
    return [heading, buildTable(section.rows)]
  }

  return [
    heading,
    ...section.content.split(/\n{2,}/).map((paragraph) =>
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun(paragraph.replace(/\n/g, " "))],
      })
    ),
  ]
}

function buildTable(rows: string[][]) {
  const normalized = rows.length > 0 ? rows : [["Item", "Detail"], ["[CONFIRM VALUE]", "[CONFIRM VALUE]"]]
  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    rows: normalized.map((row, rowIndex) =>
      new TableRow({
        children: row.map((cell) =>
          new TableCell({
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" },
            },
            children: [
              new Paragraph({
                children: [new TextRun({ text: cell || " ", bold: rowIndex === 0 })],
              }),
            ],
          })
        ),
      })
    ),
  })
}

function revisionHistoryFallback(sections: SopSection[]) {
  const hasRevisionHistory = sections.some((section) => /revision history/i.test(section.heading))
  if (hasRevisionHistory) return null
  return buildTable([
    ["Version", "Date", "Change"],
    ["00", "Draft", "AI-generated draft"],
  ])
}

