"use client"

import { useOfflineSeed } from "@/hooks/use-offline-seed"
import { useSyncOnReconnect } from "@/hooks/use-sync-on-reconnect"
import { OfflineBanner } from "@/components/offline-banner"

export function PwaProvider({ children }: { children: React.ReactNode }) {
  useOfflineSeed()
  useSyncOnReconnect()

  return (
    <>
      <OfflineBanner />
      {children}
    </>
  )
}
