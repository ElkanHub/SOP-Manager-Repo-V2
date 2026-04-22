import { GoogleGenAI } from "@google/genai"
import { logAudit } from "@/lib/audit"

/**
 * Central AI call point for SOP-Guard Pro.
 *
 * All AI features — delta summaries, risk insights, training questionnaire
 * generation, slide-deck generation — route through this module. Changing a
 * model, timeout, default temperature, or retry policy happens here in one
 * place; no route or action should import the provider SDK directly.
 *
 * Current provider: Google Gemini via @google/genai.
 * Swapping providers (Claude, OpenAI, Mistral) would mean replacing the
 * implementation of the two public functions below; callers wouldn't change.
 */

// ── Model registry ───────────────────────────────────────────────────────────
// Caller selects a *role* (fast / quality), not a specific model string, so we
// can upgrade a tier by editing env without touching any callsite.

export type AIModelTier = "fast" | "quality"

const MODEL_DEFAULTS: Record<AIModelTier, string> = {
  fast: "gemini-2.0-flash",
  quality: "gemini-2.5-pro",
}

function resolveModel(tier: AIModelTier): string {
  if (tier === "fast") return process.env.AI_MODEL_FAST || MODEL_DEFAULTS.fast
  return process.env.AI_MODEL_QUALITY || MODEL_DEFAULTS.quality
}

// ── Config ───────────────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 60_000
const DEFAULT_TEMPERATURE = 0.2
const DEFAULT_MAX_OUTPUT = 2048

export function isAiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY)
}

// Lazily instantiate so unit tests without the key don't blow up on import.
let _client: GoogleGenAI | null = null
function getClient(): GoogleGenAI {
  if (_client) return _client
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new AIError("AI_NOT_CONFIGURED", "GEMINI_API_KEY is not set")
  _client = new GoogleGenAI({ apiKey })
  return _client
}

// ── Error type ───────────────────────────────────────────────────────────────

export type AIErrorCode =
  | "AI_NOT_CONFIGURED"
  | "AI_TIMEOUT"
  | "AI_RATE_LIMITED"
  | "AI_UPSTREAM_ERROR"
  | "AI_PARSE_ERROR"
  | "AI_VALIDATION_ERROR"

export class AIError extends Error {
  code: AIErrorCode
  constructor(code: AIErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = "AIError"
  }
}

export function friendlyAiMessage(err: unknown): string {
  if (err instanceof AIError) {
    switch (err.code) {
      case "AI_NOT_CONFIGURED":
        return "AI features are not configured for this workspace."
      case "AI_TIMEOUT":
        return "The AI request took too long. Please try again."
      case "AI_RATE_LIMITED":
        return "The AI service is busy right now. Please wait a moment and try again."
      case "AI_PARSE_ERROR":
        return "The AI response was incomplete. Please try again."
      case "AI_VALIDATION_ERROR":
        return "The AI returned data in an unexpected shape. Please try again."
      default:
        return "We couldn't reach the AI service. Please try again in a moment."
    }
  }
  const msg = err instanceof Error ? err.message : String(err)
  if (/quota|rate|429|503|overloaded/i.test(msg)) return "The AI service is busy right now. Please wait a moment and try again."
  return "The AI service encountered an error. Please try again."
}

// ── Request shapes ───────────────────────────────────────────────────────────

export interface GenerateTextOptions {
  /** Caller-provided label for logs/metrics — e.g. "delta-summary", "risk-insights". */
  purpose: string
  /** Which tier to use. Default "fast". */
  tier?: AIModelTier
  /** User-side prompt. */
  prompt: string
  /** Optional system instruction ("you are …"). */
  systemInstruction?: string
  temperature?: number
  maxOutputTokens?: number
  /** Override request timeout. Default 60s. */
  timeoutMs?: number
  /** If set, the audit log will record this actor as the invoker. */
  actorId?: string | null
  /** Record the call to audit_log. Default true (skip for hot-path noisy calls). */
  audit?: boolean
}

export interface GenerateJsonOptions<T> extends GenerateTextOptions {
  /**
   * Optional runtime check — caller validates the shape. Called with the parsed
   * JSON; throws AIError('AI_VALIDATION_ERROR') if it returns false.
   */
  validate?: (value: unknown) => value is T
  /**
   * Optional Gemini responseSchema (JSON-schema-ish object). When provided,
   * the model is constrained to emit conforming JSON.
   */
  schema?: Record<string, unknown>
}

