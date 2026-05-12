"use client"

import { sendMessage } from "@/actions/messages"
import { replacePendingMessage, removeCachedMessage } from "@/lib/db/messages-cache"
import { registerSyncHandler, handlerKey } from "./handlers"

let registered = false

export function registerMessageHandlers(): void {
  if (registered) return
  registered = true

  registerSyncHandler(handlerKey("messages", "INSERT"), async ({ item }) => {
    const payload = item.payload as {
      tempId: string
      conversationId: string
      body: string
      mentions?: string[]
      referenceType?: string | null
      referenceId?: string | null
      replyToId?: string | null
    }

    try {
      const real = await sendMessage({
        conversationId: payload.conversationId,
        body: payload.body,
        mentions: payload.mentions ?? [],
        referenceType: payload.referenceType ?? null,
        referenceId: payload.referenceId ?? null,
        replyToId: payload.replyToId ?? null,
      })

      if (real && typeof real === "object" && "id" in real) {
        await replacePendingMessage(payload.tempId, real as {
          id: string
          conversation_id: string
          created_at: string
          [k: string]: unknown
        })
      } else {
        await removeCachedMessage(payload.tempId)
      }
    } catch (err) {
      // Let the sync engine retry by re-throwing
      throw err
    }
  })
}
