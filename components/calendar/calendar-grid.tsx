"use client"

import { useState, useMemo } from "react"
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
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CalendarCell } from "./calendar-cell"
import { CalendarEvent, Equipment } from "@/types/app.types"

interface CalendarGridProps {
  currentMonth: Date
  onMonthChange: (date: Date) => void
  events: CalendarEvent[]
  equipmentPmDates: { date: string; equipment: Equipment }[]
  userDepartment: string
}

export function CalendarGrid({
  currentMonth,
  onMonthChange,
  events,
  equipmentPmDates,
  userDepartment,
}: CalendarGridProps) {
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)

  const days = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [calendarStart, calendarEnd])

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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold ml-2">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
        </div>
        <Button
          variant="outline"
          onClick={() => onMonthChange(new Date())}
        >
          Today
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border border rounded-lg overflow-hidden">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="bg-muted/50 p-2 text-center text-sm font-medium"
          >
            {day}
          </div>
        ))}

        {days.map((day) => (
          <CalendarCell
            key={day.toISOString()}
            day={day}
            isCurrentMonth={isSameMonth(day, currentMonth)}
            isToday={isSameDay(day, new Date())}
            events={getEventsForDay(day)}
            pmDates={getPmDatesForDay(day)}
            userDepartment={userDepartment}
          />
        ))}
      </div>
    </div>
  )
}