export interface AIResult<T> {
  data: T
  modelUsed: string
  tier: AIModelTier
  latencyMs: number
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Plain text generation (Markdown, bullets, prose). */
export async function generateText(
  options: GenerateTextOptions,
): Promise<AIResult<string>> {
  if (!isAiConfigured()) {
    throw new AIError("AI_NOT_CONFIGURED", "GEMINI_API_KEY is not set")
  }

  const tier = options.tier ?? "fast"
  const model = resolveModel(tier)
  const started = Date.now()

  try {
    const response = await withTimeout(
      getClient().models.generateContent({
        model,
        contents: options.prompt,
        config: {
          temperature: options.temperature ?? DEFAULT_TEMPERATURE,
          maxOutputTokens: options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT,
          ...(options.systemInstruction ? { systemInstruction: options.systemInstruction } : {}),
        },
      }),
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    )

    const text = (response as any).text ?? ""
    const latencyMs = Date.now() - started

    if (options.audit !== false) {
      await logAiCall({
        purpose: options.purpose,
        model,
        tier,
        latencyMs,
        actorId: options.actorId ?? null,
        success: true,
      })
    }

    return { data: text, modelUsed: model, tier, latencyMs }
  } catch (err) {
    const mapped = mapProviderError(err)
    if (options.audit !== false) {
      await logAiCall({
        purpose: options.purpose,
        model,
        tier,
        latencyMs: Date.now() - started,
        actorId: options.actorId ?? null,
        success: false,
        errorCode: mapped.code,
      })
    }
    throw mapped
  }
}

/** Structured JSON generation. The model is constrained to `application/json`. */
export async function generateJson<T = unknown>(
  options: GenerateJsonOptions<T>,
): Promise<AIResult<T>> {
  if (!isAiConfigured()) {
    throw new AIError("AI_NOT_CONFIGURED", "GEMINI_API_KEY is not set")
  }

  const tier = options.tier ?? "fast"
  const model = resolveModel(tier)
  const started = Date.now()

  try {
    const response = await withTimeout(
      getClient().models.generateContent({
        model,
        contents: options.prompt,
        config: {
          temperature: options.temperature ?? DEFAULT_TEMPERATURE,
          maxOutputTokens: options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT,
          responseMimeType: "application/json",
          ...(options.systemInstruction ? { systemInstruction: options.systemInstruction } : {}),
          ...(options.schema ? { responseSchema: options.schema as any } : {}),
        },
      }),
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    )

    const raw = (response as any).text ?? ""
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
      if (!match) throw new AIError("AI_PARSE_ERROR", "Model did not return JSON")
      try {
        parsed = JSON.parse(match[0])
      } catch {
        throw new AIError("AI_PARSE_ERROR", "Model returned malformed JSON")
      }
    }

    if (options.validate && !options.validate(parsed)) {
      throw new AIError("AI_VALIDATION_ERROR", "AI output failed validation")
    }

    const latencyMs = Date.now() - started
    if (options.audit !== false) {
      await logAiCall({
        purpose: options.purpose,
        model,
        tier,
        latencyMs,
        actorId: options.actorId ?? null,
        success: true,
      })
    }
    return { data: parsed as T, modelUsed: model, tier, latencyMs }
  } catch (err) {
    const mapped = mapProviderError(err)
    if (options.audit !== false) {
      await logAiCall({
        purpose: options.purpose,
        model,
        tier,
        latencyMs: Date.now() - started,
        actorId: options.actorId ?? null,
        success: false,
        errorCode: mapped.code,
      })
    }
    throw mapped
  }
}

// ── Internals ────────────────────────────────────────────────────────────────

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new AIError("AI_TIMEOUT", `AI request exceeded ${ms}ms`)),
      ms,
    )
  })
  try {
    return (await Promise.race([p, timeout])) as T
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function mapProviderError(err: unknown): AIError {
  if (err instanceof AIError) return err
  const msg = err instanceof Error ? err.message : String(err)
  if (/quota|rate|429|503|overloaded/i.test(msg)) {
    return new AIError("AI_RATE_LIMITED", msg)
  }
  return new AIError("AI_UPSTREAM_ERROR", msg)
}

async function logAiCall(entry: {
  purpose: string
  model: string
  tier: AIModelTier
  latencyMs: number
  actorId: string | null
  success: boolean
  errorCode?: AIErrorCode
}) {
  await logAudit({
    actorId: entry.actorId ?? undefined,
    action: entry.success ? "ai_call_succeeded" : "ai_call_failed",
    entityType: "system",
    metadata: {
      purpose: entry.purpose,
      model: entry.model,
      tier: entry.tier,
      latency_ms: entry.latencyMs,
      ...(entry.errorCode ? { error_code: entry.errorCode } : {}),
    },
  })
}
