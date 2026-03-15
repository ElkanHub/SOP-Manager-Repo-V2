import { cn } from "@/lib/utils/cn"

type StatusType = "active" | "draft" | "pending_qa" | "pending_cc" | "superseded" | "overdue" | "pending" | "complete" | "inactive"

interface StatusBadgeProps {
  status: StatusType | string
  size?: "sm" | "md"
}

const statusStyles: Record<string, { class: string; label: string }> = {
  active: { class: "bg-green-50 border-green-200 text-green-700", label: "Active" },
  draft: { class: "bg-amber-50 border-amber-200 text-amber-700", label: "Draft" },
  pending_qa: { class: "bg-blue-50 border-blue-200 text-blue-700", label: "Pending QA" },
  pending_cc: { class: "bg-blue-50 border-blue-200 text-blue-700", label: "Pending CC" },
  superseded: { class: "bg-slate-50 border-slate-200 text-slate-600", label: "Superseded" },
  overdue: { class: "bg-red-50 border-red-200 text-red-700", label: "Overdue" },
  pending: { class: "bg-amber-50 border-amber-200 text-amber-700", label: "Pending" },
  complete: { class: "bg-green-50 border-green-200 text-green-700", label: "Complete" },
  inactive: { class: "bg-slate-50 border-slate-200 text-slate-600", label: "Inactive" },
}

const sizeStyles = {
  sm: "px-1.5 py-0.5 text-[11px]",
  md: "px-2 py-0.5 text-xs",
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const style = statusStyles[status] || statusStyles.active
  const showLock = status === "pending_cc"

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border font-medium", style.class, sizeStyles[size])}>
      {showLock && (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )}
      {style.label}
    </span>
  )
}
