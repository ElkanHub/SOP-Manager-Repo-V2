"use client"

import { memo, useMemo } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

type UserLike =
  | {
      full_name?: string | null
      avatar_url?: string | null
    }
  | null
  | undefined

interface UserAvatarProps {
  /** Preferred input: pass the full user-like object and we'll pull name + image. */
  user?: UserLike
  /** Alternative/legacy: explicit name. Overrides `user.full_name` if provided. */
  name?: string | null
  /** Alternative/legacy: explicit image URL. Overrides `user.avatar_url` if provided. */
  image?: string | null
  /**
   * One of the canonical sizes. Custom sizes can be applied by passing
   * Tailwind size utilities via `className` (e.g. `"size-5"`), which will
   * override these defaults.
   */
  size?: "xs" | "sm" | "default" | "lg" | "xl"
  /** Additional classes on the Avatar root (e.g. rings, shadows, custom size). */
  className?: string
  /** Additional classes on the fallback (e.g. force a specific text size). */
  fallbackClassName?: string
  /**
   * When true (default), the initials fallback gets a deterministic pastel
   * background derived from the name — the same user looks the same
   * everywhere, but each person gets a distinct color.
   */
  deterministicColor?: boolean
  /** Overrides the computed `alt` text. */
  alt?: string
}

const SIZE_CLASS: Record<NonNullable<UserAvatarProps["size"]>, string> = {
  xs: "size-5",
  sm: "size-6",
  default: "size-8",
  lg: "size-10",
  xl: "size-14",
}

const FALLBACK_TEXT_SIZE: Record<NonNullable<UserAvatarProps["size"]>, string> = {
  xs: "text-[9px]",
  sm: "text-[10px]",
  default: "text-xs",
  lg: "text-sm",
  xl: "text-lg",
}

// Stable FNV-1a-ish hash → hue. Cheap and deterministic.
function hashName(name: string): number {
  let h = 2166136261
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function colorForName(name: string): { bg: string; fg: string } {
  const hue = hashName(name) % 360
  // Soft pastel surface, darker text of the same hue for contrast.
  return {
    bg: `hsl(${hue} 70% 88%)`,
    fg: `hsl(${hue} 70% 28%)`,
  }
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  const initials = parts.map(p => p[0]?.toUpperCase() ?? "").join("")
  return initials || "?"
}

/**
 * Canonical avatar used everywhere in the app. Prefers the real avatar image
 * when present and automatically falls back to initials on load failure
 * (handled by the underlying Base-UI Avatar primitive).
 *
 * Performance notes:
 * - `loading="lazy"` + `decoding="async"` so off-screen avatars don't block
 *   the main thread and don't fetch until scrolled into view.
 * - `referrerPolicy="no-referrer"` keeps third-party image hosts from
 *   triggering cross-origin caching surprises.
 * - Memoised so lists of users re-render cheaply.
 */
export const UserAvatar = memo(function UserAvatar({
  user,
  name,
  image,
  size = "default",
  className,
  fallbackClassName,
  deterministicColor = true,
  alt,
}: UserAvatarProps) {
  const resolvedName = name ?? user?.full_name ?? null
  const resolvedImage = image ?? user?.avatar_url ?? null

  const initials = useMemo(() => getInitials(resolvedName), [resolvedName])
  const colors = useMemo(
    () => (deterministicColor && resolvedName ? colorForName(resolvedName) : null),
    [deterministicColor, resolvedName],
  )

  const fallbackStyle = colors
    ? { backgroundColor: colors.bg, color: colors.fg }
    : undefined

  return (
    <Avatar className={cn(SIZE_CLASS[size], className)}>
      {resolvedImage && (
        <AvatarImage
          src={resolvedImage}
          alt={alt ?? resolvedName ?? "User"}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      )}
      <AvatarFallback
        className={cn("font-bold", FALLBACK_TEXT_SIZE[size], fallbackClassName)}
        style={fallbackStyle}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
})
