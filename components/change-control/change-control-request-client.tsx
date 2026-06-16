"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ClipboardList, FileText, Plus, Send, Search, X } from "lucide-react"
import { submitChangeControlRequest } from "@/actions/change-control"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ChangeControlStatusBadge } from "@/components/change-control/change-control-status-badge"
import type { ChangeControlPackage, Department, Profile, SopRecord } from "@/types/app.types"

type SopOption = Pick<SopRecord, "id" | "sop_number" | "title" | "department" | "document_level" | "version" | "training_required">

interface Props {
    profile: Profile
    departments: Department[]
    activeSops: SopOption[]
    myChangeControls: ChangeControlPackage[]
}

export function ChangeControlRequestClient({ profile, departments, activeSops, myChangeControls }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [title, setTitle] = useState("")
    const [originatingDepartment, setOriginatingDepartment] = useState(profile.department || "")
    const [rationale, setRationale] = useState("")
    const [impactAssessment, setImpactAssessment] = useState("")
    const [dueDate, setDueDate] = useState("")
    const [search, setSearch] = useState("")
    const [departmentFilter, setDepartmentFilter] = useState("all")
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    const filteredSops = useMemo(() => {
        const q = search.trim().toLowerCase()
        return activeSops.filter((sop) => {
            const matchesDept = departmentFilter === "all" || sop.department === departmentFilter
            const matchesSearch = !q || [sop.sop_number, sop.title, sop.department].some((value) => (value || "").toLowerCase().includes(q))
            return matchesDept && matchesSearch
        })
    }, [activeSops, departmentFilter, search])

    const selectedSops = useMemo(
        () => activeSops.filter((sop) => selectedIds.includes(sop.id)),
        [activeSops, selectedIds],
    )

    const affectedDepartments = useMemo(() => {
        const departmentsFromDocs = selectedSops.map((sop) => sop.department).filter(Boolean)
        return Array.from(new Set([originatingDepartment, ...departmentsFromDocs].filter(Boolean)))
    }, [originatingDepartment, selectedSops])

    const toggleSop = (id: string) => {
        setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
    }

    const submit = () => {
        setMessage(null)
        startTransition(async () => {
            const res = await submitChangeControlRequest({
                title,
                originatingDepartment,
                rationale,
                impactAssessment,
                affectedDepartments,
                requestedDueDate: dueDate || null,
                documents: selectedSops.map((sop) => ({
                    documentId: sop.id,
                    documentNumber: sop.sop_number,
                    documentTitle: sop.title,
                    documentLevel: sop.document_level || "level_2",
                    documentType: "sop",
                    department: sop.department,
                    oldRevision: sop.version,
                    newRevision: "",
                    reasonForChange: rationale,
                    trainingRequired: !!sop.training_required,
                })),
            })

            if (!res.success) {
                setMessage({ type: "error", text: res.error })
                return
            }

            setMessage({ type: "success", text: `${res.ccNumber} submitted to QA` })
            setTitle("")
            setRationale("")
            setImpactAssessment("")
            setDueDate("")
            setSelectedIds([])
            router.refresh()
        })
    }

    return (
        <div className="p-0 md:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-4 md:px-6">
                <div className="flex items-start gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <ClipboardList className="h-4 w-4" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">Change Control Requests</h1>
                        <p className="text-sm text-muted-foreground">Submit numbered multi-document packages for QA screening</p>
                    </div>
                </div>
            </div>

            <div className="mt-6 px-4 md:px-0">
                <Tabs defaultValue="new">
                    <TabsList>
                        <TabsTrigger value="new">
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            New Package
                        </TabsTrigger>
                        <TabsTrigger value="mine">
                            <FileText className="mr-1.5 h-3.5 w-3.5" />
                            My Change Controls ({myChangeControls.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="new" className="mt-4 space-y-4">
                        {message && (
                            <div className={`rounded-md border px-3 py-2 text-sm ${message.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                                {message.text}
                            </div>
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Package Details</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="cc-title">Title</Label>
                                    <Input id="cc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Batch record SOP updates for Packaging Line 2" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Originating Department</Label>
                                    <Select value={originatingDepartment} onValueChange={(value) => value && setOriginatingDepartment(value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments.map((dept) => (
                                                <SelectItem key={dept.id || dept.name} value={dept.name}>{dept.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cc-due">Requested Due Date</Label>
                                    <Input id="cc-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cc-rationale">Rationale</Label>
                                    <Textarea id="cc-rationale" value={rationale} onChange={(e) => setRationale(e.target.value)} rows={6} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cc-impact">Impact Assessment</Label>
                                    <Textarea id="cc-impact" value={impactAssessment} onChange={(e) => setImpactAssessment(e.target.value)} rows={6} />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden">
                            <CardHeader className="space-y-3">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <CardTitle className="text-base">Affected Active SOPs</CardTitle>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input className="pl-8" placeholder="Search SOPs" value={search} onChange={(e) => setSearch(e.target.value)} />
                                        </div>
                                        <Select value={departmentFilter} onValueChange={(value) => value && setDepartmentFilter(value)}>
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
                                </div>
                                <p className="text-xs text-muted-foreground">{selectedSops.length} selected · affected departments: {affectedDepartments.join(", ") || "None"}</p>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12"></TableHead>
                                            <TableHead>SOP</TableHead>
                                            <TableHead>Department</TableHead>
                                            <TableHead>Level</TableHead>
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
                                                <TableCell className="text-xs uppercase">{sop.document_level?.replace("_", " ") || "Level 2"}</TableCell>
                                                <TableCell className="font-mono text-xs">{sop.version}</TableCell>
                                            </TableRow>
                                        ))}
                                        {filteredSops.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No active SOPs match the current filters.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

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

                        <div className="flex justify-end">
                            <Button onClick={submit} disabled={isPending || selectedSops.length === 0}>
                                <Send className="mr-2 h-4 w-4" />
                                {isPending ? "Submitting..." : "Submit to QA"}
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="mine" className="mt-4">
                        <Card className="overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Number</TableHead>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Documents</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Submitted</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {myChangeControls.map((cc) => (
                                        <TableRow key={cc.id}>
                                            <TableCell className="font-mono text-xs">
                                                <a href={`/requests/change-control/${cc.id}`} className="text-brand-teal hover:underline">
                                                    {cc.cc_number || cc.id.slice(0, 8)}
                                                </a>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{cc.title || "Change Control"}</div>
                                                {cc.clarification_request && <div className="text-xs text-orange-700">{cc.clarification_request}</div>}
                                            </TableCell>
                                            <TableCell className="text-sm">{cc.documents?.length || 0}</TableCell>
                                            <TableCell><ChangeControlStatusBadge status={cc.status} /></TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{cc.submitted_at ? format(new Date(cc.submitted_at), "dd MMM yyyy") : "-"}</TableCell>
                                        </TableRow>
                                    ))}
                                    {myChangeControls.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No Change Control requests submitted yet.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
