"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import { Archive, Check, X, Lock, ShieldAlert, Trash2, FileText, CalendarClock } from "lucide-react"
import { approveSopRetirement, rejectSopRetirement, destroyRetiredDocument } from "@/actions/document-lifecycle"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { EmptyState } from "@/components/ui/empty-state"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import type { Retirement, RetirementStatus, SopRecord } from "@/types/app.types"

type PersonRef = { id: string; full_name: string | null }

export type JoinedRetirement = Retirement & {
    document: Pick<SopRecord, "id" | "sop_number" | "title" | "department" | "version"> | null
    requester: PersonRef | null
    approver: PersonRef | null
}

interface Props {
    retirements: JoinedRetirement[]
    isQa: boolean
}

const STATUS_BADGE: Record<RetirementStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    retirement_requested: { label: "Awaiting QA", variant: "secondary" },
    retirement_approved: { label: "Approved", variant: "default" },
    pending_destruction: { label: "Retention hold", variant: "outline" },
    destroyed: { label: "Destroyed", variant: "destructive" },
    rejected: { label: "Rejected", variant: "destructive" },
}

function fmtDate(value?: string | null) {
    return value ? format(new Date(value), "d MMM yyyy") : "—"
}

function CheckRow({ ok, label, enforced = true }: { ok: boolean; label: string; enforced?: boolean }) {
    const Icon = !enforced ? ShieldAlert : ok ? Check : X
    const tone = !enforced ? "text-muted-foreground" : ok ? "text-brand-teal" : "text-destructive"
    return (
        <li className="flex items-start gap-2 text-sm">
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} aria-hidden="true" />
            <span className="text-foreground">{label}</span>
        </li>
    )
}

function Prechecks({ r }: { r: JoinedRetirement }) {
    const p = r.precheck_results
    if (!p) return null
    return (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pre-checks</p>
            <ul className="space-y-1.5">
                <CheckRow
                    ok={p.no_open_change_control}
                    label={p.no_open_change_control ? "No open change control" : `${p.open_change_control_count} open change control(s) block retirement`}
                />
                <CheckRow
                    ok={p.no_open_training}
                    label={p.no_open_training ? "No outstanding training" : `${p.open_training_count} incomplete training assignment(s) block retirement`}
                />
                <CheckRow
                    ok={p.no_active_references}
                    enforced={p.references_check_enforced}
                    label={p.references_check_enforced ? "No active documents reference this one" : "Active-reference check not yet enforced"}
                />
            </ul>
            {!p.passed && (
                <p className="mt-2 text-xs font-medium text-destructive">Pre-checks fail — approval is blocked until resolved.</p>
            )}
        </div>
    )
}

