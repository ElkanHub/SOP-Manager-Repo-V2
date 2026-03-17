"use client"

import { useState } from "react"
import { CheckSquare, CheckCircle2, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { acknowledgeSop } from "@/actions/sop"

interface AcknowledgeButtonProps {
  sopId: string
  sopVersion: string
  hasAcknowledged: boolean
  acknowledgedAt?: string
  onAcknowledged?: () => void
}

export function AcknowledgeButton({
  sopId,
  sopVersion,
  hasAcknowledged,
  acknowledgedAt,
  onAcknowledged,
}: AcknowledgeButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAcknowledge = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await acknowledgeSop(sopId, sopVersion)
      if (!result.success) {
        setError(result.error ?? "Failed to acknowledge")
      } else {
        onAcknowledged?.()
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  if (hasAcknowledged) {
    return (
      <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-md px-3 py-1.5">
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        <span className="text-sm font-medium text-green-700 dark:text-green-400">
          Acknowledged v{sopVersion}
        </span>
        {acknowledgedAt && (
          <span className="text-[11px] text-green-600 dark:text-green-500 ml-1">
            {new Date(acknowledgedAt).toLocaleDateString()}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        onClick={handleAcknowledge}
        disabled={isLoading}
        className="bg-brand-teal hover:bg-teal-600 text-white"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <CheckSquare className="h-4 w-4 mr-2" />
        )}
        Acknowledge
      </Button>
      {error && (
        <div className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
        </div>
      )}
    </div>
  )
}
