"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

// Lazy-load SopViewer — docx-preview is 600KB+ and only needed when the document renders
export const SopViewerLazy = dynamic(
  () => import("@/components/library/sop-viewer").then((mod) => mod.SopViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading document..." />
      </div>
    ),
  }
)
