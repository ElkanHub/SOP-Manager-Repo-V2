"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { DoorOpen, Search, X, Send, FilePlus2, FileEdit, Files, Archive, Lightbulb, AlertTriangle, Loader2 } from "lucide-react"
import { submitChangeControlRequest } from "@/actions/change-control"
import { requestSopRetirement } from "@/actions/document-lifecycle"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { SopUploadModal, type ExistingSopOption } from "@/components/approvals/sop-upload-modal"
import type { Department, Profile, SopRecord } from "@/types/app.types"

// The union of fields the two downstream pipes need (SopUploadModal's
// ExistingSopOption + change-control document mapping).
export type IntakeSop = Pick<
    SopRecord,
    "id" | "sop_number" | "title" | "department" | "status" | "locked" | "document_level" | "version" | "training_required"
>

interface Props {
    profile: Profile
    departments: Department[]
    activeSops: IntakeSop[]
}

type InferredType = "NEW_SOP" | "CHANGE_SINGLE" | "CHANGE_MULTI" | "RETIRE"

const MIN_REASON = 20

// All fetched SOPs are status === 'active' (effective), so selection count + the
// retire intent fully determine the type. Keying off "effective" is why we only
// ever fetch active rows server-side.
function infer(selectedCount: number, retire: boolean): InferredType {
    if (retire && selectedCount > 0) return "RETIRE"
    if (selectedCount === 0) return "NEW_SOP"
    if (selectedCount === 1) return "CHANGE_SINGLE"
    return "CHANGE_MULTI"
}

const TYPE_META: Record<InferredType, { label: string; icon: typeof FilePlus2; route: string }> = {
    NEW_SOP: { label: "New Document", icon: FilePlus2, route: "New-document upload (HOD → QA approval)" },
    CHANGE_SINGLE: { label: "Change Control", icon: FileEdit, route: "Change Control package (QA screening)" },
    CHANGE_MULTI: { label: "Change Control (multi-document)", icon: Files, route: "Change Control package (QA screening)" },
    RETIRE: { label: "Retirement", icon: Archive, route: "Retirement request (QA approval)" },
}

