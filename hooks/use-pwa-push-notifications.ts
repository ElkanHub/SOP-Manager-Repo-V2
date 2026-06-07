"use client"

import { useEffect } from "react"
import { toast } from "sonner"

const PROMPT_DISMISSED_KEY = "pwa_push_prompt_dismissed_at"
const PROMPT_TTL_MS = 14 * 24 * 60 * 60 * 1000
const PUSH_TOAST_ID = "pwa-push-permission"

function recentlyDismissed() {
  try {
    const value = window.localStorage.getItem(PROMPT_DISMISSED_KEY)
    if (!value) return false
    return Date.now() - Number(value) < PROMPT_TTL_MS
  } catch {
    return false
  }
}

function markDismissed() {
  try {
    window.localStorage.setItem(PROMPT_DISMISSED_KEY, String(Date.now()))
  } catch {
    // Ignore storage failures; prompting remains best-effort.
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

async function saveSubscription(subscription: PushSubscription) {
  await fetch("/api/pwa/push-subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  })
}

async function subscribeForPush() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) {
    console.info("[PWA] Push notifications require NEXT_PUBLIC_VAPID_PUBLIC_KEY")
    return
  }

  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  if (existing) {
    await saveSubscription(existing)
    return
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  })

  await saveSubscription(subscription)
}

function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

export function usePwaPushNotifications() {
  useEffect(() => {
    if (!isPushSupported()) return
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return

    if (Notification.permission === "granted") {
      void subscribeForPush().catch((error) => {
        console.info("[PWA] Push subscription failed", error)
      })
      return
    }

    if (Notification.permission === "denied" || recentlyDismissed()) return

    toast("Enable QMS-MANAJA notifications", {
      id: PUSH_TOAST_ID,
      description: "Get approval, Pulse, training, and workflow alerts when the app is installed.",
      duration: 12000,
      action: {
        label: "Enable",
        onClick: async () => {
          const permission = await Notification.requestPermission()
          if (permission === "granted") {
            await subscribeForPush()
          } else {
            markDismissed()
          }
          toast.dismiss(PUSH_TOAST_ID)
        },
      },
      cancel: {
        label: "Not now",
        onClick: () => {
          markDismissed()
          toast.dismiss(PUSH_TOAST_ID)
        },
      },
    })
  }, [])
}
