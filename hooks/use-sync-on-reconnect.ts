"use client"

import { useCallback, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { runSync } from "@/lib/sync/sync-engine"

export function useSyncOnReconnect(): void {
  const queryClient = useQueryClient()

  const sync = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.onLine) return
    const result = await runSync()

    if (result.synced > 0) {
      toast.success(
        `Synced ${result.synced} offline change${result.synced === 1 ? "" : "s"}`,
      )
      queryClient.invalidateQueries()
    }
    if (result.abandoned > 0) {
      toast.error(
        `${result.abandoned} change${result.abandoned === 1 ? "" : "s"} could not be synced and were discarded`,
      )
    }
  }, [queryClient])

  useEffect(() => {
    sync()
    window.addEventListener("online", sync)
    return () => window.removeEventListener("online", sync)
  }, [sync])
}
