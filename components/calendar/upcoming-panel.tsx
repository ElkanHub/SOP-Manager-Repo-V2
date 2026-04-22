"use client"

import { format, addDays, isSameDay, differenceInDays } from "date-fns"
import { Wrench, Globe2, Users, CalendarRange } from "lucide-react"
import { CalendarEvent, Equipment } from "@/types/app.types"

interface UpcomingPanelProps {
  events: CalendarEvent[]
  equipmentPmDates: { date: string; equipment: Equipment }[]
  userDepartment: string
  onDaySelect?: (day: Date) => void
}

type Row =
  | { kind: "pm"; id: string; title: string; subtitle?: string; date: Date }
  | {
    kind: "event"
    id: string
    title: string
    subtitle?: string
    date: Date
    visibility: "public" | "department"
    department?: string
  }

export function UpcomingPanel({
  events,
  equipmentPmDates,
  userDepartment,
  onDaySelect,
}: UpcomingPanelProps) {
  const today = new Date()
  const horizon = 14
  const next = Array.from({ length: horizon }, (_, i) => addDays(today, i))

  // Build ordered rows
  const rows: Row[] = []
  for (const day of next) {
    const dayStr = format(day, "yyyy-MM-dd")
    equipmentPmDates
      .filter((pm) => pm.date === dayStr)
      .forEach((pm) =>
        rows.push({
          kind: "pm",
          id: `pm-${pm.equipment.id}-${dayStr}`,
          title: pm.equipment.name,
          subtitle: pm.equipment.department,
          date: day,
        }),
      )
    events
      .filter((e) => {
        const start = e.start_date
        const end = e.end_date || e.start_date
        return dayStr >= start && dayStr <= end && dayStr === start
      })
      .forEach((e) =>
        rows.push({
          kind: "event",
          id: e.id,
          title: e.title,
          subtitle: e.description || (e.visibility === "public" ? "Company-wide" : e.department),
          date: day,
          visibility: e.visibility,
          department: e.department,
        }),
      )
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Upcoming</h3>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Next {horizon} days
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarRange className="mb-2 h-6 w-6 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">Nothing on deck</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No events or PM items in the next {horizon} days.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onDaySelect?.(row.date)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/50 focus-visible:outline-none"
                >
                  <DateTile date={row.date} today={today} highlight={row.kind === "pm"} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <TypeChip row={row} userDepartment={userDepartment} />
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-foreground">
                      {row.title}
                    </p>
                    {row.subtitle && (
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {row.subtitle}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function DateTile({
  date,
  today,
  highlight,
}: {
  date: Date
  today: Date
  highlight?: boolean
}) {
  const isToday = isSameDay(date, today)
  const days = differenceInDays(date, today)
  const imminent = days <= 3
  const accent = isToday
    ? "text-brand-teal"
    : highlight && imminent
      ? "text-amber-600 dark:text-amber-400"
      : "text-foreground"
  return (
    <div
      className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border ${
        isToday ? "border-brand-teal/40 bg-brand-teal/10" : "border-border/70 bg-muted/30"
      }`}
    >
      <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
        {format(date, "MMM")}
      </span>
      <span className={`-mt-0.5 text-base font-bold leading-none tabular-nums ${accent}`}>
        {format(date, "d")}
      </span>
    </div>
  )
}

function TypeChip({ row, userDepartment }: { row: Row; userDepartment: string }) {
  if (row.kind === "pm") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-teal/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-teal ring-1 ring-brand-teal/20">
        <Wrench className="h-2.5 w-2.5" />
        PM
      </span>
    )
  }
  if (row.visibility === "public") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-blue/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-blue ring-1 ring-brand-blue/20">
        <Globe2 className="h-2.5 w-2.5" />
        Company
      </span>
    )
  }
  const own = row.department === userDepartment
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${
        own
          ? "bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:bg-slate-400/10 dark:text-slate-200 dark:ring-slate-400/20"
          : "bg-muted text-muted-foreground ring-border"
      }`}
    >
      <Users className="h-2.5 w-2.5" />
      {own ? "Dept" : row.department || "Other"}
    </span>
  )
}
