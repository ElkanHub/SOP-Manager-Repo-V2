import type { SyncAction, SyncQueueItem } from "@/lib/db/offline-db"

export interface SyncHandlerContext {
  item: SyncQueueItem
}

export type SyncHandler = (ctx: SyncHandlerContext) => Promise<void>

const registry = new Map<string, SyncHandler>()

export function registerSyncHandler(key: string, handler: SyncHandler): void {
  registry.set(key, handler)
}

export function getSyncHandler(key: string | null | undefined): SyncHandler | undefined {
  if (!key) return undefined
  return registry.get(key)
}

export function handlerKey(table: string, action: SyncAction): string {
  return `${table}:${action}`
}
