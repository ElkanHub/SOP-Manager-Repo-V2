"use client"

import { useEffect, useState, useRef } from "react"
import { FileText, Loader2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils/cn"

interface SopViewerProps {
  fileUrl: string
  className?: string
}

export function SopViewer({ fileUrl, className }: SopViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchAndRender = async () => {
      if (!fileUrl) {
        setError("No file available")
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        console.log("[SopViewer] Fetching document from:", fileUrl)
        const response = await fetch(fileUrl)
        if (!response.ok) {
          throw new Error(`Failed to fetch document: ${response.statusText}`)
        }

        const arrayBuffer = await response.arrayBuffer()
        console.log("[SopViewer] Fetched bytes:", arrayBuffer.byteLength)
        
        if (containerRef.current) {
          // Clear previous content
          containerRef.current.innerHTML = ""
          
          const docx = await import("docx-preview")
          console.log("[SopViewer] docx-preview rendering...")
          await docx.renderAsync(arrayBuffer, containerRef.current, undefined, {
            className: "docx-preview",
            inWrapper: false,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            ignoreLastRenderedPageBreak: false,
            experimental: false,
            trimXmlDeclaration: true,
            useBase64URL: false,
            useMathMLPolyfill: false,
            showChanges: false,
            debug: false
          })
          console.log("[SopViewer] docx-preview render complete.")
        }
      } catch (err) {
        console.error("Error rendering SOP:", err)
        setError("Failed to load document")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAndRender()
  }, [fileUrl])

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-12", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-12 bg-red-50 rounded-lg",
          className
        )}
      >
        <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className={cn("w-full bg-white shadow-inner rounded-md overflow-hidden", className)}>
      <div 
        ref={containerRef} 
        className="docx-container"
      />
      <style jsx global>{`
        .docx-container {
          padding: 2rem;
          background-color: #f8fafc;
          min-height: 100%;
        }
        .docx-preview {
          background-color: white !important;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
          margin: 0 auto !important;
          padding: 2rem !important;
          width: 210mm !important;
          min-height: 297mm !important;
        }
        /* Dark mode overrides for docx-preview if needed */
        .dark .docx-container {
          background-color: #1e293b;
        }
      `}</style>
    </div>
  )
}
