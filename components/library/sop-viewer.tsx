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
      <div className={cn("flex flex-col items-center justify-center p-12 bg-red-50 rounded-lg", className)}>
        <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
        <p className="text-sm text-red-600">No document available</p>
      </div>
    )
  }

  // Microsoft Office Web Viewer requires the document URL to be publicly accessible by their servers.
  // Our fileUrl is a Supabase Signed URL, which contains a cryptographic token valid for 1 hour.
  // This satisfies the security requirement (the bucket stays private) while allowing Microsoft to read the file temporarily.
  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`

  return (
    <div className={cn("w-full bg-white flex flex-col shadow-inner rounded-md overflow-hidden relative", className)}>
      {/* We use an iframe directly to render the Microsoft Office Web Viewer */}
      <iframe
        src={officeViewerUrl}
        className="w-full h-full min-h-[850px] border-0"
        title="SOP Document Viewer"
        allowFullScreen
      />
    </div>
  )
}
