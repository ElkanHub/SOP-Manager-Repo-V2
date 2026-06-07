import webPush, { WebPushError } from "web-push"
import { createServiceClient } from "@/lib/supabase/server"

type PushSubscriptionRow = {
  endpoint: string
  p256dh: string
  auth: string
}

export type PwaPushPayload = {
  title: string
  body: string
  url?: string
  tag?: string
  badgeCount?: number
}

let configured = false

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@qms-manaja.app"

  if (!publicKey || !privateKey) return false
  if (!configured) {
    webPush.setVapidDetails(subject, publicKey, privateKey)
    configured = true
  }
  return true
}

function isExpiredSubscriptionError(error: unknown) {
  return error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)
}

export async function sendPwaPushToUsers(userIds: string[], payload: PwaPushPayload) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)))
  if (uniqueUserIds.length === 0 || !configureWebPush()) return

  const service = await createServiceClient()
  const { data: subscriptions, error } = await service
    .from("pwa_push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", uniqueUserIds)
    .eq("is_active", true)

  if (error || !subscriptions?.length) {
    if (error) console.error("[PWA] Failed to load push subscriptions:", error.message)
    return
  }

  await Promise.all(
    (subscriptions as PushSubscriptionRow[]).map(async (subscription) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify(payload)
        )
      } catch (error: unknown) {
        if (isExpiredSubscriptionError(error)) {
          await service
            .from("pwa_push_subscriptions")
            .update({ is_active: false, last_seen_at: new Date().toISOString() })
            .eq("endpoint", subscription.endpoint)
          return
        }
        console.error("[PWA] Push send failed:", error)
      }
    })
  )
}
