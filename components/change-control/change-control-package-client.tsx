"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    ArrowLeft, FileText, Upload, CheckCircle2, Clock, AlertCircle, Loader2,
    ShieldCheck, GraduationCap, Building2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { SignatureGrid } from "@/components/change-control/signature-grid"
import { SignatureConfirmModal } from "@/components/change-control/signature-confirm-modal"
import { WaiveModal } from "@/components/change-control/waive-modal"
import { ChangeControlStatusBadge } from "@/components/change-control/change-control-status-badge"
import {
    screenChangeControlRequest, updateChangeControlStatus, reviewChangeControlDocument,
    setChangeControlDocumentDraft, releaseChangeControlDocumentTraining,
    classifyChangeControl, approveChangeControlForWork, openEffectivenessReview, closeChangeControl,
} from "@/actions/change-control"
import { confirmChangeControlReconciliation } from "@/actions/sop"
import type {
    ChangeControlPackage, ChangeControlDocumentRecord, CcSignatory, SignatureCertificate,
} from "@/types/app.types"

interface Props {
    pkg: ChangeControlPackage
    documents: ChangeControlDocumentRecord[]
    signatories: CcSignatory[]
    signatureCertificates: SignatureCertificate[]
    currentUserId: string
    isAdmin: boolean
    isQa: boolean
    canSign: boolean
    isRequester: boolean
    currentUserSignatureUrl?: string | null
}

async function uploadDraft(file: File): Promise<{ filePath?: string; error?: string }> {
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/storage/sop-upload", { method: "POST", body: fd })
    const json = await res.json()
    if (!res.ok) return { error: json.error || "Upload failed" }
    return { filePath: json.filePath }
}

