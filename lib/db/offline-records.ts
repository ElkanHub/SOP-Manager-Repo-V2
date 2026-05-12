import type { OfflineRecord, OfflineStoreName } from "./offline-db"
import { getDB } from "./offline-db"

interface Row {
  id: string
  updated_at?: string | null
  created_at?: string | null
  [key: string]: unknown
}

function toRecord(row: Row): OfflineRecord {
  return {
    id: row.id,
    data: row,
    updated_at: row.updated_at ?? row.created_at ?? new Date(0).toISOString(),
    synced: true,
  }
}

export async function getAllLocal<T extends Row = Row>(
  store: OfflineStoreName,
): Promise<T[]> {
  const db = await getDB()
  const records = (await db.getAll(store)) as OfflineRecord[]
  return records.filter((r) => !r.deleted).map((r) => r.data as T)
}

export async function getLocal<T extends Row = Row>(
  store: OfflineStoreName,
  id: string,
): Promise<T | undefined> {
  const db = await getDB()
  const record = (await db.get(store, id)) as OfflineRecord | undefined
  if (!record || record.deleted) return undefined
  return record.data as T
}

export async function putLocal(
  store: OfflineStoreName,
  row: Row,
  opts: { synced?: boolean } = {},
): Promise<void> {
  const db = await getDB()
  const record: OfflineRecord = { ...toRecord(row), synced: opts.synced ?? false }
  await db.put(store, record)
}

export async function markLocalDeleted(
  store: OfflineStoreName,
  id: string,
): Promise<void> {
  const db = await getDB()
  const existing = (await db.get(store, id)) as OfflineRecord | undefined
  if (!existing) return
  await db.put(store, { ...existing, deleted: true, synced: false })
}

export async function removeLocal(
  store: OfflineStoreName,
  id: string,
): Promise<void> {
  const db = await getDB()
  await db.delete(store, id)
}

export async function seedLocal(
  store: OfflineStoreName,
  rows: Row[],
): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(store, "readwrite")
  await Promise.all([
    ...rows.map((row) =>
      tx.store.put({ ...toRecord(row), synced: true } as OfflineRecord),
    ),
    tx.done,
  ])
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDB()
  await db.put("meta", { key, value, updated_at: new Date().toISOString() })
}

export async function getMeta<T = unknown>(key: string): Promise<T | undefined> {
  const db = await getDB()
  const row = await db.get("meta", key)
  return row?.value as T | undefined
}
