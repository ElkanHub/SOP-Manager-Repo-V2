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
}

type CalendarItem = {
  id: string
  title: string
  type: "pm"
  visibility?: undefined
  department?: undefined
} | {
  id: string
  title: string
  type: "event"
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
}: CalendarCellProps) {
  const dayEvents = events.slice(0, 3)

  const allItems: CalendarItem[] = [
    ...pmDates.map((pm): CalendarItem => ({
      id: pm.equipment.id,
      title: pm.equipment.name,
      type: "pm",
    })),
    ...dayEvents.map((event): CalendarItem => ({
      id: event.id,
      title: event.title,
      type: "event",
      visibility: event.visibility,
      department: event.department,
    })),
  ].slice(0, 3)

  const totalItems = pmDates.length + events.length
  const overflow = totalItems > 3 ? totalItems - 3 : 0

  return (
    <div
      className={`
        min-h-[100px] p-1 bg-background hover:bg-muted/30 transition-colors
        ${!isCurrentMonth && "bg-muted/30"}
      `}
    >
      <div className="flex justify-end">
        <span
          className={`
            inline-flex items-center justify-center w-7 h-7 text-sm rounded-full
            ${isToday && "bg-brand-teal/10 font-bold text-brand-teal"}
          `}
        >
          {format(day, "d")}
        </span>
      </div>
      <div className="mt-1 space-y-1">
        {allItems.map((item) => (
          <CalendarChip
            key={item.id}
            title={item.title}
            type={item.type}
            visibility={item.visibility}
            department={item.department}
            userDepartment={userDepartment}
          />
        ))}
        {overflow > 0 && (
          <div className="text-xs text-muted-foreground px-1">
            +{overflow} more
          </div>
        )}
      </div>
    </div>
  )
}
