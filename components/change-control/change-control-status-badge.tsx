"use client"

import { Badge } from "@/components/ui/badge"
import type { ChangeControlPackageStatus } from "@/types/app.types"

const STATUS_LABELS: Record<ChangeControlPackageStatus, string> = {
    draft: "Draft",
    submitted: "Submitted",
    qa_screening: "QA Screening",
    clarification_requested: "Clarification",
    approved_for_document_work: "Document Work",
    documents_in_review: "In Review",
    signatures_pending: "Signatures",
    pending_reconciliation: "Reconciliation",
    pending_training: "Training",
    effective: "Effective",
    closed: "Closed",
    rejected: "Rejected",
    pending: "Signatures",
    pending_activation: "Activation",
    complete: "Complete",
    waived: "Waived",
}

const STATUS_CLASS: Partial<Record<ChangeControlPackageStatus, string>> = {
    submitted: "border-amber-200 bg-amber-50 text-amber-800",
    qa_screening: "border-blue-200 bg-blue-50 text-blue-800",
    clarification_requested: "border-orange-200 bg-orange-50 text-orange-800",
    approved_for_document_work: "border-indigo-200 bg-indigo-50 text-indigo-800",
    documents_in_review: "border-sky-200 bg-sky-50 text-sky-800",
    signatures_pending: "border-violet-200 bg-violet-50 text-violet-800",
    pending: "border-violet-200 bg-violet-50 text-violet-800",
    pending_reconciliation: "border-cyan-200 bg-cyan-50 text-cyan-800",
    pending_training: "border-teal-200 bg-teal-50 text-teal-800",
    effective: "border-emerald-200 bg-emerald-50 text-emerald-800",
    complete: "border-emerald-200 bg-emerald-50 text-emerald-800",
    closed: "border-slate-200 bg-slate-50 text-slate-800",
    rejected: "border-red-200 bg-red-50 text-red-800",
    waived: "border-zinc-200 bg-zinc-50 text-zinc-800",
}

export function ChangeControlStatusBadge({ status }: { status: ChangeControlPackageStatus }) {
    return (
        <Badge variant="outline" className={STATUS_CLASS[status] || "border-muted bg-muted/40 text-muted-foreground"}>
            {STATUS_LABELS[status] || status}
        </Badge>
    )
}

export function formatChangeControlStatus(status: ChangeControlPackageStatus) {
    return STATUS_LABELS[status] || status
}
