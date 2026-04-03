"use client"

import { useEffect, useState, useRef } from "react"
import { FileText, Loader2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils/cn"

interface SopViewerProps {
  fileUrl: string
  className?: string
}

export function SopViewer({ fileUrl, className }: SopViewerProps) {
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

  return (
    <div className={cn("w-full h-full bg-white flex flex-col overflow-hidden relative", className)}>
      {/* We use an iframe directly to render the Microsoft Office Web Viewer */}
      <iframe
        src={officeViewerUrl}
        className="w-full h-full border-0 absolute inset-0"
        title="SOP Document Viewer"
        allowFullScreen
      />
    </div>
  )
}
