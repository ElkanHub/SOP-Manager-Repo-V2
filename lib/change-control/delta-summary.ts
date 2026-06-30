import "server-only"
import { createServiceClient } from "@/lib/supabase/server"
import { generateText } from "@/lib/ai/client"
// @ts-ignore — mammoth ships no types
import * as mammoth from "mammoth"
import { diff_match_patch } from "diff-match-patch"

/**
 * Core "what changed between two SOP versions" summariser.
 *
 * Called directly by the `generateDeltaSummary` server action (no internal HTTP
 * hop). The model is NOT asked to find differences in two walls of text — we
 * compute the exact textual diff first with diff-match-patch and feed only the
 * changed segments. That keeps the summary grounded (no invented changes),
 * smaller (fewer tokens), and reproducible.
 */

// Cap the diff text we hand the model so a huge revision can't blow the prompt.
const MAX_DIFF_CHARS = 12_000

export async function computeDeltaSummary(opts: {
  oldFileUrl: string | null
  newFileUrl: string
  actorId?: string | null
}): Promise<string> {
  const service = await createServiceClient()

  const newFile = await service.storage.from("documents").download(opts.newFileUrl)
  if (newFile.error || !newFile.data) {
    throw new Error("Failed to retrieve target document")
  }
  const newText = (
    await mammoth.extractRawText({ buffer: Buffer.from(await newFile.data.arrayBuffer()) })
  ).value

  let oldText = ""
  if (opts.oldFileUrl) {
    const oldFile = await service.storage.from("documents").download(opts.oldFileUrl)
    if (!oldFile.error && oldFile.data) {
      oldText = (
        await mammoth.extractRawText({ buffer: Buffer.from(await oldFile.data.arrayBuffer()) })
      ).value
    }
  }

  const prompt = oldText ? buildDiffPrompt(changedSegments(oldText, newText)) : buildNewDocPrompt(newText)

  const { data } = await generateText({
    purpose: "delta-summary",
    tier: "quality",
    prompt,
    // Low temperature: this is an extractive, compliance-relevant fact, not a
    // creative writing task. Signers act on it.
    temperature: 0.2,
    maxOutputTokens: 600,
    actorId: opts.actorId ?? null,
  })

  return data
}

/** Build a compact [ADDED]/[REMOVED] view of the real diff for grounding. */
function changedSegments(oldText: string, newText: string): string {
  const dmp = new diff_match_patch()
  dmp.Diff_Timeout = 2 // seconds — bound the cost on very large docs
  const diffs = dmp.diff_main(oldText, newText)
  dmp.diff_cleanupSemantic(diffs)

  const lines: string[] = []
  for (const [op, text] of diffs) {
    const trimmed = text.replace(/\s+/g, " ").trim()
    if (!trimmed) continue
    if (op === 1) lines.push(`[ADDED] ${trimmed}`)
    else if (op === -1) lines.push(`[REMOVED] ${trimmed}`)
  }

  let out = lines.join("\n")
  if (out.length > MAX_DIFF_CHARS) {
    out = out.slice(0, MAX_DIFF_CHARS) + "\n…(diff truncated — review the full document delta)…"
  }
  return out || "(no substantive textual differences detected)"
}

function buildDiffPrompt(segments: string): string {
  return `You are a strict QA technical reviewer for a pharmaceutical quality system. Below is the EXACT computed difference between the previous and new version of a controlled SOP. Lines marked [ADDED] are new text; lines marked [REMOVED] were deleted.

Summarise ONLY what materially changed, in 3-6 short bullet points using "• ". Rules:
- Base every bullet strictly on the diff below. Do NOT invent changes that are not shown.
- Focus on substantive changes to procedure steps, responsibilities, limits/specifications, safety, or policy. Ignore pure formatting or grammar.
- End with one bullet starting "• Re-training impact:" stating whether operators likely need re-training because of these changes and why. If not, write "• Re-training impact: none expected."

COMPUTED DIFF:
${segments}

Provide the bullets using "• " only:`
}

function buildNewDocPrompt(newText: string): string {
  const body = newText.replace(/\s+/g, " ").trim().slice(0, MAX_DIFF_CHARS)
  return `You are a strict QA technical reviewer. No previous version of this SOP exists, so summarise the new document itself.

In 3-5 short bullet points using "• ", summarise the core operational purpose and the key steps/responsibilities of this SOP. Base it strictly on the text provided; do not invent content.

SOP TEXT:
${body}

Provide the bullets using "• " only:`
}
