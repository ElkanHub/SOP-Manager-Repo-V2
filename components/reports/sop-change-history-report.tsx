"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Download, FileText, Calendar, Hash, User, Building2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"

interface SopChangeHistoryReportProps {
  dateFrom: string | null
  dateTo: string | null
  isQa: boolean
}

export function SopChangeHistoryReport({ dateFrom, dateTo, isQa }: SopChangeHistoryReportProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const supabase = createClient()

      let query = supabase
        .from('audit_log')
        .select(`
          id,
          action,
          entity_type,
          entity_id,
          created_at,
          actor_id,
          actor:profiles!actor_id(full_name, department)
        `)
        .in('entity_type', ['sop', 'change_control'])
        .order('created_at', { ascending: false })

      if (dateFrom) {
        query = query.gte('created_at', dateFrom)
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59')
      }

      const { data: logs } = await query.limit(100)
      
      if (!logs || logs.length === 0) {
        setData([])
        setLoading(false)
        return
      }

      // Task 11: Fetch SOP numbers for both direct SOP actions and CC actions
      const sopIds = logs
        .filter(l => l.entity_type === 'sop')
        .map(l => l.entity_id)
      
      const ccIds = logs
        .filter(l => l.entity_type === 'change_control')
        .map(l => l.entity_id)

      const [{ data: sops }, { data: ccs }] = await Promise.all([
        supabase.from('sops').select('id, sop_number').in('id', sopIds),
        supabase.from('change_controls').select('id, sop_id, sops(sop_number)').in('id', ccIds)
      ])

      const enrichedLogs = logs.map(log => {
        let sopNumber = '-'
        if (log.entity_type === 'sop') {
          sopNumber = sops?.find(s => s.id === log.entity_id)?.sop_number || '-'
        } else if (log.entity_type === 'change_control') {
          const cc = ccs?.find(c => c.id === log.entity_id)
          sopNumber = (cc?.sops as any)?.sop_number || '-'
        }
        return { ...log, sop_number: sopNumber }
      })

      setData(enrichedLogs)
      setLoading(false)
    }

    fetchData()
  }, [dateFrom, dateTo])

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'sop_approved_new': 'Approved',
      'sop_submitted': 'Submitted',
      'change_control_issued': 'CC Issued',
      'change_control_completed': 'CC Completed',
      'cc_signature_added': 'Signed',
      'cc_signature_waived': 'Waived',
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
        <div className="text-sm font-semibold">{row.original.actor?.full_name || 'Unknown'}</div>
      ),
    },
    {
      accessorKey: "actor.department",
      header: "Dept",
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground/80 font-medium">{row.original.actor?.department || '-'}</div>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Timestamp",
      cell: ({ row }) => (
        <div className="text-xs font-medium text-muted-foreground">
          {format(new Date(row.getValue("created_at")), 'MMM d, yyyy')}
          <span className="ml-2 opacity-50">{format(new Date(row.getValue("created_at")), 'HH:mm')}</span>
        </div>
      ),
    },
  ]

  const buildCsv = () => {
    const headers = ['SOP No.', 'Action', 'Actor Name', 'Department', 'Timestamp']
    const rows = data.map(entry => [
      entry.sop_number,
      getActionLabel(entry.action),
      entry.actor?.full_name || 'Unknown',
      entry.actor?.department || 'Unknown',
      format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm:ss'),
    ])
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sop-change-history-${format(new Date(), 'yyyy-MM-dd')}.csv`
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
        pageSize={15}
      />
    </div>
  )
}
