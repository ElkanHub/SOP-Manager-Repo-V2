"use client"

import { useState } from "react"
import { CheckSquare, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

interface AcknowledgeButtonProps {
  sopId: string
  sopVersion: string
  userId: string
  hasAcknowledged: boolean
  acknowledgedAt?: string
  onAcknowledged?: () => void
}

export function AcknowledgeButton({
  sopId,
  sopVersion,
  userId,
  hasAcknowledged,
  acknowledgedAt,
  onAcknowledged,
}: AcknowledgeButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const handleAcknowledge = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.from("sop_acknowledgements").insert({
        sop_id: sopId,
        user_id: userId,
        version: sopVersion,
      })

      if (error) throw error
      onAcknowledged?.()
    } catch (err) {
      console.error("Error acknowledging SOP:", err)
    } finally {
      setIsLoading(false)
    }
  }

  if (hasAcknowledged) {
    return (
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-md px-3 py-1.5">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <span className="text-sm font-medium text-green-700">
          Acknowledged v{sopVersion}
        </span>
        {acknowledgedAt && (
          <span className="text-[11px] text-green-600 ml-1">
            {new Date(acknowledgedAt).toLocaleDateString()}
          </span>
        )}
      </div>
    )
  }

  return (
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
  )
}
