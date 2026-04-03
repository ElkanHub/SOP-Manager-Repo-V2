'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { submitDocumentRequest } from '@/actions/requests'
import { Profile } from '@/types/app.types'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface RequestFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: Profile
  onSuccess: () => void
}

type Step = 'form' | 'confirm' | 'success'

const MAX_CHARS = 2000
const MIN_CHARS = 10
const WARN_THRESHOLD = Math.floor(MAX_CHARS * 0.8)

export function RequestFormModal({ open, onOpenChange, profile, onSuccess }: RequestFormModalProps) {
  const [step, setStep] = useState<Step>('form')
  const [body, setBody] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null)
  const [openedAt, setOpenedAt] = useState(new Date())

  // Reset state when modal opens
  const handleOpenChange = (val: boolean) => {
    if (!isSubmitting) {
      if (!val) {
        setTimeout(() => {
          setStep('form')
          setBody('')
          setError(null)
          setReferenceNumber(null)
        }, 300)
      } else {
        setOpenedAt(new Date())
      }
      onOpenChange(val)
    }
  }

  const charCount = body.length
  const isOverLimit = charCount > MAX_CHARS
  const isUnderMin = charCount < MIN_CHARS
  const charColor = isOverLimit
    ? 'text-red-500'
    : charCount >= WARN_THRESHOLD
    ? 'text-amber-500'
    : 'text-muted-foreground'

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    const result = await submitDocumentRequest(body)
    setIsSubmitting(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    setReferenceNumber(result.referenceNumber || null)
    setStep('success')
    onSuccess()
  }

  const handleClose = () => {
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-border/40 shadow-2xl bg-gradient-to-b from-background to-background/98">
        {/* ─── Step 1: Form ───────────────────────────────────────── */}
        {step === 'form' && (
          <div className="flex flex-col h-full">
            <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-brand-navy/10 via-brand-teal/5 to-transparent border-b border-border/50 relative">
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">New Document Request</DialogTitle>
                <DialogDescription className="text-xs font-bold uppercase tracking-widest text-brand-teal/80">
                  Submit Request to QA
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-6">
              {/* Auto-filled metadata */}
              <div className="bg-brand-navy/5 dark:bg-card border border-brand-navy/10 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Requester Details</h4>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  {[
                    { label: 'Name', value: profile.full_name },
                    { label: 'Department', value: profile.department || '—' },
                    { label: 'Role', value: profile.role ? (profile.role.charAt(0).toUpperCase() + profile.role.slice(1)) : '—' },
                    { label: 'Date', value: format(openedAt, "d MMMM yyyy, h:mm a") },
                  ].map(({ label, value }) => (
                    <div key={label} className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">{label}</span>
                      <p className="font-bold text-foreground">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Request textarea */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                  What are you requesting? <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Describe the document or record you need. Be as specific as possible — include document names, reference numbers, date ranges, or any other details that will help QA locate and prepare it."
                  className={cn(
                    'min-h-[140px] max-h-[280px] resize-none bg-muted/30 border-border/50 focus:border-brand-teal/50 focus:ring-brand-teal/20 transition-all text-sm',
                    isOverLimit && 'border-destructive focus-visible:ring-destructive'
                  )}
                />
                <div className={cn('text-right text-[10px] font-bold uppercase tracking-widest', charColor)}>
                  {charCount} / {MAX_CHARS}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-bold animate-in fade-in">
                  {error}
                </div>
              )}
            </div>

            <DialogFooter className="p-6 pt-3 border-t border-border/40 bg-muted/10 sm:justify-end items-center gap-3">
              <Button variant="ghost" onClick={handleClose} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">Cancel</Button>
              <Button
                onClick={() => setStep('confirm')}
                disabled={isUnderMin || isOverLimit}
                className="bg-brand-navy hover:bg-brand-navy/90 px-8 rounded-lg shadow-xl font-bold text-white transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
              >
                Review Request
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ─── Step 2: Confirm ─────────────────────────────────────── */}
        {step === 'confirm' && (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-2 duration-300">
            <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-brand-navy/10 via-brand-teal/5 to-transparent border-b border-border/50 relative">
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">Review your request</DialogTitle>
                <DialogDescription className="text-xs font-bold uppercase tracking-widest text-brand-teal/80">
                  Finalize Submission
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-6">
              <div className="bg-brand-navy/5 dark:bg-card border border-brand-navy/10 rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-border/40 pb-4">
                  <span className="font-mono text-[10px] font-bold text-muted-foreground tracking-widest italic">REQ-PENDING</span>
                  <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-md font-bold uppercase tracking-widest">
                    Waiting for QA
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">From</span>
                    <p className="font-bold text-foreground text-sm">{profile.full_name}</p>
                    <p className="text-[10px] text-muted-foreground/80 font-medium">{profile.department} · {profile.role?.toUpperCase()}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">Date</span>
                    <p className="font-bold text-foreground text-sm">{format(openedAt, "d MMMM yyyy")}</p>
                    <p className="text-[10px] text-muted-foreground/80 font-medium">{format(openedAt, "h:mm a")}</p>
                  </div>
                </div>
                
                <div className="border-t border-border/40 pt-5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60 block mb-3">Request Subject</span>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed bg-background/50 p-4 rounded-xl border border-border/30">{body}</p>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-2 items-start mt-2">
                <div className="text-[10px] text-blue-800 dark:text-blue-300/80 font-bold leading-relaxed uppercase tracking-wider">
                  Once submitted, this request cannot be edited or withdrawn. If you need to change something, contact QA directly.
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-bold animate-in fade-in">
                  {error}
                </div>
              )}
            </div>

            <DialogFooter className="p-6 pt-3 border-t border-border/40 bg-muted/10 sm:justify-end items-center gap-3">
              <Button variant="ghost" onClick={() => setStep('form')} disabled={isSubmitting} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-brand-teal hover:bg-teal-600 px-8 rounded-lg shadow-xl font-bold text-white transition-all active:scale-95 disabled:opacity-30 disabled:grayscale">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isSubmitting ? 'SUBMITTING...' : 'SUBMIT REQUEST'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ─── Step 3: Success ─────────────────────────────────────── */}
        {step === 'success' && (
          <div className="relative">
            <div className="h-2 bg-gradient-to-r from-green-400 to-brand-teal w-full absolute top-0 left-0" />
            <div className="p-12 flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6 animate-in zoom-in duration-500">
                <CheckCircle2 className="h-10 w-10 text-green-500 dark:text-green-400" />
              </div>
              <DialogTitle className="text-2xl font-bold text-center mb-2 text-foreground">Request Submitted</DialogTitle>
              <DialogDescription className="text-center text-muted-foreground max-w-[280px] mb-6 text-sm">
                QA has been notified and will action your request shortly.
              </DialogDescription>
              {referenceNumber && (
                <div className="bg-brand-teal/5 px-6 py-3 rounded-xl mb-8 border border-brand-teal/20 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 block mb-1">Reference No.</span>
                  <span className="font-mono text-lg font-bold text-brand-teal tracking-widest">{referenceNumber}</span>
                </div>
              )}
              <Button variant="outline" onClick={handleClose} className="font-bold text-[10px] uppercase tracking-widest px-10 rounded-lg">
                Close View
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