export function ChangeControlPackageClient({
    pkg, documents, signatories, signatureCertificates,
    currentUserId, isAdmin, isQa, canSign, isRequester, currentUserSignatureUrl,
}: Props) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
    const [signOpen, setSignOpen] = useState(false)
    const [waiveTarget, setWaiveTarget] = useState<{ id: string; name: string } | null>(null)
    const [note, setNote] = useState("")
    // QA screening: structured impact assessment + risk classification (§7.2 / §7.3)
    const [classification, setClassification] = useState<"minor" | "major" | "critical">(pkg.classification || "minor")
    const [impact, setImpact] = useState({
        affected_documents: pkg.impact_assessment_structured?.affected_documents || "",
        training_required: pkg.impact_assessment_structured?.training_required ?? false,
        training_for: pkg.impact_assessment_structured?.training_for || "",
        records_affected: pkg.impact_assessment_structured?.records_affected || "",
        systems_equipment: pkg.impact_assessment_structured?.systems_equipment || "",
        revalidation_needed: pkg.impact_assessment_structured?.revalidation_needed ?? false,
        regulatory_notification: pkg.impact_assessment_structured?.regulatory_notification ?? false,
        notes: pkg.impact_assessment_structured?.notes || "",
    })
    const impactComplete =
        impact.affected_documents.trim().length > 0 &&
        impact.records_affected.trim().length > 0 &&
        impact.systems_equipment.trim().length > 0
    const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10))

    const status = pkg.status
    const ccRef = pkg.cc_number || `CC-${pkg.id.slice(0, 8).toUpperCase()}`
    const canManage = isQa || isAdmin

    const refresh = () => { setMessage(null); router.refresh() }
    const run = (fn: () => Promise<{ success: boolean; error?: string }>, ok: string) =>
        startTransition(async () => {
            const r = await fn()
            if (r.success) { setMessage({ type: "success", text: ok }); router.refresh() }
            else setMessage({ type: "error", text: r.error || "Action failed" })
        })

    const isScreening = status === "submitted" || status === "impact_pending" || status === "classified"
    const inDocWork = status === "approved_for_document_work" || status === "documents_in_review"
    const showSignatures = ["signatures_pending", "pending_reconciliation", "pending_training", "effective", "closed"].includes(status)

    return (
        <div className="min-h-screen bg-muted/10">
            <div className="border-b bg-background/60 backdrop-blur sticky top-0 z-10 px-4 sm:px-6 py-3">
                <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
                    <Link href={isRequester ? "/requests/change-control" : "/requests/hub/change-control"}
                        className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" /> Back to {isRequester ? "My Change Controls" : "Change Control Hub"}
                    </Link>
                    <ChangeControlStatusBadge status={status} />
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                {/* Header */}
                <div className="rounded-xl border bg-card p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <span className="font-mono text-xs font-bold text-brand-teal">{ccRef}</span>
                            <h1 className="text-2xl font-bold tracking-tight mt-1">{pkg.title}</h1>
                            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                                <Building2 className="h-3.5 w-3.5" /> {pkg.originating_department || "—"}
                                {pkg.deadline && <>· Due {new Date(pkg.deadline).toLocaleDateString()}</>}
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                                {pkg.origin === "sop_revision" ? "SOP Revision" : "Department Request"}
                            </Badge>
                            {pkg.classification && (
                                <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${pkg.classification === "critical" ? "border-red-300 bg-red-50 text-red-700" : pkg.classification === "major" ? "border-orange-300 bg-orange-50 text-orange-700" : "border-slate-300 bg-slate-50 text-slate-700"}`}>
                                    {pkg.classification} change
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                {message && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium ${message.type === "success" ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}>
                        {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        {message.text}
                    </div>
                )}

                {status === "rejected" && pkg.rejection_reason && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
                        <h3 className="text-sm font-bold text-destructive uppercase tracking-wide mb-1">Rejected</h3>
                        <p className="text-sm text-muted-foreground">{pkg.rejection_reason}</p>
                    </div>
                )}

                {status === "clarification_requested" && pkg.clarification_request && (
                    <div className="rounded-xl border border-amber-300/40 bg-amber-50 dark:bg-amber-950/20 p-5">
                        <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide mb-1">Clarification requested by QA</h3>
                        <p className="text-sm text-muted-foreground">{pkg.clarification_request}</p>
                    </div>
                )}

                {/* Summary */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="rounded-xl border bg-card p-5 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Rationale</h3>
                        <p className="text-sm whitespace-pre-wrap">{pkg.rationale || "—"}</p>
                    </div>
                    <div className="rounded-xl border bg-card p-5 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Impact Assessment</h3>
                        <p className="text-sm whitespace-pre-wrap">{pkg.impact_assessment || "—"}</p>
                        {pkg.affected_departments && pkg.affected_departments.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {pkg.affected_departments.map((d) => (
                                    <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* QA screening — submitted: triage; impact_pending/classified: impact + classify */}
                {isScreening && canManage && (
                    <div className="rounded-xl border bg-card p-5 space-y-4">
                        <h3 className="text-sm font-bold flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-teal" /> QA Screening</h3>

                        {status === "submitted" && (
                            <div className="space-y-3">
                                <p className="text-xs text-muted-foreground">Triage this request. Begin screening to complete the impact assessment and assign a risk classification, or send it back / reject it.</p>
                                <Textarea placeholder="Note (required for clarification / rejection)" value={note} onChange={(e) => setNote(e.target.value)} />
                                <div className="flex flex-wrap gap-2">
                                    <Button disabled={pending} onClick={() => run(() => screenChangeControlRequest(pkg.id, "approve"), "Screening started — complete the impact assessment")}>Begin screening</Button>
                                    <Button variant="outline" disabled={pending} onClick={() => run(() => screenChangeControlRequest(pkg.id, "clarification", note), "Clarification requested")}>Request clarification</Button>
                                    <Button variant="ghost" className="text-destructive" disabled={pending} onClick={() => run(() => screenChangeControlRequest(pkg.id, "reject", note), "Rejected")}>Reject</Button>
                                </div>
                            </div>
                        )}

                        {(status === "impact_pending" || status === "classified") && (
                            <div className="space-y-4">
                                <p className="text-xs text-muted-foreground">
                                    Complete the impact assessment (all four fields required) and assign a risk class. The class determines the required signature set — there is no &quot;submit anyway&quot;.
                                </p>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    <label className="space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Affected documents *</span>
                                        <Textarea value={impact.affected_documents} onChange={(e) => setImpact({ ...impact, affected_documents: e.target.value })} className="min-h-[60px]" />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Records / templates affected *</span>
                                        <Textarea value={impact.records_affected} onChange={(e) => setImpact({ ...impact, records_affected: e.target.value })} className="min-h-[60px]" />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Systems / equipment touched *</span>
                                        <Textarea value={impact.systems_equipment} onChange={(e) => setImpact({ ...impact, systems_equipment: e.target.value })} className="min-h-[60px]" />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Notes</span>
                                        <Textarea value={impact.notes} onChange={(e) => setImpact({ ...impact, notes: e.target.value })} className="min-h-[60px]" />
                                    </label>
                                </div>
                                <div className="flex flex-wrap gap-4 text-sm">
                                    <label className="flex items-center gap-2"><input type="checkbox" checked={impact.training_required} onChange={(e) => setImpact({ ...impact, training_required: e.target.checked })} /> Training required</label>
                                    <label className="flex items-center gap-2"><input type="checkbox" checked={impact.revalidation_needed} onChange={(e) => setImpact({ ...impact, revalidation_needed: e.target.checked })} /> Revalidation may be needed</label>
                                    <label className="flex items-center gap-2"><input type="checkbox" checked={impact.regulatory_notification} onChange={(e) => setImpact({ ...impact, regulatory_notification: e.target.checked })} /> Regulatory notification</label>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Risk class</span>
                                    {(["minor", "major", "critical"] as const).map((c) => (
                                        <label key={c} className="flex items-center gap-1.5 text-sm capitalize">
                                            <input type="radio" name="classification" checked={classification === c} onChange={() => setClassification(c)} /> {c}
                                        </label>
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button disabled={pending || !impactComplete}
                                        onClick={() => run(() => classifyChangeControl(pkg.id, classification, {
                                            affected_documents: impact.affected_documents,
                                            training_required: impact.training_required,
                                            training_for: impact.training_for || undefined,
                                            records_affected: impact.records_affected,
                                            systems_equipment: impact.systems_equipment,
                                            revalidation_needed: impact.revalidation_needed,
                                            regulatory_notification: impact.regulatory_notification,
                                            notes: impact.notes || undefined,
                                        }), "Impact assessed and classified")}>
                                        {status === "classified" ? "Update classification" : "Save impact & classify"}
                                    </Button>
                                    {status === "classified" && (
                                        <Button variant="outline" disabled={pending}
                                            onClick={() => run(() => approveChangeControlForWork(pkg.id), "Approved for document work")}>
                                            Approve for document work
                                        </Button>
                                    )}
                                    <Button variant="ghost" className="text-destructive" disabled={pending} onClick={() => run(() => screenChangeControlRequest(pkg.id, "reject", note), "Rejected")}>Reject</Button>
                                </div>
                                {!impactComplete && <p className="text-[11px] text-amber-600">All four impact fields (affected documents, records, systems, plus a class) must be completed before classification.</p>}
                            </div>
                        )}
                    </div>
                )}

                {/* Queued — a document is locked under another open change control (§7.4) */}
                {status === "queued" && canManage && (
                    <div className="rounded-xl border border-yellow-300/50 bg-yellow-50 dark:bg-yellow-950/20 p-5 space-y-3">
                        <h3 className="text-sm font-bold text-yellow-800 dark:text-yellow-300 flex items-center gap-2"><Clock className="h-4 w-4" /> Queued — lock conflict</h3>
                        <p className="text-xs text-muted-foreground">An affected document is currently locked under another open Change Control. This change is queued and will be released automatically when the lock clears. You can also retry now.</p>
                        <Button variant="outline" disabled={pending} onClick={() => run(() => approveChangeControlForWork(pkg.id), "Re-checked lock conflict")}>Retry approval for work</Button>
                    </div>
                )}

                {/* Documents */}
                <div className="rounded-xl border bg-card p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold flex items-center gap-2"><FileText className="h-4 w-4 text-brand-teal" /> Affected Documents ({documents.length})</h3>
                        {inDocWork && canManage && status === "approved_for_document_work" && (
                            <Button size="sm" variant="outline" disabled={pending}
                                onClick={() => run(() => updateChangeControlStatus(pkg.id, "documents_in_review"), "Moved to document review")}>
                                Start document review
                            </Button>
                        )}
                    </div>
                    <div className="space-y-3">
                        {documents.map((doc) => (
                            <DocumentRow key={doc.id} doc={doc} ccId={pkg.id} status={status} canManage={canManage}
                                pending={pending} effectiveDate={effectiveDate}
                                onAction={run} />
                        ))}
                        {documents.length === 0 && <p className="text-sm text-muted-foreground">No documents listed.</p>}
                    </div>
                </div>

                {/* Signatures */}
                {showSignatures && (
                    <div className="rounded-xl border bg-card p-5">
                        <SignatureGrid
                            signatories={signatories}
                            certificates={signatureCertificates}
                            currentUserId={currentUserId}
                            isAdmin={isAdmin}
                            canSign={canSign && status === "signatures_pending"}
                            onSign={() => setSignOpen(true)}
                            onWaive={(uid) => setWaiveTarget({ id: uid, name: signatories.find((s) => s.user_id === uid)?.full_name || "Unknown" })}
                            isLocked={status !== "signatures_pending"}
                        />
                    </div>
                )}

                {/* Reconciliation */}
                {status === "pending_reconciliation" && canManage && (
                    <div className="rounded-xl border border-amber-300/40 bg-amber-50 dark:bg-amber-950/20 p-5 space-y-3">
                        <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2"><Clock className="h-4 w-4" /> Copy Reconciliation</h3>
                        <p className="text-xs text-muted-foreground">Confirm all issued copies of the superseded revisions have been retrieved before activating the new versions.</p>
                        <div className="flex flex-wrap gap-3 items-end">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Effective date</label>
                                <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="w-44" />
                            </div>
                            <Textarea placeholder="Reconciliation note (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="flex-1 min-w-[200px]" />
                        </div>
                        <Button disabled={pending} onClick={() => run(() => confirmChangeControlReconciliation(pkg.id, note, effectiveDate), "Reconciliation confirmed — SOPs activated")}>
                            Confirm reconciliation & activate
                        </Button>
                    </div>
                )}

                {/* Effectiveness review → close (§7.12). A change is not closed when it
                    goes effective; an independent reviewer (≠ requester) confirms it met
                    its objective. */}
                {status === "effective" && canManage && (
                    <div className="rounded-xl border bg-card p-5 flex items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">All documents are effective. Open the effectiveness review to confirm the change met its objective before closing.</p>
                        <Button variant="outline" disabled={pending} onClick={() => run(() => openEffectivenessReview(pkg.id), "Effectiveness review opened")}>Open effectiveness review</Button>
                    </div>
                )}
                {status === "effectiveness_review" && canManage && (
                    <div className="rounded-xl border bg-card p-5 space-y-3">
                        <p className="text-sm text-muted-foreground">Effectiveness review — confirm the change achieved its objective. The reviewer must be independent of the requester.</p>
                        <Textarea placeholder="Effectiveness outcome (required)…" value={note} onChange={(e) => setNote(e.target.value)} />
                        <Button variant="outline" disabled={pending || note.trim().length < 5} onClick={() => run(() => closeChangeControl(pkg.id, note), "Change Control closed")}>Confirm & close Change Control</Button>
                    </div>
                )}
            </div>

            <SignatureConfirmModal
                open={signOpen}
                onOpenChange={setSignOpen}
                changeControlId={pkg.id}
                sopTitle={pkg.title || ccRef}
                newVersion={documents[0]?.new_revision || ""}
                ccRef={ccRef}
                signatureUrl={currentUserSignatureUrl}
                onSuccess={refresh}
            />
            {waiveTarget && (
                <WaiveModal
                    open={!!waiveTarget}
                    onOpenChange={(o) => !o && setWaiveTarget(null)}
                    changeControlId={pkg.id}
                    targetUserName={waiveTarget.name}
                    ccRef={ccRef}
                    onSuccess={refresh}
                />
            )}
        </div>
    )
}

function DocumentRow({ doc, ccId, status, canManage, pending, effectiveDate, onAction }: {
    doc: ChangeControlDocumentRecord
    ccId: string
    status: string
    canManage: boolean
    pending: boolean
    effectiveDate: string
    onAction: (fn: () => Promise<{ success: boolean; error?: string }>, ok: string) => void
}) {
    const [newRevision, setNewRevision] = useState(doc.new_revision || "")
    const [uploading, setUploading] = useState(false)
    const [localErr, setLocalErr] = useState<string | null>(null)
    const inDocWork = status === "approved_for_document_work" || status === "documents_in_review"

    const handleFile = async (file: File) => {
        setUploading(true); setLocalErr(null)
        const up = await uploadDraft(file)
        setUploading(false)
        if (up.error || !up.filePath) { setLocalErr(up.error || "Upload failed"); return }
        onAction(() => setChangeControlDocumentDraft(doc.id, { newRevision, newFileUrl: up.filePath }, ccId), "Draft attached")
    }

    return (
        <div className="rounded-lg border bg-muted/20 p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold">{doc.document_number}</span>
                        <Badge variant="outline" className="text-[9px] uppercase">{doc.document_level.replace("_", " ")}</Badge>
                        <Badge variant="secondary" className="text-[9px] capitalize">{doc.review_status.replace("_", " ")}</Badge>
                    </div>
                    <p className="text-sm font-medium mt-1">{doc.document_title}</p>
                    <p className="text-xs text-muted-foreground">{doc.department} · rev {doc.old_revision || "—"} → {doc.new_revision || "?"}{doc.training_required ? " · training required" : ""}</p>
                </div>
            </div>

            {inDocWork && canManage && (
                <div className="mt-3 pt-3 border-t flex flex-wrap items-end gap-2">
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">New rev</label>
                        <Input value={newRevision} onChange={(e) => setNewRevision(e.target.value)} placeholder="01" className="w-20 h-9" />
                    </div>
                    <label className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border text-xs font-medium cursor-pointer hover:bg-muted">
                        <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Attach .docx"}
                        <input type="file" accept=".docx" className="hidden" disabled={uploading || pending}
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                    </label>
                    <Separator orientation="vertical" className="h-8" />
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => onAction(() => reviewChangeControlDocument(doc.id, "approved", undefined, ccId), "Document approved")}>Approve</Button>
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => onAction(() => reviewChangeControlDocument(doc.id, "changes_requested", undefined, ccId), "Changes requested")}>Request changes</Button>
                    {localErr && <span className="text-xs text-destructive">{localErr}</span>}
                </div>
            )}

            {status === "pending_training" && canManage && doc.training_required && doc.review_status !== "effective" && (
                <div className="mt-3 pt-3 border-t flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-teal-600" />
                    <Button size="sm" disabled={pending} onClick={() => onAction(() => releaseChangeControlDocumentTraining(doc.id, effectiveDate, ccId), "Training gate released — document effective")}>
                        Release effective date (training met)
                    </Button>
                </div>
            )}
        </div>
    )
}
