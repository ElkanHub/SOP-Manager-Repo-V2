import { Bell, FileCheck, ShieldAlert, CheckCircle2, MessageSquare, AlertCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

export function PulseItem({ item, currentUser }: { item: any; currentUser: any }) {
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
    }

    const isSystem = item.sender_id === null
    const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true })

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

                {item.link_url && (
                    <a href={item.link_url} className="inline-block mt-2 text-xs font-medium text-brand-teal hover:underline">
                        View Details &rarr;
                    </a>
                )}
            </div>
        </div>
    )
}
