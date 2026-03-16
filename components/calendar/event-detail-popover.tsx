"use client"

import { format } from "date-fns"
import { CalendarEvent } from "@/types/app.types"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Trash2 } from "lucide-react"
import * as React from "react"

interface EventDetailPopoverProps {
  event: CalendarEvent
  isOwner: boolean
  onDelete: (eventId: string) => void
  deleting: boolean
  triggerContent: React.ReactNode
}

export function EventDetailPopover({
  event,
  isOwner,
  onDelete,
  deleting,
  triggerContent,
}: EventDetailPopoverProps) {
  const handleDelete = () => {
    if (isOwner) {
      onDelete(event.id)
    }
  }

  return (
    <Popover>
      <PopoverTrigger>
        {triggerContent}
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="space-y-2">
          <h4 className="font-semibold">{event.title}</h4>
          {event.description && (
            <p className="text-sm text-muted-foreground">{event.description}</p>
          )}
          <div className="text-sm text-muted-foreground">
            <p>
              {format(new Date(event.start_date), "MMM d, yyyy")}
              {event.end_date && event.end_date !== event.start_date && (
                <> - {format(new Date(event.end_date), "MMM d, yyyy")}</>
              )}
            </p>
            <p className="capitalize">
              {event.visibility === "public" ? "Public" : `Department: ${event.department}`}
            </p>
          </div>
          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
