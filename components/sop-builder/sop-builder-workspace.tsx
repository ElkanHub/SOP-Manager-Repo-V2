"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Bot, Download, FileText, Loader2, Send, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MarkdownViewer } from "./markdown-viewer"
import type { SopBuilderDraft, SopBuilderSession } from "@/lib/sop-builder/types"

type Message = {
  id: string
  sender: "user" | "agent" | "system"
  message: string
  message_type: string
  created_at: string
}

const PURPOSE_PLACEHOLDER = "Pending — described in chat"

export function SopBuilderWorkspace({
  initialSession,
  initialDrafts,
  initialMessages,
}: {
  initialSession: SopBuilderSession
  initialDrafts: SopBuilderDraft[]
  initialMessages: Message[]
}) {
  const router = useRouter()
  const [session, setSession] = useState(initialSession)
  const [drafts, setDrafts] = useState(initialDrafts)
  const [messages, setMessages] = useState(initialMessages)
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const kicked = useRef(false)

  const activeDraft = useMemo(
    () => drafts.find((d) => d.id === session.active_draft_id) || drafts[0] || null,
    [drafts, session.active_draft_id],
  )
  const visibleMessages = useMemo(() => messages.filter((m) => m.sender !== "system"), [messages])
  const hasDoc = Boolean(activeDraft?.markdown_content)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [visibleMessages.length, busy])

  // Auto-start: when arriving with a described purpose but nothing generated yet,
  // kick off the first turn so the user lands straight in the conversation.
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
    setBusy(true)
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      sender: "user",
      message: text,
      message_type: "chat",
      created_at: new Date().toISOString(),
    }
    setMessages((m) => [...m, optimistic])
    try {
      const res = await fetch(`/api/sop-builder/sessions/${session.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
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
    } finally {
      setBusy(false)
    }
  }

  async function downloadWord() {
    if (!activeDraft || downloading) return
    setDownloading(true)
    try {
      const res = await fetch(`/api/sop-builder/drafts/${activeDraft.id}/generate-word`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not generate the Word file")
      if (data.signedUrl) window.location.href = data.signedUrl
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 bg-background">
      {/* Conversation */}
      <section className={`flex h-full min-h-0 flex-col ${hasDoc ? "w-full border-r border-border md:max-w-md xl:max-w-lg" : "w-full"}`}>
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Link href="/sop-builder" className="text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{session.title || "New SOP"}</p>
            <p className="text-[11px] text-muted-foreground">SOP drafting agent</p>
          </div>
          {hasDoc && (
            <Button size="sm" variant="outline" onClick={downloadWord} disabled={downloading} className="md:hidden">
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            </Button>
          )}
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-5">
            {visibleMessages.length === 0 && !busy && <Welcome onPick={setInput} />}
            {visibleMessages.map((m) => (
              <Bubble key={m.id} message={m} />
            ))}
            {busy && <Thinking hasDoc={hasDoc} />}
          </div>
        </div>

        <Composer input={input} setInput={setInput} onSend={() => send()} busy={busy} />
      </section>

      {/* Document (supporting view) */}
      {hasDoc && activeDraft && (
        <aside className="hidden h-full min-h-0 flex-1 flex-col bg-muted/20 md:flex">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-background/60 px-5 py-3 backdrop-blur">
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-brand-teal" />
              <span className="truncate text-sm font-semibold">{activeDraft.structured_content_json?.title || session.title}</span>
              <Badge variant="secondary" className="shrink-0">v{activeDraft.version}</Badge>
            </div>
            <Button size="sm" variant="outline" onClick={downloadWord} disabled={downloading}>
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Word
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card px-8 py-7 shadow-sm">
              <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                AI-generated draft — not approved, not effective, and not for operational use.
              </div>
              <MarkdownViewer markdown={activeDraft.markdown_content} />
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}

function Welcome({ onPick }: { onPick: (text: string) => void }) {
  const suggestions = [
    "Write an SOP for cleaning and sanitising the tablet compression area.",
    "Draft an SOP for handling out-of-specification (OOS) laboratory results.",
    "Create an SOP for receiving and quarantining incoming raw materials.",
  ]
  return (
    <div className="flex flex-col items-center gap-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-teal/10 text-brand-teal">
        <Sparkles className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">What SOP should we build?</h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
          Describe the procedure in plain language. I&apos;ll draft a detailed, audit-ready SOP and we&apos;ll refine it together.
        </p>
      </div>
      <div className="flex w-full max-w-xl flex-col gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm text-foreground/80 transition hover:border-brand-teal/40 hover:bg-accent"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function Bubble({ message }: { message: Message }) {
  if (message.sender === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-brand-navy px-4 py-2.5 text-sm leading-6 text-white">
          {message.message}
        </div>
      </div>
    )
  }
  return (
    <div className="flex gap-3">
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
        {hasDoc ? "Revising the draft…" : "Drafting your SOP…"}
      </div>
    </div>
  )
}

function Composer({
  input,
  setInput,
  onSend,
  busy,
}: {
  input: string
  setInput: (text: string) => void
  onSend: () => void
  busy: boolean
}) {
  return (
    <div className="border-t border-border px-4 py-3">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-end gap-2 rounded-2xl border border-input bg-background p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                onSend()
              }
            }}
            rows={1}
            placeholder="Describe the SOP you need, or ask for a change…"
            disabled={busy}
            className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none disabled:opacity-60"
          />
          <Button size="icon" onClick={onSend} disabled={busy || !input.trim()} className="h-9 w-9 shrink-0 rounded-xl">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">
          The agent drafts compliance-ready SOPs. Every draft must be reviewed and approved before use.
        </p>
      </div>
    </div>
  )
}
