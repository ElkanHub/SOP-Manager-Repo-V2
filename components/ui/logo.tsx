import Image from "next/image"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  /** If true, applies styling specifically for dark backgrounds (like the marketing site) */
  forceDark?: boolean
}

export function Logo({ className, forceDark = false }: LogoProps) {
  return (
    <div className={cn(
      "relative flex items-center justify-center shrink-0 overflow-hidden",
      // On dark backgrounds, we wrap it in a subtle white pill so the JPG colors remain intact without a harsh square edge.
      // On light backgrounds, we use multiply to make the white background disappear naturally.
      forceDark 
        ? "bg-white rounded-full p-1.5 px-3" 
        : "mix-blend-multiply dark:bg-white dark:rounded-full dark:p-1.5 dark:px-3 dark:mix-blend-normal",
      className
    )}>
      <Image
        src="/marketing/logo.jpg"
        alt="QMS-MANAJA"
        width={400}
        height={100}
        className="h-7 w-auto object-contain"
        priority
      />
    </div>
  )
}
