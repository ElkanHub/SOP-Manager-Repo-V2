"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { fetchAcknowledgements } from "@/lib/queries/reports"
import { exportReportCsv } from "@/actions/audit"
import { Button } from "@/components/ui/button"
import { Download, Users, ShieldCheck, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"

interface AcknowledgementLogReportProps {
  dateFrom: string | null
  dateTo: string | null
  isQa: boolean
  isAdmin: boolean
}

export function AcknowledgementLogReport({ dateFrom, dateTo, isQa, isAdmin }: AcknowledgementLogReportProps) {
  const [page, setPage] = useState(0)
  const queryClient = useQueryClient()

  useEffect(() => { setPage(0) }, [dateFrom, dateTo])

  const queryKey = ["report-acknowledgements", page, dateFrom, dateTo]

  const { data: result, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () => fetchAcknowledgements({ page, dateFrom, dateTo }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ["report-acknowledgements", page + 1, dateFrom, dateTo],
      queryFn: () => fetchAcknowledgements({ page: page + 1, dateFrom, dateTo }),
    })
  }, [page, dateFrom, dateTo, queryClient])

  const data = result?.data ?? []
  const totalCount = result?.count ?? 0
  const pageSize = result?.pageSize ?? 50
  const totalPages = Math.ceil(totalCount / pageSize)
  const loading = isLoading || isFetching

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "sop.sop_number",
      header: "SOP No.",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-blue-600 bg-blue-500/5 px-2 py-1 rounded">
          {row.original.sop?.sop_number || "-"}
        </span>
      ),
    },
    {
      accessorKey: "sop.title",
      header: "Title",
      cell: ({ row }) => (
        <div className="text-sm font-semibold truncate max-w-[200px]" title={row.original.sop?.title}>
          {row.original.sop?.title || "-"}
        </div>
      ),
    },
    {
      accessorKey: "user.full_name",
      header: "Employee",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
            {row.original.user?.full_name?.split(" ").map((n: string) => n[0]).join("") || "?"}
          </div>
          <div className="text-sm font-medium">{row.original.user?.full_name || "Unknown"}</div>
        </div>
      ),
    },
    {
      accessorKey: "user.department",
      header: "Dept",
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground/80 font-medium">{row.original.user?.department || "-"}</div>
      ),
    },
    {
      accessorKey: "version",
      header: "Version",
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-mono text-[10px] font-bold px-1.5 h-4">
          v{row.getValue("version")}
        </Badge>
      ),
    },
    {
      accessorKey: "acknowledged_at",
      header: "Acknowledged At",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="h-3 w-3 text-green-500" />
          {format(new Date(row.getValue("acknowledged_at")), "MMM d, yyyy")}
          <span className="ml-1 opacity-50">{format(new Date(row.getValue("acknowledged_at")), "HH:mm")}</span>
        </div>
      ),
    },
  ]

  const [exporting, setExporting] = useState(false)
  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await exportReportCsv({ reportType: "acknowledgements", dateFrom, dateTo })
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
          <div className="bg-blue-500/10 p-2 rounded-lg">
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Worker Acknowledgements</h2>
            <p className="text-sm text-muted-foreground">Detailed log of SOP reading and comprehension sign-offs</p>
          </div>
        </div>
        {isAdmin && (
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={data.length === 0 || exporting}
            className="rounded-xl border-blue-500/20 hover:bg-blue-500/5 hover:text-blue-500 shadow-sm group/btn"
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
        noDataMessage={loading ? "Loading records..." : "No acknowledgements found."}
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
