"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  CloudOff,
  RefreshCw,
  LayoutDashboard,
  Library,
  Wrench,
  MessagesSquare,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const QUICK_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/library", label: "SOP Library", icon: Library },
  { href: "/equipment", label: "Equipment", icon: Wrench },
  { href: "/messages", label: "Messages", icon: MessagesSquare },
]

export function OfflineScreen() {
  const [online, setOnline] = useState<boolean>(true)
  const [retrying, setRetrying] = useState(false)
  const [autoReloadIn, setAutoReloadIn] = useState<number | null>(null)

  useEffect(() => {
    setOnline(typeof navigator === "undefined" ? true : navigator.onLine)

    const handleOnline = () => {
      setOnline(true)
      // Give the SW a moment to reclaim control, then refresh
      setAutoReloadIn(2)
    }
    const handleOffline = () => {
      setOnline(false)
      setAutoReloadIn(null)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  useEffect(() => {
    if (autoReloadIn === null) return
    if (autoReloadIn <= 0) {
      window.location.reload()
      return
    }
    const t = window.setTimeout(() => setAutoReloadIn((s) => (s ?? 0) - 1), 1000)
    return () => window.clearTimeout(t)
  }, [autoReloadIn])

  const handleRetry = () => {
    setRetrying(true)
    window.location.reload()
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background to-brand-navy/[0.04] dark:to-brand-navy/[0.12]">
      {/* Decorative background — soft radial wash, brand-tinted */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(13,43,85,0.10), transparent 55%), radial-gradient(circle at 80% 80%, rgba(20,184,166,0.08), transparent 55%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] [background-size:48px_48px] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)]"
      />

      <main className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        {/* Connection chip */}
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors",
            online
              ? "border-brand-teal/30 bg-brand-teal/10 text-brand-teal"
              : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300",
          )}
        >
          <span
            className={cn(
              "inline-block h-1.5 w-1.5 rounded-full",
              online ? "bg-brand-teal" : "bg-amber-500 animate-pulse",
            )}
          />
          {online ? "Connection restored" : "No connection"}
        </div>

        {/* Hero icon */}
        <div className="relative">
          <div
            aria-hidden
            className={cn(
              "absolute inset-0 -m-6 rounded-full blur-2xl transition-opacity",
              online ? "bg-brand-teal/20 opacity-70" : "bg-brand-navy/15 opacity-60",
            )}
          />
          <div
            className={cn(
              "relative flex h-24 w-24 items-center justify-center rounded-3xl border shadow-xl ring-1",
              online
                ? "border-brand-teal/30 bg-brand-teal/10 text-brand-teal ring-brand-teal/20"
                : "border-border bg-background text-brand-navy ring-border/50 dark:text-foreground",
            )}
          >
            {online ? (
              <CheckCircle2 className="h-10 w-10" />
            ) : (
              <CloudOff className="h-10 w-10" />
            )}
          </div>
        </div>

        {/* Copy */}
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {online ? "Back online" : "You&rsquo;re offline"}
          </h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            {online
              ? autoReloadIn !== null
                ? `Reloading in ${autoReloadIn}s…`
                : "Reconnecting now."
              : "We couldn&rsquo;t reach SOP-Guard Pro from this device. Anything you&rsquo;ve already viewed is still available, and any changes you make will sync automatically when your connection returns."}
          </p>
        </div>

        {/* Primary actions */}
        <div className="flex w-full max-w-xs flex-col gap-2 sm:max-w-sm sm:flex-row sm:items-center sm:justify-center">
          <Button
            onClick={handleRetry}
            disabled={retrying}
            className="h-11 flex-1 bg-brand-navy text-white hover:bg-brand-navy/90"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", retrying && "animate-spin")} />
            Try again
          </Button>
          <Link
            href="/dashboard"
            className="inline-flex h-11 flex-1 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Open dashboard
          </Link>
        </div>

        {/* Available offline */}
        <div className="w-full pt-4">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground/80">
            Available offline
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-4 text-xs font-medium text-foreground/80 backdrop-blur transition-all hover:border-brand-teal/50 hover:bg-brand-teal/5 hover:text-foreground hover:shadow-sm"
              >
                <Icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-brand-teal" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-2 text-[11px] text-muted-foreground/70">
          SOP-Guard Pro &middot; Working offline is supported on this device
        </div>
      </main>
    </div>
  )
}
