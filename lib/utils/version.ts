export function incrementVersion(current: string): string {
    const clean = current.trim().replace(/^v/i, "")
    const legacyMatch = clean.match(/^(\d+)\.(\d+)$/)
    const revision = legacyMatch
        ? Math.max(0, Number.parseInt(legacyMatch[1], 10) - 1 + Number.parseInt(legacyMatch[2], 10))
        : Number.parseInt(clean, 10)

    const next = Number.isFinite(revision) ? revision + 1 : 1
    return String(next).padStart(2, "0")
}
