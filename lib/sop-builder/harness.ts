import { AIError, friendlyAiMessage, generateJson } from "@/lib/ai/client"
import { logAudit } from "@/lib/audit"
import {
  buildAgentSystemInstruction,
  buildAgentTurnPrompt,
  buildChatRevisionPrompt,
  buildDraftPrompt,
  buildFullDraftPrompt,
  buildOutlinePrompt,
  buildRevisionPrompt,
  buildSystemInstruction,
} from "./prompts"
import {
  normalizeOutline,
  normalizeStructuredSop,
  structuredSopToMarkdown,
} from "./markdown"
import { recordAiUsage } from "@/lib/ai/usage"
import { creditCostFor } from "@/lib/ai/credits"
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

  /**
   * One conversational turn. The first turn produces a complete draft directly
   * from the conversation; later turns revise the live draft from the user's
   * message. This is what powers the single-chat workspace.
   */
  async chatTurn(session: SopBuilderSession, userMessage: string): Promise<{ draft: SopBuilderDraft; assistantMessage: string }> {
    const messages = await this.loadMessages(session.id)

    const { data: latestDraft } = await this.service
      .from("sop_builder_drafts")
      .select("*")
      .eq("session_id", session.id)
      .neq("status", "superseded")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!latestDraft) {
      const { data, modelUsed } = await generateJson<unknown>({
        purpose: "sop-builder-draft",
        tier: "quality",
        prompt: buildFullDraftPrompt(session, messages),
        systemInstruction: buildSystemInstruction(),
        maxOutputTokens: 8192,
        timeoutMs: 120_000,
        actorId: this.actorId,
      })
      const content = ensureSections(normalizeStructuredSop(data, session.title), session)
      const draft = await this.createDraft(session, {
        outline: null,
        content,
        markdown: structuredSopToMarkdown(content),
        modelUsed,
        status: "ready",
      })
      await this.service
        .from("sop_builder_sessions")
        .update({ status: "draft_ready", active_draft_id: draft.id })
        .eq("id", session.id)

      const assistantMessage = `I've drafted "${content.title}" with ${content.sections.length} sections — it's in the document panel on the right. Anything I had to assume is flagged with [CONFIRM …]. Tell me what to refine: add detail to a step, adjust responsibilities, tighten the scope — whatever you need.`
      await this.postAgentMessage(session.id, assistantMessage, draft.id, "draft_summary")
      await logAudit({
        actorId: this.actorId,
        action: "sop_builder_draft_generated",
        entityType: "system",
        entityId: session.id,
        metadata: { draft_id: draft.id, version: draft.version, via: "chat" },
      })
      return { draft, assistantMessage }
    }

    const current = latestDraft as SopBuilderDraft
    const { data, modelUsed } = await generateJson<unknown>({
      purpose: "sop-builder-revision",
      tier: "quality",
      prompt: buildChatRevisionPrompt(session, current.structured_content_json, userMessage),
      systemInstruction: buildSystemInstruction(),
      maxOutputTokens: 8192,
      timeoutMs: 120_000,
      actorId: this.actorId,
    })
    const content = ensureSections(normalizeStructuredSop(data, session.title), session)
    const draft = await this.createDraft(session, {
      outline: current.outline_json || null,
      content,
      markdown: structuredSopToMarkdown(content),
      modelUsed,
      status: "ready",
      changeSummary: "Revised from chat instruction.",
    })
    await this.service.from("sop_builder_drafts").update({ status: "superseded" }).eq("id", current.id)
    await this.service
      .from("sop_builder_sessions")
      .update({ status: "draft_ready", active_draft_id: draft.id })
      .eq("id", session.id)

    const assistantMessage = `Done — I've updated the draft (now v${draft.version}). Review the changes on the right, and tell me if you'd like more adjustments.`
    await this.postAgentMessage(session.id, assistantMessage, draft.id, "revision_summary")
    await logAudit({
      actorId: this.actorId,
      action: "sop_builder_draft_revised",
      entityType: "system",
      entityId: session.id,
      metadata: { draft_id: draft.id, previous_draft_id: current.id, via: "chat" },
    })
    return { draft, assistantMessage }
  }

  /**
   * Collaborative agent turn. One model call returns a structured result that
   * is routed to: discuss (no doc change), draft, revise_section (patch one
   * section), or revise_full. Credits are metered per resolved action. The
   * agent is locked to SOP authoring only (see buildAgentSystemInstruction).
   */
  async agentTurn(
    session: SopBuilderSession,
    userMessage: string,
    selection?: { quoted: string; sectionHeading: string | null } | null,
  ): Promise<{ reply: string; action: string; draft: SopBuilderDraft | null }> {
    void userMessage // the message is already persisted; the model reads it from loadMessages
    const messages = await this.loadMessages(session.id)

    const { data: latestDraft } = await this.service
      .from("sop_builder_drafts")
      .select("*")
      .eq("session_id", session.id)
      .neq("status", "superseded")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle()

    const current = (latestDraft as SopBuilderDraft | null) || null

    const result = await generateJson<Record<string, unknown>>({
      purpose: "sop-builder-discuss",
      tier: "quality",
      prompt: buildAgentTurnPrompt({
        session,
        messages,
        currentDoc: current?.structured_content_json || null,
        selection: selection || null,
      }),
      systemInstruction: buildAgentSystemInstruction(),
      maxOutputTokens: 8192,
      timeoutMs: 120_000,
      actorId: this.actorId,
      meter: false,
      validate: (v): v is Record<string, unknown> => typeof v === "object" && v !== null,
    })

    const turn = result.data
    const reply = typeof turn.reply === "string" && turn.reply.trim() ? turn.reply.trim() : "Okay."
    let action = typeof turn.action === "string" ? turn.action : "discuss"
    if (!["discuss", "draft", "revise_section", "revise_full"].includes(action)) action = "discuss"
    if (action === "revise_section" && !current) action = "discuss"

    let draft: SopBuilderDraft | null = current

    if (action === "draft" || action === "revise_full") {
      const content = ensureSections(normalizeStructuredSop(turn.document, session.title), session)
      draft = await this.createDraft(session, {
        outline: current?.outline_json || null,
        content,
        markdown: structuredSopToMarkdown(content),
        modelUsed: result.modelUsed,
        status: "ready",
        changeSummary: action === "revise_full" ? "Full revision." : undefined,
      })
      if (current && action === "revise_full") {
        await this.service.from("sop_builder_drafts").update({ status: "superseded" }).eq("id", current.id)
      }
      await this.service.from("sop_builder_sessions").update({ status: "draft_ready", active_draft_id: draft.id }).eq("id", session.id)
    } else if (action === "revise_section" && current) {
      const edit = (turn.section_edit || {}) as { heading?: string; section?: unknown }
      const base = current.structured_content_json
      const normalized = normalizeStructuredSop({ title: base.title, sections: [edit.section] }, session.title).sections[0]
      if (normalized) {
        const targetHeading = (edit.heading || normalized.heading || "").trim()
        const sections = base.sections.slice()
        const idx = sections.findIndex((s) => s.heading === targetHeading)
        if (idx >= 0) sections[idx] = normalized
        else sections.push(normalized)
        const content: SopStructuredContent = { ...base, sections }
        draft = await this.createDraft(session, {
          outline: current.outline_json || null,
          content,
          markdown: structuredSopToMarkdown(content),
          modelUsed: result.modelUsed,
          status: "ready",
          changeSummary: `Revised section: ${targetHeading}`,
        })
        await this.service.from("sop_builder_drafts").update({ status: "superseded" }).eq("id", current.id)
        await this.service.from("sop_builder_sessions").update({ status: "draft_ready", active_draft_id: draft.id }).eq("id", session.id)
      } else {
        action = "discuss"
      }
    }

    const purpose =
      action === "draft" ? "sop-builder-draft"
        : action === "revise_full" ? "sop-builder-revise-full"
          : action === "revise_section" ? "sop-builder-revise-section"
            : "sop-builder-discuss"
    await recordAiUsage({
      purpose,
      model: result.modelUsed,
      tier: result.tier,
      credits: creditCostFor(purpose),
      promptTokens: result.usage?.prompt ?? null,
      completionTokens: result.usage?.completion ?? null,
      totalTokens: result.usage?.total ?? null,
      success: true,
      actorId: this.actorId,
      latencyMs: result.latencyMs,
    })

    await this.postAgentMessage(session.id, reply, draft?.id ?? null, `agent_${action}`)
    await logAudit({
      actorId: this.actorId,
      action: `sop_builder_${action}`,
      entityType: "system",
      entityId: session.id,
      metadata: { draft_id: draft?.id ?? null },
    })

    return { reply, action, draft }
  }

  private async postAgentMessage(sessionId: string, message: string, draftId: string | null, type: string) {
    await this.service.from("sop_builder_messages").insert({
      session_id: sessionId,
      sender: "agent",
      message,
      message_type: type,
      related_draft_id: draftId,
    })
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

