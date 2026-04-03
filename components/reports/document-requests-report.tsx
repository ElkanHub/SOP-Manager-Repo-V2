'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { fetchDocumentRequests } from '@/lib/queries/reports'
import { Button } from '@/components/ui/button'
import { Download, ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react'
import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { RequestStatusPill } from '@/components/requests/request-status-pill'
import { RequestStatus, DocumentRequest } from '@/types/app.types'
import { RequestDetailModal } from '@/components/requests/request-detail-modal'

interface DocumentRequestsReportProps {
  dateFrom: string | null
  dateTo: string | null
}

export function DocumentRequestsReport({ dateFrom, dateTo }: DocumentRequestsReportProps) {
  const [page, setPage] = useState(0)
  const [selectedRequest, setSelectedRequest] = useState<DocumentRequest | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const queryClient = useQueryClient()

  const [prevDates, setPrevDates] = useState({ dateFrom, dateTo })
  if (dateFrom !== prevDates.dateFrom || dateTo !== prevDates.dateTo) {
    setPrevDates({ dateFrom, dateTo })
    setPage(0)
  }

  const queryKey = ['report-document-requests', page, dateFrom, dateTo]

  const { data: result, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () => fetchDocumentRequests({ page, dateFrom, dateTo }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ['report-document-requests', page + 1, dateFrom, dateTo],
      queryFn: () => fetchDocumentRequests({ page: page + 1, dateFrom, dateTo }),
    })
  }, [page, dateFrom, dateTo, queryClient])

  const data = (result?.data ?? []) as unknown as DocumentRequest[]
  const totalCount = result?.count ?? 0
  const pageSize = result?.pageSize ?? 50
  const totalPages = Math.ceil(totalCount / pageSize)
  const loading = isLoading || isFetching

  const fmt = (d: string | null) =>
    d ? format(new Date(d), 'dd MMM yyyy, HH:mm') : '—'

  const columns: ColumnDef<DocumentRequest>[] = [
    {
      accessorKey: 'reference_number',
      header: 'Ref No.',
      cell: ({ row }) => {
        const req = row.original as DocumentRequest
        return (
          <button 
            onClick={() => {
              setSelectedRequest(req)
              setIsDetailModalOpen(true)
            }}
            className="font-mono text-xs font-bold text-amber-600 bg-amber-500/5 px-2 py-1 rounded hover:bg-amber-500/10 hover:text-amber-700 transition-colors"
          >
            {row.getValue('reference_number')}
          </button>
        )
      },
    },
    {
      accessorKey: 'requester_name',
      header: 'Requester',
      cell: ({ row }) => (
        <div>
          <div className="text-sm font-semibold">{row.getValue('requester_name')}</div>
          <div className="text-xs text-muted-foreground">{row.original.requester_email}</div>
        </div>
      ),
    },
    {
      accessorKey: 'requester_department',
      header: 'Dept',
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground/80 font-medium">{row.getValue('requester_department')}</div>
      ),
    },
    {
      accessorKey: 'requester_role',
      header: 'Role',
      cell: ({ row }) => {
        const role = row.getValue('requester_role') as string
        return <div className="text-xs capitalize">{role}</div>
      },
    },
    {
      accessorKey: 'submitted_at',
      header: 'Submitted',
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground">{fmt(row.getValue('submitted_at'))}</div>
      ),
    },
    {
      accessorKey: 'received_at',
      header: 'Received',
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground">{fmt(row.original.received_at)}</div>
      ),
    },
    {
      accessorKey: 'approved_at',
      header: 'Approved',
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground">{fmt(row.original.approved_at)}</div>
      ),
    },
    {
      accessorKey: 'fulfilled_at',
      header: 'Fulfilled',
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground">{fmt(row.original.fulfilled_at)}</div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <RequestStatusPill status={row.getValue('status') as RequestStatus} size="sm" />
      ),
    },
    {
      accessorKey: 'qa_notes',
      header: 'QA Notes',
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground/70 italic max-w-[180px] truncate" title={row.getValue('qa_notes')}>
          {row.getValue('qa_notes') || '—'}
        </div>
      ),
    },
  ]

  const buildCsv = () => {
    const headers = [
      'Reference No.', 'Requester Name', 'Email', 'Department', 'Role', 'Employee ID',
      'Submitted At', 'Received At', 'Approved At', 'Fulfilled At', 'Status', 'QA Notes',
    ]
    const rows = data.map((entry: DocumentRequest) => [
      entry.reference_number || '—',
      entry.requester_name || '—',
      entry.requester_email || '—',
      entry.requester_department || '—',
      entry.requester_role || '—',
      entry.requester_employee_id || '—',
      fmt(entry.submitted_at),
      fmt(entry.received_at),
      fmt(entry.approved_at),
      fmt(entry.fulfilled_at),
      entry.status || '—',
      entry.qa_notes || '—',
    ])
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `document-requests-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-6">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 p-2 rounded-lg">
            <ClipboardList className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Document Requests Log</h2>
            <p className="text-sm text-muted-foreground">All document requests submitted to QA, with full lifecycle tracking</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={buildCsv}
          disabled={data.length === 0}
          className="rounded-xl border-amber-500/20 hover:bg-amber-500/5 hover:text-amber-600 shadow-sm group/btn"
        >
          <Download className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" />
          Export Dataset (.csv)
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={loading}
        noDataMessage={loading ? 'Loading records...' : 'No document requests found.'}
        pageSize={pageSize}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages} · {totalCount} records
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0 || loading}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1 || loading}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <RequestDetailModal 
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        request={selectedRequest}
      />
    </div>
  )
}
