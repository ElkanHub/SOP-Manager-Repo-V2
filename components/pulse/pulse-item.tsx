import { useState } from "react"
import Link from "next/link"
import { Bell, FileCheck, ShieldAlert, CheckCircle2, MessageSquare, AlertCircle, CornerDownRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { acknowledgeNotice } from "@/actions/pulse"

export function PulseItem({ item, currentUser, replies = [] }: { item: any; currentUser: any, replies?: any[] }) {
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Acknowledgement logic
    const acks = item.acknowledgements || []
    const isAcknowledged = acks.some((a: any) => a.user_id === currentUser.id)
    const ackCount = acks.length
    const isSender = item.sender_id === currentUser.id

    const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true })
    const isSystem = item.sender_id === null

    async function handleAcknowledge() {
        if (isAcknowledged) return
        setIsSubmitting(true)
        const result = await acknowledgeNotice(item.id)
        if (result.error) {
            console.error(result.error)
        }
        setIsSubmitting(false)
    }

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

    const canReply = false // No more direct replies in Pulse for now as per user request


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
                    {item.body || item.content}
                </p>

                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-4">
                        {item.link_url && (
                            <Link href={item.link_url} className="inline-block text-xs font-medium text-brand-teal dark:text-teal-400 hover:underline">
                                View Details &rarr;
                            </Link>
                        )}
                        {!isSender && item.type === 'notice' && (
                            <button
                                onClick={handleAcknowledge}
                                disabled={isAcknowledged || isSubmitting}
                                className={`text-xs font-semibold flex items-center gap-1.5 px-2 py-1 rounded-md transition-all
                                    ${isAcknowledged
                                        ? 'text-brand-teal bg-brand-teal/10 cursor-default'
                                        : 'text-muted-foreground hover:text-brand-navy hover:bg-brand-navy/5 active:scale-95'
                                    }`}
                            >
                                {isAcknowledged ? (
                                    <>
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Acknowledged
                                    </>
                                ) : (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-current rounded-sm" />
                                        Acknowledge
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {isSender && item.type === 'notice' && item.total_recipients && (
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full border border-border/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-pulse" />
                            {ackCount} / {item.total_recipients} acknowledged
                        </div>
                    )}
                </div>


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
                                    <p className="text-sm text-foreground/80">{reply.body || reply.content}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
