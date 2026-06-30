/**
 * Server-safe HTML sanitizer for mammoth-rendered .docx output.
 *
 * There is no DOM server-side and we don't want isomorphic-dompurify in the
 * server bundle, so this mirrors the regex strip already used by the approvals
 * preview route. It removes the executable/active vectors mammoth could
 * theoretically emit while leaving structural tags (p, h1-h3, ul/ol/li, table,
 * strong/em, and diff <ins>/<del>) intact so previews and diffs still render.
 *
 * ponytail: regex sanitizer kept for parity with existing server routes; swap
 * to isomorphic-dompurify only if a crafted-docx XSS ever proves it insufficient.
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript:/gi, "")
}
