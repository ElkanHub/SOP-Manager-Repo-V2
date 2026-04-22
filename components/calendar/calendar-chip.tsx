"use client"

import * as React from "react"
import { Wrench, Globe2, Users } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface CalendarChipProps {
  title: string
  type: "pm" | "event"
  visibility?: "public" | "department"
  department?: string
  userDepartment: string
  onClick?: (e: React.MouseEvent) => void
}

type Tone = {
  bg: string
  text: string
  border: string
  Icon: React.ComponentType<{ className?: string }>
  label: string
}

function resolveTone({
  type,
  visibility,
  department,
  userDepartment,
}: Pick<CalendarChipProps, "type" | "visibility" | "department" | "userDepartment">): Tone {
  if (type === "pm") {
    return {
      bg: "bg-brand-teal/10 hover:bg-brand-teal/15",
      text: "text-brand-teal",
      border: "border-brand-teal",
      Icon: Wrench,
      label: "Preventive maintenance",
    }
  }
  if (visibility === "public") {
    return {
      bg: "bg-brand-blue/10 hover:bg-brand-blue/15",
      text: "text-brand-blue",
      border: "border-brand-blue",
      Icon: Globe2,
      label: "Company-wide event",
    }
  }
  const own = department === userDepartment
  if (own) {
    return {
      bg: "bg-slate-500/10 hover:bg-slate-500/15 dark:bg-slate-400/10 dark:hover:bg-slate-400/15",
      text: "text-slate-700 dark:text-slate-200",
      border: "border-slate-500 dark:border-slate-400",
      Icon: Users,
      label: "Department event",
    }
  }
  return {
    bg: "bg-muted hover:bg-muted/80",
    text: "text-muted-foreground",
    border: "border-muted-foreground/40",
    Icon: Users,
    label: "Other department",
  }
}

export function CalendarChip({
  title,
  type,
  visibility,
  department,
  userDepartment,
  onClick,
}: CalendarChipProps) {
  const tone = resolveTone({ type, visibility, department, userDepartment })
  const Icon = tone.Icon

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClick?.(e)
            }}
            className={`flex w-full items-center gap-1 rounded-md border-l-2 px-1.5 py-1 text-left text-[11px] font-medium leading-tight ${tone.bg} ${tone.text} ${tone.border} transition-colors`}
          >
            <Icon className="h-3 w-3 shrink-0 opacity-80" />
            <span className="truncate">{title}</span>
          </button>
        }
      />
      <TooltipContent className="max-w-[240px]">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{tone.label}</span>
          <span className="text-xs font-medium">{title}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
