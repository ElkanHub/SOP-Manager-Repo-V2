"use client"

import { useState } from "react"
import { format } from "date-fns"
import { useQuery } from "@tanstack/react-query"
import { fetchDocumentsDueForReview } from "@/lib/queries/reports"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/ui/status-badge"

interface Props {
  dateFrom: string | null
  dateTo: string | null
}

const levelLabels: Record<string, string> = {
  level_1: "Level I",
  level_2: "Level II",
  level_3: "Level III",
  level_4: "Level IV",
}

export function DocumentsDueReviewReport({ dateFrom, dateTo }: Props) {
  const [page, setPage] = useState(0)
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["documents-due-review", page, dateFrom, dateTo],
    queryFn: () => fetchDocumentsDueForReview({ page, dateFrom, dateTo }),
  })

  const rows = data?.data || []
  const totalPages = Math.ceil((data?.count || 0) / (data?.pageSize || 50))

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    )
  }

  return (
    <div className={isFetching ? "opacity-70" : ""}>
      <div className="mb-4">
        <h2 className="text-lg font-bold">Documents Due for Review</h2>
        <p className="text-sm text-muted-foreground">SOPs with review dates in the selected window.</p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Document</th>
              <th className="px-4 py-3 text-left">Level</th>
              <th className="px-4 py-3 text-left">Department</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Effective</th>
              <th className="px-4 py-3 text-left">Due Review</th>
              <th className="px-4 py-3 text-left">Owner</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any) => {
              const owner = Array.isArray(row.owner) ? row.owner[0] : row.owner
              return (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs">{row.sop_number}</div>
                    <div className="font-semibold">{row.title}</div>
                  </td>
                  <td className="px-4 py-3">{levelLabels[row.document_level] || "Level II"}</td>
                  <td className="px-4 py-3">{row.department}</td>
                  <td className="px-4 py-3"><StatusBadge status={row.status} size="sm" /></td>
                  <td className="px-4 py-3">{row.effective_date ? format(new Date(row.effective_date), "dd MMM yyyy") : "-"}</td>
                  <td className="px-4 py-3 font-semibold">{row.due_for_revision ? format(new Date(row.due_for_revision), "dd MMM yyyy") : "-"}</td>
                  <td className="px-4 py-3">{owner?.full_name || "Department Manager"}</td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No documents due for review in this window.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}
