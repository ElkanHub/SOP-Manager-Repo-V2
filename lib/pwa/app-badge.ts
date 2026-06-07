"use client"

type BadgeNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

const badgeSources = new Map<string, number>()

function getBadgeNavigator(): BadgeNavigator | null {
  if (typeof navigator === "undefined") return null
  return navigator as BadgeNavigator
}

async function applyBadge(total: number) {
  const badgeNavigator = getBadgeNavigator()
  if (!badgeNavigator?.setAppBadge || !badgeNavigator?.clearAppBadge) return

  try {
    if (total > 0) {
      await badgeNavigator.setAppBadge(total)
    } else {
      await badgeNavigator.clearAppBadge()
    }
  } catch {
    // Badging is best-effort and not supported by every installed PWA surface.
  }
}

export function publishAppBadgeSource(source: string, count: number) {
  badgeSources.set(source, Math.max(0, Math.floor(count || 0)))
  const total = Array.from(badgeSources.values()).reduce((sum, value) => sum + value, 0)
  void applyBadge(total)
}

export function clearAppBadgeSource(source: string) {
  badgeSources.delete(source)
  const total = Array.from(badgeSources.values()).reduce((sum, value) => sum + value, 0)
  void applyBadge(total)
}
