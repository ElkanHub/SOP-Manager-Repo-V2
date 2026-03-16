"use client"

interface CalendarChipProps {
  title: string
  type: "pm" | "event"
  visibility?: "public" | "department"
  department?: string
  userDepartment: string
  onClick?: () => void
}

export function CalendarChip({
  title,
  type,
  visibility,
  department,
  userDepartment,
  onClick,
}: CalendarChipProps) {
  const getChipStyles = () => {
    if (type === "pm") {
      return "bg-brand-teal/20 text-brand-teal border-brand-teal/30 hover:bg-brand-teal/30"
    }
    if (visibility === "public") {
      return "bg-brand-blue/20 text-brand-blue border-brand-blue/30 hover:bg-brand-blue/30"
    }
    if (department === userDepartment) {
      return "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30 hover:bg-slate-500/30"
    }
    return "bg-muted text-muted-foreground border-border"
  }

  return (
    <div
      onClick={onClick}
      className={`
        text-xs px-1.5 py-0.5 rounded border truncate cursor-pointer
        ${getChipStyles()}
        ${onClick ? "hover:opacity-80" : ""}
      `}
    >
      {type === "pm" && "🔧 "}
      {title}
    </div>
  )
}
