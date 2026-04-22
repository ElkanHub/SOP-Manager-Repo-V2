"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { ClipboardList, FileText, Send, Inbox, ExternalLink, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import type { Profile, RequestForm, RequestFormSubmission } from "@/types/app.types"
import { FormFillerDialog } from "@/components/request-forms/form-filler"
import { SubmissionDetailSheet, SubmissionStatusBadge } from "@/components/request-forms/submission-detail"

interface Props {
    profile: Profile
    isQa: boolean
    publishedForms: RequestForm[]
    mySubmissions: RequestFormSubmission[]
}

export function NewRequestsClient({ profile, isQa, publishedForms, mySubmissions }: Props) {
    const router = useRouter()
    const [fillerOpen, setFillerOpen] = useState(false)
    const [activeForm, setActiveForm] = useState<RequestForm | null>(null)

    const [detailOpen, setDetailOpen] = useState(false)
    const [selectedSub, setSelectedSub] = useState<RequestFormSubmission | null>(null)

    const [search, setSearch] = useState("")

    const visibleForms = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return publishedForms
        return publishedForms.filter(
            (f) =>
                f.title.toLowerCase().includes(q) ||
                (f.description || "").toLowerCase().includes(q) ||
                (f.target_department || "").toLowerCase().includes(q),
        )
    }, [publishedForms, search])

    const openForm = (f: RequestForm) => {
        setActiveForm(f)
        setFillerOpen(true)
    }

    const onSubmitted = () => {
        router.refresh()
    }

    return (
        <div className="p-0 md:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 md:px-6 py-4">
                <div className="flex items-start gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <ClipboardList className="h-4 w-4" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">Requests</h1>
                        <p className="text-muted-foreground text-sm">
                            Submit a request using a QA-approved form
                        </p>
                    </div>
                </div>
                {isQa && (
                    <Link href="/requests/hub">
                        <Button size="sm" className="bg-brand-navy hover:bg-brand-navy/90">
                            <Sparkles className="h-4 w-4 mr-1.5" />
                            Open QA Hub
                        </Button>
                    </Link>
                )}
            </div>

            <div className="mt-6 px-4 md:px-0">
                <Tabs defaultValue="forms">
                    <TabsList>
                        <TabsTrigger value="forms">
                            <FileText className="h-3.5 w-3.5 mr-1.5" />
                            Available Forms ({publishedForms.length})
                        </TabsTrigger>
                        <TabsTrigger value="mine">
                            <Inbox className="h-3.5 w-3.5 mr-1.5" />
                            My Submissions ({mySubmissions.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="forms" className="mt-4 space-y-3">
                        <Input
                            placeholder="Search forms…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="max-w-xs"
                        />

                        {visibleForms.length === 0 ? (
                            <Card>
                                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                                    {publishedForms.length === 0 ? (
                                        <>No request forms are available yet. Please check back later.</>
                                    ) : (
                                        <>No forms match your search.</>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {visibleForms.map((f) => (
                                    <Card key={f.id} className="hover:border-brand-teal/40 transition-colors">
                                        <CardHeader>
                                            <div className="flex items-start justify-between gap-2">
                                                <CardTitle className="text-base line-clamp-1">{f.title}</CardTitle>
                                                {f.target_department && (
                                                    <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-bold">
                                                        {f.target_department}
                                                    </Badge>
                                                )}
                                            </div>
                                            {f.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{f.description}</p>
                                            )}
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="text-[11px] text-muted-foreground">
                                                {f.fields?.length ?? 0} fields · v{f.version}
                                            </div>
                                            <Button
                                                size="sm"
                                                className="w-full bg-brand-teal hover:bg-teal-600"
                                                onClick={() => openForm(f)}
                                            >
                                                <Send className="h-3.5 w-3.5 mr-1.5" />
                                                Fill Out Form
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="mine" className="mt-4">
                        <Card className="p-0 overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-32">Ref</TableHead>
                                        <TableHead>Form</TableHead>
                                        <TableHead className="w-28">Status</TableHead>
                                        <TableHead className="w-36">Submitted</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mySubmissions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                                                You haven&apos;t submitted any requests yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        mySubmissions.map((s) => (
                                            <TableRow
                                                key={s.id}
                                                className="cursor-pointer"
                                                onClick={() => {
                                                    setSelectedSub(s)
                                                    setDetailOpen(true)
                                                }}
                                            >
                                                <TableCell className="font-mono text-xs">{s.reference_number}</TableCell>
                                                <TableCell className="font-medium text-sm">
                                                    {s.form?.title || s.form_snapshot?.title}
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
                </Tabs>
            </div>

            <FormFillerDialog
                open={fillerOpen}
                onOpenChange={setFillerOpen}
                form={activeForm}
                onSubmitted={onSubmitted}
            />

            <SubmissionDetailSheet
                open={detailOpen}
                onOpenChange={setDetailOpen}
                submission={selectedSub}
                isQa={isQa}
                onChanged={(updated) => {
                    setSelectedSub(updated)
                    router.refresh()
                }}
            />
        </div>
    )
}
