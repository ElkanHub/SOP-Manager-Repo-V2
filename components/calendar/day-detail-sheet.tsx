"use client"

import * as React from "react"
import { format, isSameDay } from "date-fns"
import { Wrench, Globe2, Users, Plus, Trash2, Loader2, CalendarDays } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { CalendarEvent, Equipment, Profile } from "@/types/app.types"
import { deleteEvent } from "@/actions/events"

interface DayDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  day: Date | null
  events: CalendarEvent[]
  pmDates: { date: string; equipment: Equipment }[]
  profile: Profile
  onAddEvent: (dateStr: string) => void
  onDeleted?: () => void
}

export function DayDetailSheet({
  open,
  onOpenChange,
  day,
  events,
  pmDates,
  profile,
  onAddEvent,
  onDeleted,
}: DayDetailSheetProps) {
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const canCreate = profile.role === "manager" || profile.is_admin

  if (!day) return null
  const isToday = isSameDay(day, new Date())
  const dateStr = format(day, "yyyy-MM-dd")

  const handleDelete = async (eventId: string) => {
    setDeletingId(eventId)
    try {
      const res = await deleteEvent(eventId)
      if (res.success) onDeleted?.()
    } finally {
      setDeletingId(null)
    }
  }

  const publicEvents = events.filter((e) => e.visibility === "public")
  const deptEvents = events.filter((e) => e.visibility !== "public")
  const totalItems = events.length + pmDates.length

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border bg-gradient-to-br from-brand-teal/8 via-brand-navy/5 to-transparent p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-border/60 bg-card shadow-sm">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {format(day, "MMM")}
              </span>
              <span
                className={`-mt-0.5 text-xl font-bold leading-none ${
                  isToday ? "text-brand-teal" : "text-foreground"
                }`}
              >
                {format(day, "d")}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="flex items-center gap-2 text-base">
                {format(day, "EEEE")}
                {isToday && (
                  <span className="rounded-full bg-brand-teal/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-teal">
                    Today
                  </span>
                )}
              </SheetTitle>
              <SheetDescription className="mt-0.5 text-xs">
                {format(day, "MMMM d, yyyy")} · {totalItems}{" "}
                {totalItems === 1 ? "item" : "items"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5">
          {totalItems === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 py-10 text-center">
              <CalendarDays className="mb-3 h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">Nothing scheduled</p>
              <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
                No PM items or events on this day.
              </p>
            </div>
          )}

          {pmDates.length > 0 && (
            <Section
              label="Preventive Maintenance"
              count={pmDates.length}
              Icon={Wrench}
              accent="teal"
            >
              {pmDates.map((pm) => (
                <DetailRow
                  key={`pm-${pm.equipment.id}-${pm.date}`}
                  title={pm.equipment.name}
                  subtitle={
                    pm.equipment.department
                      ? `${pm.equipment.department}${pm.equipment.asset_id ? ` · ${pm.equipment.asset_id}` : ""}`
                      : pm.equipment.asset_id
                  }
                  Icon={Wrench}
                  accent="teal"
                />
              ))}
            </Section>
          )}

          {publicEvents.length > 0 && (
            <Section
              label="Company-wide"
              count={publicEvents.length}
              Icon={Globe2}
              accent="blue"
            >
              {publicEvents.map((e) => (
                <DetailRow
                  key={e.id}
                  title={e.title}
                  subtitle={e.description}
                  Icon={Globe2}
                  accent="blue"
                  onDelete={
                    e.created_by === profile.id ? () => handleDelete(e.id) : undefined
                  }
                  deleting={deletingId === e.id}
                />
              ))}
            </Section>
          )}

          {deptEvents.length > 0 && (
            <Section
              label="Department"
              count={deptEvents.length}
              Icon={Users}
              accent="slate"
            >
              {deptEvents.map((e) => (
                <DetailRow
                  key={e.id}
                  title={e.title}
                  subtitle={
                    e.description ||
                    (e.department ? `Department: ${e.department}` : undefined)
                  }
                  Icon={Users}
                  accent="slate"
                  onDelete={
                    e.created_by === profile.id ? () => handleDelete(e.id) : undefined
                  }
                  deleting={deletingId === e.id}
                />
              ))}
            </Section>
          )}
        </div>

        {canCreate && (
          <div className="border-t border-border bg-muted/20 p-4">
            <Button
              onClick={() => onAddEvent(dateStr)}
              className="w-full bg-brand-navy hover:bg-brand-navy/90 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add event on {format(day, "MMM d")}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

type Accent = "teal" | "blue" | "slate"

const accentMap: Record<Accent, { bg: string; text: string; ring: string }> = {
  teal: {
    bg: "bg-brand-teal/10",
    text: "text-brand-teal",
    ring: "ring-brand-teal/20",
  },
  blue: {
    bg: "bg-brand-blue/10",
    text: "text-brand-blue",
    ring: "ring-brand-blue/20",
  },
  slate: {
    bg: "bg-slate-500/10 dark:bg-slate-400/10",
    text: "text-slate-700 dark:text-slate-200",
    ring: "ring-slate-500/20 dark:ring-slate-400/20",
  },
}

function Section({
  label,
  count,
  Icon,
  accent,
  children,
}: {
  label: string
  count: number
  Icon: React.ComponentType<{ className?: string }>
  accent: Accent
  children: React.ReactNode
}) {
  const a = accentMap[accent]
  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-2 flex items-center gap-2 px-0.5">
        <span className={`flex h-5 w-5 items-center justify-center rounded-md ${a.bg} ${a.text}`}>
          <Icon className="h-3 w-3" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <span className="text-[11px] text-muted-foreground/70">· {count}</span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function DetailRow({
  title,
  subtitle,
  Icon,
  accent,
  onDelete,
  deleting,
}: {
  title: string
  subtitle?: string
  Icon: React.ComponentType<{ className?: string }>
  accent: Accent
  onDelete?: () => void
  deleting?: boolean
}) {
  const a = accentMap[accent]
  return (
    <div className="group flex items-start gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5 transition-colors hover:border-border">
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ring-1 ${a.bg} ${a.text} ${a.ring}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {subtitle && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
          onClick={onDelete}
          disabled={deleting}
          aria-label="Delete event"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
      )}
    </div>
  )
}
