"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { toast } from "sonner"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const MARKETING_PATHS = new Set(["/", "/contact"])
const DISMISS_KEY = "pwa_install_dismissed_at"
const IOS_DISMISS_KEY = "pwa_ios_hint_dismissed_at"
const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000 // re-offer after 14 days
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

function isIosSafari(): boolean {
  if (typeof window === "undefined") return false
  const ua = window.navigator.userAgent
  const isIos = /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as Mac; detect via touch + Apple platform
    (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)
  if (!isIos) return false
  // Exclude in-app webviews where install is not possible (CRiOS = Chrome iOS, etc.)
  const isInAppBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
  return !isInAppBrowser
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  if (window.matchMedia("(display-mode: standalone)").matches) return true
  // iOS Safari
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function InstallPrompt() {
  const pathname = usePathname()
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (isStandalone()) return

    function onBeforeInstall(e: Event) {
      e.preventDefault()
      deferredRef.current = e as BeforeInstallPromptEvent
      maybeShow()
    }

    function onInstalled() {
      deferredRef.current = null
      toast.dismiss(TOAST_ID)
    }

    function maybeShow() {
      if (isMarketing(pathname)) return
      if (recentlyDismissed(DISMISS_KEY)) return
      if (!deferredRef.current) return

      toast("Install SOP-Guard Pro", {
        id: TOAST_ID,
        description: "Add the app to your device for faster access and offline use.",
        duration: Infinity,
        action: {
          label: "Install",
          onClick: async () => {
            const evt = deferredRef.current
            if (!evt) return
            try {
              await evt.prompt()
              const { outcome } = await evt.userChoice
              if (outcome === "dismissed") {
                window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
              }
            } catch {
              // user gesture / browser declined
            } finally {
              deferredRef.current = null
              toast.dismiss(TOAST_ID)
            }
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
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    window.addEventListener("appinstalled", onInstalled)

    // If event already fired before mount (some browsers cache it), and we have one queued, try again
    maybeShow()

    // iOS Safari fallback — no beforeinstallprompt event, so show manual instructions
    let iosTimer: number | undefined
    if (
      isIosSafari() &&
      !isMarketing(pathname) &&
      !recentlyDismissed(IOS_DISMISS_KEY)
    ) {
      iosTimer = window.setTimeout(() => {
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
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
      if (iosTimer !== undefined) window.clearTimeout(iosTimer)
    }
  }, [pathname])

  // Hide toasts when user navigates onto a marketing page
  useEffect(() => {
    if (isMarketing(pathname)) {
      toast.dismiss(TOAST_ID)
      toast.dismiss(IOS_TOAST_ID)
    }
  }, [pathname])

  return null
}
