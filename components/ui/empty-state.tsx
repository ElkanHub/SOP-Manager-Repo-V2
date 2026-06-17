import type { LucideIcon } from "lucide-react"
import { Inbox } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  /** Icon shown above the title. Defaults to an inbox. */
  icon?: LucideIcon
  title: string
  description?: string
  /** Optional call-to-action (a Button, Link, etc.). */
  action?: React.ReactNode
  className?: string
  /** Tighter padding for use inside cards/panels. */
  compact?: boolean
}

/**
 * Standard "loaded but no data" state. Use for any list/table/panel that can
 * legitimately have zero rows — gives the user an explanation and (ideally) a
 * next step instead of a blank area. For fetch *failures* use <ErrorCard/>.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        compact ? "p-6" : "p-10",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
