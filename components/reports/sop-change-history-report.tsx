"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { keepPreviousData } from "@tanstack/react-query"
import { fetchSopChanges } from "@/lib/queries/reports"
import { exportReportCsv } from "@/actions/audit"
import { Button } from "@/components/ui/button"
import { Download, FileText, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"

interface SopChangeHistoryReportProps {
  dateFrom: string | null
  dateTo: string | null
  isQa: boolean
  isAdmin: boolean
}

export function SopChangeHistoryReport({ dateFrom, dateTo, isQa, isAdmin }: SopChangeHistoryReportProps) {
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

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "cc_ref",
      header: "CC Ref",
      cell: ({ row }) => {
        const id = row.original.id
        const date = new Date(row.original.created_at)
        const ccRef = `CC-${date.getFullYear()}-${id.slice(0, 4).toUpperCase()}`
        return (
          <Link href={`/change-control/${id}`} className="font-mono text-xs font-bold text-brand-teal bg-brand-teal/5 px-2 py-1 rounded hover:underline hover:bg-brand-teal/10 transition-colors">
            {ccRef}
          </Link>
        )
      },
    },
    {
      accessorKey: "sops.title",
      header: "Document",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{row.original.sops?.title || "Unknown Document"}</span>
          <span className="text-xs text-muted-foreground">{row.original.sops?.sop_number || "-"}</span>
        </div>
      ),
    },
    {
      accessorKey: "sops.department",
      header: "Dept",
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground/80 font-medium">{row.original.sops?.department || "-"}</div>
      ),
    },
    {
      accessorKey: "old_version",
      header: "Version Delta",
      cell: ({ row }) => (
        <div className="text-xs font-medium flex items-center gap-1.5">
          <span className="text-muted-foreground">{row.original.old_version || 'v0.0'}</span>
          <span className="text-brand-navy dark:text-brand-teal">→</span>
          <span className="font-bold text-foreground">{row.original.new_version || '-'}</span>
        </div>
      ),
    },
    {
      accessorKey: "signatories",
      header: "Signatures",
      cell: ({ row }) => (
        <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {row.original.signatories?.length || 0} Collected
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const statusStr = String(row.original.status || 'unknown')
        if (statusStr === 'complete') {
          return <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">Executed</Badge>
        }
        return <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 capitalize">{statusStr.replace('_', ' ')}</Badge>
      },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => (
        <div className="text-xs font-medium text-muted-foreground">
          {format(new Date(row.original.created_at), "MMM d, yyyy")}
        </div>
      ),
    },
  ]

  const [exporting, setExporting] = useState(false)
  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await exportReportCsv({ reportType: "sop-changes", dateFrom, dateTo })
      if (!res.success) { alert(res.error || "Export failed"); return }
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = res.filename
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-6">
        <div className="flex items-center gap-3">
          <div className="bg-brand-teal/10 p-2 rounded-lg">
            <FileText className="h-5 w-5 text-brand-teal" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Change Control Log</h2>
            <p className="text-sm text-muted-foreground">Comprehensive tracking of all active and historic document updates</p>
          </div>
        </div>
        {isAdmin && (
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={data.length === 0 || exporting}
            className="rounded-xl border-brand-teal/20 hover:bg-brand-teal/5 hover:text-brand-teal shadow-sm group/btn"
          >
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" />}
            Export Dataset (.csv)
          </Button>
        )}
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
