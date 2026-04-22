"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2, FileText, Send } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { UserAvatar } from "@/components/user-avatar"
import { SopViewer } from "@/components/library/sop-viewer"
import { approveSopRequest, requestChangesSop } from "@/actions/sop"
import { SopApprovalRequest, Profile, SopRecord } from "@/types/app.types"

interface ApprovalDetailClientProps {
    approvalRequest: SopApprovalRequest & {
        profiles?: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'department'>
        sops?: Pick<SopRecord, 'id' | 'sop_number' | 'title' | 'department'>
    }
    allRequestsForSop: (SopApprovalRequest & {
        profiles?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
    })[]
    comments: (any & {
        profiles?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
    })[]
    currentUserId: string
    isSelfSubmission: boolean
}

export function ApprovalDetailClient({
    approvalRequest,
    allRequestsForSop,
    comments,
    currentUserId,
    isSelfSubmission,
}: ApprovalDetailClientProps) {
    const [loading, setLoading] = useState(false)
    const [action, setAction] = useState<'approve' | 'changes' | null>(null)
    const [changeType, setChangeType] = useState<'minor' | 'significant' | null>(null)
    const [comment, setComment] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const sop = approvalRequest.sops
    const submitter = approvalRequest.profiles

    const handleApprove = async () => {
        if (approvalRequest.type === 'update' && !changeType) {
            setError('Please classify the change type before approving')
            return
        }

        setLoading(true)
        setError(null)
        setAction('approve')
        
        try {
            const result = await approveSopRequest(
                approvalRequest.id, 
                changeType || 'significant',
                comment || undefined
            )
            
            if (!result.success) {
                setError(result.error)
                setAction(null)
                return
            }

            if (result.result === 'activated') {
                setSuccess('SOP approved and activated! Redirecting…')
            } else if (result.result === 'change_control_issued') {
                setSuccess('Approved — Change Control issued for signing. Redirecting…')
            }
            
            setTimeout(() => {
                window.location.href = '/approvals'
            }, 2000)
        } catch (err: any) {
            setError(err.message || 'Failed to approve')
            setAction(null)
        } finally {
            setLoading(false)
        }
    }

    const handleRequestChanges = async () => {
        if (!comment.trim()) {
            setError('Please provide a comment explaining the requested changes')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const result = await requestChangesSop(approvalRequest.id, comment)
            
            if (!result.success) {
                setError(result.error || 'Failed to request changes')
                return
            }

            setSuccess('Changes requested. The submitter has been notified.')
            setTimeout(() => {
                window.location.href = '/approvals'
            }, 2000)
        } catch (err: any) {
            setError(err.message || 'Failed to request changes')
        } finally {
            setLoading(false)
        }
    }


    return (
        <div className="container mx-auto py-6">
            <div className="mb-6">
                <Link href="/approvals" className="text-brand-blue hover:underline flex items-center gap-1 text-sm">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Approvals
                </Link>
            </div>

            {success && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                    {success}
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertCircle className="h-5 w-5" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="bg-card dark:bg-card rounded-lg border shadow-sm">
                        <div className="p-4 border-b flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <h2 className="font-semibold">{sop?.sop_number}</h2>
                                    <p className="text-sm text-muted-foreground">{sop?.title}</p>
                                </div>
                            </div>
                            <Badge variant="secondary">
                                {approvalRequest.type === 'new' ? 'New SOP' : 'Update'}
                            </Badge>
                        </div>
                        <div className="p-4">
                            <SopViewer 
                                fileUrl={approvalRequest.file_url}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardContent className="p-4 space-y-4">
                            <div>
                                <h3 className="font-medium text-sm text-muted-foreground mb-2">Submitted By</h3>
                                <div className="flex items-center gap-3">
                                    <UserAvatar user={submitter as any} size="lg" />
                                    <div>
                                        <p className="font-medium">{submitter?.full_name}</p>
                                        <p className="text-xs text-muted-foreground">{submitter?.department}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-medium text-sm text-muted-foreground mb-2">Submission Details</h3>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Type:</span>
                                        <span>{approvalRequest.type === 'new' ? 'New SOP' : 'Update'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Version:</span>
                                        <span>{approvalRequest.version_label}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Submitted:</span>
                                        <span>{formatDistanceToNow(new Date(approvalRequest.created_at), { addSuffix: true })}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Status:</span>
                                        <Badge 
                                            variant="outline"
                                            className={
                                                approvalRequest.status === 'pending' ? 'border-blue-500 text-blue-600 dark:text-blue-400' :
                                                approvalRequest.status === 'changes_requested' ? 'border-amber-500 text-amber-600 dark:text-amber-400' :
                                                approvalRequest.status === 'approved' ? 'border-green-500 text-green-600 dark:text-green-400' :
                                                'border-red-500 text-red-600 dark:text-red-400'
                                            }
                                        >
                                            {approvalRequest.status.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {approvalRequest.notes_to_qa && (
                                <div>
                                    <h3 className="font-medium text-sm text-muted-foreground mb-2">Notes to QA</h3>
                                    <p className="text-sm bg-muted dark:bg-muted/50 p-3 rounded-md">
                                        {approvalRequest.notes_to_qa}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {allRequestsForSop.length > 1 && (
                        <Card>
                            <CardContent className="p-4">
                                <h3 className="font-medium text-sm text-muted-foreground mb-3">Submission History</h3>
                                <div className="space-y-3">
                                    {allRequestsForSop.map((req, idx) => (
                                        <div key={req.id} className="flex items-start gap-3">
                                            <div className={`w-2 h-2 mt-2 rounded-full ${
                                                idx === allRequestsForSop.length - 1 ? 'bg-brand-teal' : 'bg-muted-foreground/30'
                                            }`} />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{req.version_label}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                                                </p>
                                                {req.status !== 'pending' && (
                                                    <Badge variant="outline" className="mt-1 text-xs">
                                                        {req.status}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {comments.length > 0 && (
                        <Card>
                            <CardContent className="p-4">
                                <h3 className="font-medium text-sm text-muted-foreground mb-3">QA Comments</h3>
                                <div className="space-y-3">
                                    {comments.map(comment => (
                                        <div key={comment.id} className="bg-muted dark:bg-muted/50 p-3 rounded-md">
                                            <div className="flex items-center gap-2 mb-1">
                                                <UserAvatar user={comment.profiles as any} size="sm" />
                                                <span className="text-sm font-medium">{comment.profiles?.full_name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-sm">{comment.comment}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {approvalRequest.status === 'pending' && (
                        <Card>
                            <CardContent className="p-4 space-y-4">
                                {isSelfSubmission ? (
                                    <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-md text-amber-800 dark:text-amber-200 text-sm">
                                        You submitted this SOP. Another QA Manager must approve it.
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            {/* Approve — two-step: click to reveal confirm, then confirm fires handleApprove */}
                                            {action !== 'approve' ? (
                                                <Button 
                                                    onClick={() => setAction('approve')}
                                                    disabled={loading}
                                                    className="w-full bg-green-600 hover:bg-green-700"
                                                >
                                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                                    Approve
                                                </Button>
                                            ) : (
                                                <div className="space-y-4 p-4 bg-green-50/50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold uppercase tracking-widest text-green-700 dark:text-green-400">Step 2: Classification</span>
                                                        <Button variant="ghost" size="sm" onClick={() => setAction(null)} className="h-6 w-6 p-0 text-green-700">×</Button>
                                                    </div>
                                                    
                                                    {approvalRequest.type === 'update' ? (
                                                        <div className="space-y-3">
                                                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">Classify this update before activation:</p>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <button
                                                                    onClick={() => setChangeType('minor')}
                                                                    className={`p-3 rounded-xl border text-left transition-all ${
                                                                        changeType === 'minor' 
                                                                        ? 'bg-white dark:bg-slate-900 border-green-500 shadow-sm' 
                                                                        : 'bg-transparent border-slate-200 dark:border-slate-800 opacity-60'
                                                                    }`}
                                                                >
                                                                    <p className="text-xs font-bold">Minor change</p>
                                                                    <p className="text-[9px] text-muted-foreground">Activate immediately (v1.x)</p>
                                                                </button>
                                                                <button
                                                                    onClick={() => setChangeType('significant')}
                                                                    className={`p-3 rounded-xl border text-left transition-all ${
                                                                        changeType === 'significant' 
                                                                        ? 'bg-white dark:bg-slate-900 border-green-500 shadow-sm' 
                                                                        : 'bg-transparent border-slate-200 dark:border-slate-800 opacity-60'
                                                                    }`}
                                                                >
                                                                    <p className="text-xs font-bold">Significant change</p>
                                                                    <p className="text-[9px] text-muted-foreground">Change Control (vX.0)</p>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                                            Confirm activation for this new SOP?
                                                        </p>
                                                    )}

                                                    <div className="space-y-2">
                                                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">Optional justification:</p>
                                                        <Textarea 
                                                            placeholder="Why was this classification chosen?"
                                                            value={comment}
                                                            onChange={(e) => setComment(e.target.value)}
                                                            className="text-xs min-h-[60px] bg-white/50 dark:bg-black/20"
                                                        />
                                                    </div>

                                                    <Button
                                                        onClick={handleApprove}
                                                        disabled={loading || (approvalRequest.type === 'update' && !changeType)}
                                                        className="w-full bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/10"
                                                    >
                                                        {loading ? (
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        ) : (
                                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                                        )}
                                                        Confirm & Activate
                                                    </Button>
                                                </div>
                                            )}

                                            <Button 
                                                onClick={() => setAction('changes')}
                                                variant="outline"
                                                disabled={loading || action === 'approve'}
                                                className="w-full border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50"
                                            >
                                                <AlertCircle className="h-4 w-4 mr-2" />
                                                Request Changes
                                            </Button>
                                        </div>

                                        {action === 'changes' && (
                                            <div className="space-y-2">
                                                <Textarea 
                                                    placeholder="Explain what changes are needed..."
                                                    value={comment}
                                                    onChange={(e) => setComment(e.target.value)}
                                                    rows={3}
                                                />
                                                <div className="flex gap-2">
                                                    <Button 
                                                        onClick={handleRequestChanges}
                                                        disabled={loading}
                                                        size="sm"
                                                        className="flex-1 bg-amber-600 hover:bg-amber-700"
                                                    >
                                                        {loading ? (
                                                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                        ) : (
                                                            <Send className="h-4 w-4 mr-1" />
                                                        )}
                                                        Send
                                                    </Button>
                                                    <Button 
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setAction(null)
                                                            setComment('')
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
