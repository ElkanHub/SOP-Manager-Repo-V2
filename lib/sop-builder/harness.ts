import { AIError, friendlyAiMessage, generateJson } from "@/lib/ai/client"
import { logAudit } from "@/lib/audit"
import {
  buildDraftPrompt,
  buildOutlinePrompt,
  buildRevisionPrompt,
  buildSystemInstruction,
} from "./prompts"
import {
  normalizeOutline,
  normalizeStructuredSop,
  structuredSopToMarkdown,
} from "./markdown"
import type {
  SopBuilderComment,
  SopBuilderDraft,
  SopBuilderSession,
  SopOutline,
  SopStructuredContent,
} from "./types"

type ServiceClient = Awaited<ReturnType<typeof import("@/lib/supabase/server").createServiceClient>>

export class SopBuilderHarness {
  constructor(
    private service: ServiceClient,
    private actorId: string,
  ) {}

  async generateOutline(session: SopBuilderSession) {
    const messages = await this.loadMessages(session.id)
    const { data, modelUsed } = await generateJson<unknown>({
      purpose: "sop-builder-outline",
      tier: "quality",
      prompt: buildOutlinePrompt(session, messages),
      systemInstruction: buildSystemInstruction(),
      maxOutputTokens: 2048,
      timeoutMs: 90_000,
      actorId: this.actorId,
    })

    const outline = normalizeOutline(data, session.title)
    const markdown = `# ${outline.title}\n\n${outline.sections.map((section, index) => `${index + 1}. ${section.heading}\n   ${section.intent}`).join("\n\n")}`
    const draft = await this.createDraft(session, {
      outline,
      content: {
        title: outline.title,
        ai_draft_warning: "AI-generated draft only. Not approved, not effective, and not released for operational use.",
        department: session.department,
        sections: [],
      },
      markdown,
      modelUsed,
      status: "ready",
    })

    await this.service
      .from("sop_builder_sessions")
      .update({ status: outline.questions?.length ? "awaiting_clarification" : "outline_ready", active_draft_id: draft.id })
      .eq("id", session.id)

    if (outline.questions?.length) {
      await this.service.from("sop_builder_messages").insert(
        outline.questions.map((question) => ({
          session_id: session.id,
          sender: "agent",
          message: question,
          message_type: "clarification_question",
          related_draft_id: draft.id,
        }))
      )
    }

    await logAudit({
      actorId: this.actorId,
      action: "sop_builder_outline_generated",
      entityType: "system",
      entityId: session.id,
      metadata: { draft_id: draft.id, question_count: outline.questions?.length || 0 },
    })

    return draft
  }

  async generateDraft(session: SopBuilderSession, outline: SopOutline) {
    const messages = await this.loadMessages(session.id)
    const { data, modelUsed } = await generateJson<unknown>({
      purpose: "sop-builder-draft",
      tier: "quality",
      prompt: buildDraftPrompt(session, outline, messages),
      systemInstruction: buildSystemInstruction(),
      maxOutputTokens: 8192,
      timeoutMs: 120_000,
      actorId: this.actorId,
    })

    const content = ensureSections(normalizeStructuredSop(data, session.title), session)
    const draft = await this.createDraft(session, {
      outline,
      content,
      markdown: structuredSopToMarkdown(content),
      modelUsed,
      status: "ready",
    })

    await this.service
      .from("sop_builder_sessions")
      .update({ status: "draft_ready", active_draft_id: draft.id })
      .eq("id", session.id)

    await logAudit({
      actorId: this.actorId,
      action: "sop_builder_draft_generated",
      entityType: "system",
      entityId: session.id,
      metadata: { draft_id: draft.id, version: draft.version },
    })

    return draft
  }

