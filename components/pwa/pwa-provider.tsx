"use client"

import { useEffect } from "react"
import { useOfflineSeed } from "@/hooks/use-offline-seed"
import { useSyncOnReconnect } from "@/hooks/use-sync-on-reconnect"
import { OfflineBanner } from "@/components/offline-banner"
import { registerMessageHandlers } from "@/lib/sync/message-handlers"

export function PwaProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerMessageHandlers()
  }, [])

  useOfflineSeed()
  useSyncOnReconnect()

  return (
    <>
      <OfflineBanner />
      {children}
    </>
  )
}
