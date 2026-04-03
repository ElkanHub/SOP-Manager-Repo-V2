import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils/cn"

const deptBadgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "",
        outline: "bg-transparent",
      },
      size: {
        sm: "px-1.5 py-0.5 text-[11px]",
        md: "px-2 py-0.5 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

const deptColourMap: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-700 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800/50" },
  orange: { bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-700 dark:text-orange-400", border: "border-orange-200 dark:border-orange-800/50" },
  green: { bg: "bg-green-50 dark:bg-green-900/20", text: "text-green-700 dark:text-green-400", border: "border-green-200 dark:border-green-800/50" },
  purple: { bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-700 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800/50" },
  red: { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-700 dark:text-red-400", border: "border-red-200 dark:border-red-800/50" },
  yellow: { bg: "bg-yellow-50 dark:bg-yellow-900/20", text: "text-yellow-700 dark:text-yellow-400", border: "border-yellow-200 dark:border-yellow-800/50" },
  pink: { bg: "bg-pink-50 dark:bg-pink-900/20", text: "text-pink-700 dark:text-pink-400", border: "border-pink-200 dark:border-pink-800/50" },
  cyan: { bg: "bg-cyan-50 dark:bg-cyan-900/20", text: "text-cyan-700 dark:text-cyan-400", border: "border-cyan-200 dark:border-cyan-800/50" },
}

interface DeptBadgeProps extends VariantProps<typeof deptBadgeVariants> {
  department: string
  colour?: string
  className?: string
}

export function DeptBadge({ department, colour = "blue", variant, size, className }: DeptBadgeProps) {
  const colourClasses = deptColourMap[colour] || deptColourMap.blue

  return (
    <span
      className={cn(
        variant === "outline"
          ? `border ${colourClasses.text} ${colourClasses.bg}`
          : `${colourClasses.bg} ${colourClasses.text} ${colourClasses.border}`,
        deptBadgeVariants({ variant, size }),
        className
      )}
    >
      {department.slice(0, 16)}
    </span>
  )
}
