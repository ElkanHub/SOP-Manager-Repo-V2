import { createClient } from "@/lib/supabase/client"
import {
  getPendingSyncItems,
  markSyncFailure,
  removeSyncItem,
} from "@/lib/db/sync-queue"
import { getSyncHandler } from "./handlers"

const MAX_RETRIES = 5

export interface SyncResult {
  synced: number
  failed: number
  abandoned: number
}

export async function runSync(): Promise<SyncResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0, abandoned: 0 }
  }

  const supabase = createClient()
  const queue = await getPendingSyncItems()

  let synced = 0
  let failed = 0
  let abandoned = 0

  for (const item of queue.sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (item.id === undefined) continue

    if (item.retries >= MAX_RETRIES) {
      await removeSyncItem(item.id)
      abandoned++
      continue
    }

    try {
      // Custom handler takes precedence (e.g. server actions that need auth/RLS bypass)
      const customHandler = getSyncHandler(item.handler)
      if (customHandler) {
        await customHandler({ item })
        await removeSyncItem(item.id)
        synced++
        continue
      }

      let error: { message: string } | null = null

      if (item.action === "INSERT") {
        const res = await supabase.from(item.table).insert(item.payload)
        error = res.error
      } else if (item.action === "UPDATE") {
        const payload = item.payload as {
          id: string
          updated_at?: string
          [k: string]: unknown
        }
        const { id, ...rest } = payload

        let query = supabase.from(item.table).update(rest).eq("id", id)
        if (payload.updated_at) {
          // Last-write-wins: only apply if our version is newer than the server's
          query = query.lt("updated_at", payload.updated_at)
        }
        const res = await query
        error = res.error
      } else if (item.action === "DELETE") {
        const { id } = item.payload as { id: string }
        const res = await supabase.from(item.table).delete().eq("id", id)
        error = res.error
      }

      if (error) throw new Error(error.message)

      await removeSyncItem(item.id)
      synced++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await markSyncFailure(item.id, message)
      failed++
    }
  }

  return { synced, failed, abandoned }
}
