"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { FileText, Clock, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SopApprovalRequest, Profile, SopRecord } from "@/types/app.types"
import Link from "next/link"
import { getInitials } from "@/lib/utils"

interface ApprovalQueueTableProps {
    requests: (SopApprovalRequest & {
        profiles?: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'department'>
        sops?: Pick<SopRecord, 'id' | 'sop_number' | 'title' | 'department'>
    })[]
    currentUserId: string
}

export function ApprovalQueueTable({ requests, currentUserId }: ApprovalQueueTableProps) {
    const [filter, setFilter] = useState<'all' | 'pending' | 'changes_requested' | 'approved' | 'rejected'>('all')

    const filteredRequests = requests.filter(req => {
        if (filter === 'all') return true
        return req.status === filter
    })

    const groupedBySop = filteredRequests.reduce((acc, request) => {
        const sopId = request.sop_id
        if (!acc[sopId]) {
            acc[sopId] = []
        }
        acc[sopId].push(request)
        return acc
    }, {} as Record<string, typeof requests>)

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
            case 'changes_requested':
                return <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400"><AlertCircle className="h-3 w-3 mr-1" />Changes Requested</Badge>
            case 'approved':
                return <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>
            case 'rejected':
                return <Badge variant="outline" className="border-red-500 text-red-600 dark:text-red-400">Rejected</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const isSelfSubmission = (submittedById: string) => {
        return submittedById === currentUserId
    }


    if (requests.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No approval requests yet.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex gap-2 flex-wrap">
                {(['all', 'pending', 'changes_requested', 'approved', 'rejected'] as const).map((status) => (
                    <Button
                        key={status}
                        variant={filter === status ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter(status)}
                    >
                        {status === 'all' ? 'All' : status === 'changes_requested' ? 'Changes Requested' : status.charAt(0).toUpperCase() + status.slice(1)}
                        <span className="ml-2 text-xs opacity-70">
                            {status === 'all' 
                                ? requests.length 
                                : requests.filter(r => r.status === status).length}
                        </span>
                    </Button>
                ))}
            </div>

            <div className="space-y-4">
                {Object.entries(groupedBySop).map(([sopId, sopRequests]) => {
                    const latestRequest = sopRequests[0]
                    const submitter = latestRequest.profiles
                    const sop = latestRequest.sops

                    return (
                        <Card key={sopId} className="overflow-hidden">
                            <CardContent className="p-0">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <Avatar className="h-10 w-10 shrink-0">
                                            <AvatarImage src={submitter?.avatar_url} />
                                            <AvatarFallback>
                                                {getInitials(submitter?.full_name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm font-medium">{sop?.sop_number}</span>
                                                <Badge variant="secondary" className="text-[10px] px-1.5 h-4">{latestRequest.type === 'new' ? 'New' : 'Update'}</Badge>
                                            </div>
                                            <p className="text-sm font-semibold truncate">{sop?.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                By {submitter?.full_name} • {formatDistanceToNow(new Date(latestRequest.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {getStatusBadge(latestRequest.status)}
                                            {latestRequest.status === 'pending' && isSelfSubmission(latestRequest.submitted_by) && (
                                                <Badge variant="outline" className="border-border text-muted-foreground whitespace-nowrap">
                                                    Your request
                                                </Badge>
                                            )}
                                        </div>
                                        <Link href={`/approvals/${latestRequest.id}`} className="shrink-0">
                                            <Button size="sm" className="h-8 px-4">
                                                Review
                                            </Button>
                                        </Link>
                                    </div>
                                </div>

                                {sopRequests.length > 1 && (
                                    <div className="border-t px-4 py-2 bg-muted/50 dark:bg-muted/30">
                                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                                            <RefreshCw className="h-3 w-3 mr-1" />
                                            View {sopRequests.length - 1} previous submission(s)
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
