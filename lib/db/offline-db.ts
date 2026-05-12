import type { DBSchema, IDBPDatabase } from "idb"
import { openDB } from "idb"

export type SyncAction = "INSERT" | "UPDATE" | "DELETE"

export interface SyncQueueItem {
  id?: number
  table: string
  action: SyncAction
  payload: Record<string, unknown>
  created_at: string
  retries: number
  last_error?: string | null
  // Optional handler key — when set, sync engine dispatches to a registered
  // handler (e.g. a server action) instead of writing directly via Supabase REST.
  handler?: string | null
}

export interface OfflineRecord<T = Record<string, unknown>> {
  id: string
  data: T
  updated_at: string
  synced: boolean
  deleted?: boolean
}

interface AppDB extends DBSchema {
  sops: {
    key: string
    value: OfflineRecord
    indexes: { "by-updated": string; "by-department": string }
  }
  equipment: {
    key: string
    value: OfflineRecord
    indexes: { "by-updated": string; "by-department": string }
  }
  departments: {
    key: string
    value: OfflineRecord
    indexes: { "by-updated": string }
  }
  profiles: {
    key: string
    value: OfflineRecord
    indexes: { "by-updated": string }
  }
  messages_cache: {
    key: string
    value: {
      id: string
      conversation_id: string
      created_at: string
      data: Record<string, unknown>
      synced: boolean
      temp_id?: string
    }
    indexes: { "by-conversation": string; "by-created": string }
  }
  sync_queue: {
    key: number
    value: SyncQueueItem
    indexes: { "by-created": string }
  }
  meta: {
    key: string
    value: { key: string; value: unknown; updated_at: string }
  }
}

export type OfflineStoreName = "sops" | "equipment" | "departments" | "profiles"
export type AppDBSchema = AppDB

const DB_NAME = "sop-guard-offline"
const DB_VERSION = 2

let dbPromise: Promise<IDBPDatabase<AppDB>> | null = null

export function getDB(): Promise<IDBPDatabase<AppDB>> {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser")
  }

  if (!dbPromise) {
    dbPromise = openDB<AppDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("sops")) {
          const s = db.createObjectStore("sops", { keyPath: "id" })
          s.createIndex("by-updated", "updated_at")
          s.createIndex("by-department", "data.department" as never)
        }
        if (!db.objectStoreNames.contains("equipment")) {
          const s = db.createObjectStore("equipment", { keyPath: "id" })
          s.createIndex("by-updated", "updated_at")
          s.createIndex("by-department", "data.department" as never)
        }
        if (!db.objectStoreNames.contains("departments")) {
          const s = db.createObjectStore("departments", { keyPath: "id" })
          s.createIndex("by-updated", "updated_at")
        }
        if (!db.objectStoreNames.contains("profiles")) {
          const s = db.createObjectStore("profiles", { keyPath: "id" })
          s.createIndex("by-updated", "updated_at")
        }
        if (!db.objectStoreNames.contains("sync_queue")) {
          const q = db.createObjectStore("sync_queue", {
            keyPath: "id",
            autoIncrement: true,
          })
          q.createIndex("by-created", "created_at")
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" })
        }
        if (!db.objectStoreNames.contains("messages_cache")) {
          const m = db.createObjectStore("messages_cache", { keyPath: "id" })
          m.createIndex("by-conversation", "conversation_id")
          m.createIndex("by-created", "created_at")
        }
      },
    })
  }

  return dbPromise
}

export async function clearOfflineDB(): Promise<void> {
  const db = await getDB()
  await Promise.all([
    db.clear("sops"),
    db.clear("equipment"),
    db.clear("departments"),
    db.clear("profiles"),
    db.clear("messages_cache"),
    db.clear("sync_queue"),
    db.clear("meta"),
  ])
}
