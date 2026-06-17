import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  PageNumber,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx"
import type { SopSection, SopStructuredContent } from "./types"

// Clean, formal SOP document: black text only, appropriate spacing, plain
// bordered tables where needed, controlled header/footer with Page X of Y.
// No decorative colour.

const LINE = { style: BorderStyle.SINGLE, size: 2, color: "000000" }
const CELL_BORDERS = { top: LINE, bottom: LINE, left: LINE, right: LINE }

export async function generateSopDocx(content: SopStructuredContent) {
  const body: Array<Paragraph | Table> = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: content.title, bold: true, size: 32 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: content.ai_draft_warning, italics: true, size: 18 })],
    }),
    approvalBlock(),
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    ...content.sections.flatMap(sectionToDocx),
  ]

  if (!content.sections.some((section) => /revision history/i.test(section.heading))) {
    body.push(headingPara("Revision History"))
    body.push(buildTable([
      ["Version", "Date", "Change", "Change Control No."],
      ["00", "[CONFIRM VALUE]", "Initial AI draft", "[CONFIRM VALUE]"],
    ]))
  }

  const document = new Document({
    creator: "QMS-MANAJA",
    title: content.title,
    description: "AI-generated draft SOP",
    sections: [{
      properties: {},
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: `${content.department || "QMS"} · ${content.title}`, size: 16 })],
              border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000", space: 4 } },
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "Page ", size: 16 }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16 }),
                new TextRun({ text: " of ", size: 16 }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16 }),
              ],
            }),
          ],
        }),
      },
      children: body,
    }],
  })

  return Packer.toBuffer(document)
}

function approvalBlock() {
  return buildTable([
    ["Action", "Name", "Designation", "Sign & Date"],
    ["Prepared By", "", "", ""],
    ["Reviewed By (User HOD)", "", "", ""],
    ["Reviewed By (QA)", "", "", ""],
    ["Approved By (QA Head)", "", "", ""],
  ])
}

function headingPara(text: string) {
  return new Paragraph({
    spacing: { before: 260, after: 100 },
    children: [new TextRun({ text, bold: true, size: 24 })],
  })
}

function sectionToDocx(section: SopSection): Array<Paragraph | Table> {
  const heading = headingPara(section.heading)

  if (section.type === "steps") {
    return [
      heading,
      ...section.steps.map((step, index) =>
        new Paragraph({
          spacing: { after: 100 },
          indent: { left: 360 },
          children: [new TextRun(`${index + 1}. ${step}`)],
        }),
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
      }),
    ),
  ]
}

function buildTable(rows: string[][]) {
  const normalized = rows.length > 0 ? rows : [["Item", "Detail"], ["[CONFIRM VALUE]", "[CONFIRM VALUE]"]]
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: normalized.map((row, rowIndex) =>
      new TableRow({
        tableHeader: rowIndex === 0,
        children: row.map((cell) =>
          new TableCell({
            borders: CELL_BORDERS,
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: cell || " ", bold: rowIndex === 0 })],
              }),
            ],
          }),
        ),
      }),
    ),
  })
}
