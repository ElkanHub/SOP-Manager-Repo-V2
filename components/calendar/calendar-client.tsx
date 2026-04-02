"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CalendarGrid } from "./calendar-grid"
import { NewEventModal } from "./new-event-modal"
import { UpcomingPanel } from "./upcoming-panel"
import { CalendarEvent, Equipment, Profile } from "@/types/app.types"
import { Calendar } from "lucide-react"

interface CalendarClientProps {
  events: CalendarEvent[]
  equipmentPmDates: { date: string; equipment: Equipment }[]
  profile: Profile
}

export function CalendarClient({ events, equipmentPmDates, profile }: CalendarClientProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [newEventOpen, setNewEventOpen] = useState(false)

  return (
    <div className="p-6">
      {/* <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
        <Button
          className="bg-brand-teal hover:bg-teal-600"
          onClick={() => setNewEventOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Event
        </Button>
      </div> */}
      {/* Page Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Calendar className="h-4 w-4" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Calendar</h1>
        </div>
        <Button
          className="bg-brand-teal hover:bg-teal-600"
          onClick={() => setNewEventOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Event
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <CalendarGrid
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            events={events}
            equipmentPmDates={equipmentPmDates}
            userDepartment={profile.department || ''}
          />
        </div>
        <div className="lg:col-span-1">
          <UpcomingPanel
            events={events}
            equipmentPmDates={equipmentPmDates}
            userDepartment={profile.department || ''}
          />
        </div>
      </div>

      <NewEventModal
        open={newEventOpen}
        onOpenChange={setNewEventOpen}
      />
    </div>
  )
}
