"use client"

import { useMemo, useState } from "react"
import { format, isSameDay } from "date-fns"
import { Plus, Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CalendarGrid } from "./calendar-grid"
import { NewEventModal } from "./new-event-modal"
import { UpcomingPanel } from "./upcoming-panel"
import { DayDetailSheet } from "./day-detail-sheet"
import { CalendarEvent, Equipment, Profile } from "@/types/app.types"
import { useRouter } from "next/navigation"

interface CalendarClientProps {
  events: CalendarEvent[]
  equipmentPmDates: { date: string; equipment: Equipment }[]
  profile: Profile
}

export function CalendarClient({ events, equipmentPmDates, profile }: CalendarClientProps) {
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [newEventOpen, setNewEventOpen] = useState(false)
  const [newEventDate, setNewEventDate] = useState<string | undefined>(undefined)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const canCreate = profile.role === "manager" || profile.is_admin

  const selectedDayItems = useMemo(() => {
    if (!selectedDay) return { events: [] as CalendarEvent[], pmDates: [] as typeof equipmentPmDates }
    const dayStr = format(selectedDay, "yyyy-MM-dd")
    const dayEvents = events.filter((event) => {
      const start = event.start_date
      const end = event.end_date || event.start_date
      return dayStr >= start && dayStr <= end
    })
    const dayPm = equipmentPmDates.filter((pm) => pm.date === dayStr)
    return { events: dayEvents, pmDates: dayPm }
  }, [selectedDay, events, equipmentPmDates])

  const openDay = (day: Date) => {
    setSelectedDay(day)
    setSheetOpen(true)
    // Keep month in sync when opening a day outside the current view
    if (!isSameDay(day, currentMonth)) setCurrentMonth(day)
  }

  const openNewEvent = (dateStr?: string) => {
    setNewEventDate(dateStr)
    setNewEventOpen(true)
  }

  return (
    <div className="flex flex-col">
      {/* Page Header */}
      <div className="flex flex-col gap-3 border-b border-border bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-teal to-brand-blue text-white shadow-sm">
            <CalendarIcon className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">Calendar</h1>
            <p className="text-xs text-muted-foreground">
              PM schedules, department events, and company-wide activity
            </p>
          </div>
        </div>
        {canCreate && (
          <Button
            onClick={() => openNewEvent()}
            className="bg-brand-teal text-white shadow-sm hover:bg-brand-teal/90"
            size="sm"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New Event
          </Button>
        )}
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-5">
          <CalendarGrid
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            events={events}
            equipmentPmDates={equipmentPmDates}
            userDepartment={profile.department || ""}
            onDaySelect={openDay}
          />
          <div className="xl:sticky xl:top-4 xl:max-h-[calc(100vh-6rem)]">
            <UpcomingPanel
              events={events}
              equipmentPmDates={equipmentPmDates}
              userDepartment={profile.department || ""}
              onDaySelect={openDay}
            />
          </div>
        </div>
      </div>

      <DayDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        day={selectedDay}
        events={selectedDayItems.events}
        pmDates={selectedDayItems.pmDates}
        profile={profile}
        onAddEvent={(dateStr) => {
          setSheetOpen(false)
          openNewEvent(dateStr)
        }}
        onDeleted={() => router.refresh()}
      />

      <NewEventModal
        open={newEventOpen}
        onOpenChange={(open) => {
          setNewEventOpen(open)
          if (!open) setNewEventDate(undefined)
        }}
        initialDate={newEventDate}
      />
    </div>
  )
}
