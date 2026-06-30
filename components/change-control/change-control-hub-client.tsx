"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { CheckCircle2, ClipboardCheck, Filter, MessageSquare, Search, XCircle } from "lucide-react"
import { screenChangeControlRequest, updateChangeControlStatus, type ChangeControlLifecycleStatus } from "@/actions/change-control"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { ChangeControlStatusBadge } from "@/components/change-control/change-control-status-badge"
import type { ChangeControlPackage, ChangeControlPackageStatus, Department } from "@/types/app.types"

interface Props {
    departments: Department[]
    changeControls: ChangeControlPackage[]
}

const openStatuses: ChangeControlPackageStatus[] = [
    "submitted",
    "clarification_requested",
    "impact_pending",
    "classified",
    "queued",
    "approved_for_document_work",
    "documents_in_review",
    "signatures_pending",
    "pending_reconciliation",
    "pending_training",
    "effectiveness_review",
]

// Only the benign manual transitions belong here. Terminal transitions (effective /
// closed) go through guarded actions (reconciliation, close-after-effectiveness-review).
const lifecycleOptions: { value: ChangeControlPackageStatus; label: string }[] = [
    { value: "documents_in_review", label: "Documents in Review" },
    { value: "signatures_pending", label: "Signatures Pending" },
    { value: "pending_reconciliation", label: "Pending Reconciliation" },
    { value: "pending_training", label: "Pending Training" },
]

