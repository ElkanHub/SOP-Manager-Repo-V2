"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { keepPreviousData } from "@tanstack/react-query"
import { fetchSopChanges } from "@/lib/queries/reports"
import { Button } from "@/components/ui/button"
import { Download, FileText, ChevronLeft, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"

interface SopChangeHistoryReportProps {
  dateFrom: string | null
  dateTo: string | null
  isQa: boolean
}

export function SopChangeHistoryReport({ dateFrom, dateTo, isQa }: SopChangeHistoryReportProps) {
  const [page, setPage] = useState(0)
  const queryClient = useQueryClient()

  // Reset to page 0 when date filters change
  useEffect(() => { setPage(0) }, [dateFrom, dateTo])

  const queryKey = ["report-sop-changes", page, dateFrom, dateTo]

  const { data: result, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () => fetchSopChanges({ page, dateFrom, dateTo }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  // Prefetch next page
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ["report-sop-changes", page + 1, dateFrom, dateTo],
      queryFn: () => fetchSopChanges({ page: page + 1, dateFrom, dateTo }),
    })
  }, [page, dateFrom, dateTo, queryClient])

  const data = result?.data ?? []
  const totalCount = result?.count ?? 0
  const pageSize = result?.pageSize ?? 50
  const totalPages = Math.ceil(totalCount / pageSize)
  const loading = isLoading || isFetching

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      sop_approved_new: "Approved",
      sop_submitted: "Submitted",
      change_control_issued: "CC Issued",
      change_control_completed: "CC Completed",
      cc_signature_added: "Signed",
      cc_signature_waived: "Waived",
    }
    return labels[action] || action
  }

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "sop_number",
      header: "SOP No.",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-brand-teal bg-brand-teal/5 px-2 py-1 rounded">
          {row.getValue("sop_number")}
        </span>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-bold border-brand-teal/20 text-brand-teal">
          {getActionLabel(row.getValue("action"))}
        </Badge>
      ),
    },
    {
      accessorKey: "actor.full_name",
      header: "Actor",
      cell: ({ row }) => (
        <div className="text-sm font-semibold">{(row.original as any).actor?.full_name || "Unknown"}</div>
      ),
    },
    {
      accessorKey: "actor.department",
      header: "Dept",
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground/80 font-medium">{(row.original as any).actor?.department || "-"}</div>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Timestamp",
      cell: ({ row }) => (
        <div className="text-xs font-medium text-muted-foreground">
          {format(new Date(row.getValue("created_at")), "MMM d, yyyy")}
          <span className="ml-2 opacity-50">{format(new Date(row.getValue("created_at")), "HH:mm")}</span>
        </div>
      ),
    },
  ]

  const buildCsv = () => {
    const headers = ["SOP No.", "Action", "Actor Name", "Department", "Timestamp"]
    const rows = data.map((entry) => [
      entry.sop_number,
      getActionLabel(entry.action),
      (entry as any).actor?.full_name || "Unknown",
      (entry as any).actor?.department || "Unknown",
      format(new Date(entry.created_at), "yyyy-MM-dd HH:mm:ss"),
    ])
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${v}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `sop-change-history-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-6">
        <div className="flex items-center gap-3">
          <div className="bg-brand-teal/10 p-2 rounded-lg">
            <FileText className="h-5 w-5 text-brand-teal" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">SOP Change History</h2>
            <p className="text-sm text-muted-foreground">Audit trail of all SOP approvals and modifications</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={buildCsv}
          disabled={data.length === 0}
          className="rounded-xl border-brand-teal/20 hover:bg-brand-teal/5 hover:text-brand-teal shadow-sm group/btn"
        >
          <Download className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" />
          Export Dataset (.csv)
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={loading}
        noDataMessage={loading ? "Loading audit logs..." : "No data found. Try adjusting your date range."}
        pageSize={pageSize}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages} &middot; {totalCount} records
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || loading}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1 || loading}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
