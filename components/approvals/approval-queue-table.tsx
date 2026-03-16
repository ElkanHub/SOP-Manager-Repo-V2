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
import { createClient } from "@/lib/supabase/client"

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
                return <Badge variant="outline" className="border-blue-500 text-blue-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
            case 'changes_requested':
                return <Badge variant="outline" className="border-amber-500 text-amber-600"><AlertCircle className="h-3 w-3 mr-1" />Changes Requested</Badge>
            case 'approved':
                return <Badge variant="outline" className="border-green-500 text-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>
            case 'rejected':
                return <Badge variant="outline" className="border-red-500 text-red-600">Rejected</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const isSelfSubmission = (submittedById: string) => {
        return submittedById === currentUserId
    }

    if (requests.length === 0) {
        return (
            <div className="text-center py-12 text-slate-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>No approval requests yet.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex gap-2">
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
                                <div className="flex items-center gap-4 p-4">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={submitter?.avatar_url} />
                                        <AvatarFallback>
                                            {submitter?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                                        </AvatarFallback>
                                    </Avatar>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm font-medium">{sop?.sop_number}</span>
                                            <Badge variant="secondary">{latestRequest.type === 'new' ? 'New' : 'Update'}</Badge>
                                        </div>
                                        <p className="text-sm font-medium truncate">{sop?.title}</p>
                                        <p className="text-xs text-slate-500">
                                            Submitted by {submitter?.full_name} • {formatDistanceToNow(new Date(latestRequest.created_at), { addSuffix: true })}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {getStatusBadge(latestRequest.status)}
                                        {latestRequest.status === 'pending' && isSelfSubmission(latestRequest.submitted_by) && (
                                            <Badge variant="outline" className="border-slate-300 text-slate-500">
                                                You submitted this
                                            </Badge>
                                        )}
                                        <Link href={`/approvals/${latestRequest.id}`}>
                                            <Button size="sm">
                                                Review
                                            </Button>
                                        </Link>
                                    </div>
                                </div>

                                {sopRequests.length > 1 && (
                                    <div className="border-t px-4 py-2 bg-slate-50">
                                        <Button variant="ghost" size="sm" className="text-xs text-slate-500">
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
