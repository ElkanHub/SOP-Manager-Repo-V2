"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { createEvent } from "@/actions/events"

interface NewEventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialDate?: string
}

export function NewEventModal({ open, onOpenChange, initialDate }: NewEventModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState(initialDate || "")
  const [endDate, setEndDate] = useState("")
  const [visibility, setVisibility] = useState<"public" | "department">("department")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!title.trim()) return
    if (!startDate) return

    setSubmitting(true)
    setError(null)

    try {
      const result = await createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        startDate,
        endDate: endDate || undefined,
        visibility,
      })

      if (result.success) {
        setTitle("")
        setDescription("")
        setStartDate(initialDate || "")
        setEndDate("")
        setVisibility("department")
        onOpenChange(false)
      } else {
        setError(result.error || "Failed to create event")
      }
    } catch (err) {
      setError("An error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setTitle("")
      setDescription("")
      setStartDate(initialDate || "")
      setEndDate("")
      setVisibility("department")
      setError(null)
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date">Start Date <span className="text-destructive">*</span></Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Visibility</Label>
            <RadioGroup
              value={visibility}
              onValueChange={(v) => setVisibility(v as "public" | "department")}
              className="flex gap-4 mt-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="cursor-pointer">Public</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="department" id="department" />
                <Label htmlFor="department" className="cursor-pointer">My Department</Label>
              </div>
            </RadioGroup>
          </div>

          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !startDate}
            className="bg-brand-teal hover:bg-teal-600"
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
