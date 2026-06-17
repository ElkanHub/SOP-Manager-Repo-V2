/**
 * Incremental extractor for the agent turn's streamed JSON.
 *
 * The model emits a single JSON object whose first keys are "action" then
 * "reply" (enforced by the prompt). We don't want to wait for the whole object
 * before showing anything, so this parser is fed each streamed text chunk and:
 *   - resolves `action` as soon as that field lands (drives the status line), and
 *   - emits decoded `reply` characters as they arrive (streamed to the chat).
 *
 * The rest of the object (document / section_edit) is parsed normally from the
 * complete buffer once the stream closes — this only handles the live preview.
 */
export class AgentTurnStreamParser {
  private buf = ""
  private replyContentStart = -1 // index in buf where the reply string's content begins
  private replyClosed = false
  private emitted = 0 // count of decoded reply chars already returned as deltas
  action: string | null = null

  /**
   * Feed the next streamed chunk. Returns any newly-resolved action and the
   * next slice of decoded reply text to append to the visible bubble.
   */
  push(chunk: string): { replyDelta: string; actionResolved: string | null } {
    this.buf += chunk
    let actionResolved: string | null = null

    if (this.action === null) {
      const m = this.buf.match(/"action"\s*:\s*"([a-z_]+)"/)
      if (m) {
        this.action = m[1]
        actionResolved = m[1]
      }
    }

    if (this.replyContentStart === -1) {
      const m = this.buf.match(/"reply"\s*:\s*"/)
      if (m) this.replyContentStart = m.index! + m[0].length
    }

    let replyDelta = ""
    if (this.replyContentStart !== -1 && !this.replyClosed) {
      const { text, closed } = decodeJsonString(this.buf, this.replyContentStart)
      if (text.length > this.emitted) {
        replyDelta = text.slice(this.emitted)
        this.emitted = text.length
      }
      if (closed) this.replyClosed = true
    }

    return { replyDelta, actionResolved }
  }
}

/**
 * Decode a JSON string body starting at `start` (just after the opening quote)
 * up to the closing unescaped quote. Stops early — without consuming a dangling
 * escape — when the buffer ends mid-escape, so the next chunk completes it.
 */
function decodeJsonString(buf: string, start: number): { text: string; closed: boolean } {
  let out = ""
  let i = start
  while (i < buf.length) {
    const ch = buf[i]
    if (ch === "\\") {
      // Need at least the escape char (and 4 hex digits for \u) available.
      if (i + 1 >= buf.length) break
      const esc = buf[i + 1]
      if (esc === "u") {
        if (i + 5 >= buf.length) break
        const hex = buf.slice(i + 2, i + 6)
        if (/^[0-9a-fA-F]{4}$/.test(hex)) {
          out += String.fromCharCode(parseInt(hex, 16))
          i += 6
          continue
        }
        // malformed — emit literally and move on
        out += esc
        i += 2
        continue
      }
      out += ESCAPES[esc] ?? esc
      i += 2
      continue
    }
    if (ch === '"') {
      return { text: out, closed: true }
    }
    out += ch
    i += 1
  }
  return { text: out, closed: false }
}

const ESCAPES: Record<string, string> = {
  n: "\n",
  t: "\t",
  r: "\r",
  b: "\b",
  f: "\f",
  "/": "/",
  '"': '"',
  "\\": "\\",
}
