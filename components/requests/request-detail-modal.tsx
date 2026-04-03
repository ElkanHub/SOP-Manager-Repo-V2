'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { User, Mail, Building2, Briefcase, IdCard, FileText, Info, History, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { markRequestReceived, markRequestApproved, markRequestFulfilled } from '@/actions/requests'
import { Textarea } from '@/components/ui/textarea'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { DocumentRequest } from '@/types/app.types'
import { RequestStatusPill } from './request-status-pill'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RequestDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: DocumentRequest | null
  isQaManager?: boolean
}

export function RequestDetailModal({ open, onOpenChange, request, isQaManager = false }: RequestDetailModalProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [qaNote, setQaNote] = useState('')

  useEffect(() => {
    if (request) {
      setQaNote(request.qa_notes || '')
      setError(null)
      setLoading(null)
    }
  }, [request, open])

  if (!request) return null

  const run = async (action: () => Promise<{ success: boolean; error?: string }>, label: string) => {
    setLoading(label)
    setError(null)
    const result = await action()
    if (result.success) {
      setLoading(null)
      // We don't close the modal immediately to show the updated status if realtime is fast,
      // but in a table view, the parent will update.
    } else {
      setLoading(null)
      setError(result.error || 'Something went wrong')
    }
  }

  const steps = [
    { label: 'Submitted', date: request.submitted_at, profile: null },
    { label: 'Received', date: request.received_at, profile: request.received_by_profile },
    { label: 'Approved', date: request.approved_at, profile: request.approved_by_profile },
    { label: 'Fulfilled', date: request.fulfilled_at, profile: request.fulfilled_by_profile },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl w-[95vw] p-0 overflow-hidden border-border/40 shadow-2xl bg-gradient-to-b from-background to-background/98 max-h-[90vh] flex flex-col">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-border/50 relative flex-shrink-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {request.reference_number}
                </DialogTitle>
                <RequestStatusPill status={request.status} size="sm" />
              </div>
              <DialogDescription className="text-xs font-bold uppercase tracking-widest text-amber-600/80">
                Document Request Detailed View
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Section 1: Requester & Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-brand-navy/5 dark:bg-card border border-brand-navy/10 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                <User className="h-4 w-4 text-brand-teal" />
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Requester Information</h4>
              </div>
              <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                {[
                  { label: 'Full Name', value: request.requester_name, icon: User },
                  { label: 'Department', value: request.requester_department, icon: Building2 },
                  { label: 'Job Title', value: request.requester_job_title || '—', icon: Briefcase },
                  { label: 'Employee ID', value: request.requester_employee_id || '—', icon: IdCard },
                  { label: 'Role', value: request.requester_role, icon: Info, className: 'capitalize' },
                  { label: 'Email', value: request.requester_email, icon: Mail, className: 'break-all' },
                ].map(({ label, value, className }) => (
                  <div key={label} className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60 block">{label}</span>
                    <p className={cn("text-sm font-bold text-foreground", className)}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-brand-navy/5 dark:bg-card border border-brand-navy/10 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                <History className="h-4 w-4 text-brand-teal" />
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Processing Lifecycle</h4>
              </div>
              <div className="space-y-4">
                {steps.map((step, idx) => (
                  <div key={step.label} className={cn(
                    "flex items-start gap-3 relative pb-2",
                    idx !== steps.length - 1 && "after:absolute after:left-[7px] after:top-[20px] after:bottom-0 after:w-[1px] after:bg-border/60"
                  )}>
                    <div className={cn(
                      "h-3.5 w-3.5 rounded-full mt-1 z-10 flex-shrink-0 border-2",
                      step.date ? "bg-brand-teal border-brand-teal/40" : "bg-muted border-muted-foreground/20"
                    )} />
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/80">{step.label}</span>
                        {step.date && (
                          <span className="text-[9px] text-muted-foreground font-medium">
                            {format(new Date(step.date), "dd MMM yyyy, HH:mm")}
                          </span>
                        )}
                      </div>
                      {step.profile && (
                        <p className="text-[11px] font-bold text-brand-teal truncate">
                          by {step.profile.full_name}
                        </p>
                      )}
                      {!step.date && <p className="text-[10px] text-muted-foreground italic">Pending</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Request Body */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 ml-1">
              <FileText className="h-4 w-4 text-amber-600" />
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Request Content</h4>
            </div>
            <div className="bg-muted/30 border border-border/40 rounded-2xl p-6 shadow-inner min-h-[120px]">
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed italic">
                &quot;{request.request_body}&quot;
              </p>
            </div>
          </div>

          {/* Section 3: QA Notes */}
          {request.qa_notes && (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center gap-2 ml-1">
                <Info className="h-4 w-4 text-brand-teal" />
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">QA Feedback / Notes</h4>
              </div>
              <div className="bg-brand-teal/5 border border-brand-teal/20 rounded-2xl p-6 shadow-sm">
                <p className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-wrap italic">
                  {request.qa_notes}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 pt-3 border-t border-border/40 bg-muted/10 flex flex-col sm:flex-row justify-between items-center gap-4 flex-shrink-0">
            <div className="mr-auto hidden md:block">
               <p className="text-[9px] text-muted-foreground italic uppercase tracking-widest">Reference No. {request.reference_number}</p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 w-full sm:w-auto">
                {isQaManager && request.status !== 'fulfilled' && (
                    <div className="flex flex-wrap items-center gap-2 mr-2">
                        {request.status === 'submitted' && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="font-bold text-[10px] uppercase tracking-widest rounded-lg border-brand-teal/30 hover:bg-brand-teal/5 text-brand-teal"
                                onClick={() => run(() => markRequestReceived(request.id), 'received')}
                                disabled={!!loading}
                            >
                                {loading === 'received' ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : null}
                                Mark Received
                            </Button>
                        )}
                        
                        {(request.status === 'submitted' || request.status === 'received') && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="font-bold text-[10px] uppercase tracking-widest rounded-lg border-amber-500/30 hover:bg-amber-500/5 text-amber-600"
                                onClick={() => run(() => markRequestApproved(request.id, qaNote || undefined), 'approved')}
                                disabled={!!loading}
                            >
                                {loading === 'approved' ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : null}
                                Approve Request
                            </Button>
                        )}

                        {request.status === 'approved' && (
                            <div className="flex items-center gap-2">
                                <Textarea 
                                   value={qaNote}
                                   onChange={(e) => setQaNote(e.target.value)}
                                   placeholder="Add completion notes..."
                                   className="h-9 min-h-0 w-48 text-xs py-1 border-brand-teal/20 focus-visible:ring-brand-teal"
                                />
                                <Button
                                    size="sm"
                                    className="font-bold text-[10px] uppercase tracking-widest rounded-lg bg-brand-teal hover:bg-brand-teal/90 text-white"
                                    onClick={() => run(() => markRequestFulfilled(request.id, qaNote || undefined), 'fulfilled')}
                                    disabled={!!loading}
                                >
                                    {loading === 'fulfilled' ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : null}
                                    Fulfil
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                <Button 
                    variant="ghost" 
                    onClick={() => onOpenChange(false)}
                    className="font-bold text-[10px] uppercase tracking-widest px-6 rounded-lg hover:bg-background border border-transparent hover:border-border/60"
                >
                    Close View
                </Button>
            </div>
            
            {error && (
                <div className="absolute top-[-40px] left-6 right-6 flex items-center gap-2 text-red-500 bg-background border border-red-200 rounded-md px-3 py-1.5 text-[10px] font-bold shadow-xl animate-in slide-in-from-bottom-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
