import { useState } from "react"
import { Bell, FileCheck, ShieldAlert, CheckCircle2, MessageSquare, AlertCircle, CornerDownRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { replyToNotice } from "@/actions/pulse"

export function PulseItem({ item, currentUser, replies = [] }: { item: any; currentUser: any, replies?: any[] }) {
    const [isReplying, setIsReplying] = useState(false)
    const [replyContent, setReplyContent] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Determine icon and colors based on type
    let Icon = Bell
    let colorClass = "bg-slate-100 text-slate-500 border-slate-200"

    switch (item.type) {
        case 'notice':
            Icon = MessageSquare
            colorClass = "bg-blue-50 text-blue-600 border-blue-100"
            if (item.audience === 'everyone') {
                Icon = Bell
                colorClass = "bg-brand-navy/10 text-brand-navy border-brand-navy/20"
            }
            break
        case 'todo':
            Icon = CheckCircle2
            colorClass = "bg-orange-50 text-orange-600 border-orange-100"
            break
        case 'sop_submission':
        case 'sop_revision':
        case 'sop_approved':
            Icon = FileCheck
            colorClass = "bg-brand-teal/10 text-brand-teal border-brand-teal/20"
            break
        case 'cc_approval':
        case 'cc_signature_request':
            Icon = ShieldAlert
            colorClass = "bg-purple-50 text-purple-600 border-purple-100"
            break
        case 'system_alert':
            Icon = AlertCircle
            colorClass = "bg-red-50 text-red-600 border-red-100"
            break
        case 'message':
            Icon = MessageSquare
            colorClass = "bg-brand-teal/10 text-brand-teal border-brand-teal/20"
            break
    }

    const isSystem = item.sender_id === null
    const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true })
    const canReply = item.type === 'notice' && (!item.thread_depth || item.thread_depth === 0)

    const handleSubmitReply = async () => {
        if (!replyContent.trim()) return
        setIsSubmitting(true)
        const result = await replyToNotice(item.id, replyContent.trim())
        if (result.success) {
            setIsReplying(false)
            setReplyContent("")
        }
        setIsSubmitting(false)
    }

    return (
        <div className="flex gap-3 items-start group relative pb-4 last:pb-0">
            {/* Timeline connector */}
            <div className="absolute top-8 bottom-0 left-[15px] w-[2px] bg-slate-100 group-last:hidden" />

            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 border z-10", colorClass)}>
                <Icon className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-900 truncate">
                        {isSystem ? 'System' : item.sender_name || 'Someone'}
                    </span>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {timeAgo}
                    </span>
                </div>

                <p className="text-sm text-slate-700 leading-snug break-words">
                    {item.content}
                </p>

                <div className="flex items-center gap-4 mt-2">
                    {item.link_url && (
                        <a href={item.link_url} className="inline-block text-xs font-medium text-brand-teal hover:underline">
                            View Details &rarr;
                        </a>
                    )}
                    {canReply && (
                        <button
                            onClick={() => setIsReplying(!isReplying)}
                            className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                        >
                            Reply
                        </button>
                    )}
                </div>

                {isReplying && (
                    <div className="mt-3 pl-2 border-l-2 border-slate-200">
                        <Textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Write a reply..."
                            className="min-h-[60px] text-sm resize-none mb-2 bg-white"
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setIsReplying(false)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button size="sm" onClick={handleSubmitReply} disabled={isSubmitting || !replyContent.trim()} className="bg-brand-navy">
                                Post Reply
                            </Button>
                        </div>
                    </div>
                )}

                {/* Nested Replies */}
                {replies.length > 0 && (
                    <div className="mt-4 space-y-4">
                        {replies.map((reply) => (
                            <div key={reply.id} className="relative flex gap-3">
                                {/* Small visual connector for replies */}
                                <div className="absolute -left-6 top-3 text-slate-300">
                                    <CornerDownRight className="w-4 h-4" />
                                </div>
                                <div className="flex-1 bg-slate-50 p-3 rounded-md border border-slate-100">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-medium text-slate-800">{reply.sender_name}</span>
                                        <span className="text-[10px] text-slate-400">
                                            {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600">{reply.content}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
