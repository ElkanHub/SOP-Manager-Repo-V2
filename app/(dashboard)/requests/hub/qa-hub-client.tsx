"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ArrowLeft, ClipboardList, Plus, Edit3, Archive, EyeOff, Eye, FileText, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import type { Department, Profile, RequestForm, RequestFormSubmission } from "@/types/app.types"
import { FormBuilderDialog } from "@/components/request-forms/form-builder"
import { SubmissionDetailSheet, SubmissionStatusBadge } from "@/components/request-forms/submission-detail"
import { setFormPublishState, archiveRequestForm } from "@/actions/request-forms"
import { useRouter } from "next/navigation"

interface Props {
    profile: Profile
    forms: RequestForm[]
    submissions: RequestFormSubmission[]
    departments: Department[]
}

type StatusFilter = "all" | "submitted" | "received" | "approved" | "fulfilled" | "rejected"

export function QaHubClient({ profile, forms: initialForms, submissions: initialSubs, departments }: Props) {
    const router = useRouter()
    const [forms, setForms] = useState<RequestForm[]>(initialForms)
    const [submissions, setSubmissions] = useState<RequestFormSubmission[]>(initialSubs)

    const [builderOpen, setBuilderOpen] = useState(false)
    const [editingForm, setEditingForm] = useState<RequestForm | null>(null)

    const [selectedSub, setSelectedSub] = useState<RequestFormSubmission | null>(null)
    const [sheetOpen, setSheetOpen] = useState(false)

    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

    const openCreate = () => {
        setEditingForm(null)
        setBuilderOpen(true)
    }
    const openEdit = (f: RequestForm) => {
        setEditingForm(f)
        setBuilderOpen(true)
    }

    const onFormSaved = () => {
        router.refresh()
    }

    const togglePublish = async (f: RequestForm) => {
        const res = await setFormPublishState(f.id, !f.is_published)
        if (res.success) {
            setForms((prev) => prev.map((x) => x.id === f.id ? { ...x, is_published: !x.is_published } : x))
        }
    }

    const onArchive = async (f: RequestForm) => {
        if (!confirm(`Archive "${f.title}"? In-flight submissions will continue normally.`)) return
        const res = await archiveRequestForm(f.id)
        if (res.success) {
            setForms((prev) => prev.map((x) => x.id === f.id ? { ...x, is_archived: true, is_published: false } : x))
        }
    }

    const filteredSubs = useMemo(() => {
        const q = search.trim().toLowerCase()
        return submissions.filter((s) => {
            if (statusFilter !== "all" && s.status !== statusFilter) return false
            if (!q) return true
            return (
                s.reference_number.toLowerCase().includes(q) ||
                s.requester_name.toLowerCase().includes(q) ||
                s.requester_department.toLowerCase().includes(q) ||
                (s.form?.title || s.form_snapshot?.title || "").toLowerCase().includes(q)
            )
        })
    }, [submissions, search, statusFilter])

    const pendingCount = submissions.filter((s) => s.status === "submitted" || s.status === "received").length

    return (
        <div className="p-0 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 md:px-6 py-4">
                <div className="flex items-start gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <ClipboardList className="h-4 w-4" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">Request Hub</h1>
                        <p className="text-muted-foreground text-sm">Design forms and review incoming requests</p>
                    </div>
                </div>
                <Link href="/requests">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-1.5" />
                        Back to Requests
                    </Button>
                </Link>
            </div>

            <div className="mt-6 px-4 md:px-0">
                <Tabs defaultValue="incoming">
                    <TabsList>
                        <TabsTrigger value="incoming">
                            <Inbox className="h-3.5 w-3.5 mr-1.5" />
                            Incoming
                            {pendingCount > 0 && (
                                <Badge className="ml-2 h-4 px-1 bg-brand-teal text-white text-[10px]">{pendingCount}</Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="forms">
                            <FileText className="h-3.5 w-3.5 mr-1.5" />
                            Forms ({forms.filter((f) => !f.is_archived).length})
                        </TabsTrigger>
                    </TabsList>

                    {/* Incoming */}
                    <TabsContent value="incoming" className="mt-4 space-y-3">
                        <div className="flex flex-wrap gap-2 items-center">
                            <Input
                                placeholder="Search ref, requester, dept, form…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="max-w-xs"
                            />
                            <Select value={statusFilter} onValueChange={(v) => setStatusFilter((v || "all") as StatusFilter)}>
                                <SelectTrigger className="w-44">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    <SelectItem value="submitted">Submitted</SelectItem>
                                    <SelectItem value="received">Received</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="fulfilled">Fulfilled</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                            <span className="text-xs text-muted-foreground ml-auto">
                                {filteredSubs.length} of {submissions.length}
                            </span>
                        </div>

                        <Card className="p-0 overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-32">Ref</TableHead>
                                        <TableHead>Form</TableHead>
                                        <TableHead>Requester</TableHead>
                                        <TableHead>Dept</TableHead>
                                        <TableHead className="w-28">Status</TableHead>
                                        <TableHead className="w-36">Submitted</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSubs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                                                No submissions match your filters.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredSubs.map((s) => (
                                            <TableRow
                                                key={s.id}
                                                className="cursor-pointer"
                                                onClick={() => {
                                                    setSelectedSub(s)
                                                    setSheetOpen(true)
                                                }}
                                            >
                                                <TableCell className="font-mono text-xs">{s.reference_number}</TableCell>
                                                <TableCell className="font-medium text-sm">
                                                    {s.form?.title || s.form_snapshot?.title}
                                                </TableCell>
                                                <TableCell className="text-sm">{s.requester_name}</TableCell>
                                                <TableCell>
                                                    <span className="text-xs text-muted-foreground">{s.requester_department}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <SubmissionStatusBadge status={s.status} />
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {format(new Date(s.submitted_at), "dd MMM, HH:mm")}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </TabsContent>

                    {/* Forms */}
                    <TabsContent value="forms" className="mt-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                Design templates for other departments to fill in.
                            </p>
                            <Button className="bg-brand-teal hover:bg-teal-600" onClick={openCreate}>
                                <Plus className="h-4 w-4 mr-1.5" /> New Form
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {forms.filter((f) => !f.is_archived).length === 0 && (
                                <Card>
                                    <CardContent className="p-8 text-center text-sm text-muted-foreground">
                                        No forms yet. Create your first one.
                                    </CardContent>
                                </Card>
                            )}
                            {forms.filter((f) => !f.is_archived).map((f) => (
                                <Card key={f.id}>
                                    <CardHeader>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-base line-clamp-1">{f.title}</CardTitle>
                                                {f.description && (
                                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{f.description}</p>
                                                )}
                                            </div>
                                            {f.is_published ? (
                                                <Badge variant="outline" className="border-brand-teal/40 text-brand-teal bg-brand-teal/5 text-[10px] uppercase tracking-widest font-bold">
                                                    Published
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-bold">
                                                    Draft
                                                </Badge>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                                            <span>v{f.version}</span>
                                            <span>·</span>
                                            <span>{f.fields?.length ?? 0} fields</span>
                                            {f.target_department && (
                                                <>
                                                    <span>·</span>
                                                    <span>for {f.target_department}</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground">
                                            Created by <span className="font-semibold text-foreground">{f.created_by_name}</span>{" "}
                                            ({f.created_by_department}) · {format(new Date(f.created_at), "dd MMM yyyy")}
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            <Button size="sm" variant="outline" onClick={() => openEdit(f)}>
                                                <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => togglePublish(f)}>
                                                {f.is_published ? (
                                                    <><EyeOff className="h-3.5 w-3.5 mr-1" /> Unpublish</>
                                                ) : (
                                                    <><Eye className="h-3.5 w-3.5 mr-1" /> Publish</>
                                                )}
                                            </Button>
                                            <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => onArchive(f)}>
                                                <Archive className="h-3.5 w-3.5 mr-1" /> Archive
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {forms.some((f) => f.is_archived) && (
                            <details className="pt-4">
                                <summary className="text-xs font-bold uppercase tracking-widest text-muted-foreground cursor-pointer">
                                    Archived forms ({forms.filter((f) => f.is_archived).length})
                                </summary>
                                <div className="mt-3 space-y-2">
                                    {forms.filter((f) => f.is_archived).map((f) => (
                                        <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
                                            <div>
                                                <p className="text-sm text-foreground">{f.title}</p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Archived {f.archived_at ? format(new Date(f.archived_at), "dd MMM yyyy") : ""}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            <FormBuilderDialog
                open={builderOpen}
                onOpenChange={setBuilderOpen}
                existingForm={editingForm}
                departments={departments}
                onSaved={onFormSaved}
            />

            <SubmissionDetailSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                submission={selectedSub}
                isQa={true}
                onChanged={(updated) => {
                    setSelectedSub(updated)
                    setSubmissions((prev) => prev.map((s) => s.id === updated.id ? updated : s))
                }}
            />
        </div>
    )
}
