"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Loader2, CheckCircle2, X, Clock } from "lucide-react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { DeptBadge } from "@/components/ui/dept-badge"
import {
    markSubmissionReceived,
    markSubmissionApproved,
    markSubmissionFulfilled,
    markSubmissionRejected,
} from "@/actions/request-forms"
import type { RequestFormSubmission } from "@/types/app.types"

interface Props {
    open: boolean
    onOpenChange: (v: boolean) => void
    submission: RequestFormSubmission | null
    isQa: boolean
    onChanged: (updated: RequestFormSubmission) => void
}

export function SubmissionDetailSheet({ open, onOpenChange, submission, isQa, onChanged }: Props) {
    const [notes, setNotes] = useState("")
    const [rejectReason, setRejectReason] = useState("")
    const [loading, setLoading] = useState<"receive" | "approve" | "fulfil" | "reject" | null>(null)
    const [showReject, setShowReject] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!submission) return null

    const canReceive = submission.status === "submitted"
    const canApprove = submission.status === "submitted" || submission.status === "received"
    const canFulfil = submission.status === "approved"
    const canReject = submission.status === "submitted" || submission.status === "received"

    const fields = submission.form_snapshot?.fields || []

    const run = async (kind: "receive" | "approve" | "fulfil" | "reject") => {
        setError(null)
        setLoading(kind)
        try {
            let res
            if (kind === "receive") res = await markSubmissionReceived(submission.id)
            else if (kind === "approve") res = await markSubmissionApproved(submission.id, notes || undefined)
            else if (kind === "fulfil") res = await markSubmissionFulfilled(submission.id, notes || undefined)
            else res = await markSubmissionRejected(submission.id, rejectReason)

            if (!res.success) {
                setError(res.error)
                return
            }
            if (res.data) onChanged(res.data)
            setShowReject(false)
            setNotes("")
            setRejectReason("")
        } finally {
            setLoading(null)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground">{submission.reference_number}</span>
                        <StatusBadge status={submission.status} />
                    </div>
                    <SheetTitle className="text-lg">
                        {submission.form?.title || submission.form_snapshot.title || "Request"}
                    </SheetTitle>
                    <SheetDescription>
                        Submitted {format(new Date(submission.submitted_at), "PPp")}
                    </SheetDescription>
                </SheetHeader>

                <div className="px-4 pb-2 space-y-5">
                    {/* Requester metadata */}
                    <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Requester</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <MetaLine label="Name" value={submission.requester_name} />
                            <MetaLine label="Role" value={submission.requester_role} capitalize />
                            <MetaLine label="Email" value={submission.requester_email} mono />
                            <MetaLine label="Department" value={submission.requester_department} />
                            {submission.requester_job_title && (
                                <MetaLine label="Job Title" value={submission.requester_job_title} />
                            )}
                            {submission.requester_employee_id && (
                                <MetaLine label="Employee ID" value={submission.requester_employee_id} mono />
                            )}
                        </div>
                    </div>

                    {/* Answers */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Responses
                        </h4>
                        {fields.map((f, idx) => (
                            <div key={f.id} className="rounded-lg border border-border/50 p-3">
                                <div className="flex items-start gap-2">
                                    <span className="shrink-0 text-xs font-bold text-muted-foreground/70 mt-0.5">
                                        {idx + 1}.
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-foreground">{f.label}</p>
                                        {f.helper_text && (
                                            <p className="text-[11px] text-muted-foreground mt-0.5">{f.helper_text}</p>
                                        )}
                                        <div className="mt-1.5 text-sm text-foreground break-words">
                                            {renderAnswer(submission.answers?.[f.id], f.field_type)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Timeline */}
                    <div className="rounded-lg border border-border/50 p-3 space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Lifecycle
                        </h4>
                        <TimelineRow label="Submitted" at={submission.submitted_at} actor={submission.requester_name} />
                        <TimelineRow
                            label="Received"
                            at={submission.received_at}
                            actor={submission.received_by_profile?.full_name}
                        />
                        <TimelineRow
                            label="Approved"
                            at={submission.approved_at}
                            actor={submission.approved_by_profile?.full_name}
                        />
                        <TimelineRow
                            label="Fulfilled"
                            at={submission.fulfilled_at}
                            actor={submission.fulfilled_by_profile?.full_name}
                        />
                        {submission.rejected_at && (
                            <TimelineRow
                                label="Rejected"
                                at={submission.rejected_at}
                                actor={submission.rejected_by_profile?.full_name}
                                destructive
                            />
                        )}
                    </div>

                    {submission.qa_notes && (
                        <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                                QA Notes
                            </h4>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{submission.qa_notes}</p>
                        </div>
                    )}

                    {/* QA action panel */}
                    {isQa && (canReceive || canApprove || canFulfil || canReject) && (
                        <div className="rounded-lg border border-brand-teal/30 bg-brand-teal/5 p-3 space-y-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand-teal">
                                QA Action
                            </h4>

                            {(canApprove || canFulfil) && !showReject && (
                                <div className="space-y-2">
                                    <Label className="text-xs">Notes (optional, max 1000)</Label>
                                    <Textarea
                                        rows={2}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Notes for the requester"
                                        maxLength={1000}
                                    />
                                </div>
                            )}

                            {showReject && (
                                <div className="space-y-2">
                                    <Label className="text-xs">Rejection reason <span className="text-destructive">*</span></Label>
                                    <Textarea
                                        rows={3}
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        placeholder="Why is this being rejected?"
                                        maxLength={1000}
                                    />
                                </div>
                            )}

                            {error && (
                                <p className="text-xs text-destructive">{error}</p>
                            )}

                            <div className="flex flex-wrap gap-2">
                                {canReceive && !showReject && (
                                    <Button size="sm" variant="outline" onClick={() => run("receive")} disabled={!!loading}>
                                        {loading === "receive" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                                        Mark Received
                                    </Button>
                                )}
                                {canApprove && !showReject && (
                                    <Button size="sm" onClick={() => run("approve")} disabled={!!loading} className="bg-brand-blue hover:bg-blue-700">
                                        {loading === "approve" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                                        Approve
                                    </Button>
                                )}
                                {canFulfil && !showReject && (
                                    <Button size="sm" onClick={() => run("fulfil")} disabled={!!loading} className="bg-brand-teal hover:bg-teal-600">
                                        {loading === "fulfil" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                                        Mark Fulfilled
                                    </Button>
                                )}
                                {canReject && !showReject && (
                                    <Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => setShowReject(true)} disabled={!!loading}>
                                        Reject
                                    </Button>
                                )}
                                {showReject && (
                                    <>
                                        <Button size="sm" variant="ghost" onClick={() => setShowReject(false)} disabled={!!loading}>Cancel</Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => run("reject")}
                                            disabled={!!loading || rejectReason.trim().length < 3}
                                        >
                                            {loading === "reject" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                                            Confirm Reject
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <SheetFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}

function renderAnswer(val: unknown, type: string) {
    if (val === undefined || val === null || val === "") {
        return <span className="text-muted-foreground italic text-xs">No answer</span>
    }
    if (type === "checkbox_single") {
        return val ? "Yes" : "No"
    }
    if (type === "checkbox_multi" && Array.isArray(val)) {
        return (
            <div className="flex flex-wrap gap-1">
                {val.map((v, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{String(v)}</Badge>
                ))}
            </div>
        )
    }
    if (type === "long_text") {
        return <span className="whitespace-pre-wrap">{String(val)}</span>
    }
    return String(val)
}

function MetaLine({ label, value, mono, capitalize }: { label: string; value: string; mono?: boolean; capitalize?: boolean }) {
    return (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">{label}</p>
            <p className={`text-sm text-foreground ${mono ? "font-mono text-xs" : ""} ${capitalize ? "capitalize" : ""}`}>{value}</p>
        </div>
    )
}

function TimelineRow({ label, at, actor, destructive }: { label: string; at: string | null | undefined; actor?: string | null; destructive?: boolean }) {
    if (!at) {
        return (
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                <Clock className="h-3 w-3" />
                <span className="font-medium">{label}</span>
                <span>— pending</span>
            </div>
        )
    }
    return (
        <div className={`flex items-center gap-2 text-xs ${destructive ? "text-destructive" : "text-foreground"}`}>
            {destructive ? <X className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3 text-brand-teal" />}
            <span className="font-semibold">{label}</span>
            <span className="text-muted-foreground">
                · {format(new Date(at), "PPp")}
                {actor ? ` by ${actor}` : ""}
            </span>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { label: string; cls: string }> = {
        submitted: { label: "Submitted", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" },
        received: { label: "Received", cls: "bg-brand-blue/10 text-brand-blue border-brand-blue/30" },
        approved: { label: "Approved", cls: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30" },
        fulfilled: { label: "Fulfilled", cls: "bg-brand-teal/10 text-brand-teal border-brand-teal/30" },
        rejected: { label: "Rejected", cls: "bg-destructive/10 text-destructive border-destructive/30" },
    }
    const c = config[status] || config.submitted
    return (
        <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-widest ${c.cls}`}>
            {c.label}
        </Badge>
    )
}

export { StatusBadge as SubmissionStatusBadge }
