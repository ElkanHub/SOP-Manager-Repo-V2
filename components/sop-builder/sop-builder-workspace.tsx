"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Bot, Download, FileText, Loader2, MessageSquarePlus, RefreshCw, Send, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MarkdownViewer } from "./markdown-viewer"
import { SopViewerLazy as SopViewer } from "@/components/library/sop-viewer-lazy"
import type { SopBuilderComment, SopBuilderDraft, SopBuilderSession } from "@/lib/sop-builder/types"

type Message = {
  id: string
  sender: "user" | "agent" | "system"
  message: string
  message_type: string
  created_at: string
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

  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.id === selectedDraftId) || drafts[0] || null,
    [drafts, selectedDraftId],
  )
  const outlineDraft = useMemo(() => drafts.find((draft) => draft.outline_json), [drafts])
  const openComments = comments.filter((comment) => comment.status === "open")

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

  const isBusy = Boolean(busy)
  const sections = selectedDraft?.structured_content_json?.sections || []

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-brand-teal text-white">AI Draft</Badge>
              <Badge variant="outline" className="capitalize">{session.status.replace(/_/g, " ")}</Badge>
              {selectedDraft && <Badge variant="secondary">Version {selectedDraft.version}</Badge>}
            </div>
            <h1 className="mt-2 truncate text-xl font-bold tracking-tight text-slate-900">{session.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">{session.department || "No department"} · Drafts only, not controlled SOPs</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={generateOutline} disabled={isBusy}>
              {busy === "outline" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate Outline
            </Button>
            <Button variant="outline" onClick={generateDraft} disabled={isBusy || !outlineDraft}>
              {busy === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Generate Draft
            </Button>
            <Button onClick={generateWord} disabled={isBusy || !selectedDraft || !selectedDraft.markdown_content}>
              {busy === "word" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Generate Word File
            </Button>
            <Button variant="outline" onClick={downloadWord} disabled={isBusy || !selectedDraft?.docx_path}>
              {busy === "download" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download
            </Button>
          </div>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-[1fr_360px]">
        <section className="min-h-0 overflow-hidden rounded-md border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <FileText className="h-4 w-4" />
              Draft Preview
            </div>
            {drafts.length > 0 && (
              <select
                value={selectedDraftId}
                onChange={(event) => {
                  setSelectedDraftId(event.target.value)
                  loadComments(event.target.value)
                }}
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
          <div className="h-full overflow-y-auto p-5">
            {selectedDraft?.markdown_content ? (
              <MarkdownViewer markdown={selectedDraft.markdown_content} />
            ) : (
              <div className="flex h-[50vh] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <Bot className="h-10 w-10" />
                <p className="text-sm font-medium">Generate an outline, then generate the first Markdown draft.</p>
              </div>
            )}

            {signedUrl && selectedDraft?.docx_path && (
              <div className="mt-8 border-t border-slate-200 pt-5">
                <div className="mb-3 flex items-center gap-2">
                  <Badge className="bg-amber-100 text-amber-900">Word Preview</Badge>
                  <span className="text-xs text-muted-foreground">Generated file uses the draft watermark overlay.</span>
                </div>
                <div className="h-[75vh] overflow-hidden rounded-md border border-slate-200">
                  <SopViewer fileUrl={signedUrl} status="draft" className="h-full" />
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto">
          <section className="rounded-md border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">AI Chat</h2>
            </div>
            <div className="max-h-72 space-y-3 overflow-y-auto p-4">
              {messages.map((message) => (
                <div key={message.id} className={message.sender === "user" ? "text-right" : "text-left"}>
                  <div className={`inline-block max-w-[90%] rounded-md px-3 py-2 text-sm ${message.sender === "user" ? "bg-brand-navy text-white" : "bg-slate-100 text-slate-800"}`}>
                    {message.message}
                  </div>
                </div>
              ))}
            </div>
            <form action={addClarification} className="flex gap-2 border-t border-slate-200 p-3">
              <Input name="message" placeholder="Answer or add context" disabled={isBusy} />
              <Button type="submit" size="icon" disabled={isBusy}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </section>

          <section className="rounded-md border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Revision Comments</h2>
              <Dialog>
                <DialogTrigger render={<Button size="sm" variant="outline" disabled={!selectedDraft} />}>
                  <MessageSquarePlus className="h-4 w-4" />
                  Add
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add AI Revision Comment</DialogTitle>
                  </DialogHeader>
                  <form action={addComment} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Target section</Label>
                      <select name="section_heading" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm">
                        <option value="">No specific section</option>
                        {sections.map((section) => (
                          <option key={section.heading} value={section.heading}>{section.heading}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Quoted text</Label>
                      <Input name="quoted_text" placeholder="Optional copied text from the draft" />
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
            <div className="space-y-3 p-4">
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
            <div className="space-y-3 border-t border-slate-200 p-4">
              <Textarea
                value={revisionInstruction}
                onChange={(event) => setRevisionInstruction(event.target.value)}
                rows={3}
                placeholder="Optional revision instruction"
              />
              <Button className="w-full" onClick={reviseDraft} disabled={isBusy || !selectedDraft || (!openComments.length && !revisionInstruction.trim())}>
                {busy === "revise" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Request Revision
              </Button>
            </div>
          </section>
        </aside>
      </main>
    </div>
  )
}
