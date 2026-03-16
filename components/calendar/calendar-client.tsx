"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CalendarGrid } from "./calendar-grid"
import { NewEventModal } from "./new-event-modal"
import { UpcomingPanel } from "./upcoming-panel"
import { CalendarEvent, Equipment, Profile } from "@/types/app.types"

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
        <Button
          className="bg-brand-teal hover:bg-teal-600"
          onClick={() => setNewEventOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Event
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <CalendarGrid
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            events={events}
            equipmentPmDates={equipmentPmDates}
            userDepartment={profile.department}
          />
        </div>
        <div className="lg:col-span-1">
          <UpcomingPanel
            events={events}
            equipmentPmDates={equipmentPmDates}
            userDepartment={profile.department}
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
