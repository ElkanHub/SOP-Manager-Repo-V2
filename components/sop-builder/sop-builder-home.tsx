"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import { Loader2, Plus, Search, Send, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type SessionRow = {
  id: string
  title: string
  department: string | null
  status: string
  updated_at: string
  active_draft?: { version?: number | null; docx_path?: string | null } | null
}

function getTimeGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export function SopBuilderHome({
  sessions,
  profileName,
}: {
  sessions: SessionRow[]
  profileName?: string | null
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [request, setRequest] = useState("")
  const [pending, setPending] = useState(false)

  const firstName = (profileName || "there").trim().split(/\s+/)[0] || "there"

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sessions
    return sessions.filter((s) =>
      [s.title, s.department, s.status].filter(Boolean).join(" ").toLowerCase().includes(q),
    )
  }, [query, sessions])

  async function start() {
    const purpose = request.trim()
    if (!purpose) {
      toast.error("Describe the SOP you want to build.")
      return
    }
    setPending(true)
    try {
      const res = await fetch("/api/sop-builder/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled SOP", purpose }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to start")
      router.push(`/sop-builder/${data.session.id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start the agent")
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-background md:-m-6">
      {/* Artifacts sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-muted/30 lg:flex">
        <div className="px-4 py-3.5">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your SOPs</span>
        </div>
        <div className="px-3">
          <Button render={<Link href="/sop-builder/new" />} variant="outline" size="sm" className="w-full justify-start">
            <Plus className="h-4 w-4" />
            New SOP
          </Button>
        </div>
        <div className="px-3 pt-3">
          <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="h-6 border-0 px-0 text-sm shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
        <div className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
          {filtered.map((s) => (
            <Link
              key={s.id}
              href={`/sop-builder/${s.id}`}
              className="block rounded-lg px-2.5 py-2 transition hover:bg-accent/60"
            >
              <div className="truncate text-sm text-foreground/80">{s.title || "Untitled SOP"}</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(s.updated_at), { addSuffix: true })}
              </div>
            </Link>
          ))}
          {filtered.length === 0 && <p className="px-2.5 py-4 text-xs text-muted-foreground">No SOPs yet.</p>}
        </div>
      </aside>

      {/* Centered start */}
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-teal/10 text-brand-teal">
              <Sparkles className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{getTimeGreeting()}, {firstName}.</h1>
            <p className="max-w-md text-sm text-muted-foreground">
              Describe the procedure and the agent will draft a detailed, audit-ready SOP. Refine it in one conversation.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-input bg-card p-3 shadow-sm focus-within:ring-1 focus-within:ring-ring">
            <textarea
              autoFocus
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  start()
                }
              }}
              rows={4}
              placeholder="e.g. Write an SOP for cleaning and sanitising the tablet compression area, including frequency, materials, steps, and the records to complete."
              className="w-full resize-none bg-transparent px-2 py-2 text-sm outline-none"
            />
            <div className="flex items-center justify-end px-1 pt-1">
              <Button onClick={start} disabled={pending || !request.trim()}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Build SOP
              </Button>
            </div>
          </div>

          {/* Recent (mobile, where the sidebar is hidden) */}
          {sessions.length > 0 && (
            <div className="mt-8 lg:hidden">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your SOPs</p>
              <div className="space-y-2">
                {sessions.slice(0, 6).map((s) => (
                  <Link
                    key={s.id}
                    href={`/sop-builder/${s.id}`}
                    className="block rounded-lg border border-border px-3 py-2.5 transition hover:bg-accent/60"
                  >
                    <div className="truncate text-sm font-medium">{s.title || "Untitled SOP"}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(s.updated_at), { addSuffix: true })}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
