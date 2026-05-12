"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { toast } from "sonner"
import { useInstallPrompt } from "@/hooks/use-install-prompt"

const MARKETING_PATHS = new Set(["/", "/contact"])
const DISMISS_KEY = "pwa_install_dismissed_at"
const IOS_DISMISS_KEY = "pwa_ios_hint_dismissed_at"
const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000
const TOAST_ID = "pwa-install"
const IOS_TOAST_ID = "pwa-ios-install"
const IOS_HINT_DELAY_MS = 2000

function isMarketing(pathname: string | null): boolean {
  if (!pathname) return false
  return MARKETING_PATHS.has(pathname)
}

function recentlyDismissed(key: string): boolean {
  try {
    const ts = window.localStorage.getItem(key)
    if (!ts) return false
    return Date.now() - Number(ts) < DISMISS_TTL_MS
  } catch {
    return false
  }
}

export function InstallPrompt() {
  const pathname = usePathname()
  const { canInstall, isIos, promptInstall } = useInstallPrompt()
  const iosShown = useRef(false)

  // Chrome/Edge install toast
  useEffect(() => {
    if (!canInstall) return
    if (isMarketing(pathname)) return
    if (recentlyDismissed(DISMISS_KEY)) return

    toast("Install SOP-Guard Pro", {
      id: TOAST_ID,
      description: "Add the app to your device for faster access and offline use.",
      duration: Infinity,
      action: {
        label: "Install",
        onClick: async () => {
          const outcome = await promptInstall()
          if (outcome === "dismissed") {
            window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
          }
          toast.dismiss(TOAST_ID)
        },
      },
      cancel: {
        label: "Not now",
        onClick: () => {
          window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
          toast.dismiss(TOAST_ID)
        },
      },
    })
  }, [canInstall, pathname, promptInstall])

  // iOS Safari fallback
  useEffect(() => {
    if (!isIos) return
    if (iosShown.current) return
    if (isMarketing(pathname)) return
    if (recentlyDismissed(IOS_DISMISS_KEY)) return

    const t = window.setTimeout(() => {
      iosShown.current = true
      toast("Install SOP-Guard Pro", {
        id: IOS_TOAST_ID,
        description:
          "Tap the Share button, then 'Add to Home Screen' to install this app on your device.",
        duration: Infinity,
        cancel: {
          label: "Got it",
          onClick: () => {
            window.localStorage.setItem(IOS_DISMISS_KEY, String(Date.now()))
            toast.dismiss(IOS_TOAST_ID)
          },
        },
      })
    }, IOS_HINT_DELAY_MS)

    return () => window.clearTimeout(t)
  }, [isIos, pathname])

  // Dismiss when navigating to a marketing route
  useEffect(() => {
    if (isMarketing(pathname)) {
      toast.dismiss(TOAST_ID)
      toast.dismiss(IOS_TOAST_ID)
    }
  }, [pathname])

  return null
}
