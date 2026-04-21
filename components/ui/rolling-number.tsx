"use client"

import { cn } from "@/lib/utils"

interface RollingNumberProps {
  value: number
  className?: string
  /** Transition duration in ms. Default 500. */
  durationMs?: number
}

/**
 * A slot-machine style digit counter. Each digit position holds a vertical
 * column of 0–9 and uses a CSS transform transition to slide to the current
 * value — increments slide the column upward, decrements slide it downward.
 * Sizing is em-based so it matches the surrounding font size automatically.
 */
export function RollingNumber({ value, className, durationMs = 500 }: RollingNumberProps) {
  const safe = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0))
  const digits = String(safe).split("")

  return (
    <span
      className={cn("inline-flex tabular-nums leading-none align-baseline", className)}
      aria-label={String(safe)}
      role="status"
    >
      {digits.map((d, i) => {
        // Stable identity per position from the right so adding/removing a
        // leading digit doesn't remount all cells.
        const posFromRight = digits.length - 1 - i
        return (
          <DigitCell
            key={posFromRight}
            digit={parseInt(d, 10)}
            durationMs={durationMs}
          />
        )
      })}
    </span>
  )
}

function DigitCell({ digit, durationMs }: { digit: number; durationMs: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block overflow-hidden leading-none"
      style={{ height: "1em" }}
    >
      <span
        className="flex flex-col leading-none will-change-transform"
        style={{
          transform: `translateY(-${digit}em)`,
          transition: `transform ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        }}
      >
        {Array.from({ length: 10 }, (_, n) => (
          <span key={n} style={{ height: "1em", lineHeight: "1em" }}>
            {n}
          </span>
        ))}
      </span>
    </span>
  )
}
