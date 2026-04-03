import { cn } from "@/lib/utils/cn"

type StatusType = "active" | "draft" | "pending_qa" | "pending_cc" | "superseded" | "overdue" | "pending" | "complete" | "inactive"

interface StatusBadgeProps {
  status: StatusType | string
  size?: "sm" | "md"
  className?: string
}

const statusStyles: Record<string, { class: string; label: string }> = {
  active: { class: "bg-brand-teal/10 border-brand-teal/20 text-brand-teal dark:bg-brand-teal/20 dark:text-brand-teal dark:border-brand-teal/30", label: "Active" },
  draft: { class: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700/50 dark:text-amber-400", label: "Draft" },
  pending_qa: { class: "bg-brand-navy/10 border-brand-navy/20 text-brand-navy dark:bg-brand-blue/20 dark:border-brand-blue/30 dark:text-brand-blue", label: "Pending QA" },
  pending_cc: { class: "bg-brand-navy/10 border-brand-navy/20 text-brand-navy dark:bg-brand-blue/20 dark:border-brand-blue/30 dark:text-brand-blue", label: "Pending CC" },
  superseded: { class: "bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400", label: "Superseded" },
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
