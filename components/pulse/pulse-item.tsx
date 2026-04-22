import { useState } from "react"
import Link from "next/link"
import {
    Bell,
    FileCheck,
    ShieldAlert,
    CheckCircle2,
    MessageSquare,
    AlertCircle,
    CornerDownRight,
    ClipboardList,
    GraduationCap,
    Wrench,
    Trash2,
    Circle,
    CalendarClock,
} from "lucide-react"
import { formatDistanceToNow, format, isPast, differenceInHours } from "date-fns"
import { cn } from "@/lib/utils"
import { acknowledgeNotice, toggleTodoComplete, deleteTodo } from "@/actions/pulse"

export function PulseItem({
    item,
    currentUser,
    replies = [],
}: {
    item: any
    currentUser: any
    replies?: any[]
}) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isToggling, setIsToggling] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // Acknowledgement logic (notices)
    const acks = item.acknowledgements || []
    const isAcknowledged = acks.some((a: any) => a.user_id === currentUser.id)
    const ackCount = acks.length
    const isSender = item.sender_id === currentUser.id

    const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true })
    const isSystem = item.sender_id === null

    // Todo state
    const isTodo = item.type === "todo"
    const todoCompleted = Boolean(item.completed_at)
    const dueAt: Date | null = item.due_at ? new Date(item.due_at) : null
    const isOverdue = dueAt ? !todoCompleted && isPast(dueAt) : false
    const isDueSoon =
        dueAt && !todoCompleted && !isOverdue && differenceInHours(dueAt, new Date()) <= 24

    async function handleAcknowledge() {
        if (isAcknowledged) return
        setIsSubmitting(true)
        const result = await acknowledgeNotice(item.id)
        if (result.error) console.error(result.error)
        setIsSubmitting(false)
    }

    async function handleToggleTodo() {
        if (isToggling) return
        setIsToggling(true)
        const result = await toggleTodoComplete(item.id)
        if (result.error) console.error(result.error)
        setIsToggling(false)
    }

    async function handleDeleteTodo() {
        if (isDeleting) return
        setIsDeleting(true)
        const result = await deleteTodo(item.id)
        if (result.error) {
            console.error(result.error)
            setIsDeleting(false)
        }
        // On success the realtime delete event will remove it from the list.
    }

    // Icon + color — todos get a special treatment based on due status
    let Icon = Bell
    let colorClass = "bg-muted text-muted-foreground border-border"

    switch (item.type) {
        case "notice":
            Icon = MessageSquare
            colorClass = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
            if (item.audience === "everyone") {
                Icon = Bell
                colorClass =
                    "bg-brand-navy/10 dark:bg-brand-navy/20 text-brand-navy dark:text-blue-300 border-brand-navy/20 dark:border-brand-navy/30"
            }
            break
        case "todo":
            Icon = CheckCircle2
            if (todoCompleted) {
                colorClass = "bg-muted text-muted-foreground/60 border-border"
            } else if (isOverdue) {
                colorClass = "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
            } else if (isDueSoon) {
                colorClass = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
            } else {
                colorClass =
                    "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
            }
            break
        case "sop_submission":
        case "sop_revision":
        case "sop_approved":
        case "sop_active":
            Icon = FileCheck
            colorClass =
                "bg-brand-teal/10 dark:bg-brand-teal/20 text-brand-teal dark:text-teal-400 border-brand-teal/20 dark:border-brand-teal/30"
            break
        case "cc_approval":
        case "cc_signature":
        case "cc_signature_request":
        case "cc_deadline":
            Icon = ShieldAlert
            colorClass = "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
            break
        case "pm_due":
        case "pm_overdue":
            Icon = Wrench
            colorClass = "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
            break
        case "approval_request":
        case "approval_update":
            Icon = FileCheck
            colorClass =
                "bg-brand-teal/10 dark:bg-brand-teal/20 text-brand-teal dark:text-teal-400 border-brand-teal/20 dark:border-brand-teal/30"
            break
        case "system_alert":
        case "system":
            Icon = AlertCircle
            colorClass = "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
            break
        case "message":
            Icon = MessageSquare
            colorClass =
                "bg-brand-teal/10 dark:bg-brand-teal/20 text-brand-teal dark:text-teal-400 border-brand-teal/20 dark:border-brand-teal/30"
            break
        case "request_update":
        case "new_signup":
            Icon = ClipboardList
            colorClass =
                "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800"
            break
        case "training_assigned":
        case "training_completed":
            Icon = GraduationCap
            colorClass =
                "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            break
        case "training_due":
        case "training_needs_review":
            Icon = GraduationCap
            colorClass =
                "bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/20"
            break
    }

    return (
        <div className="flex gap-3 items-start group relative pb-4 last:pb-0">
            {/* Timeline connector */}
            <div className="absolute top-8 bottom-0 left-[15px] w-[2px] bg-border group-last:hidden" />

            {/* For todos, the icon becomes the completion checkbox */}
            {isTodo ? (
                <button
                    onClick={handleToggleTodo}
                    disabled={isToggling}
                    aria-label={todoCompleted ? "Mark incomplete" : "Mark complete"}
                    className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border z-10 transition-colors shadow-sm cursor-pointer",
                        colorClass,
                        "hover:brightness-110",
                    )}
                >
                    {todoCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                    ) : (
                        <Circle className="w-4 h-4" />
                    )}
                </button>
            ) : (
                <div
                    className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border z-10 transition-colors shadow-sm",
                        colorClass,
                    )}
                >
                    <Icon className="w-4 h-4" />
                </div>
            )}

            <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-foreground truncate">
                        {isTodo
                            ? "To-Do"
                            : isSystem
                                ? "System"
                                : item.sender?.full_name || item.sender_name || "Someone"}
                    </span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo}</span>
                </div>

                <p
                    className={cn(
                        "text-sm leading-snug break-words",
                        isTodo && todoCompleted ? "text-muted-foreground/60 line-through" : "text-foreground/90",
                    )}
                >
                    {item.body || item.content}
                </p>

                {/* Due date badge for todos */}
                {isTodo && dueAt && (
                    <div
                        className={cn(
                            "mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1",
                            todoCompleted
                                ? "bg-muted text-muted-foreground/70 ring-border"
                                : isOverdue
                                    ? "bg-red-500/10 text-red-600 dark:text-red-400 ring-red-500/20"
                                    : isDueSoon
                                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20"
                                        : "bg-muted text-muted-foreground ring-border",
                        )}
                    >
                        <CalendarClock className="h-3 w-3" />
                        {todoCompleted
                            ? `Completed ${formatDistanceToNow(new Date(item.completed_at), { addSuffix: true })}`
                            : isOverdue
                                ? `Overdue · ${format(dueAt, "MMM d, HH:mm")}`
                                : `Due ${format(dueAt, "MMM d, HH:mm")}`}
                    </div>
                )}

                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-4">
                        {item.link_url && (
                            <Link
                                href={item.link_url}
                                className="inline-block text-xs font-medium text-brand-teal dark:text-teal-400 hover:underline"
                            >
                                View Details &rarr;
                            </Link>
                        )}
                        {!isSender && item.type === "notice" && (
                            <button
                                onClick={handleAcknowledge}
                                disabled={isAcknowledged || isSubmitting}
                                className={`text-xs font-semibold flex items-center gap-1.5 px-2 py-1 rounded-md transition-all
                                    ${isAcknowledged
                                        ? "text-brand-teal bg-brand-teal/10 cursor-default"
                                        : "text-muted-foreground hover:text-brand-navy hover:bg-brand-navy/5 active:scale-95"
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
                        {isTodo && (
                            <button
                                onClick={handleDeleteTodo}
                                disabled={isDeleting}
                                className="text-xs font-medium flex items-center gap-1 text-muted-foreground/70 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                                aria-label="Delete todo"
                            >
                                <Trash2 className="h-3 w-3" />
                                Delete
                            </button>
                        )}
                    </div>

                    {isSender && item.type === "notice" && item.total_recipients && (
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
                                <div className="absolute -left-6 top-3 text-border">
                                    <CornerDownRight className="w-4 h-4" />
                                </div>
                                <div className="flex-1 bg-muted/30 p-3 rounded-md border border-border/50 shadow-sm transition-all hover:bg-muted/50">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-semibold text-foreground">
                                            {reply.sender?.full_name || reply.sender_name || "Someone"}
                                        </span>
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
