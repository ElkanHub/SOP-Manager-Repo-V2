"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Bot, FileText, Plus, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-teal">
            <Bot className="h-4 w-4" />
            Drafting workspace
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">AI SOP Builder</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Create draft SOPs with a guided AI workflow, review the Markdown draft, then generate a Word file when ready.
          </p>
        </div>
        <Button render={<Link href="/sop-builder/new" />}>
          <Plus className="h-4 w-4" />
          Start New SOP
        </Button>
      </header>

      <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search sessions"
          className="h-7 border-0 px-0 shadow-none focus-visible:ring-0"
        />
      </div>

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <FileText className="h-9 w-9 text-muted-foreground" />
            <div>
              <p className="font-semibold text-slate-900">No SOP Builder sessions found</p>
              <p className="mt-1 text-sm text-muted-foreground">Start a new SOP draft to begin.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((session) => (
              <Link
                key={session.id}
                href={`/sop-builder/${session.id}`}
                className="grid gap-3 px-4 py-4 transition hover:bg-slate-50 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-sm font-semibold text-slate-900">{session.title}</h2>
                    <Badge variant="outline" className="capitalize">{session.status.replace(/_/g, " ")}</Badge>
                    {session.active_draft?.version && (
                      <Badge variant="secondary">v{session.active_draft.version}</Badge>
                    )}
                    {session.active_draft?.docx_path && <Badge className="bg-brand-teal text-white">Word ready</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {session.department || "No department"} · Updated {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
                  </p>
                </div>
                <Button variant="outline" size="sm">Open</Button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

