import { useState } from "react"
import Link from "next/link"
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
    let colorClass = "bg-muted text-muted-foreground border-border"

    switch (item.type) {
        case 'notice':
            Icon = MessageSquare
            colorClass = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
            if (item.audience === 'everyone') {
                Icon = Bell
                colorClass = "bg-brand-navy/10 dark:bg-brand-navy/20 text-brand-navy dark:text-blue-300 border-brand-navy/20 dark:border-brand-navy/30"
            }
            break
        case 'todo':
            Icon = CheckCircle2
            colorClass = "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
            break
        case 'sop_submission':
        case 'sop_revision':
        case 'sop_approved':
            Icon = FileCheck
            colorClass = "bg-brand-teal/10 dark:bg-brand-teal/20 text-brand-teal dark:text-teal-400 border-brand-teal/20 dark:border-brand-teal/30"
            break
        case 'cc_approval':
        case 'cc_signature_request':
            Icon = ShieldAlert
            colorClass = "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
            break
        case 'system_alert':
            Icon = AlertCircle
            colorClass = "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
            break
        case 'message':
            Icon = MessageSquare
            colorClass = "bg-brand-teal/10 dark:bg-brand-teal/20 text-brand-teal dark:text-teal-400 border-brand-teal/20 dark:border-brand-teal/30"
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
            <div className="absolute top-8 bottom-0 left-[15px] w-[2px] bg-border group-last:hidden" />

            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 border z-10 transition-colors shadow-sm", colorClass)}>
                <Icon className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-foreground truncate">
                        {isSystem ? 'System' : (item.sender?.full_name || item.sender_name || 'Someone')}
                    </span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {timeAgo}
                    </span>
                </div>

                <p className="text-sm text-foreground/90 leading-snug break-words">
                    {item.content}
                </p>

                <div className="flex items-center gap-4 mt-2">
                    {item.link_url && (
                        <Link href={item.link_url} className="inline-block text-xs font-medium text-brand-teal dark:text-teal-400 hover:underline">
                            View Details &rarr;
                        </Link>
                    )}
                    {canReply && (
                        <button
                            onClick={() => setIsReplying(!isReplying)}
                            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Reply
                        </button>
                    )}
                </div>

                {isReplying && (
                    <div className="mt-3 pl-3 border-l-2 border-border/50">
                        <Textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Write a reply..."
                            className="min-h-[60px] text-sm resize-none mb-2 bg-background focus-visible:ring-1 focus-visible:ring-brand-teal"
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
                                <div className="absolute -left-6 top-3 text-border">
                                    <CornerDownRight className="w-4 h-4" />
                                </div>
                                <div className="flex-1 bg-muted/30 p-3 rounded-md border border-border/50 shadow-sm transition-all hover:bg-muted/50">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-semibold text-foreground">{reply.sender?.full_name || reply.sender_name || 'Someone'}</span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-foreground/80">{reply.content}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
