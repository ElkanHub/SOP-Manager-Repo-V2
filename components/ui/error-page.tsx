"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
  description?: string
  showHomeLink?: boolean
}

export function ErrorPage({
  error,
  reset,
  title = "Something went wrong",
  description = "An unexpected error occurred. Our team has been notified.",
  showHomeLink = true,
}: ErrorPageProps) {
  useEffect(() => {
    // Log to console — never expose raw error to user
    console.error("[Error Boundary]", error)
  }, [error])

  const referenceCode = error.digest?.slice(0, 8).toUpperCase() ?? "UNKNOWN"

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
      </div>

      <div className="flex flex-col gap-2 max-w-md">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 font-mono mt-1">
            Reference: {referenceCode}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          onClick={reset}
          className="gap-2 bg-brand-teal hover:bg-brand-teal/90 text-white"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
        {showHomeLink && (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Go to Dashboard
          </Link>
        )}
      </div>
    </div>
  )
}
