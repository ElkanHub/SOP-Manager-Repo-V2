"use client"

import { format, addDays, isSameDay } from "date-fns"
import { CalendarEvent, Equipment } from "@/types/app.types"

interface UpcomingPanelProps {
  events: CalendarEvent[]
  equipmentPmDates: { date: string; equipment: Equipment }[]
  userDepartment: string
}

export function UpcomingPanel({ events, equipmentPmDates, userDepartment }: UpcomingPanelProps) {
  const today = new Date()
  const next14Days = Array.from({ length: 14 }, (_, i) => addDays(today, i))

  const getItemsForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd")
    const dayEvents = events.filter((event) => {
      const start = event.start_date
      const end = event.end_date || event.start_date
      return dayStr >= start && dayStr <= end
    })
    const dayPmDates = equipmentPmDates.filter((pm) => pm.date === dayStr)
    return { events: dayEvents, pmDates: dayPmDates }
  }

  const hasItems = (day: Date) => {
    const { events, pmDates } = getItemsForDay(day)
    return events.length > 0 || pmDates.length > 0
  }

  return (
    <div className="bg-card rounded-lg border p-4">
      <h3 className="font-semibold mb-4">Upcoming (14 days)</h3>
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {next14Days.map((day) => {
          const { events, pmDates } = getItemsForDay(day)
          if (!hasItems(day)) return null

          return (
            <div key={day.toISOString()} className="border-b last:border-0 pb-3 last:pb-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={`
                  text-sm font-medium
                  ${isSameDay(day, today) && "text-brand-teal"}
                `}>
                  {isSameDay(day, today)
                    ? "Today"
                    : format(day, "EEE, MMM d")}
                </span>
              </div>
              <div className="space-y-1">
                {pmDates.map((pm) => (
                  <div
                    key={`pm-${pm.equipment.id}`}
                    className="text-sm flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-brand-teal" />
                    <span className="text-brand-teal">{pm.equipment.name}</span>
                    <span className="text-xs text-muted-foreground">(PM)</span>
                  </div>
                ))}
                {events.map((event) => {
                  const isOwnDept = event.department === userDepartment
                  return (
                    <div
                      key={event.id}
                      className="text-sm flex items-center gap-2"
                    >
                      <span className={`
                        w-2 h-2 rounded-full
                        ${event.visibility === "public" ? "bg-brand-blue" : isOwnDept ? "bg-slate-500" : "bg-muted-foreground"}
                      `} />
                      <span className={event.visibility === "public" ? "text-brand-blue" : ""}>
                        {event.title}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        {!next14Days.some(hasItems) && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No upcoming events
          </p>
        )}
      </div>
    </div>
  )
}
