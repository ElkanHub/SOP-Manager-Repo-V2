"use client"

import { useEffect, useState } from "react"
import { CloudOff, RefreshCw } from "lucide-react"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { getPendingSyncCount } from "@/lib/db/sync-queue"

export function SyncStatus() {
  const isOnline = useOnlineStatus()
  const [pending, setPending] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function refresh() {
      try {
        const count = await getPendingSyncCount()
        if (!cancelled) setPending(count)
      } catch {
        // ignore
      }
    }
    refresh()
    const interval = window.setInterval(refresh, 10_000)
    window.addEventListener("online", refresh)
    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener("online", refresh)
    }
  }, [isOnline])

  if (pending === 0 && isOnline) return null

  if (!isOnline) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <CloudOff className="h-3.5 w-3.5" />
        Offline{pending > 0 ? ` · ${pending} pending` : ""}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
      Syncing {pending}…
    </span>
  )
}
