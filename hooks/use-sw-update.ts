"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"

const TOAST_ID = "pwa-update-available"
const CHECK_INTERVAL_MS = 30 * 60 * 1000 // 30 min

function showUpdateToast(reg: ServiceWorkerRegistration) {
  toast("New version available", {
    id: TOAST_ID,
    description: "Reload to get the latest improvements.",
    duration: Infinity,
    action: {
      label: "Reload",
      onClick: () => {
        const waiting = reg.waiting
        if (!waiting) {
          window.location.reload()
          return
        }
        // Reload after the new worker takes control
        const reload = () => window.location.reload()
        navigator.serviceWorker.addEventListener("controllerchange", reload, {
          once: true,
        })
        waiting.postMessage({ type: "SKIP_WAITING" })
      },
    },
    cancel: {
      label: "Later",
      onClick: () => toast.dismiss(TOAST_ID),
    },
  })
}

export function useSwUpdate(): void {
  const checkedOnce = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return

    let pollTimer: number | undefined
    let cleanup = () => {}

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return

      // If a worker is already waiting when we mount, prompt immediately.
      if (reg.waiting && navigator.serviceWorker.controller) {
        showUpdateToast(reg)
      }

      // Force an update check on mount so we don't depend on the browser's
      // own heuristic about when to re-fetch sw.js. The server now sends
      // Cache-Control: max-age=0 for /sw.js so this is a cheap conditional
      // GET in practice.
      reg.update().catch(() => {})

      const onUpdateFound = () => {
        const installing = reg.installing
        if (!installing) return
        installing.addEventListener("statechange", () => {
          if (
            installing.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            showUpdateToast(reg)
          }
        })
      }

      reg.addEventListener("updatefound", onUpdateFound)

      // Poll for updates on a long interval so long-lived tabs don't go stale.
      pollTimer = window.setInterval(() => {
        reg.update().catch(() => {})
      }, CHECK_INTERVAL_MS)

      // Trigger one check on focus / visibility-return so users returning to
      // an old tab see the toast quickly.
      const onFocus = () => {
        if (checkedOnce.current) return
        checkedOnce.current = true
        reg.update().catch(() => {})
        window.setTimeout(() => {
          checkedOnce.current = false
        }, 60_000)
      }
      window.addEventListener("focus", onFocus)
      document.addEventListener("visibilitychange", onFocus)

      cleanup = () => {
        reg.removeEventListener("updatefound", onUpdateFound)
        window.removeEventListener("focus", onFocus)
        document.removeEventListener("visibilitychange", onFocus)
        if (pollTimer !== undefined) window.clearInterval(pollTimer)
      }
    })

    return () => cleanup()
  }, [])
}
