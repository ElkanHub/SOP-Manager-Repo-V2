"use client"

import { ErrorPage } from "@/components/ui/error-page"

export default function SopBuilderError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorPage error={error} reset={reset} title="AI SOP Builder unavailable" />
}

