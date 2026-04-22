"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { fetchPulseNotices } from "@/lib/queries/reports"
import { exportReportCsv } from "@/actions/audit"
import { Button } from "@/components/ui/button"
import { Download, Bell, MailOpen, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"

interface PulseNoticeReportProps {
  dateFrom: string | null
  dateTo: string | null
  isAdmin: boolean
}

export function PulseNoticeReport({ dateFrom, dateTo, isAdmin }: PulseNoticeReportProps) {
  const [page, setPage] = useState(0)
  const queryClient = useQueryClient()

  useEffect(() => { setPage(0) }, [dateFrom, dateTo])

  const queryKey = ["report-pulse-notices", page, dateFrom, dateTo]

  const { data: result, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () => fetchPulseNotices({ page, dateFrom, dateTo }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ["report-pulse-notices", page + 1, dateFrom, dateTo],
      queryFn: () => fetchPulseNotices({ page: page + 1, dateFrom, dateTo }),
    })
  }, [page, dateFrom, dateTo, queryClient])

  const data = result?.data ?? []
  const totalCount = result?.count ?? 0
  const pageSize = result?.pageSize ?? 50
  const totalPages = Math.ceil(totalCount / pageSize)
  const loading = isLoading || isFetching

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "sender.full_name",
      header: "Sender",
      cell: ({ row }) => (
        <div className="text-sm font-semibold">{row.original.sender?.full_name || "System"}</div>
      ),
    },
    {
      accessorKey: "audience",
      header: "Audience",
      cell: ({ row }) => (
        <Badge variant="secondary" className="capitalize text-[10px] font-bold">
          {row.getValue("audience")}
        </Badge>
      ),
    },
    {
      accessorKey: "target_department",
      header: "Target",
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground/80 font-medium">{row.getValue("target_department") || "-"}</div>
      ),
    },
    {
      accessorKey: "title",
      header: "Content",
      cell: ({ row }) => (
        <div className="space-y-1 max-w-md">
          <div className="text-sm font-bold flex items-center gap-2">
            <MailOpen className="h-3 w-3 text-indigo-500 opacity-60" />
            {row.getValue("title")}
          </div>
          <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed" title={row.original.body}>
            {row.original.body || "-"}
          </div>
        </div>
      ),
      size: 400,
    },
    {
      accessorKey: "created_at",
      header: "Sent At",
      cell: ({ row }) => (
        <div className="text-xs font-medium text-muted-foreground whitespace-nowrap">
          {format(new Date(row.getValue("created_at")), "MMM d, yyyy")}
          <span className="ml-2 opacity-50">{format(new Date(row.getValue("created_at")), "HH:mm")}</span>
        </div>
      ),
    },
  ]

  const [exporting, setExporting] = useState(false)
  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await exportReportCsv({ reportType: "pulse-notices", dateFrom, dateTo })
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
          <div className="bg-indigo-500/10 p-2 rounded-lg">
            <Bell className="h-5 w-5 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Pulse / Notice Log</h2>
            <p className="text-sm text-muted-foreground">Audit log of all broadcast notices and system communications</p>
          </div>
        </div>
        {isAdmin && (
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={data.length === 0 || exporting}
            className="rounded-xl border-indigo-500/20 hover:bg-indigo-500/5 hover:text-indigo-500 shadow-sm group/btn"
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
        noDataMessage={loading ? "Loading logs..." : "No notices found."}
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
