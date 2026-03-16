"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface NumberTickerProps {
  value: number
  duration?: number
  className?: string
}

export function NumberTicker({ value, duration = 0.6, className }: NumberTickerProps) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let startTime: number | null = null
    const startValue = 0
    const endValue = value

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1)
      
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentValue = Math.floor(startValue + (endValue - startValue) * easeOut)
      
      setDisplayValue(currentValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration])

  return (
    <span className={cn("tabular-nums", className)}>
      {displayValue}
    </span>
  )
}
