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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Lightfall from "@/components/Lightfall"
import { SopViewerLazy as SopViewer } from "@/components/library/sop-viewer-lazy"
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

type SelectionDraft = {
  text: string
  sectionHeading: string | null
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
  const [revisionInstruction, setRevisionInstruction] = useState("")
  const [documentOpen, setDocumentOpen] = useState(Boolean(initialDrafts.length))
  const [documentView, setDocumentView] = useState<DocumentView>(initialSignedUrl ? "word" : "markdown")
  const [commentDialogOpen, setCommentDialogOpen] = useState(false)
  const [selectionDraft, setSelectionDraft] = useState<SelectionDraft | null>(null)

  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.id === selectedDraftId) || drafts[0] || null,
    [drafts, selectedDraftId],
  )
  const outlineDraft = useMemo(() => drafts.find((draft) => draft.outline_json), [drafts])
  const openComments = comments.filter((comment) => comment.status === "open")
  const isBusy = Boolean(busy)
  const sections = selectedDraft?.structured_content_json?.sections || []
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
      toast.success("Outline generated")
      setDocumentOpen(true)
      setDocumentView("markdown")
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
      toast.success("Draft generated")
      setDocumentOpen(true)
      setDocumentView("markdown")
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

  function openSelectionComment(selection: SelectionDraft) {
    setSelectionDraft(selection)
    setCommentDialogOpen(true)
  }

  const primaryAction = getPrimaryAction({
    sessionStatus: session.status,
    hasOutline: Boolean(outlineDraft),
    hasDraft: Boolean(selectedDraft?.markdown_content),
    hasWord: Boolean(selectedDraft?.docx_path),
    busy,
    generateOutline,
    generateDraft,
    reviseDraft,
    generateWord,
    downloadWord,
  })

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f7f8fa]">
      <header className="shrink-0 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-brand-teal text-white">AI Draft</Badge>
              <Badge variant="outline" className="capitalize">{session.status.replace(/_/g, " ")}</Badge>
              {selectedDraft && <Badge variant="secondary">Version {selectedDraft.version}</Badge>}
              <span className="text-xs text-muted-foreground">{session.department || "No department"}</span>
            </div>
            <h1 className="mt-1 truncate text-base font-semibold tracking-tight text-slate-950 sm:text-lg">{session.title}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setDocumentOpen((open) => !open)}>
              {documentOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              {documentOpen ? "Hide Document" : "Show Document"}
            </Button>
            <Button onClick={primaryAction.onClick} disabled={primaryAction.disabled}>
              {primaryAction.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : primaryAction.icon}
              {primaryAction.label}
            </Button>
          </div>
        </div>
      </header>

      <main className={`grid min-h-0 flex-1 gap-0 overflow-hidden ${documentOpen ? "xl:grid-cols-[minmax(420px,0.96fr)_minmax(520px,1.04fr)]" : "grid-cols-1"}`}>
        <section className="relative flex min-h-0 flex-col overflow-hidden border-r border-slate-200 bg-white">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">
            {!hasUserPrompt && (
              <WelcomeScreen
                title={session.title}
                department={session.department}
                onQuickPrompt={(text) => {
                  const input = document.querySelector<HTMLInputElement>("#sop-builder-message-input")
                  if (input) input.value = text
                  input?.focus()
                }}
              />
            )}

            {hasUserPrompt && (
              <div className="mx-auto flex max-w-3xl flex-col gap-6">
                <AgentProcessCard
                  status={session.status}
                  hasDraft={Boolean(selectedDraft?.markdown_content)}
                  openComments={openComments.length}
                  documentOpen={documentOpen}
                  onOpenDocument={() => setDocumentOpen(true)}
                />
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                {isBusy && (
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-teal" />
                    {busy === "outline" && "Building an outline from the intake..."}
                    {busy === "draft" && "Writing the Markdown SOP draft..."}
                    {busy === "revise" && "Applying your comments to a new draft version..."}
                    {busy === "word" && "Generating the Word file..."}
                    {busy === "message" && "Saving your message..."}
                    {busy === "download" && "Preparing the download..."}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-8">
            <form id="sop-builder-composer" action={addClarification} className="mx-auto max-w-3xl">
              <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                <Input
                  id="sop-builder-message-input"
                  name="message"
                  placeholder="Brief the agent, answer a question, or describe the change you want..."
                  disabled={isBusy}
                  className="h-11 border-0 px-3 text-sm shadow-none focus-visible:ring-0"
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {["Make it more compliant", "Add more detail", "Simplify language"].map((prompt) => (
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
        </section>

        {documentOpen && (
          <DocumentWorkspace
            selectedDraft={selectedDraft}
            drafts={drafts}
            comments={comments}
            selectedDraftId={selectedDraftId}
            documentView={documentView}
            signedUrl={signedUrl}
            sections={sections}
            isBusy={isBusy}
            busy={busy}
            revisionInstruction={revisionInstruction}
            setRevisionInstruction={setRevisionInstruction}
            setDocumentView={setDocumentView}
            setSelectedDraftId={(id) => {
              setSelectedDraftId(id)
              loadComments(id)
            }}
            onTextSelected={openSelectionComment}
            onAddCommentClick={() => {
              setSelectionDraft(null)
              setCommentDialogOpen(true)
            }}
            onReviseDraft={reviseDraft}
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
                <option value="">No specific section</option>
                {sections.map((section) => (
                  <option key={section.heading} value={section.heading}>{section.heading}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Selected text</Label>
              <Textarea
                name="quoted_text"
                rows={3}
                defaultValue={selectionDraft?.text || ""}
                placeholder="Optional copied text from the draft"
              />
            </div>
            <div className="space-y-2">
              <Label>Instruction</Label>
              <Textarea name="comment_text" required rows={4} placeholder="Tell the AI what to change." />
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
    <div className="relative mx-auto flex min-h-[calc(100vh-14rem)] max-w-4xl items-center justify-center overflow-hidden rounded-[8px] border border-slate-900/20 bg-[#052b1e] p-6 text-white shadow-sm">
      <Lightfall
        colors={["#a6c8ff", "#27ffee", "#48acbc"]}
        backgroundColor="#052b1e"
        speed={0.2}
        streakCount={1}
        streakWidth={0.2}
        streakLength={0.4}
        density={0.6}
        twinkle={1}
        glow={1}
        backgroundGlow={0.1}
        zoom={1}
        opacity={0.6}
        mouseInteraction={false}
        mouseStrength={0.5}
        mouseRadius={1.75}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(5,43,30,0.05),rgba(5,43,30,0.72))]" />
      <div className="relative z-10 flex max-w-2xl flex-col items-center text-center">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur">
          <Bot className="h-6 w-6 text-[#27ffee]" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a6c8ff]">{department || "QMS-MANAJA"} SOP Assistant</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-white/78">
          Brief the agent in plain language. It will help shape the outline, draft the SOP in Markdown, and use your highlighted comments to revise the document.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          {["Start by building the outline", "Ask me what details are missing", "Draft the first SOP version"].map((prompt) => (
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

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.sender === "user"
  const isSystem = message.sender === "system"
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[86%] gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isUser ? "bg-brand-navy text-white" : "bg-slate-100 text-slate-700"}`}>
          {isUser ? <span className="text-xs font-bold">You</span> : <Bot className="h-4 w-4" />}
        </div>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${isUser ? "bg-brand-navy text-white" : isSystem ? "border border-slate-200 bg-slate-50 text-slate-600" : "border border-slate-200 bg-white text-slate-800"}`}>
          {message.message}
        </div>
      </div>
    </div>
  )
}

function AgentProcessCard({
  status,
  hasDraft,
  openComments,
  documentOpen,
  onOpenDocument,
}: {
  status: string
  hasDraft: boolean
  openComments: number
  documentOpen: boolean
  onOpenDocument: () => void
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">Agent process</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasDraft ? "Review the Markdown draft, highlight text to comment, then ask for revisions." : "Start with an outline, then generate the Markdown draft."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="capitalize">{status.replace(/_/g, " ")}</Badge>
          {openComments > 0 && <Badge className="bg-amber-100 text-amber-900">{openComments} open comment{openComments === 1 ? "" : "s"}</Badge>}
          {!documentOpen && hasDraft && (
            <Button size="sm" variant="outline" onClick={onOpenDocument}>
              <PanelRightOpen className="h-4 w-4" />
              Open Draft
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function DocumentWorkspace({
  selectedDraft,
  drafts,
  comments,
  selectedDraftId,
  documentView,
  signedUrl,
  sections,
  isBusy,
  busy,
  revisionInstruction,
  setRevisionInstruction,
  setDocumentView,
  setSelectedDraftId,
  onTextSelected,
  onAddCommentClick,
  onReviseDraft,
  onGenerateWord,
  onDownloadWord,
}: {
  selectedDraft: SopBuilderDraft | null
  drafts: SopBuilderDraft[]
  comments: SopBuilderComment[]
  selectedDraftId: string
  documentView: DocumentView
  signedUrl: string | null
  sections: SopBuilderDraft["structured_content_json"]["sections"]
  isBusy: boolean
  busy: string | null
  revisionInstruction: string
  setRevisionInstruction: (value: string) => void
  setDocumentView: (view: DocumentView) => void
  setSelectedDraftId: (id: string) => void
  onTextSelected: (selection: SelectionDraft) => void
  onAddCommentClick: () => void
  onReviseDraft: () => void
  onGenerateWord: () => void
  onDownloadWord: () => void
}) {
  const openComments = comments.filter((comment) => comment.status === "open")
  return (
    <aside className="grid min-h-0 grid-rows-[auto_1fr] overflow-hidden bg-slate-100">
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDocumentView("markdown")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${documentView === "markdown" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              Markdown
            </button>
            <button
              type="button"
              onClick={() => setDocumentView("word")}
              disabled={!selectedDraft?.docx_path}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-40 ${documentView === "word" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
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
                    Version {draft.version} · {draft.status.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_300px] overflow-hidden max-lg:grid-cols-1">
        <div className="min-h-0 overflow-y-auto p-5">
          {documentView === "markdown" ? (
            <div className="mx-auto min-h-full max-w-4xl rounded-[8px] border border-slate-200 bg-white px-7 py-6 shadow-sm">
              <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                Draft only. Highlight text in this Markdown view to add an AI revision comment.
              </div>
              {selectedDraft?.markdown_content ? (
                <MarkdownViewer markdown={selectedDraft.markdown_content} onTextSelected={onTextSelected} />
              ) : (
                <div className="flex h-[52vh] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                  <FileText className="h-10 w-10" />
                  <p className="text-sm font-medium">The Markdown draft will appear here after generation.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="mx-auto h-full min-h-[72vh] max-w-5xl overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
              {signedUrl && selectedDraft?.docx_path ? (
                <SopViewer fileUrl={signedUrl} status="draft" className="h-full" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                  <FileText className="h-10 w-10" />
                  <p className="text-sm font-medium">Generate the Word file to preview it here.</p>
                  <Button onClick={onGenerateWord} disabled={isBusy || !selectedDraft}>
                    {busy === "word" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    Generate Word File
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="min-h-0 overflow-y-auto border-l border-slate-200 bg-white p-4 max-lg:border-l-0 max-lg:border-t">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Revision Comments</h2>
            <Button size="sm" variant="outline" onClick={onAddCommentClick} disabled={!selectedDraft}>
              <MessageSquarePlus className="h-4 w-4" />
              Add
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Highlight text in the Markdown draft or add a general instruction.</p>
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
              placeholder="Optional instruction to combine with open comments"
            />
            <Button className="w-full" onClick={onReviseDraft} disabled={isBusy || !selectedDraft || (!openComments.length && !revisionInstruction.trim())}>
              {busy === "revise" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Revise Draft
            </Button>
            <Button className="w-full" variant="outline" onClick={onGenerateWord} disabled={isBusy || !selectedDraft?.markdown_content}>
              {busy === "word" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Generate Word File
            </Button>
            <Button className="w-full" variant="outline" onClick={onDownloadWord} disabled={isBusy || !selectedDraft?.docx_path}>
              {busy === "download" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download Word File
            </Button>
          </div>

          {sections.length > 0 && (
            <div className="mt-4 rounded-md bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Detected sections</p>
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

function getPrimaryAction(args: {
  sessionStatus: string
  hasOutline: boolean
  hasDraft: boolean
  hasWord: boolean
  busy: string | null
  generateOutline: () => void
  generateDraft: () => void
  reviseDraft: () => void
  generateWord: () => void
  downloadWord: () => void
}) {
  if (args.hasWord) {
    return {
      label: "Download Word File",
      icon: <Download className="h-4 w-4" />,
      onClick: args.downloadWord,
      disabled: Boolean(args.busy),
      loading: args.busy === "download",
    }
  }
  if (args.hasDraft) {
    return {
      label: "Generate Word File",
      icon: <FileText className="h-4 w-4" />,
      onClick: args.generateWord,
      disabled: Boolean(args.busy),
      loading: args.busy === "word",
    }
  }
  if (args.hasOutline || args.sessionStatus === "outline_ready") {
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