export function ChangeControlHubClient({ departments, changeControls }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [selectedId, setSelectedId] = useState(changeControls[0]?.id || "")
    const [statusFilter, setStatusFilter] = useState("open")
    const [departmentFilter, setDepartmentFilter] = useState("all")
    const [search, setSearch] = useState("")
    const [note, setNote] = useState("")
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return changeControls.filter((cc) => {
            const statusMatches = statusFilter === "all"
                || (statusFilter === "open" && openStatuses.includes(cc.status))
                || cc.status === statusFilter
            const departmentMatches = departmentFilter === "all"
                || cc.originating_department === departmentFilter
                || cc.documents?.some((doc) => doc.department === departmentFilter)
            const searchMatches = !q
                || [cc.cc_number, cc.title, cc.originating_department, cc.requester?.full_name]
                    .some((value) => (value || "").toLowerCase().includes(q))
                || cc.documents?.some((doc) => [doc.document_number, doc.document_title].some((value) => (value || "").toLowerCase().includes(q)))
            return statusMatches && departmentMatches && searchMatches
        })
    }, [changeControls, departmentFilter, search, statusFilter])

    const selected = useMemo(
        () => changeControls.find((cc) => cc.id === selectedId) || filtered[0] || null,
        [changeControls, filtered, selectedId],
    )

    const runScreening = (decision: "approve" | "clarification" | "reject") => {
        if (!selected) return
        setMessage(null)
        startTransition(async () => {
            const res = await screenChangeControlRequest(selected.id, decision, note)
            if (!res.success) {
                setMessage({ type: "error", text: res.error })
                return
            }
            setNote("")
            setMessage({ type: "success", text: "Change Control updated" })
            router.refresh()
        })
    }

    const runStatusUpdate = (status: ChangeControlLifecycleStatus) => {
        if (!selected) return
        setMessage(null)
        startTransition(async () => {
            const res = await updateChangeControlStatus(selected.id, status)
            if (!res.success) {
                setMessage({ type: "error", text: res.error })
                return
            }
            setMessage({ type: "success", text: "Lifecycle status updated" })
            router.refresh()
        })
    }

    return (
        <div className="p-0 md:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-4 md:px-6">
                <div className="flex items-start gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <ClipboardCheck className="h-4 w-4" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">Change Control Hub</h1>
                        <p className="text-sm text-muted-foreground">QA register for numbered multi-document Change Control packages</p>
                    </div>
                </div>
            </div>

            <div className="mt-6 grid gap-4 px-4 md:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.8fr)] md:px-0">
                <Card className="overflow-hidden">
                    <CardHeader className="space-y-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Register</CardTitle>
                            <div className="text-xs text-muted-foreground">{filtered.length} of {changeControls.length}</div>
                        </div>
                        <div className="grid gap-2 md:grid-cols-[1fr_180px_180px]">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input className="pl-8" placeholder="Search register" value={search} onChange={(e) => setSearch(e.target.value)} />
                            </div>
                            <Select value={statusFilter} onValueChange={(value) => value && setStatusFilter(value)}>
                                <SelectTrigger>
                                    <Filter className="mr-2 h-4 w-4" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    {openStatuses.map((status) => (
                                        <SelectItem key={status} value={status}>{status.replaceAll("_", " ")}</SelectItem>
                                    ))}
                                    <SelectItem value="effective">Effective</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={departmentFilter} onValueChange={(value) => value && setDepartmentFilter(value)}>
                                <SelectTrigger>
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
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Number</TableHead>
                                    <TableHead>Package</TableHead>
                                    <TableHead>Requester</TableHead>
                                    <TableHead>Docs</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((cc) => (
                                    <TableRow
                                        key={cc.id}
                                        className="cursor-pointer"
                                        data-state={selected?.id === cc.id ? "selected" : undefined}
                                        onClick={() => setSelectedId(cc.id)}
                                    >
                                        <TableCell className="font-mono text-xs">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); router.push(`/requests/hub/change-control/${cc.id}`) }}
                                                className="text-brand-teal hover:underline"
                                            >
                                                {cc.cc_number || cc.id.slice(0, 8)}
                                            </button>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{cc.title || "Change Control"}</div>
                                            <div className="text-xs text-muted-foreground">{cc.originating_department || "No department"} · {cc.submitted_at ? format(new Date(cc.submitted_at), "dd MMM yyyy") : "-"}</div>
                                        </TableCell>
                                        <TableCell className="text-sm">{cc.requester?.full_name || "-"}</TableCell>
                                        <TableCell className="text-sm">{cc.documents?.length || 0}</TableCell>
                                        <TableCell><ChangeControlStatusBadge status={cc.status} /></TableCell>
                                    </TableRow>
                                ))}
                                {filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No Change Controls match the current filters.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{selected?.cc_number || "Select a Change Control"}</CardTitle>
                        {selected && <ChangeControlStatusBadge status={selected.status} />}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {message && (
                            <div className={`rounded-md border px-3 py-2 text-sm ${message.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                                {message.text}
                            </div>
                        )}

                        {selected ? (
                            <>
                                <div>
                                    <div className="font-medium">{selected.title || "Change Control"}</div>
                                    <div className="mt-1 text-sm text-muted-foreground">{selected.rationale || "No rationale recorded."}</div>
                                </div>

                                <div className="space-y-2">
                                    <Label>QA Note</Label>
                                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="Required for clarification or rejection" />
                                </div>

                                <div className="grid grid-cols-1 gap-2">
                                    <Button disabled={isPending} onClick={() => runScreening("approve")}>
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Approve for Document Work
                                    </Button>
                                    <Button variant="outline" disabled={isPending} onClick={() => runScreening("clarification")}>
                                        <MessageSquare className="mr-2 h-4 w-4" />
                                        Request Clarification
                                    </Button>
                                    <Button variant="destructive" disabled={isPending} onClick={() => runScreening("reject")}>
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Reject
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    <Label>Lifecycle Status</Label>
                                    <Select disabled={isPending} onValueChange={(value) => value && runStatusUpdate(value as ChangeControlLifecycleStatus)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Move package to..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {lifecycleOptions.map((item) => (
                                                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-xs font-semibold uppercase text-muted-foreground">Affected Documents</div>
                                    <div className="space-y-2">
                                        {(selected.documents || []).map((doc) => (
                                            <div key={doc.id} className="rounded-md border p-2">
                                                <div className="text-sm font-medium">{doc.document_number}</div>
                                                <div className="text-xs text-muted-foreground">{doc.document_title}</div>
                                                <div className="mt-1 text-[11px] uppercase text-muted-foreground">{doc.department || "No department"} · {doc.old_revision || "00"} → {doc.new_revision || "TBD"}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="py-8 text-center text-sm text-muted-foreground">No Change Control selected.</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
