import { cn } from "@/lib/utils/cn"

type StatusType = "active" | "draft" | "draft_in_review" | "pending_hod" | "pending_qa" | "approved_pending_training" | "pending_cc" | "superseded" | "pending_destruction" | "destroyed" | "overdue" | "pending" | "complete" | "inactive"

interface StatusBadgeProps {
  status: StatusType | string
  size?: "sm" | "md"
  className?: string
}

const statusStyles: Record<string, { class: string; label: string }> = {
  active: { class: "bg-brand-teal/10 border-brand-teal/20 text-brand-teal dark:bg-brand-teal/20 dark:text-brand-teal dark:border-brand-teal/30", label: "Active" },
  draft: { class: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700/50 dark:text-amber-400", label: "Draft" },
  draft_in_review: { class: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700/50 dark:text-amber-400", label: "Draft Review" },
  pending_hod: { class: "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700/50 dark:text-blue-400", label: "Pending HOD" },
  pending_qa: { class: "bg-brand-navy/10 border-brand-navy/20 text-brand-navy dark:bg-brand-blue/20 dark:border-brand-blue/30 dark:text-brand-blue", label: "Pending QA" },
  approved_pending_training: { class: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700/50 dark:text-emerald-400", label: "Pending Training" },
  pending_cc: { class: "bg-brand-navy/10 border-brand-navy/20 text-brand-navy dark:bg-brand-blue/20 dark:border-brand-blue/30 dark:text-brand-blue", label: "Pending CC" },
  superseded: { class: "bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400", label: "Superseded" },
  pending_destruction: { class: "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800/50 dark:text-red-400", label: "Pending Destruction" },
  destroyed: { class: "bg-slate-200 border-slate-300 text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400", label: "Destroyed" },
  overdue: { class: "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800/50 dark:text-red-400", label: "Overdue" },
  pending: { class: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700/50 dark:text-amber-400", label: "Pending" },
  complete: { class: "bg-brand-teal/10 border-brand-teal/20 text-brand-teal dark:bg-brand-teal/20 dark:text-brand-teal dark:border-brand-teal/30", label: "Complete" },
  inactive: { class: "bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400", label: "Inactive" },
}

const sizeStyles = {
  sm: "px-1.5 py-0.5 text-[11px]",
  md: "px-2 py-0.5 text-xs",
}

export function StatusBadge({ status, size = "md", className }: StatusBadgeProps) {
  const style = statusStyles[status] || statusStyles.active
  const showLock = status === "pending_cc"

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border font-medium text-center", style.class, sizeStyles[size], className)}>
      {showLock && (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )}
      {style.label}
    </span>
  )
}
