"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { usePresenceStore } from "@/store/presence-store"

interface PresenceTrackerProps {
  userId: string
  department: string | null
}

/**
 * Mounts once inside the dashboard layout. Subscribes to a shared Supabase
 * Realtime Presence channel, tracks this user's presence, and feeds the
 * current online-user list into the presence store. Joins/leaves are detected
 * within a few seconds — including tab close, disconnect, and logout.
 */
export function PresenceTracker({ userId, department }: PresenceTrackerProps) {
  const setOnlineUsers = usePresenceStore((s) => s.setOnlineUsers)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel("presence:app", {
      config: { presence: { key: userId } },
    })

    const pushState = () => {
      const state = channel.presenceState() as Record<
        string,
        Array<{ user_id: string; department: string | null }>
      >
      // presenceState keys are user IDs; each may have multiple connections
      // (e.g. multiple tabs). We want unique users.
      const seen = new Set<string>()
      const users: { user_id: string; department: string | null }[] = []
      for (const [, entries] of Object.entries(state)) {
        const entry = entries[0]
        if (!entry?.user_id || seen.has(entry.user_id)) continue
        seen.add(entry.user_id)
        users.push({ user_id: entry.user_id, department: entry.department ?? null })
      }
      setOnlineUsers(users)
    }

    channel
      .on("presence", { event: "sync" }, pushState)
      .on("presence", { event: "join" }, pushState)
      .on("presence", { event: "leave" }, pushState)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: userId, department })
        }
      })

    const handleBeforeUnload = () => {
      // Best-effort: untrack so the leave event fires before the socket closes.
      channel.untrack()
    }
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      channel.untrack()
      supabase.removeChannel(channel)
    }
  }, [userId, department, setOnlineUsers])

  return null
}
