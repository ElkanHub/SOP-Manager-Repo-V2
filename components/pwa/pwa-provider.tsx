"use client"

import { useEffect } from "react"
import { useOfflineSeed } from "@/hooks/use-offline-seed"
import { usePwaPushNotifications } from "@/hooks/use-pwa-push-notifications"
import { useSyncOnReconnect } from "@/hooks/use-sync-on-reconnect"
import { useSwUpdate } from "@/hooks/use-sw-update"
import { OfflineBanner } from "@/components/offline-banner"
import { registerMessageHandlers } from "@/lib/sync/message-handlers"

export function PwaProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerMessageHandlers()
  }, [])

  useOfflineSeed()
  usePwaPushNotifications()
  useSyncOnReconnect()
  useSwUpdate()

  return (
    <>
      <OfflineBanner />
      {children}
    </>
  )
}
