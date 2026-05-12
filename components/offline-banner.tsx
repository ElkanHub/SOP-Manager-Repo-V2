"use client"

import { WifiOff } from "lucide-react"
import { useOnlineStatus } from "@/hooks/use-online-status"

export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[60] flex items-center justify-center gap-2 bg-amber-500/95 px-4 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur supports-[backdrop-filter]:bg-amber-500/90"
    >
      <WifiOff className="h-3.5 w-3.5" />
      <span>Working offline — changes will sync when you reconnect</span>
    </div>
  )
}
