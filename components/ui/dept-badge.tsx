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
  blue: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
  orange: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300" },
  green: { bg: "bg-green-100", text: "text-green-700", border: "border-green-300" },
  purple: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300" },
  red: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300" },
  yellow: { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300" },
  pink: { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-300" },
  cyan: { bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-300" },
}

interface DeptBadgeProps extends VariantProps<typeof deptBadgeVariants> {
  department: string
  colour?: string
}

export function DeptBadge({ department, colour = "blue", variant, size }: DeptBadgeProps) {
  const colourClasses = deptColourMap[colour] || deptColourMap.blue

  return (
    <span
      className={cn(
        variant === "outline"
          ? `border ${colourClasses.text} ${colourClasses.bg}`
          : `${colourClasses.bg} ${colourClasses.text} ${colourClasses.border}`,
        deptBadgeVariants({ variant, size })
      )}
    >
      {department.slice(0, 16)}
    </span>
  )
}
