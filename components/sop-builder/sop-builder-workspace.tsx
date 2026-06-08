"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Bot,
  Download,
  FileText,
  Loader2,
  MessageSquarePlus,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react"
import Lightfall from "@/components/Lightfall"
import { SopViewerLazy as SopViewer } from "@/components/library/sop-viewer-lazy"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MarkdownViewer } from "./markdown-viewer"
import type { SopBuilderComment, SopBuilderDraft, SopBuilderSession } from "@/lib/sop-builder/types"

type Message = {
  id: string
  sender: "user" | "agent" | "system"
  message: string
  message_type: string
  created_at: string
}

type DocumentView = "markdown" | "word"
type SelectionDraft = { text: string; sectionHeading: string | null }

const sopBuilderLightfall = {
  colors: ["#a6faff", "#27ffdd", "#9fabff"],
  backgroundColor: "#27358b",
  speed: 0.2,
  streakCount: 2,
  streakWidth: 1.3,
  streakLength: 2.6,
  density: 0.5,
  twinkle: 0.75,
  glow: 1,
  backgroundGlow: 0,
  zoom: 2.1,
  opacity: 1,
  mouseInteraction: false,
  mouseStrength: 0,
  mouseRadius: 0.1,
}

export function SopBuilderWorkspace({
  initialSession,
  initialDrafts,
  initialMessages,
  initialComments,
  initialSignedUrl,
}: {
  initialSession: SopBuilderSession
  initialDrafts: SopBuilderDraft[]
  initialMessages: Message[]
  initialComments: SopBuilderComment[]
  initialSignedUrl: string | null
}) {
  const router = useRouter()
  const [session, setSession] = useState(initialSession)
  const [drafts, setDrafts] = useState(initialDrafts)
  const [messages, setMessages] = useState(initialMessages)
  const [comments, setComments] = useState(initialComments)
  const [selectedDraftId, setSelectedDraftId] = useState(initialSession.active_draft_id || initialDrafts[0]?.id || "")
  const [signedUrl, setSignedUrl] = useState(initialSignedUrl)
  const [busy, setBusy] = useState<string | null>(null)
  const [documentOpen, setDocumentOpen] = useState(Boolean(initialDrafts.length))
  const [documentView, setDocumentView] = useState<DocumentView>(initialSignedUrl ? "word" : "markdown")
  const [commentDialogOpen, setCommentDialogOpen] = useState(false)
  const [selectionDraft, setSelectionDraft] = useState<SelectionDraft | null>(null)
  const [revisionInstruction, setRevisionInstruction] = useState("")

  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.id === selectedDraftId) || drafts[0] || null,
    [drafts, selectedDraftId],
  )
  const outlineDraft = useMemo(() => drafts.find((draft) => draft.outline_json), [drafts])
  const openComments = comments.filter((comment) => comment.status === "open")
  const sections = selectedDraft?.structured_content_json?.sections || []
  const isBusy = Boolean(busy)
  const hasUserPrompt = messages.some((message) => message.sender === "user")

  async function refreshSession(nextDraftId?: string) {
    const res = await fetch(`/api/sop-builder/sessions/${session.id}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to refresh session")
    setSession(data.session)
    setDrafts(data.drafts)
    setMessages(data.messages)
    const active = nextDraftId || data.session.active_draft_id || data.drafts[0]?.id || ""
    setSelectedDraftId(active)
    if (active) await loadComments(active)
    router.refresh()
  }

  async function loadComments(draftId: string) {
    const res = await fetch(`/api/sop-builder/drafts/${draftId}/comments`)
    const data = await res.json()
    if (res.ok) setComments(data.comments || [])
  }

  async function runAction(label: string, fn: () => Promise<void>) {
    setBusy(label)
    try {
      await fn()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed")
    } finally {
      setBusy(null)
    }
  }

  async function generateOutline() {
    await runAction("outline", async () => {
      const res = await fetch(`/api/sop-builder/sessions/${session.id}/outline`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate outline")
      setDocumentOpen(true)
      setDocumentView("markdown")
      toast.success("Outline generated")
      await refreshSession(data.draft.id)
    })
  }

  async function generateDraft() {
    await runAction("draft", async () => {
      const res = await fetch(`/api/sop-builder/sessions/${session.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outline: outlineDraft?.outline_json }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate draft")
      setDocumentOpen(true)
      setDocumentView("markdown")
      toast.success("Markdown draft generated")
      await refreshSession(data.draft.id)
    })
  }

  async function addClarification(formData: FormData) {
    const message = String(formData.get("message") || "").trim()
    if (!message) return
    await runAction("message", async () => {
      const res = await fetch(`/api/sop-builder/sessions/${session.id}/clarify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send message")
      const form = document.getElementById("sop-builder-composer") as HTMLFormElement | null
      form?.reset()
      await refreshSession()
    })
  }

  async function addComment(formData: FormData) {
    if (!selectedDraft) return
    const payload = {
      section_heading: String(formData.get("section_heading") || ""),
      quoted_text: String(formData.get("quoted_text") || ""),
      comment_text: String(formData.get("comment_text") || ""),
    }
    if (!payload.comment_text.trim()) {
      toast.error("Comment instruction is required")
      return
    }
    await runAction("comment", async () => {
      const res = await fetch(`/api/sop-builder/drafts/${selectedDraft.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to add comment")
      setComments((current) => [...current, data.comment])
      setCommentDialogOpen(false)
      setSelectionDraft(null)
      toast.success("Comment added")
    })
  }

  async function reviseDraft() {
    await runAction("revise", async () => {
      const res = await fetch(`/api/sop-builder/sessions/${session.id}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: revisionInstruction }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to revise draft")
      setRevisionInstruction("")
      setDocumentOpen(true)
      setDocumentView("markdown")
      toast.success("Revision completed")
      await refreshSession(data.draft.id)
    })
  }

  async function generateWord() {
    if (!selectedDraft) return
    await runAction("word", async () => {
      const res = await fetch(`/api/sop-builder/drafts/${selectedDraft.id}/generate-word`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate Word file")
      setSignedUrl(data.signedUrl || null)
      setDocumentOpen(true)
      setDocumentView("word")
      toast.success("Word file generated")
      await refreshSession(selectedDraft.id)
    })
  }

  async function downloadWord() {
    if (!selectedDraft) return
    await runAction("download", async () => {
      const res = await fetch(`/api/sop-builder/drafts/${selectedDraft.id}/download`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to prepare download")
      window.location.href = data.signedUrl
    })
  }

  const primaryAction = getPrimaryAction({
    hasOutline: Boolean(outlineDraft),
    hasDraft: Boolean(selectedDraft?.markdown_content),
    hasWord: Boolean(selectedDraft?.docx_path),
    busy,
    generateOutline,
    generateDraft,
    generateWord,
    downloadWord,
  })

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f8f8f6] dark:bg-background">
      <header className="z-20 flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-[#fbfbf9]/95 px-4 py-3 backdrop-blur dark:border-border dark:bg-background/95">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge className="bg-brand-teal text-white">AI Draft</Badge>
            <Badge variant="outline" className="capitalize">{session.status.replace(/_/g, " ")}</Badge>
            {selectedDraft && <Badge variant="secondary">v{selectedDraft.version}</Badge>}
          </div>
          <h1 className="mt-1 truncate text-sm font-semibold text-slate-950 dark:text-foreground sm:text-base">{session.title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" onClick={() => setDocumentOpen((open) => !open)}>
            {documentOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            {documentOpen ? "Hide View" : "Open View"}
          </Button>
          <Button onClick={primaryAction.onClick} disabled={primaryAction.disabled}>
            {primaryAction.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : primaryAction.icon}
            {primaryAction.label}
          </Button>
        </div>
      </header>

      <main className="relative min-h-0 flex-1 overflow-hidden">
        <section className={`flex h-full min-h-0 flex-col transition-[padding] duration-300 ${documentOpen ? "2xl:pr-[52vw]" : ""}`}>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-end gap-6">
              {!hasUserPrompt ? (
                <WelcomeScreen
                  title={session.title}
                  department={session.department}
                  onQuickPrompt={(text) => {
                    const input = document.querySelector<HTMLInputElement>("#sop-builder-message-input")
                    if (input) input.value = text
                    input?.focus()
                  }}
                />
              ) : (
                <>
                  <ProcessStrip
                    status={session.status}
                    hasDraft={Boolean(selectedDraft?.markdown_content)}
                    openComments={openComments.length}
                    onOpenDocument={() => setDocumentOpen(true)}
                  />
                  {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                  {isBusy && <ThinkingState busy={busy} />}
                </>
              )}
            </div>
          </div>

          <Composer isBusy={isBusy} onSubmit={addClarification} />
        </section>

        {documentOpen && (
          <DocumentPanel
            selectedDraft={selectedDraft}
            drafts={drafts}
            selectedDraftId={selectedDraftId}
            signedUrl={signedUrl}
            documentView={documentView}
            comments={comments}
            sections={sections}
            busy={busy}
            isBusy={isBusy}
            revisionInstruction={revisionInstruction}
            setRevisionInstruction={setRevisionInstruction}
            setDocumentView={setDocumentView}
            setSelectedDraftId={(id) => {
              setSelectedDraftId(id)
              loadComments(id)
            }}
            onClose={() => setDocumentOpen(false)}
            onTextSelected={(selection) => {
              setSelectionDraft(selection)
              setCommentDialogOpen(true)
            }}
            onGeneralComment={() => {
              setSelectionDraft(null)
              setCommentDialogOpen(true)
            }}
            onRevise={reviseDraft}
            onGenerateWord={generateWord}
            onDownloadWord={downloadWord}
          />
        )}
      </main>

      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add AI Revision Comment</DialogTitle>
          </DialogHeader>
          <form action={addComment} className="space-y-4">
            <div className="space-y-2">
              <Label>Target section</Label>
              <select
                name="section_heading"
                defaultValue={selectionDraft?.sectionHeading || ""}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">General</option>
                {sections.map((section) => (
                  <option key={section.heading} value={section.heading}>{section.heading}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Selected text</Label>
              <Textarea name="quoted_text" rows={3} defaultValue={selectionDraft?.text || ""} />
            </div>
            <div className="space-y-2">
              <Label>Instruction</Label>
              <Textarea name="comment_text" required rows={4} placeholder="Tell the agent what to change." />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isBusy}>Save Comment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function WelcomeScreen({
  title,
  department,
  onQuickPrompt,
}: {
  title: string
  department: string | null | undefined
  onQuickPrompt: (text: string) => void
}) {
  return (
    <div className="relative flex min-h-[min(720px,calc(100vh-12rem))] items-center justify-center overflow-hidden rounded-[8px] bg-[#27358b] px-6 py-12 text-white shadow-sm">
      <Lightfall
        colors={sopBuilderLightfall.colors}
        backgroundColor={sopBuilderLightfall.backgroundColor}
        speed={sopBuilderLightfall.speed}
        streakCount={sopBuilderLightfall.streakCount}
        streakWidth={sopBuilderLightfall.streakWidth}
        streakLength={sopBuilderLightfall.streakLength}
        density={sopBuilderLightfall.density}
        twinkle={sopBuilderLightfall.twinkle}
        glow={sopBuilderLightfall.glow}
        backgroundGlow={sopBuilderLightfall.backgroundGlow}
        zoom={sopBuilderLightfall.zoom}
        opacity={sopBuilderLightfall.opacity}
        mouseInteraction={sopBuilderLightfall.mouseInteraction}
        mouseStrength={sopBuilderLightfall.mouseStrength}
        mouseRadius={sopBuilderLightfall.mouseRadius}
      />
      <div className="relative z-10 max-w-2xl text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur">
          <Bot className="h-6 w-6 text-[#27ffdd]" />
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-[#a6faff]">{department || "QMS-MANAJA"} SOP Agent</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">{title}</h2>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {["Start with an outline", "Ask what details are missing", "Draft the first version"].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onQuickPrompt(prompt)}
              className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur transition hover:bg-white/16"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Composer({ isBusy, onSubmit }: { isBusy: boolean; onSubmit: (formData: FormData) => Promise<void> }) {
  return (
    <div className="shrink-0 border-t border-slate-200 bg-[#fbfbf9]/95 px-4 py-4 backdrop-blur">
      <form id="sop-builder-composer" action={onSubmit} className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <Input
            id="sop-builder-message-input"
            name="message"
            disabled={isBusy}
            placeholder="Message the SOP agent..."
            className="h-12 border-0 px-3 text-sm shadow-none focus-visible:ring-0"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {["Make it more compliant", "Add detail", "Simplify"].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    const input = document.querySelector<HTMLInputElement>("#sop-builder-message-input")
                    if (input) input.value = prompt
                    input?.focus()
                  }}
                  className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 transition hover:bg-slate-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <Button type="submit" disabled={isBusy}>
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.sender === "user"
  const isSystem = message.sender === "system"
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[88%] gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isUser ? "bg-slate-950 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>
          {isUser ? <span className="text-[10px] font-semibold">You</span> : <Bot className="h-4 w-4" />}
        </div>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-6 ${isUser ? "bg-slate-950 text-white" : isSystem ? "bg-slate-100 text-slate-600" : "bg-white text-slate-800 ring-1 ring-slate-200"}`}>
          {message.message}
        </div>
      </div>
    </div>
  )
}

function ProcessStrip({
  status,
  hasDraft,
  openComments,
  onOpenDocument,
}: {
  status: string
  hasDraft: boolean
  openComments: number
  onOpenDocument: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
      <div>
        <p className="font-semibold text-slate-950">{status.replace(/_/g, " ")}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {hasDraft ? "Markdown draft is available in the document view." : "The agent is ready to shape the first draft."}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {openComments > 0 && <Badge className="bg-amber-100 text-amber-900">{openComments} open</Badge>}
        <Button size="sm" variant="outline" onClick={onOpenDocument}>
          <PanelRightOpen className="h-4 w-4" />
          Document
        </Button>
      </div>
    </div>
  )
}

function ThinkingState({ busy }: { busy: string | null }) {
  const labels: Record<string, string> = {
    outline: "Building the outline...",
    draft: "Writing the Markdown draft...",
    revise: "Applying revision comments...",
    word: "Generating the Word file...",
    message: "Saving your message...",
    download: "Preparing the download...",
    comment: "Saving comment...",
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
      <Loader2 className="h-4 w-4 animate-spin text-brand-teal" />
      {busy ? labels[busy] || "Working..." : "Working..."}
    </div>
  )
}

function DocumentPanel({
  selectedDraft,
  drafts,
  selectedDraftId,
  signedUrl,
  documentView,
  comments,
  sections,
  busy,
  isBusy,
  revisionInstruction,
  setRevisionInstruction,
  setDocumentView,
  setSelectedDraftId,
  onClose,
  onTextSelected,
  onGeneralComment,
  onRevise,
  onGenerateWord,
  onDownloadWord,
}: {
  selectedDraft: SopBuilderDraft | null
  drafts: SopBuilderDraft[]
  selectedDraftId: string
  signedUrl: string | null
  documentView: DocumentView
  comments: SopBuilderComment[]
  sections: SopBuilderDraft["structured_content_json"]["sections"]
  busy: string | null
  isBusy: boolean
  revisionInstruction: string
  setRevisionInstruction: (value: string) => void
  setDocumentView: (view: DocumentView) => void
  setSelectedDraftId: (id: string) => void
  onClose: () => void
  onTextSelected: (selection: SelectionDraft) => void
  onGeneralComment: () => void
  onRevise: () => void
  onGenerateWord: () => void
  onDownloadWord: () => void
}) {
  const openComments = comments.filter((comment) => comment.status === "open")
  return (
    <aside className="absolute inset-y-0 right-0 z-10 flex w-full flex-col border-l border-slate-200 bg-white shadow-2xl 2xl:w-[52vw]">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDocumentView("markdown")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${documentView === "markdown" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            Markdown
          </button>
          <button
            type="button"
            onClick={() => setDocumentView("word")}
            disabled={!selectedDraft?.docx_path}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-40 ${documentView === "word" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            Word
          </button>
        </div>
        <div className="flex items-center gap-2">
          {drafts.length > 0 && (
            <select
              value={selectedDraftId}
              onChange={(event) => setSelectedDraftId(event.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
            >
              {drafts.map((draft) => (
                <option key={draft.id} value={draft.id}>
                  Version {draft.version}
                </option>
              ))}
            </select>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <PanelRightClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_280px] max-lg:grid-cols-1">
        <div className="min-h-0 overflow-y-auto bg-slate-100 p-5">
          {documentView === "markdown" ? (
            <div className="mx-auto min-h-full max-w-4xl rounded-[8px] border border-slate-200 bg-white px-7 py-6 shadow-sm">
              <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                Draft only
              </div>
              {selectedDraft?.markdown_content ? (
                <MarkdownViewer markdown={selectedDraft.markdown_content} onTextSelected={onTextSelected} />
              ) : (
                <EmptyDocument onGenerate={onGenerateWord} canGenerate={Boolean(selectedDraft?.markdown_content)} busy={busy} />
              )}
            </div>
          ) : (
            <div className="h-full min-h-[72vh] overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
              {signedUrl && selectedDraft?.docx_path ? (
                <SopViewer fileUrl={signedUrl} status="draft" className="h-full" />
              ) : (
                <EmptyDocument onGenerate={onGenerateWord} canGenerate={Boolean(selectedDraft?.markdown_content)} busy={busy} />
              )}
            </div>
          )}
        </div>

        <div className="min-h-0 overflow-y-auto border-l border-slate-200 bg-white p-4 max-lg:border-l-0 max-lg:border-t">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-950">Comments</h2>
            <Button size="sm" variant="outline" onClick={onGeneralComment} disabled={!selectedDraft}>
              <MessageSquarePlus className="h-4 w-4" />
              Add
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No revision comments yet.</p>
            ) : comments.map((comment) => (
              <div key={comment.id} className="rounded-md border border-slate-200 p-3 text-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-900">{comment.section_heading || "General"}</span>
                  <Badge variant={comment.status === "open" ? "outline" : "secondary"}>{comment.status}</Badge>
                </div>
                {comment.quoted_text && <p className="mb-2 border-l-2 border-slate-300 pl-2 text-xs text-muted-foreground">{comment.quoted_text}</p>}
                <p className="text-slate-700">{comment.comment_text}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
            <Label>Revision instruction</Label>
            <Textarea
              value={revisionInstruction}
              onChange={(event) => setRevisionInstruction(event.target.value)}
              rows={4}
              placeholder="Optional instruction"
            />
            <Button className="w-full" onClick={onRevise} disabled={isBusy || !selectedDraft || (!openComments.length && !revisionInstruction.trim())}>
              {busy === "revise" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Revise Draft
            </Button>
            <Button className="w-full" variant="outline" onClick={onGenerateWord} disabled={isBusy || !selectedDraft?.markdown_content}>
              {busy === "word" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Generate Word
            </Button>
            <Button className="w-full" variant="outline" onClick={onDownloadWord} disabled={isBusy || !selectedDraft?.docx_path}>
              {busy === "download" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download
            </Button>
          </div>

          {sections.length > 0 && (
            <div className="mt-4 rounded-md bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sections</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {sections.map((section) => (
                  <Badge key={section.heading} variant="outline" className="max-w-full truncate">{section.heading}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

function EmptyDocument({ onGenerate, canGenerate, busy }: { onGenerate: () => void; canGenerate: boolean; busy: string | null }) {
  return (
    <div className="flex h-full min-h-[52vh] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
      <FileText className="h-10 w-10" />
      <p className="text-sm font-medium">No document view is ready yet.</p>
      <Button onClick={onGenerate} disabled={!canGenerate || Boolean(busy)}>
        {busy === "word" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        Generate Word
      </Button>
    </div>
  )
}

function getPrimaryAction(args: {
  hasOutline: boolean
  hasDraft: boolean
  hasWord: boolean
  busy: string | null
  generateOutline: () => void
  generateDraft: () => void
  generateWord: () => void
  downloadWord: () => void
}) {
  if (args.hasWord) {
    return {
      label: "Download",
      icon: <Download className="h-4 w-4" />,
      onClick: args.downloadWord,
      disabled: Boolean(args.busy),
      loading: args.busy === "download",
    }
  }
  if (args.hasDraft) {
    return {
      label: "Generate Word",
      icon: <FileText className="h-4 w-4" />,
      onClick: args.generateWord,
      disabled: Boolean(args.busy),
      loading: args.busy === "word",
    }
  }
  if (args.hasOutline) {
    return {
      label: "Generate Draft",
      icon: <FileText className="h-4 w-4" />,
      onClick: args.generateDraft,
      disabled: Boolean(args.busy),
      loading: args.busy === "draft",
    }
  }
  return {
    label: "Generate Outline",
    icon: <Sparkles className="h-4 w-4" />,
    onClick: args.generateOutline,
    disabled: Boolean(args.busy),
    loading: args.busy === "outline",
  }
}
