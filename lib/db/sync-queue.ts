import type { SyncAction, SyncQueueItem } from "./offline-db"
import { getDB } from "./offline-db"

export async function enqueueSync(
  table: string,
  action: SyncAction,
  payload: Record<string, unknown>,
  options: { handler?: string | null } = {},
): Promise<number> {
  const db = await getDB()
  return db.add("sync_queue", {
    table,
    action,
    payload,
    created_at: new Date().toISOString(),
    retries: 0,
    last_error: null,
    handler: options.handler ?? null,
  })
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const db = await getDB()
  return db.getAll("sync_queue")
}

export async function getPendingSyncCount(): Promise<number> {
  const db = await getDB()
  return db.count("sync_queue")
}

export async function removeSyncItem(id: number): Promise<void> {
  const db = await getDB()
  await db.delete("sync_queue", id)
}

export async function markSyncFailure(
  id: number,
  error: string,
): Promise<void> {
  const db = await getDB()
  const item = await db.get("sync_queue", id)
  if (!item) return
  await db.put("sync_queue", {
    ...item,
    retries: item.retries + 1,
    last_error: error,
  })
}

export async function clearSyncQueue(): Promise<void> {
  const db = await getDB()
  await db.clear("sync_queue")
}
