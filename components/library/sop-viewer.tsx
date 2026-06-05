"use client"

import { useEffect, useState, useRef } from "react"
import { FileText, Loader2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils/cn"

interface SopViewerProps {
  fileUrl: string
  className?: string
  status?: string
  isCrossDepartment?: boolean
}

export function SopViewer({ fileUrl, className, status, isCrossDepartment }: SopViewerProps) {
  if (!fileUrl) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-12 bg-red-50/50 rounded-lg", className)}>
        <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
        <p className="text-sm font-bold text-red-600 uppercase tracking-widest">No document available</p>
      </div>
    )
  }

  // Microsoft Office Web Viewer requires the document URL to be publicly accessible by their servers.
  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`

  const showDraftWatermark = status === 'draft' || status === 'draft_in_review' || status === 'pending_hod' || status === 'pending_qa' || status === 'approved_pending_training'
  const showSupersededWatermark = status === 'superseded'
  const showReferenceBanner = status === 'active' && isCrossDepartment

  return (
    <div className={cn("w-full h-full min-h-[75vh] bg-white flex flex-col overflow-hidden relative", className)}>
      {/* We use an iframe directly to render the Microsoft Office Web Viewer */}
      <iframe
        src={officeViewerUrl}
        className="w-full h-full border-0 absolute inset-0"
        title="SOP Document Viewer"
        allowFullScreen
      />
      {showDraftWatermark && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center select-none">
          <span className="-rotate-45 text-7xl sm:text-8xl font-black tracking-[0.2em] text-amber-500/20">
            DRAFT
          </span>
        </div>
      )}
      {showSupersededWatermark && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center select-none">
          <span className="-rotate-45 text-6xl sm:text-8xl font-black tracking-[0.16em] text-slate-500/20">
            SUPERSEDED
          </span>
        </div>
      )}
      {showReferenceBanner && (
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 bg-slate-900/85 px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.2em] text-white select-none">
          Reference Copy
        </div>
      )}
    </div>
  )
}
