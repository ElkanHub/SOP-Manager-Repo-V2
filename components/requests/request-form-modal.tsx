'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
      <DialogContent className="max-w-lg">
        {/* ─── Step 1: Form ───────────────────────────────────────── */}
        {step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle>New Document Request</DialogTitle>
              <DialogDescription>
                Complete your details are auto-filled. Just describe what you need.
              </DialogDescription>
            </DialogHeader>

            {/* Auto-filled metadata */}
            <div className="bg-muted rounded-lg p-4 mb-4 space-y-1.5">
              {[
                { label: 'Name', value: profile.full_name },
                { label: 'Department', value: profile.department || '—' },
                { label: 'Role', value: profile.role ? (profile.role.charAt(0).toUpperCase() + profile.role.slice(1)) : '—' },
                { label: 'Job Title', value: profile.job_title || '—' },
                { label: 'Employee ID', value: profile.employee_id || '—' },
                { label: 'Date', value: format(openedAt, "d MMMM yyyy, h:mm a") },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-2 text-[13px]">
                  <span className="text-muted-foreground w-24 shrink-0">{label}:</span>
                  <span className="text-foreground font-medium">{value}</span>
                </div>
              ))}
            </div>

            {/* Request textarea */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                What are you requesting?
              </label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Describe the document or record you need. Be as specific as possible — include document names, reference numbers, date ranges, or any other details that will help QA locate and prepare it."
                className={cn(
                  'min-h-[120px] max-h-[280px] resize-none text-sm',
                  isOverLimit && 'border-red-500 focus-visible:ring-red-500'
                )}
              />
              <div className={cn('text-right text-xs', charColor)}>
                {charCount} / {MAX_CHARS}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-md">{error}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={() => setStep('confirm')}
                disabled={isUnderMin || isOverLimit}
              >
                Review Request
              </Button>
            </div>
          </>
        )}

        {/* ─── Step 2: Confirm ─────────────────────────────────────── */}
        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle>Review your request</DialogTitle>
              <DialogDescription>
                This request will be sent to QA. You cannot edit it after sending.
              </DialogDescription>
            </DialogHeader>

            <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-mono text-xs text-muted-foreground italic">REQ-PENDING</span>
                <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded-full font-semibold">
                  Waiting for QA
                </span>
              </div>
              <div className="border-t border-border pt-3 space-y-1 text-sm">
                <div className="text-muted-foreground">
                  From: <span className="text-foreground font-medium">{profile.full_name}</span>
                  {profile.department && <span> · {profile.department}</span>}
                  {profile.role && <span> · {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}</span>}
                </div>
                <div className="text-muted-foreground text-xs">
                  {format(openedAt, "d MMMM yyyy, h:mm a")}
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground mb-1 font-medium">Request:</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{body}</p>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 text-xs text-blue-700 dark:text-blue-300">
              Once submitted, this request cannot be edited or withdrawn. If you need to change something, contact QA directly.
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-md">{error}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep('form')} disabled={isSubmitting}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </>
        )}

        {/* ─── Step 3: Success ─────────────────────────────────────── */}
        {step === 'success' && (
          <div className="flex flex-col items-center text-center py-6 gap-3">
            <CheckCircle2 className="w-12 h-12 text-green-500 animate-in zoom-in-50 duration-300" />
            <div>
              <p className="text-sm font-medium text-foreground mt-2">Request Submitted</p>
              <p className="text-[13px] text-muted-foreground mt-1">Your request has been submitted to QA.</p>
            </div>
            {referenceNumber && (
              <div className="bg-muted px-3 py-1.5 rounded-md inline-block mt-1">
                <span className="font-mono text-sm font-semibold text-brand-teal">{referenceNumber}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">QA has been notified and will action your request.</p>
            <Button variant="secondary" onClick={handleClose} className="mt-3">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
