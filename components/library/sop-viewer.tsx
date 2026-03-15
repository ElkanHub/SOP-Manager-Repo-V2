"use client"

import { useEffect, useState } from "react"
import mammoth from "mammoth"
import DOMPurify from "dompurify"
import { FileText, Loader2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils/cn"

interface SopViewerProps {
  fileUrl: string
  className?: string
}

const ALLOWED_TAGS = [
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "strong",
  "em",
  "br",
  "b",
  "i",
  "u",
  "span",
]

export function SopViewer({ fileUrl, className }: SopViewerProps) {
  const [html, setHtml] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        const response = await fetch(fileUrl)
        if (!response.ok) {
          throw new Error("Failed to fetch document")
        }

        const arrayBuffer = await response.arrayBuffer()
        const result = await mammoth.convertToHtml({ arrayBuffer })

        const sanitized = DOMPurify.sanitize(result.value, {
          ALLOWED_TAGS,
          ALLOWED_ATTR: [],
        })

        setHtml(sanitized)
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
    <div
      className={cn(
        "prose prose-slate max-w-none",
        "prose-headings:font-semibold prose-headings:text-slate-800",
        "prose-p:text-slate-700 prose-p:leading-relaxed",
        "prose-table:border prose-td:border prose-td:p-2",
        "prose-strong:text-slate-800",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
