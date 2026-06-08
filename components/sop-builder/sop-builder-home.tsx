"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ArrowRight, Bot, FileText, Plus, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Lightfall from "@/components/Lightfall"
import { useMemo, useState } from "react"

type SessionRow = {
  id: string
  title: string
  department: string | null
  status: string
  updated_at: string
  active_draft?: { version?: number | null; docx_path?: string | null } | null
}

export function SopBuilderHome({ sessions }: { sessions: SessionRow[] }) {
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sessions
    return sessions.filter((session) =>
      [session.title, session.department, session.status].filter(Boolean).join(" ").toLowerCase().includes(q)
    )
  }, [query, sessions])

  return (
    <div className="min-h-full bg-[#f7f8fa]">
      <div className="grid min-h-[calc(100vh-5rem)] lg:grid-cols-[minmax(360px,0.72fr)_minmax(440px,1fr)]">
        <section className="flex flex-col border-r border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-brand-teal">
                  <Bot className="h-4 w-4" />
                  AI SOP Builder
                </div>
                <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Draft sessions</h1>
              </div>
              <Button render={<Link href="/sop-builder/new" />} size="sm">
                <Plus className="h-4 w-4" />
                New
              </Button>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search drafts"
                className="h-7 border-0 px-0 shadow-none focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {filtered.length === 0 ? (
              <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 text-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">No drafts yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Start with a new SOP brief.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((session) => (
                  <Link
                    key={session.id}
                    href={`/sop-builder/${session.id}`}
                    className="block rounded-xl border border-transparent px-3 py-3 transition hover:border-slate-200 hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold text-slate-950">{session.title}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {session.department || "No department"} · {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
                        </p>
                      </div>
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="capitalize">{session.status.replace(/_/g, " ")}</Badge>
                      {session.active_draft?.version && <Badge variant="secondary">v{session.active_draft.version}</Badge>}
                      {session.active_draft?.docx_path && <Badge className="bg-brand-teal text-white">Word ready</Badge>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="relative flex items-center justify-center overflow-hidden bg-[#052b1e] px-6 py-10 text-white">
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(5,43,30,0.02),rgba(5,43,30,0.75))]" />
          <div className="relative z-10 max-w-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur">
              <Bot className="h-6 w-6 text-[#27ffee]" />
            </div>
            <h2 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">Build a draft SOP with an agent.</h2>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/78">
              Start with a structured brief, continue in a familiar chat workspace, review Markdown as the working draft, and generate Word only when the draft is ready.
            </p>
            <div className="mt-8">
              <Button render={<Link href="/sop-builder/new" />} className="h-10 bg-white text-slate-950 hover:bg-white/90">
                <Plus className="h-4 w-4" />
                Start New SOP
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