export function IntakeClient({ profile, departments, activeSops }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const [search, setSearch] = useState("")
    const [departmentFilter, setDepartmentFilter] = useState("all")
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [reason, setReason] = useState("")
    const [retire, setRetire] = useState(false)

    const [disputeOpen, setDisputeOpen] = useState(false)
    const [disputeNote, setDisputeNote] = useState("")

    const [uploadOpen, setUploadOpen] = useState(false)
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    const selectedSops = useMemo(
        () => activeSops.filter((s) => selectedIds.includes(s.id)),
        [activeSops, selectedIds],
    )

    const filteredSops = useMemo(() => {
        const q = search.trim().toLowerCase()
        return activeSops.filter((sop) => {
            const matchesDept = departmentFilter === "all" || sop.department === departmentFilter
            const matchesSearch = !q || [sop.sop_number, sop.title, sop.department].some((v) => (v || "").toLowerCase().includes(q))
            return matchesDept && matchesSearch
        })
    }, [activeSops, departmentFilter, search])

    const inferred = infer(selectedIds.length, retire)
    const meta = TYPE_META[inferred]
    const TypeIcon = meta.icon

    const rationaleText = useMemo(() => {
        const names = selectedSops.map((s) => s.sop_number).join(", ")
        switch (inferred) {
            case "NEW_SOP":
                return "You selected no existing document, so this will be raised as a brand-new document for approval."
            case "CHANGE_SINGLE":
                return `You selected ${names}, which is effective, so this will be handled as a change.`
            case "CHANGE_MULTI":
                return `You selected ${selectedSops.length} effective documents (${names}), so this will be handled as a multi-document change.`
            case "RETIRE":
                return `You marked ${names} for discontinuation, so this will be routed as a retirement request.`
        }
    }, [inferred, selectedSops])

    const reasonTooShort = reason.trim().length < MIN_REASON

    const toggleSop = (id: string) => {
        setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
    }

    const combinedReason = () => {
        const note = disputeNote.trim()
        return note ? `${reason.trim()}\n\n[Type disputed by requester — QA to re-evaluate] ${note}` : reason.trim()
    }

    const dispatch = () => {
        setMessage(null)

        // NEW_SOP reuses the existing upload modal — no server call here.
        if (inferred === "NEW_SOP") {
            setUploadOpen(true)
            return
        }

        const text = combinedReason()

        startTransition(async () => {
            if (inferred === "RETIRE") {
                // requestSopRetirement handles one document; loop covers multi-select.
                for (const sop of selectedSops) {
                    const res = await requestSopRetirement(sop.id, text)
                    if (!res.success) {
                        setMessage({ type: "error", text: `${sop.sop_number}: ${res.error}` })
                        return
                    }
                }
                setMessage({ type: "success", text: `Retirement request submitted to QA for ${selectedSops.length} document(s).` })
                resetForm()
                router.refresh()
                return
            }

            // CHANGE_SINGLE / CHANGE_MULTI → Change Control pipe.
            const numbers = selectedSops.map((s) => s.sop_number).join(", ")
            const res = await submitChangeControlRequest({
                title: `Change request: ${numbers}`.slice(0, 160),
                originatingDepartment: profile.department || selectedSops[0]?.department || "",
                rationale: text,
                impactAssessment: text,
                affectedDepartments: Array.from(new Set(selectedSops.map((s) => s.department).filter(Boolean))),
                requestedDueDate: null,
                documents: selectedSops.map((sop) => ({
                    documentId: sop.id,
                    documentNumber: sop.sop_number,
                    documentTitle: sop.title,
                    documentLevel: sop.document_level || "level_2",
                    documentType: "sop",
                    department: sop.department,
                    oldRevision: sop.version,
                    newRevision: "",
                    reasonForChange: text,
                    trainingRequired: !!sop.training_required,
                })),
            })

            if (!res.success) {
                setMessage({ type: "error", text: res.error })
                return
            }
            setMessage({ type: "success", text: `${res.ccNumber} submitted to QA.` })
            resetForm()
            router.refresh()
        })
    }

    const resetForm = () => {
        setSelectedIds([])
        setReason("")
        setRetire(false)
        setDisputeOpen(false)
        setDisputeNote("")
    }

    const existingSops: ExistingSopOption[] = activeSops.map((s) => ({
        id: s.id,
        sop_number: s.sop_number,
        title: s.title,
        department: s.department,
        status: s.status,
        locked: s.locked,
    }))

    return (
        <div className="p-0 md:p-6">
            <div className="flex items-start gap-2 border-b border-border bg-card px-4 py-4 md:px-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-navy text-white">
                    <DoorOpen className="h-4 w-4" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-foreground">Start a Request</h1>
                    <p className="text-sm text-muted-foreground">One door. Tell us what you need — we work out how to route it.</p>
                </div>
            </div>

            <div className="mt-6 space-y-4 px-4 md:px-0">
                {message && (
                    <div className={`rounded-md border px-3 py-2 text-sm ${message.type === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"}`}>
                        {message.text}
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">What does this concern?</CardTitle>
                        <p className="text-sm text-muted-foreground">Pick the effective document(s) this is about, or leave empty to create something new.</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input className="pl-8" placeholder="Search documents" value={search} onChange={(e) => setSearch(e.target.value)} />
                            </div>
                            <Select value={departmentFilter} onValueChange={(v) => v && setDepartmentFilter(v)}>
                                <SelectTrigger className="w-full sm:w-48">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All departments</SelectItem>
                                    {departments.map((dept) => (
                                        <SelectItem key={dept.id || dept.name} value={dept.name}>{dept.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="overflow-hidden rounded-md border border-border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12"></TableHead>
                                        <TableHead>Document</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead>Revision</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSops.map((sop) => (
                                        <TableRow key={sop.id} className="cursor-pointer" onClick={() => toggleSop(sop.id)}>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <Checkbox checked={selectedIds.includes(sop.id)} onCheckedChange={() => toggleSop(sop.id)} />
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{sop.sop_number}</div>
                                                <div className="text-xs text-muted-foreground">{sop.title}</div>
                                            </TableCell>
                                            <TableCell className="text-sm">{sop.department}</TableCell>
                                            <TableCell className="font-mono text-xs">{sop.version}</TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredSops.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No active documents match the current filters.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {selectedSops.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {selectedSops.map((sop) => (
                                    <Button key={sop.id} type="button" variant="outline" size="sm" onClick={() => toggleSop(sop.id)}>
                                        {sop.sop_number}
                                        <X className="ml-1.5 h-3.5 w-3.5" />
                                    </Button>
                                ))}
                            </div>
                        )}

                        <label className="flex items-center gap-2 text-sm text-foreground">
                            <Checkbox checked={retire} onCheckedChange={(v) => setRetire(!!v)} disabled={selectedSops.length === 0} />
                            Discontinue / retire the selected document(s)
                        </label>

                        <div className="space-y-2">
                            <Label htmlFor="intake-reason">Why? (required)</Label>
                            <Textarea
                                id="intake-reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={4}
                                placeholder="Describe what you need and why. This becomes the rationale on the routed request."
                            />
                            {reasonTooShort && reason.length > 0 && (
                                <p className="text-xs text-muted-foreground">At least {MIN_REASON} characters.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Inference result + confirm. Type is locked at dispatch, not before. */}
                <Card className="border-brand-teal/30">
                    <CardContent className="space-y-4 pt-6">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-teal/10 text-brand-teal">
                                <TypeIcon className="h-5 w-5" />
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Inferred</span>
                                    <span className="text-sm font-bold text-foreground">{meta.label}</span>
                                </div>
                                <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-brand-teal" />
                                    {rationaleText}
                                </p>
                                <p className="text-xs text-muted-foreground/70">Routes to: {meta.route}</p>
                            </div>
                        </div>

                        {disputeOpen && (
                            <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                                <Label htmlFor="dispute-note" className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                                    <AlertTriangle className="h-3.5 w-3.5" /> Tell QA why this looks wrong
                                </Label>
                                <Textarea
                                    id="dispute-note"
                                    value={disputeNote}
                                    onChange={(e) => setDisputeNote(e.target.value)}
                                    rows={2}
                                    placeholder="QA will re-evaluate. Your note is attached to the request."
                                />
                            </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground"
                                onClick={() => setDisputeOpen((o) => !o)}
                            >
                                {disputeOpen ? "Never mind, looks right" : "This looks wrong"}
                            </Button>
                            <Button onClick={dispatch} disabled={isPending || reasonTooShort}>
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                {inferred === "NEW_SOP" ? "Continue to upload" : "Confirm & submit"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* NEW_SOP routes here — reuse the existing upload flow, preset to 'new'. */}
            <SopUploadModal
                open={uploadOpen}
                onOpenChange={setUploadOpen}
                user={profile}
                departments={departments}
                existingSops={existingSops}
                lockedType="new"
                onSuccess={() => {
                    setUploadOpen(false)
                    setMessage({ type: "success", text: "New document submitted for review." })
                    resetForm()
                    router.refresh()
                }}
            />
        </div>
    )
}
