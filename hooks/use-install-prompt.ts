"use client"

import { useEffect, useState } from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

let cachedEvent: BeforeInstallPromptEvent | null = null
const subscribers = new Set<(e: BeforeInstallPromptEvent | null) => void>()
let installedHandlerAttached = false

function broadcast() {
  for (const s of subscribers) s(cachedEvent)
}

function attachGlobalListeners() {
  if (installedHandlerAttached || typeof window === "undefined") return
  installedHandlerAttached = true

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault()
    cachedEvent = e as BeforeInstallPromptEvent
    console.info("[PWA] beforeinstallprompt captured")
    broadcast()
  })

  window.addEventListener("appinstalled", () => {
    cachedEvent = null
    console.info("[PWA] appinstalled")
    broadcast()
  })
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  if (window.matchMedia("(display-mode: standalone)").matches) return true
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function isIosSafari(): boolean {
  if (typeof window === "undefined") return false
  const ua = window.navigator.userAgent
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)
  if (!isIos) return false
  const isInAppBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
  return !isInAppBrowser
}

export interface UseInstallPromptResult {
  canInstall: boolean
  isIos: boolean
  installed: boolean
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">
}

export function useInstallPrompt(): UseInstallPromptResult {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(cachedEvent)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    attachGlobalListeners()
    setInstalled(isStandalone())

    const handler = (e: BeforeInstallPromptEvent | null) => setEvent(e)
    subscribers.add(handler)
    return () => {
      subscribers.delete(handler)
    }
  }, [])

  async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
    const e = event ?? cachedEvent
    if (!e) return "unavailable"
    try {
      await e.prompt()
      const { outcome } = await e.userChoice
      if (outcome === "accepted") {
        cachedEvent = null
        broadcast()
      }
      return outcome
    } catch {
      return "unavailable"
    }
  }

  return {
    canInstall: !!event && !installed,
    isIos: isIosSafari() && !installed,
    installed,
    promptInstall,
  }
}
