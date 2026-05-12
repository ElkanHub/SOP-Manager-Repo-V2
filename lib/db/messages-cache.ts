import { getDB } from "./offline-db"

interface MessageRow {
  id: string
  conversation_id: string
  created_at: string
  [key: string]: unknown
}

export async function cacheMessages(rows: MessageRow[]): Promise<void> {
  if (!rows.length) return
  const db = await getDB()
  const tx = db.transaction("messages_cache", "readwrite")
  await Promise.all([
    ...rows.map((row) =>
      tx.store.put({
        id: row.id,
        conversation_id: row.conversation_id,
        created_at: row.created_at,
        data: row as Record<string, unknown>,
        synced: true,
      }),
    ),
    tx.done,
  ])
}

export async function cachePendingMessage(row: MessageRow & { temp_id: string }): Promise<void> {
  const db = await getDB()
  await db.put("messages_cache", {
    id: row.temp_id,
    conversation_id: row.conversation_id,
    created_at: row.created_at,
    data: row as Record<string, unknown>,
    synced: false,
    temp_id: row.temp_id,
  })
}

export async function replacePendingMessage(
  tempId: string,
  realRow: MessageRow,
): Promise<void> {
  const db = await getDB()
  const tx = db.transaction("messages_cache", "readwrite")
  await tx.store.delete(tempId)
  await tx.store.put({
    id: realRow.id,
    conversation_id: realRow.conversation_id,
    created_at: realRow.created_at,
    data: realRow as Record<string, unknown>,
    synced: true,
  })
  await tx.done
}

export async function getCachedMessages<T = MessageRow>(
  conversationId: string,
  limit = 200,
): Promise<T[]> {
  const db = await getDB()
  const tx = db.transaction("messages_cache", "readonly")
  const index = tx.store.index("by-conversation")
  const rows: T[] = []
  let cursor = await index.openCursor(IDBKeyRange.only(conversationId))
  while (cursor) {
    rows.push(cursor.value.data as T)
    cursor = await cursor.continue()
  }
  await tx.done
  rows.sort((a, b) => {
    const aT = (a as { created_at?: string }).created_at ?? ""
    const bT = (b as { created_at?: string }).created_at ?? ""
    return bT.localeCompare(aT)
  })
  return rows.slice(0, limit)
}

export async function getLatestCachedCreatedAt(
  conversationId: string,
): Promise<string | null> {
  const rows = await getCachedMessages(conversationId, 1)
  return rows[0]?.created_at ?? null
}

export async function removeCachedMessage(id: string): Promise<void> {
  const db = await getDB()
  await db.delete("messages_cache", id)
}
