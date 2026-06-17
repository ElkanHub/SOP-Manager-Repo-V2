/**
 * AI credit cost per purpose — the single source of truth for metering.
 *
 * Mirrors the pricing model (`V2DOCS/v2.2/strategy/QMS-MANAJA_Pricing-Model.md`).
 * Credits are charged ONLY on a successful call. A failed call records a usage
 * event with 0 credits for observability.
 *
 * One fixed credit cost per action (deterministic, easy to communicate to a
 * tenant) — actual token usage is recorded alongside for cost analysis.
 */
export const AI_CREDIT_COST: Record<string, number> = {
  "delta-summary": 3,
  "risk-insights": 5,
  "training-questionnaire": 8,
  "training-slides": 10,
  "sop-builder-outline": 6,
  "sop-builder-draft": 12,
  "sop-builder-revision": 6,
  // Collaborative agent turn — charged per resolved action:
  "sop-builder-discuss": 1,
  "sop-builder-revise-section": 3,
  "sop-builder-revise-full": 6,
  "sop-builder-word": 0,
}

/** Credits charged for a given purpose. Unknown purposes cost 1 (safe default). */
export function creditCostFor(purpose: string): number {
  return AI_CREDIT_COST[purpose] ?? 1
}
