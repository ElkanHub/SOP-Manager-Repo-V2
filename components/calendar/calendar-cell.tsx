"use client"

import { format } from "date-fns"
import { CalendarChip } from "./calendar-chip"
import { CalendarEvent, Equipment } from "@/types/app.types"

interface CalendarCellProps {
  day: Date
  isCurrentMonth: boolean
  isToday: boolean
  events: CalendarEvent[]
  pmDates: { date: string; equipment: Equipment }[]
  userDepartment: string
  maxChips?: number
  onSelect: (day: Date) => void
}

type CalendarItem =
  | {
    kind: "pm"
    id: string
    title: string
  }
  | {
    kind: "event"
    id: string
    title: string
    visibility: "public" | "department"
    department?: string
  }

export function CalendarCell({
  day,
  isCurrentMonth,
  isToday,
  events,
  pmDates,
  userDepartment,
  maxChips = 3,
  onSelect,
}: CalendarCellProps) {
  // PMs first (most time-sensitive), then events
  const items: CalendarItem[] = [
    ...pmDates.map(
      (pm): CalendarItem => ({
        kind: "pm",
        id: `pm-${pm.equipment.id}`,
        title: pm.equipment.name,
      }),
    ),
    ...events.map(
      (event): CalendarItem => ({
        kind: "event",
        id: event.id,
        title: event.title,
        visibility: event.visibility,
        department: event.department,
      }),
    ),
  ]

  const visible = items.slice(0, maxChips)
  const overflow = items.length - visible.length

  const openDay = () => onSelect(day)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openDay}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          openDay()
        }
      }}
      className={`group relative flex h-full min-h-[120px] sm:min-h-[136px] cursor-pointer flex-col gap-1.5 p-2 text-left transition-colors
        ${isCurrentMonth ? "bg-background hover:bg-muted/40" : "bg-muted/20 hover:bg-muted/30"}
        ${isToday ? "bg-brand-teal/[0.04]" : ""}
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-teal/60 focus-visible:z-10`}
    >
      <div className="flex items-center justify-start">
        <span
          className={`inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-1.5 text-[12px] font-semibold tabular-nums leading-none
            ${isToday ? "bg-brand-teal text-white shadow-sm" : isCurrentMonth ? "text-foreground" : "text-muted-foreground/60"}`}
        >
          {format(day, "d")}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 overflow-hidden">
        {visible.map((item) =>
          item.kind === "pm" ? (
            <CalendarChip
              key={item.id}
              title={item.title}
              type="pm"
              userDepartment={userDepartment}
              onClick={openDay}
            />
          ) : (
            <CalendarChip
              key={item.id}
              title={item.title}
              type="event"
              visibility={item.visibility}
              department={item.department}
              userDepartment={userDepartment}
              onClick={openDay}
            />
          ),
        )}
        {overflow > 0 && (
          <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground">
            +{overflow} more
          </span>
        )}
      </div>
    </div>
  )
}
