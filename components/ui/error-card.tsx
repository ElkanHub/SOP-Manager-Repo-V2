"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorCardProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorCard({
  title = "Something went wrong",
  message = "An error occurred while loading this content. Please try again.",
  onRetry,
}: ErrorCardProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  )
}
