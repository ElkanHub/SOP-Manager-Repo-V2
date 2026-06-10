"use client"

import { MouseEvent, useRef } from "react"
import { cn } from "@/lib/utils"

export function MarkdownViewer({
  markdown,
  className,
  onTextSelected,
}: {
  markdown: string
  className?: string
  onTextSelected?: (selection: { text: string; sectionHeading: string | null }) => void
}) {
  const blocks = markdown.split(/\n{2,}/).filter((block) => block.trim().length > 0)
  const rootRef = useRef<HTMLElement | null>(null)

  function handleMouseUp(event: MouseEvent<HTMLElement>) {
    if (!onTextSelected) return
    const selection = window.getSelection()
    const text = selection?.toString().trim()
    if (!text || text.length < 3) return
    const target = event.target instanceof HTMLElement ? event.target : null
    const sectionNode = target?.closest("[data-section-heading]")
    const sectionHeading = sectionNode?.getAttribute("data-section-heading") || findPreviousHeading(target)
    onTextSelected({ text, sectionHeading })
  }

  return (
    <article
      ref={rootRef}
      onMouseUp={handleMouseUp}
      className={cn("prose prose-slate max-w-none text-sm dark:prose-invert", className)}
    >
      {blocks.map((block, index) => renderBlock(block, index))}
    </article>
  )
}

function renderBlock(block: string, index: number) {
  const trimmed = block.trim()
  if (trimmed.startsWith("# ")) {
    return <h1 key={index} className="mb-4 text-2xl font-bold tracking-tight text-slate-900">{trimmed.slice(2)}</h1>
  }
  if (trimmed.startsWith("## ")) {
    const heading = trimmed.slice(3)
    return <h2 key={index} data-section-heading={heading} className="mt-6 border-b border-slate-200 pb-1 text-lg font-semibold text-slate-800">{heading}</h2>
  }
  if (trimmed.startsWith("> ")) {
    return (
      <div key={index} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
        {trimmed.replace(/^>\s?/, "")}
      </div>
    )
  }
  if (trimmed.startsWith("|")) {
    return renderTable(trimmed, index)
  }
  if (/^\d+\.\s/m.test(trimmed)) {
    return (
      <ol key={index} className="ml-5 list-decimal space-y-1">
        {trimmed.split("\n").map((line, i) => (
          <li key={i}>{line.replace(/^\d+\.\s/, "")}</li>
        ))}
      </ol>
    )
  }
  if (trimmed.startsWith("- ")) {
    return (
      <ul key={index} className="ml-5 list-disc space-y-1">
        {trimmed.split("\n").map((line, i) => (
          <li key={i}>{line.replace(/^-\s/, "")}</li>
        ))}
      </ul>
    )
  }
  return <p key={index} className="leading-7 text-slate-700 whitespace-pre-wrap">{trimmed}</p>
}

function findPreviousHeading(target: HTMLElement | null) {
  let node = target
  while (node && node.previousElementSibling) {
    node = node.previousElementSibling as HTMLElement
    const heading = node.getAttribute("data-section-heading")
    if (heading) return heading
  }
  return null
}

function renderTable(block: string, index: number) {
  const rows = block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && !/^\|\s*-/.test(line))
    .map((line) => line.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()))

  if (!rows.length) return null

  return (
    <div key={index} className="overflow-x-auto rounded-md border border-slate-200">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-slate-50">
          <tr>
            {rows[0].map((cell, i) => (
              <th key={i} className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-800">{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, i) => (
                <td key={i} className="border-b border-slate-100 px-3 py-2 text-slate-700">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
