"use client"
import { ErrorPage } from "@/components/ui/error-page"

export default function DashboardShellError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorPage
      error={error}
      reset={reset}
      title="Application error"
      description="An unexpected error occurred. Try refreshing the page."
    />
  )
}
