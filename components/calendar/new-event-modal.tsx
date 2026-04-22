"use client"

import { useEffect, useState } from "react"
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

  useEffect(() => {
    if (open && initialDate) setStartDate(initialDate)
  }, [open, initialDate])

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
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/40 shadow-2xl bg-gradient-to-b from-background to-background/95">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-brand-teal/10 via-brand-navy/5 to-transparent border-b border-border/50">
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <div className="p-2 rounded-lg bg-brand-teal/10">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-teal"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
            </div>
            Schedule Event
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Event Designation <span className="text-red-500">*</span></Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value.toUpperCase())}
              placeholder="e.g. Quarterly Compliance Audit"
              className="bg-muted/30 border-border/50 focus:border-brand-teal/50 focus:ring-brand-teal/20 transition-all font-medium"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Contextual Details</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a brief summary of the event objectives..."
              rows={3}
              className="bg-muted/30 border-border/50 focus:border-brand-teal/50 focus:ring-brand-teal/20 resize-none transition-all text-sm leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Commencement <span className="text-red-500">*</span></Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-muted/30 border-border/50 focus:border-brand-teal/50 focus:ring-brand-teal/20 transition-all"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Conclusion</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-muted/30 border-border/50 focus:border-brand-teal/50 focus:ring-brand-teal/20 transition-all"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Broadcast Visibility</Label>
            <RadioGroup
              value={visibility}
              onValueChange={(v) => setVisibility(v as "public" | "department")}
              className="grid grid-cols-2 gap-3"
            >
              <div 
                className={`flex items-center space-x-3 rounded-xl border p-3 cursor-pointer transition-all ${visibility === 'public' ? 'border-brand-teal bg-brand-teal/5 ring-1 ring-brand-teal/20' : 'border-border/40 hover:bg-muted/50'}`}
                onClick={() => setVisibility('public')}
              >
                <RadioGroupItem value="public" id="public" />
                <div className="flex flex-col">
                    <Label htmlFor="public" className="cursor-pointer font-bold text-sm">Global</Label>
                    <span className="text-[10px] text-muted-foreground/70">All Workspace Users</span>
                </div>
              </div>
              <div 
                className={`flex items-center space-x-3 rounded-xl border p-3 cursor-pointer transition-all ${visibility === 'department' ? 'border-brand-navy bg-brand-navy/5 ring-1 ring-brand-navy/20' : 'border-border/40 hover:bg-muted/50'}`}
                onClick={() => setVisibility('department')}
              >
                <RadioGroupItem value="department" id="department" />
                <div className="flex flex-col">
                    <Label htmlFor="department" className="cursor-pointer font-bold text-sm">Selective</Label>
                    <span className="text-[10px] text-muted-foreground/70">Own Department Only</span>
                </div>
              </div>
            </RadioGroup>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-bold animate-in fade-in slide-in-from-top-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12" y1="16" y2="16.01"/></svg>
                {error}
            </div>
          )}
        </div>
        <DialogFooter className="p-6 pt-2 border-t border-border/40 bg-muted/10 flex flex-col-reverse sm:flex-row gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">Discard</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !startDate}
            className="bg-brand-navy hover:bg-brand-navy/90 text-white shadow-xl font-bold px-8 rounded-lg transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                SCHEDULING...
              </>
            ) : (
                "SCHEDULE EVENT"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
