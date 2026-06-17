"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { motion } from "motion/react"
import { ArrowLeft, Bot, Download, FileText, Loader2, PanelLeft, Plus, Send, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SopViewerLazy as SopViewer } from "@/components/library/sop-viewer-lazy"
import { MarkdownViewer } from "./markdown-viewer"
import type { SopBuilderDraft, SopBuilderSession } from "@/lib/sop-builder/types"

type Message = {
  id: string
  sender: "user" | "agent" | "system"
  message: string
  message_type: string
  created_at: string
}
type SessionRow = { id: string; title: string | null; status: string; updated_at: string; active_draft_id?: string | null }
type Pane = "chat" | "doc"
type DocView = "markdown" | "word"
type Selection = { text: string; sectionHeading: string | null }

const PURPOSE_PLACEHOLDER = "Pending — described in chat"
const SPRING = { type: "spring", stiffness: 380, damping: 34 } as const

export function SopBuilderWorkspace({
  initialSession,
  initialDrafts,
  initialMessages,
  sessions,
}: {
  initialSession: SopBuilderSession
  initialDrafts: SopBuilderDraft[]
  initialMessages: Message[]
  sessions: SessionRow[]
}) {
  const router = useRouter()
  const [session, setSession] = useState(initialSession)
  const [drafts, setDrafts] = useState(initialDrafts)
  const [messages, setMessages] = useState(initialMessages)
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [pane, setPane] = useState<Pane>("chat")
  const [docView, setDocView] = useState<DocView>("markdown")
  const [wordUrl, setWordUrl] = useState<string | null>(null)
  const [wordLoading, setWordLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const kicked = useRef(false)
  const autoShown = useRef(false)

  const activeDraft = useMemo(
    () => drafts.find((d) => d.id === session.active_draft_id) || drafts[0] || null,
    [drafts, session.active_draft_id],
  )
  const visibleMessages = useMemo(() => messages.filter((m) => m.sender !== "system"), [messages])
  const hasDoc = Boolean(activeDraft?.markdown_content)
  const started = visibleMessages.length > 0 || busy

  // Surface the document once, the first time one exists.
  useEffect(() => {
    if (hasDoc && !autoShown.current) {
      autoShown.current = true
      setPane("doc")
    }
  }, [hasDoc])

  // Word preview is invalidated whenever the active draft changes.
  useEffect(() => setWordUrl(null), [activeDraft?.id])

  useEffect(() => {
    if (pane === "chat") scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [visibleMessages.length, busy, pane])

  useEffect(() => {
    if (kicked.current) return
    const purpose = (session.purpose || "").trim()
    if (drafts.length === 0 && visibleMessages.length === 0 && purpose && purpose !== PURPOSE_PLACEHOLDER) {
      kicked.current = true
      void send(purpose)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function send(explicit?: string) {
    const text = (explicit ?? input).trim()
    if (!text || busy) return
    if (!explicit) setInput("")
    const sel = selection
    setSelection(null)
    setBusy(true)
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      sender: "user",
      message: sel ? `“${sel.text}” — ${text}` : text,
      message_type: "chat",
      created_at: new Date().toISOString(),
    }
    setMessages((m) => [...m, optimistic])
    try {
      const res = await fetch(`/api/sop-builder/sessions/${session.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          selection: sel ? { quoted: sel.text, sectionHeading: sel.sectionHeading } : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "The agent could not respond")
      setSession(data.session)
      setDrafts(data.drafts)
      setMessages(data.messages)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong")
      setMessages((m) => m.filter((x) => x.id !== optimistic.id))
      if (!explicit) setInput(text)
      if (sel) setSelection(sel)
    } finally {
      setBusy(false)
    }
  }

  async function ensureWord() {
    if (!activeDraft || wordUrl || wordLoading) return
    setWordLoading(true)
    try {
      const res = await fetch(`/api/sop-builder/drafts/${activeDraft.id}/generate-word`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not render the Word preview")
      setWordUrl(data.signedUrl || null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Word preview failed")
    } finally {
      setWordLoading(false)
    }
  }

  useEffect(() => {
    if (pane === "doc" && docView === "word") void ensureWord()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pane, docView, activeDraft?.id])

  async function downloadWord() {
    if (!activeDraft || wordLoading) return
    setWordLoading(true)
    try {
      const res = await fetch(`/api/sop-builder/drafts/${activeDraft.id}/generate-word`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Download failed")
      if (data.signedUrl) {
        setWordUrl(data.signedUrl)
        window.location.href = data.signedUrl
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed")
    } finally {
      setWordLoading(false)
    }
  }

  function onSelectText(sel: { text: string; sectionHeading: string | null }) {
    setSelection({ text: sel.text, sectionHeading: sel.sectionHeading })
    setPane("chat")
  }

  const composer = (
    <Composer input={input} setInput={setInput} onSend={() => send()} busy={busy} centered={!started} />
  )

  return (
    <div className="flex h-full min-h-0 bg-background">
      <ArtifactSidebar sessions={sessions} currentId={session.id} open={sidebarOpen} />

      <section className="flex h-full min-h-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-border px-3 py-3">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="hidden rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground lg:block"
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
          <Link href="/sop-builder" className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground lg:hidden">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{session.title || "New SOP"}</p>
          {hasDoc && (
            <div className="flex items-center rounded-lg border border-border p-0.5 text-xs font-medium">
              {(["chat", "doc"] as Pane[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPane(p)}
                  className={`rounded-md px-2.5 py-1 transition ${pane === p ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {p === "chat" ? "Chat" : "Document"}
                </button>
              ))}
            </div>
          )}
        </header>

        {pane === "chat" ? (
          <>
            {started ? (
              <>
                <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
                  <div className="mx-auto flex max-w-2xl flex-col gap-5">
                    {visibleMessages.map((m) => (
                      <Bubble key={m.id} message={m} />
                    ))}
                    {busy && <Thinking hasDoc={hasDoc} />}
                  </div>
                </div>
                <motion.div layoutId="sop-composer" transition={SPRING} className="border-t border-border px-4 py-3">
                  <div className="mx-auto max-w-2xl">
                    {selection && <SelectionChip selection={selection} onClear={() => setSelection(null)} />}
                    {composer}
                  </div>
                </motion.div>
              </>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-4">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-teal/10 text-brand-teal">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight">What SOP can we build?</h2>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Describe the procedure and I&apos;ll draft a detailed, audit-ready SOP. We&apos;ll refine it together.
                  </p>
                </div>
                <motion.div layoutId="sop-composer" transition={SPRING} className="w-full max-w-2xl">
                  {composer}
                </motion.div>
              </div>
            )}
          </>
        ) : (
          activeDraft && (
            <div className="flex min-h-0 flex-1 flex-col bg-muted/20">
              <div className="flex items-center justify-between gap-3 border-b border-border bg-background/60 px-4 py-2.5 backdrop-blur">
                <div className="flex items-center rounded-lg border border-border p-0.5 text-xs font-medium">
                  {(["markdown", "word"] as DocView[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setDocView(v)}
                      className={`rounded-md px-2.5 py-1 capitalize transition ${docView === v ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {v === "word" ? "Word" : "Markdown"}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">v{activeDraft.version}</Badge>
                  <Button size="sm" variant="outline" onClick={downloadWord} disabled={wordLoading}>
                    {wordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Word
                  </Button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                {docView === "markdown" ? (
                  <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white px-8 py-7 text-slate-900 shadow-sm">
                    <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                      AI-generated draft — not approved, not effective, and not for operational use.
                    </div>
                    <MarkdownViewer markdown={activeDraft.markdown_content} onTextSelected={onSelectText} />
                  </div>
                ) : (
                  <div className="mx-auto h-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    {wordUrl ? (
                      <SopViewer fileUrl={wordUrl} status="draft" className="h-full" />
                    ) : (
                      <div className="flex h-full min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Rendering Word preview…
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </section>
    </div>
  )
}

function SelectionChip({ selection, onClear }: { selection: Selection; onClear: () => void }) {
  return (
    <div className="mb-2 flex items-start gap-2 rounded-lg border border-brand-teal/30 bg-brand-teal/5 px-3 py-2 text-xs">
      <div className="min-w-0 flex-1">
        <span className="font-semibold text-brand-teal">Commenting on{selection.sectionHeading ? ` §${selection.sectionHeading}` : ""}:</span>{" "}
        <span className="text-muted-foreground">“{selection.text.length > 160 ? `${selection.text.slice(0, 160)}…` : selection.text}”</span>
      </div>
      <button onClick={onClear} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Clear selection">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function ArtifactSidebar({ sessions, currentId, open }: { sessions: SessionRow[]; currentId: string; open: boolean }) {
  return (
    <aside className={`hidden h-full shrink-0 flex-col bg-muted/30 transition-[width] duration-300 lg:flex ${open ? "w-64 border-r border-border" : "w-0 overflow-hidden"}`}>
      <div className="flex items-center px-4 py-3.5">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your SOPs</span>
      </div>
      <div className="px-3">
        <Button render={<Link href="/sop-builder/new" />} variant="outline" size="sm" className="w-full justify-start">
          <Plus className="h-4 w-4" />
          New SOP
        </Button>
      </div>
      <div className="mt-3 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {sessions.map((s) => {
          const active = s.id === currentId
          return (
            <Link key={s.id} href={`/sop-builder/${s.id}`} className={`block rounded-lg px-2.5 py-2 transition ${active ? "bg-accent" : "hover:bg-accent/60"}`}>
              <div className={`truncate text-sm ${active ? "font-medium text-foreground" : "text-foreground/80"}`}>{s.title || "Untitled SOP"}</div>
              <div className="truncate text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(s.updated_at), { addSuffix: true })}</div>
            </Link>
          )
        })}
        {sessions.length === 0 && <p className="px-2.5 py-4 text-xs text-muted-foreground">No SOPs yet.</p>}
      </div>
    </aside>
  )
}

function Bubble({ message }: { message: Message }) {
  if (message.sender === "user") {
    return (
      <div className="flex justify-end duration-300 animate-in fade-in slide-in-from-bottom-1">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-brand-navy px-4 py-2.5 text-sm leading-6 text-white">
          {message.message}
        </div>
      </div>
    )
  }
  return (
    <div className="flex gap-3 duration-300 animate-in fade-in slide-in-from-bottom-1">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-teal/10 text-brand-teal">
        <Bot className="h-4 w-4" />
      </div>
      <div className="max-w-[85%] whitespace-pre-wrap text-sm leading-7 text-foreground/90">{message.message}</div>
    </div>
  )
}

function Thinking({ hasDoc }: { hasDoc: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-teal/10 text-brand-teal">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {hasDoc ? "Working on the document…" : "Thinking…"}
      </div>
    </div>
  )
}

function Composer({
  input,
  setInput,
  onSend,
  busy,
  centered,
}: {
  input: string
  setInput: (text: string) => void
  onSend: () => void
  busy: boolean
  centered: boolean
}) {
  return (
    <div>
      <div className="flex items-end gap-2 rounded-2xl border border-input bg-background p-2 shadow-sm transition focus-within:ring-1 focus-within:ring-ring">
        <textarea
          autoFocus={centered}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              onSend()
            }
          }}
          rows={1}
          placeholder={centered ? "Describe the SOP you want to build…" : "Reply, or comment on the document…"}
          disabled={busy}
          className="max-h-44 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none disabled:opacity-60"
        />
        <Button size="icon" onClick={onSend} disabled={busy || !input.trim()} className="h-9 w-9 shrink-0 rounded-xl">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      <p className="mt-1.5 px-1 text-center text-[10px] text-muted-foreground">
        Drafts are AI-generated and must be reviewed and approved before use.
      </p>
    </div>
  )
}
