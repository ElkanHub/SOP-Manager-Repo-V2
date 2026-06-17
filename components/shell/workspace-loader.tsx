"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"

/**
 * Premium brand loader shown ONLY on the login → dashboard transition.
 *
 * The login redirect appends `?welcome=1`; this component detects that flag on
 * mount, strips it from the URL, and plays a short, deliberate splash — the
 * QMS-MANAJA mark with a shimmer sweep running through it, a progress bar, and
 * cycling status messages — then reveals the (already-rendered) dashboard with a
 * soft fade/scale "lifting veil". It adapts the message if the network drops or
 * the load runs long, and matches the user's light/dark theme.
 *
 * Translated from the "Brand Loader" (shimmer-sweep variant) Claude Design.
 */

const MESSAGES = [
  "Getting your workspace ready",
  "Preparing your documents",
  "Syncing the latest changes",
  "Almost there",
]
const OFFLINE_MESSAGE = "Waiting for your connection"
const SLOW_MESSAGE = "Still getting things ready"

// How long the splash lingers at minimum (premium pacing), and when to consider
// the load "slow" so the caption softens its promise.
const MIN_DURATION_MS = 2200
const SLOW_AFTER_MS = 7000
const MESSAGE_INTERVAL_MS = 1100

type Palette = {
  logoBase: string
  accent: string
  wordmark: string
  caption: string
  track: string
  fill: string
}

// The background is intentionally NOT set here — the overlay uses the flat theme
// background (`bg-background`) so it's just the app's black/white, matching the
// user's light/dark mode. This palette only drives the mark + accents.
function paletteFor(dark: boolean, offline: boolean): Palette {
  if (dark) {
    return {
      logoBase: "#334155",
      accent: offline ? "#f59e0b" : "#2dd4bf",
      wordmark: "#e2e8f0",
      caption: "rgba(226,232,240,0.55)",
      track: "rgba(226,232,240,0.12)",
      fill: offline ? "#f59e0b" : "linear-gradient(90deg, #0d9488, #2dd4bf)",
    }
  }
  return {
    logoBase: "#cbd5e1",
    accent: offline ? "#b45309" : "#0284c7",
    wordmark: "#0f172a",
    caption: "rgba(15,23,42,0.55)",
    track: "rgba(15,23,42,0.10)",
    fill: offline ? "#b45309" : "linear-gradient(90deg, #0f172a, #0d9488)",
  }
}

