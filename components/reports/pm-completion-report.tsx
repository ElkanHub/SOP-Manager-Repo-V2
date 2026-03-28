"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { fetchPmCompletions } from "@/lib/queries/reports"
import { Button } from "@/components/ui/button"
import { Download, Wrench, ChevronLeft, ChevronRight } from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"

interface PmCompletionReportProps {
  dateFrom: string | null
  dateTo: string | null
  isQa: boolean
}

export function PmCompletionReport({ dateFrom, dateTo, isQa }: PmCompletionReportProps) {
  const [page, setPage] = useState(0)
  const queryClient = useQueryClient()

  useEffect(() => { setPage(0) }, [dateFrom, dateTo])

  const queryKey = ["report-pm-completions", page, dateFrom, dateTo]

  const { data: result, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () => fetchPmCompletions({ page, dateFrom, dateTo }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ["report-pm-completions", page + 1, dateFrom, dateTo],
      queryFn: () => fetchPmCompletions({ page: page + 1, dateFrom, dateTo }),
    })
  }, [page, dateFrom, dateTo, queryClient])

  const data = result?.data ?? []
  const totalCount = result?.count ?? 0
  const pageSize = result?.pageSize ?? 50
  const totalPages = Math.ceil(totalCount / pageSize)
  const loading = isLoading || isFetching

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "equipment.asset_id",
      header: "Asset ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-orange-600 bg-orange-500/5 px-2 py-1 rounded">
          {row.original.equipment?.asset_id || "-"}
        </span>
      ),
    },
    {
      accessorKey: "equipment.name",
      header: "Asset Name",
      cell: ({ row }) => (
        <div className="text-sm font-semibold truncate max-w-[180px]" title={row.original.equipment?.name}>
          {row.original.equipment?.name || "-"}
        </div>
      ),
    },
    {
      accessorKey: "equipment.department",
      header: "Dept",
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground/80 font-medium">{row.original.equipment?.department || "-"}</div>
      ),
    },
    {
      accessorKey: "assigned_to_user.full_name",
      header: "Assigned To",
      cell: ({ row }) => (
        <div className="text-sm">{row.original.assigned_to_user?.full_name || "-"}</div>
      ),
    },
    {
      accessorKey: "completed_by_user.full_name",
      header: "Completed By",
      cell: ({ row }) => (
        <div className="text-sm font-medium">{row.original.completed_by_user?.full_name || "-"}</div>
      ),
    },
    {
      accessorKey: "completed_at",
      header: "Date",
      cell: ({ row }) => (
        <div className="text-xs font-medium text-muted-foreground">
          {row.getValue("completed_at") ? format(new Date(row.getValue("completed_at") as string), "MMM d, yyyy") : "-"}
        </div>
      ),
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground/70 italic max-w-xs truncate" title={row.getValue("notes")}>
          {row.getValue("notes") || "No work notes"}
        </div>
      ),
    },
  ]

  const buildCsv = () => {
    const headers = ["Asset ID", "Asset Name", "Dept", "Assigned To", "Completed By", "Completion Date", "Notes"]
    const rows = data.map((entry: any) => [
      entry.equipment?.asset_id || "-",
      entry.equipment?.name || "-",
      entry.equipment?.department || "-",
      entry.assigned_to_user?.full_name || "-",
      entry.completed_by_user?.full_name || "-",
      entry.completed_at ? format(new Date(entry.completed_at), "yyyy-MM-dd HH:mm:ss") : "-",
      entry.notes || "-",
    ])
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${v}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `pm-completion-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-6">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500/10 p-2 rounded-lg">
            <Wrench className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">PM Completion Log</h2>
            <p className="text-sm text-muted-foreground">Historical records of preventive maintenance tasks and asset upkeep</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={buildCsv}
          disabled={data.length === 0}
          className="rounded-xl border-orange-500/20 hover:bg-orange-500/5 hover:text-orange-500 shadow-sm group/btn"
        >
          <Download className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" />
          Export Dataset (.csv)
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={loading}
        noDataMessage={loading ? "Loading logs..." : "No PM records found."}
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