export function RetirementsReviewClient({ retirements, isQa }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [rejectTarget, setRejectTarget] = useState<JoinedRetirement | null>(null)
    const [rejectReason, setRejectReason] = useState("")

    const run = (fn: () => Promise<{ success: boolean; error?: string }>, okMsg: string, after?: () => void) => {
        startTransition(async () => {
            const res = await fn()
            if (!res.success) {
                toast.error(res.error || "Something went wrong")
                return
            }
            toast.success(okMsg)
            after?.()
            router.refresh()
        })
    }

    const onApprove = (r: JoinedRetirement) =>
        run(() => approveSopRetirement(r.id), "Retirement approved — document withdrawn into retention hold")

    const onDestroy = (r: JoinedRetirement) =>
        run(() => destroyRetiredDocument(r.id), "Document destroyed — metadata and audit retained")

    const submitReject = () => {
        if (!rejectTarget) return
        const target = rejectTarget
        run(() => rejectSopRetirement(target.id, rejectReason.trim()), "Retirement request rejected", () => {
            setRejectTarget(null)
            setRejectReason("")
        })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return (
        <div className="p-0 md:p-6">
            <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-4 md:rounded-t-xl md:px-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Archive className="h-4 w-4" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-foreground">Retirement Review</h1>
                    <p className="text-sm text-muted-foreground">
                        QA review of document discontinuation, retention hold and time-gated destruction
                    </p>
                </div>
            </div>

            <div className="mt-6 px-4 md:px-0">
                {retirements.length === 0 ? (
                    <EmptyState
                        icon={Archive}
                        title="No retirement requests"
                        description="When a document is proposed for retirement it will appear here for QA review."
                    />
                ) : (
                    <div className="grid gap-4">
                        {retirements.map((r) => {
                            const badge = STATUS_BADGE[r.status]
                            const retentionUntil = r.retention_until ? new Date(r.retention_until) : null
                            const canDestroy = !!retentionUntil && retentionUntil.getTime() <= today.getTime()

                            return (
                                <Card key={r.id}>
                                    <CardHeader className="gap-3">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="flex items-start gap-2">
                                                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                                <div>
                                                    <p className="font-semibold text-foreground">
                                                        {r.document?.sop_number || "—"}
                                                        {r.document?.version ? <span className="ml-2 text-xs text-muted-foreground">v{r.document.version}</span> : null}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">{r.document?.title || "Document unavailable"}</p>
                                                    {r.document?.department && (
                                                        <p className="text-xs text-muted-foreground">{r.document.department}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <Badge variant={badge.variant}>{badge.label}</Badge>
                                        </div>
                                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                                            <span>Requested by {r.requester?.full_name || "Unknown"}</span>
                                            <span>Requested {fmtDate(r.requested_at)}</span>
                                            {r.approver?.full_name && <span>QA: {r.approver.full_name}</span>}
                                        </div>
                                    </CardHeader>

                                    <CardContent className="space-y-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Justification</p>
                                            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{r.justification}</p>
                                        </div>

                                        <Prechecks r={r} />

                                        {/* Retention hold / time-gate */}
                                        {r.status === "pending_destruction" && (
                                            <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${canDestroy ? "border-destructive/40 bg-destructive/5" : "border-amber-500/40 bg-amber-500/5"}`}>
                                                {canDestroy ? (
                                                    <Trash2 className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                                                ) : (
                                                    <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
                                                )}
                                                <div>
                                                    <p className="font-medium text-foreground">
                                                        {canDestroy ? "Retention period elapsed — destruction may proceed" : "Destruction blocked"}
                                                    </p>
                                                    <p className="text-muted-foreground">
                                                        {canDestroy
                                                            ? `Retained until ${fmtDate(r.retention_until)}.`
                                                            : `Retained until ${fmtDate(r.retention_until)} — destruction is locked until then.`}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {r.status === "rejected" && r.rejection_reason && (
                                            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-destructive">Rejected</p>
                                                <p className="mt-1 whitespace-pre-wrap text-foreground">{r.rejection_reason}</p>
                                            </div>
                                        )}

                                        {r.status === "destroyed" && (
                                            <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <CalendarClock className="h-4 w-4" /> Destroyed {fmtDate(r.destroyed_at)}
                                                </span>
                                                {r.destruction_method && <span>Method: {r.destruction_method}</span>}
                                            </div>
                                        )}

                                        {/* QA actions */}
                                        {isQa && r.status === "retirement_requested" && (
                                            <div className="flex flex-wrap gap-2">
                                                <Button size="sm" disabled={isPending} onClick={() => onApprove(r)}>
                                                    <Check className="h-4 w-4" /> Approve
                                                </Button>
                                                <Button size="sm" variant="outline" disabled={isPending} onClick={() => setRejectTarget(r)}>
                                                    <X className="h-4 w-4" /> Reject
                                                </Button>
                                                <p className="basis-full text-xs text-muted-foreground">
                                                    Pre-checks must pass and the approver cannot be the requester.
                                                </p>
                                            </div>
                                        )}

                                        {isQa && r.status === "pending_destruction" && (
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                disabled={isPending || !canDestroy}
                                                title={!canDestroy ? `Retained until ${fmtDate(r.retention_until)}` : undefined}
                                                onClick={() => onDestroy(r)}
                                            >
                                                {canDestroy ? <Trash2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                                {canDestroy ? "Destroy document" : "Destruction locked"}
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>

            <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason("") } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject retirement request</DialogTitle>
                        <DialogDescription>
                            {rejectTarget?.document?.sop_number} — provide a reason. This is recorded in the audit trail.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="reject-reason">Rejection reason</Label>
                        <Textarea
                            id="reject-reason"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Why is this retirement being rejected?"
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason("") }} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={submitReject} disabled={isPending || rejectReason.trim().length < 5}>
                            Reject request
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
