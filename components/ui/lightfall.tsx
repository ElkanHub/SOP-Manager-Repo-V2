"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

type LightfallProps = {
  colors?: string[]
  backgroundColor?: string
  speed?: number
  streakCount?: number
  streakWidth?: number
  streakLength?: number
  density?: number
  twinkle?: number
  glow?: number
  backgroundGlow?: number
  zoom?: number
  opacity?: number
  mouseInteraction?: boolean
  mouseStrength?: number
  mouseRadius?: number
  className?: string
}

type Streak = {
  x: number
  y: number
  length: number
  width: number
  speed: number
  color: string
  alpha: number
  phase: number
}

export function Lightfall({
  colors = ["#a6c8ff", "#27ffee", "#48acbc"],
  backgroundColor = "#052b1e",
  speed = 0.2,
  streakCount = 1,
  streakWidth = 0.2,
  streakLength = 0.4,
  density = 0.6,
  twinkle = 1,
  glow = 1,
  backgroundGlow = 0.1,
  zoom = 1,
  opacity = 0.6,
  mouseInteraction = false,
  mouseStrength = 0.5,
  mouseRadius = 1.75,
  className,
}: LightfallProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const mouseRef = useRef({ x: -9999, y: -9999 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const surface = canvas
    const context = ctx

    let frame = 0
    let raf = 0
    let width = 0
    let height = 0
    let streaks: Streak[] = []

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = surface.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      surface.width = Math.floor(width * dpr)
      surface.height = Math.floor(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      streaks = createStreaks()
    }

    function createStreaks() {
      const amount = Math.max(1, Math.round(streakCount * density * 42))
      return Array.from({ length: amount }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        length: height * (0.12 + streakLength * 0.55) * (0.55 + Math.random() * 0.7),
        width: Math.max(0.5, streakWidth * 10 * (0.65 + Math.random())),
        speed: (0.35 + Math.random() * 0.7) * speed * 8,
        color: colors[index % colors.length],
        alpha: opacity * (0.35 + Math.random() * 0.65),
        phase: Math.random() * Math.PI * 2,
      }))
    }

    function draw() {
      frame += 0.015
      context.fillStyle = backgroundColor
      context.fillRect(0, 0, width, height)

      if (backgroundGlow > 0) {
        const glowGradient = context.createRadialGradient(width * 0.5, height * 0.42, 0, width * 0.5, height * 0.42, Math.max(width, height) * 0.65)
        glowGradient.addColorStop(0, `rgba(39, 255, 238, ${backgroundGlow})`)
        glowGradient.addColorStop(0.45, `rgba(72, 172, 188, ${backgroundGlow * 0.45})`)
        glowGradient.addColorStop(1, "rgba(5, 43, 30, 0)")
        context.fillStyle = glowGradient
        context.fillRect(0, 0, width, height)
      }

      context.save()
      context.translate(width / 2, height / 2)
      context.scale(zoom, zoom)
      context.translate(-width / 2, -height / 2)

      for (const streak of streaks) {
        streak.y += streak.speed
        streak.x += streak.speed * 0.18
        if (streak.y - streak.length > height || streak.x > width + streak.length) {
          streak.y = -streak.length * (0.1 + Math.random())
          streak.x = Math.random() * width * 0.9
        }

        const twinkleAlpha = streak.alpha * (0.72 + Math.sin(frame * 4 * twinkle + streak.phase) * 0.2)
        const mouse = mouseRef.current
        const dx = streak.x - mouse.x
        const dy = streak.y - mouse.y
        const mouseDistance = Math.sqrt(dx * dx + dy * dy)
        const mouseBoost = mouseInteraction && mouseDistance < mouseRadius * 120
          ? 1 + mouseStrength * (1 - mouseDistance / (mouseRadius * 120))
          : 1

        const gradient = context.createLinearGradient(streak.x, streak.y - streak.length, streak.x + streak.length * 0.22, streak.y)
        gradient.addColorStop(0, "rgba(255,255,255,0)")
        gradient.addColorStop(0.55, hexToRgba(streak.color, twinkleAlpha * mouseBoost))
        gradient.addColorStop(1, "rgba(255,255,255,0)")

        context.shadowColor = streak.color
        context.shadowBlur = glow * 16
        context.strokeStyle = gradient
        context.lineWidth = streak.width
        context.beginPath()
        context.moveTo(streak.x, streak.y - streak.length)
        context.lineTo(streak.x + streak.length * 0.22, streak.y)
        context.stroke()
      }

      context.restore()
      raf = requestAnimationFrame(draw)
    }

    function handleMouse(event: MouseEvent) {
      const rect = surface.getBoundingClientRect()
      mouseRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }

    resize()
    draw()
    window.addEventListener("resize", resize)
    if (mouseInteraction) window.addEventListener("mousemove", handleMouse)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
      window.removeEventListener("mousemove", handleMouse)
    }
  }, [
    backgroundColor,
    backgroundGlow,
    colors,
    density,
    glow,
    mouseInteraction,
    mouseRadius,
    mouseStrength,
    opacity,
    speed,
    streakCount,
    streakLength,
    streakWidth,
    twinkle,
    zoom,
  ])

  return <canvas ref={canvasRef} className={cn("absolute inset-0 h-full w-full", className)} aria-hidden="true" />
}

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "")
  const value = Number.parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`
}