export function WorkspaceLoader() {
  const [visible, setVisible] = useState(false)
  const [dark, setDark] = useState(true)
  const [msgIndex, setMsgIndex] = useState(0)
  const [offline, setOffline] = useState(false)
  const [slow, setSlow] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const startRef = useRef(0)

  // 1. Activate only when arriving from login (?welcome=1), then clean the URL
  //    so a later refresh of the dashboard won't replay the splash.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("welcome") !== "1") return

    startRef.current = Date.now()
    /* eslint-disable react-hooks/set-state-in-effect -- activating the splash from
       the post-login URL flag is the whole point of this mount-time effect. */
    setDark(document.documentElement.classList.contains("dark"))
    setOffline(!navigator.onLine)
    setVisible(true)
    /* eslint-enable react-hooks/set-state-in-effect */

    params.delete("welcome")
    const clean = window.location.pathname + (params.toString() ? `?${params}` : "")
    window.history.replaceState(window.history.state, "", clean)
  }, [])

  // Drop the pre-paint cover only after the overlay has actually rendered above
  // it (z-100 over z-99), so there's never a frame of bare dashboard.
  useEffect(() => {
    if (!visible) return
    document.getElementById("__ws_precover")?.remove()
  }, [visible])

  // 2. Cycle status messages while loading.
  useEffect(() => {
    if (!visible) return
    const id = window.setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, MESSAGES.length - 1))
    }, MESSAGE_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [visible])

  // 3. Track connectivity + a "slow load" threshold so the caption can adapt.
  useEffect(() => {
    if (!visible) return
    const goOnline = () => setOffline(false)
    const goOffline = () => setOffline(true)
    window.addEventListener("online", goOnline)
    window.addEventListener("offline", goOffline)
    const slowTimer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS)
    return () => {
      window.removeEventListener("online", goOnline)
      window.removeEventListener("offline", goOffline)
      window.clearTimeout(slowTimer)
    }
  }, [visible])

  // 4. Reveal the dashboard once it's painted, a minimum dwell has passed, and
  //    we're online. Re-checks when the window finishes loading or we reconnect.
  useEffect(() => {
    if (!visible) return
    let cancelled = false
    let finishTimer: number | undefined

    const tryFinish = () => {
      if (cancelled || !navigator.onLine) return
      const elapsed = Date.now() - startRef.current
      window.clearTimeout(finishTimer)
      finishTimer = window.setTimeout(() => {
        if (cancelled) return
        setFinishing(true) // let the progress bar snap to 100%…
        window.setTimeout(() => !cancelled && setVisible(false), 280) // …then lift the veil
      }, Math.max(0, MIN_DURATION_MS - elapsed))
    }

    if (document.readyState === "complete") tryFinish()
    else window.addEventListener("load", tryFinish, { once: true })
    window.addEventListener("online", tryFinish)

    return () => {
      cancelled = true
      window.clearTimeout(finishTimer)
      window.removeEventListener("load", tryFinish)
      window.removeEventListener("online", tryFinish)
    }
  }, [visible])

  const palette = paletteFor(dark, offline)
  const caption = offline ? OFFLINE_MESSAGE : slow ? SLOW_MESSAGE : MESSAGES[msgIndex]
  const barWidth = finishing ? "100%" : offline ? "62%" : "92%"

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="workspace-loader"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05, filter: "blur(12px)" }}
          transition={{ duration: 0.75, ease: [0.4, 0, 0.2, 1] }}
          className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-7 px-6 bg-background ${finishing ? "pointer-events-none" : ""}`}
          aria-live="polite"
          aria-busy={!finishing}
          role="status"
        >
          <motion.div
            className="flex flex-col items-center gap-7"
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Logo mark with a shimmer sweep running through the silhouette */}
            <div
              style={{
                width: 116,
                height: 116,
                backgroundImage: `linear-gradient(112deg, ${palette.logoBase} 0%, ${palette.logoBase} 36%, ${palette.accent} 50%, ${palette.logoBase} 64%, ${palette.logoBase} 100%)`,
                backgroundSize: "280% 100%",
                backgroundRepeat: "no-repeat",
                animation: `wsldr-sweep ${offline ? "2.6s" : "1.6s"} linear infinite`,
                WebkitMaskImage: "url(/brand/logo-mask.png)",
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                WebkitMaskSize: "contain",
                maskImage: "url(/brand/logo-mask.png)",
                maskRepeat: "no-repeat",
                maskPosition: "center",
                maskSize: "contain",
              }}
            />

            <div
              className="text-lg font-semibold tracking-tight"
              style={{ color: palette.wordmark }}
            >
              QMS-MANAJA
            </div>

            {/* Progress bar */}
            <div
              className="h-[3px] w-[200px] overflow-hidden rounded-full"
              style={{ background: palette.track }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: palette.fill }}
                initial={{ width: "6%" }}
                animate={{ width: barWidth }}
                transition={{ duration: finishing ? 0.26 : MIN_DURATION_MS / 1000, ease: finishing ? "easeOut" : "easeInOut" }}
              />
            </div>

            {/* Adaptive caption */}
            <div
              className="flex items-center gap-2"
              style={{
                color: palette.caption,
                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={caption}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.3 }}
                >
                  {caption}
                </motion.span>
              </AnimatePresence>
              <span className="inline-flex gap-[3px]">
                {[0, 0.2, 0.4].map((delay) => (
                  <span
                    key={delay}
                    className="h-[3px] w-[3px] rounded-full"
                    style={{ background: "currentColor", animation: `wsldr-blink 1.2s ease-in-out ${delay}s infinite` }}
                  />
                ))}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
