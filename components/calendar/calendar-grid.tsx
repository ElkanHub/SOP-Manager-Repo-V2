"use client"

import { useMemo } from "react"
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns"
import { ChevronLeft, ChevronRight, Wrench, Globe2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CalendarCell } from "./calendar-cell"
import { CalendarEvent, Equipment } from "@/types/app.types"

interface CalendarGridProps {
  currentMonth: Date
  onMonthChange: (date: Date) => void
  events: CalendarEvent[]
  equipmentPmDates: { date: string; equipment: Equipment }[]
  userDepartment: string
  onDaySelect: (day: Date) => void
}

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function CalendarGrid({
  currentMonth,
  onMonthChange,
  events,
  equipmentPmDates,
  userDepartment,
  onDaySelect,
}: CalendarGridProps) {
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)

  const days = useMemo(
    () => eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
    [calendarStart, calendarEnd],
  )

  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd")
    return events.filter((event) => {
      const start = event.start_date
      const end = event.end_date || event.start_date
      return dayStr >= start && dayStr <= end
    })
  }

  const getPmDatesForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd")
    return equipmentPmDates.filter((pm) => pm.date === dayStr)
  }

  // Month summary — counts within the visible current month only
  const monthSummary = useMemo(() => {
    const inMonth = (dateStr: string) => {
      const d = new Date(dateStr)
      return isSameMonth(d, currentMonth)
    }
    const pm = equipmentPmDates.filter((p) => inMonth(p.date)).length
    const pub = events.filter((e) => e.visibility === "public" && inMonth(e.start_date)).length
    const dept = events.filter((e) => e.visibility !== "public" && inMonth(e.start_date)).length
    return { pm, pub, dept }
  }, [events, equipmentPmDates, currentMonth])

  const today = new Date()
  const isCurrentMonth = isSameMonth(today, currentMonth)

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center rounded-lg border border-border bg-background shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-r-none hover:bg-muted"
              onClick={() => onMonthChange(subMonths(currentMonth, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-none border-x border-border px-3 text-xs font-semibold uppercase tracking-wider hover:bg-muted disabled:opacity-100"
              onClick={() => onMonthChange(new Date())}
              disabled={isCurrentMonth}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-l-none hover:bg-muted"
              onClick={() => onMonthChange(addMonths(currentMonth, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
            {format(currentMonth, "MMMM")}{" "}
            <span className="font-medium text-muted-foreground">
              {format(currentMonth, "yyyy")}
            </span>
          </h2>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
          <LegendDot color="bg-brand-teal" Icon={Wrench} label="PM" count={monthSummary.pm} />
          <LegendDot color="bg-brand-blue" Icon={Globe2} label="Company" count={monthSummary.pub} />
          <LegendDot color="bg-slate-500 dark:bg-slate-300" Icon={Users} label="Department" count={monthSummary.dept} />
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {DAY_HEADERS.map((d, i) => (
          <div
            key={d}
            className={`py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground ${
              i < 6 ? "border-r border-border" : ""
            }`}
          >
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d.slice(0, 1)}</span>
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 overflow-hidden rounded-b-xl">
        {days.map((day, idx) => {
          const col = idx % 7
          const row = Math.floor(idx / 7)
          const totalRows = Math.ceil(days.length / 7)
          return (
            <div
              key={day.toISOString()}
              className={`${col < 6 ? "border-r" : ""} ${row < totalRows - 1 ? "border-b" : ""} border-border`}
            >
              <CalendarCell
                day={day}
                isCurrentMonth={isSameMonth(day, currentMonth)}
                isToday={isSameDay(day, today)}
                events={getEventsForDay(day)}
                pmDates={getPmDatesForDay(day)}
                userDepartment={userDepartment}
                onSelect={onDaySelect}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LegendDot({
  color,
  Icon,
  label,
  count,
}: {
  color: string
  Icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      <Icon className="h-3 w-3 opacity-70" />
      <span className="font-medium text-foreground">{label}</span>
      <span className="tabular-nums text-muted-foreground/80">{count}</span>
    </span>
  )
}
