"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ArrowRight, FileText, Menu, Plus, Search, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import Lightfall from "@/components/Lightfall"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type SessionRow = {
  id: string
  title: string
  department: string | null
  status: string
  updated_at: string
  active_draft?: { version?: number | null; docx_path?: string | null } | null
}

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

function getTimeGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function getWelcomeMessage(firstName: string, sessions: SessionRow[]) {
  const greeting = getTimeGreeting()
  const latest = sessions[0]
  if (!latest) return `${greeting}, ${firstName}. Ready to shape your first SOP?`
  if (latest.active_draft?.docx_path) return `${greeting}, ${firstName}. Your latest SOP is ready for Word review.`
  if (latest.status === "clarifying") return `${greeting}, ${firstName}. The agent is waiting for your answers.`
  return `${greeting}, ${firstName}.`
}

function useTypewriter(text: string) {
  const [value, setValue] = useState("")

  useEffect(() => {
    let index = 0
    const timer = window.setInterval(() => {
      index += 1
      setValue(text.slice(0, index))
      if (index >= text.length) window.clearInterval(timer)
    }, 34)

    return () => window.clearInterval(timer)
  }, [text])

  return value
}

export function SopBuilderHome({
  sessions,
  profileName,
}: {
  sessions: SessionRow[]
  profileName?: string | null
}) {
  const [query, setQuery] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)

  const firstName = (profileName || "there").trim().split(/\s+/)[0] || "there"
  const welcomeMessage = useMemo(() => getWelcomeMessage(firstName, sessions), [firstName, sessions])
  const typedGreeting = useTypewriter(welcomeMessage)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sessions
    return sessions.filter((session) =>
      [session.title, session.department, session.status].filter(Boolean).join(" ").toLowerCase().includes(q)
    )
  }, [query, sessions])

  return (
    <div
      className={cn(
        "relative isolate min-h-[calc(100vh-4rem)] overflow-hidden md:-m-6",
        "bg-[#27358b] text-white"
      )}
    >
      <div className="absolute inset-0">
        <Lightfall
          colors={sopBuilderLightfall.colors}
          backgroundColor="#27358b"
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
      </div>

      <header className="relative z-10 flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <div className="text-sm font-semibold tracking-tight text-white">AI SOP Builder</div>
        <Button
          render={<Link href="/sop-builder/new" />}
          className="h-10 rounded-full bg-white px-4 text-slate-950 shadow-sm hover:bg-white/90"
        >
          <Plus className="h-4 w-4" />
          Start New SOP
        </Button>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-9rem)] items-center justify-center px-6 py-16 text-center sm:px-8">
        <div className="mx-auto max-w-4xl">
          <h1
            className="min-h-[4.5rem] text-balance text-4xl font-semibold tracking-normal text-white sm:text-6xl"
          >
            {typedGreeting}
            <span className="ml-1 inline-block w-3 animate-pulse text-[#27ffdd]">
              |
            </span>
          </h1>
        </div>
      </main>

      <div className="relative z-10 flex justify-center px-5 pb-8 sm:px-8">
        <Button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="h-10 rounded-full border border-white/15 bg-white/10 px-4 text-white backdrop-blur hover:bg-white/18"
        >
          <Menu className="h-4 w-4" />
          Chats
        </Button>
      </div>

      <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
        <DrawerContent className="mx-auto h-[min(82vh,760px)] max-w-4xl rounded-t-2xl border-border shadow-2xl">
          <div className="flex min-h-0 flex-1 flex-col">
            <DrawerHeader className="border-b border-border px-4 py-4 text-left sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <DrawerTitle>Chats</DrawerTitle>
                  <DrawerDescription>Continue an SOP draft session.</DrawerDescription>
                </div>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setMenuOpen(false)}>
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </div>
            </DrawerHeader>

            <div className="border-b border-border p-4 sm:px-6">
              <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search chats"
                  className="h-7 border-0 px-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
              {filtered.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border text-center">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">No chats found</p>
                    <p className="mt-1 text-xs text-muted-foreground">Start a new SOP draft to create one.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((session) => (
                    <Link
                      key={session.id}
                      href={`/sop-builder/${session.id}`}
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-lg border border-transparent px-3 py-3 transition hover:border-border hover:bg-muted/60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-foreground">{session.title}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {session.department || "No department"} ·{" "}
                            {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
                          </p>
                        </div>
                        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="capitalize">
                          {session.status.replace(/_/g, " ")}
                        </Badge>
                        {session.active_draft?.version && <Badge variant="secondary">v{session.active_draft.version}</Badge>}
                        {session.active_draft?.docx_path && <Badge className="bg-brand-teal text-white">Word ready</Badge>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