  async reviseDraft(args: {
    session: SopBuilderSession
    currentDraft: SopBuilderDraft
    comments: SopBuilderComment[]
    instruction?: string
  }) {
    const { data, modelUsed } = await generateJson<unknown>({
      purpose: "sop-builder-revision",
      tier: "quality",
      prompt: buildRevisionPrompt({
        session: args.session,
        currentDraftJson: args.currentDraft.structured_content_json,
        comments: args.comments,
        extraInstruction: args.instruction,
      }),
      systemInstruction: buildSystemInstruction(),
      maxOutputTokens: 8192,
      timeoutMs: 120_000,
      actorId: this.actorId,
    })

    const content = ensureSections(normalizeStructuredSop(data, args.session.title), args.session)
    const draft = await this.createDraft(args.session, {
      outline: args.currentDraft.outline_json || null,
      content,
      markdown: structuredSopToMarkdown(content),
      modelUsed,
      status: "ready",
      changeSummary: args.comments.length
        ? `Revised from ${args.comments.length} user comment${args.comments.length === 1 ? "" : "s"}.`
        : "Revised from chat instruction.",
    })

    await this.service
      .from("sop_builder_drafts")
      .update({ status: "superseded" })
      .eq("id", args.currentDraft.id)

    if (args.comments.length > 0) {
      await this.service
        .from("sop_builder_comments")
        .update({ status: "resolved", resolved_by_draft_id: draft.id })
        .in("id", args.comments.map((comment) => comment.id))
    }

    if (args.instruction?.trim()) {
      await this.service.from("sop_builder_messages").insert({
        session_id: args.session.id,
        sender: "user",
        message: args.instruction.trim(),
        message_type: "revision_instruction",
        related_draft_id: args.currentDraft.id,
      })
    }

    await this.service.from("sop_builder_messages").insert({
      session_id: args.session.id,
      sender: "agent",
      message: draft.change_summary || "Revision completed.",
      message_type: "revision_summary",
      related_draft_id: draft.id,
    })

    await this.service
      .from("sop_builder_sessions")
      .update({ status: "draft_ready", active_draft_id: draft.id })
      .eq("id", args.session.id)

    await logAudit({
      actorId: this.actorId,
      action: "sop_builder_draft_revised",
      entityType: "system",
      entityId: args.session.id,
      metadata: { draft_id: draft.id, previous_draft_id: args.currentDraft.id, comment_count: args.comments.length },
    })

    return draft
  }

  private async loadMessages(sessionId: string) {
    const { data } = await this.service
      .from("sop_builder_messages")
      .select("sender, message")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })

    return (data || []) as Array<{ sender: string; message: string }>
  }

  private async createDraft(
    session: SopBuilderSession,
    draft: {
      outline: SopOutline | null
      content: SopStructuredContent
      markdown: string
      modelUsed: string
      status: string
      changeSummary?: string
    },
  ): Promise<SopBuilderDraft> {
    const { data: latest } = await this.service
      .from("sop_builder_drafts")
      .select("version")
      .eq("session_id", session.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle()

    const version = ((latest?.version as number | undefined) || 0) + 1
    const { data, error } = await this.service
      .from("sop_builder_drafts")
      .insert({
        session_id: session.id,
        organization_id: session.organization_id || null,
        version,
        outline_json: draft.outline,
        structured_content_json: draft.content,
        markdown_content: draft.markdown,
        change_summary: draft.changeSummary || null,
        model_used: draft.modelUsed,
        status: draft.status,
      })
      .select("*")
      .single()

    if (error || !data) {
      throw new AIError("AI_UPSTREAM_ERROR", error?.message || "Draft could not be saved")
    }

    return data as SopBuilderDraft
  }
}

export function sopBuilderErrorMessage(error: unknown) {
  return friendlyAiMessage(error)
}

function ensureSections(content: SopStructuredContent, session: SopBuilderSession): SopStructuredContent {
  if (content.sections.length > 0) return content
  return {
    ...content,
    sections: [
      { heading: "1. Purpose", type: "text", content: session.purpose },
      { heading: "2. Scope", type: "text", content: session.scope_text || "[CONFIRM VALUE]" },
      {
        heading: "3. Responsibilities",
        type: "table",
        rows: [["Role", "Responsibility"], ["[CONFIRM OWNER]", "Review and approve assigned SOP responsibilities."]],
      },
      { heading: "4. Procedure", type: "steps", steps: ["Verify prerequisites. [CONFIRM VALUE]", "Record required evidence. [CONFIRM VALUE]"] },
      { heading: "5. Records and References", type: "text", content: session.records_forms || session.regulatory_refs || "[CONFIRM VALUE]" },
      { heading: "6. Revision History", type: "table", rows: [["Version", "Date", "Change"], ["00", "Draft", "AI-generated draft"]] },
    ],
  }
}

