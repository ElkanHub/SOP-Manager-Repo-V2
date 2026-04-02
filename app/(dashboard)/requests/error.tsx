'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function RequestsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-full py-20 gap-4 text-center px-6">
      <AlertCircle className="w-12 h-12 text-red-500" />
      <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        We couldn't load your document requests. Please try again.
      </p>
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </div>
  )
}
