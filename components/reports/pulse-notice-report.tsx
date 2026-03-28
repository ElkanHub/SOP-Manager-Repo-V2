"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Download, Bell, Calendar, User, Users, Building2, MailOpen } from "lucide-react"
import { Badge } from "@/components/ui/badge"

import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"

interface PulseNoticeReportProps {
  dateFrom: string | null
  dateTo: string | null
}

export function PulseNoticeReport({ dateFrom, dateTo }: PulseNoticeReportProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const supabase = createClient()

      let query = supabase
        .from('pulse_items')
        .select(`
          id,
          title,
          body,
          created_at,
          sender:profiles!pulse_items_sender_id_fkey(full_name),
          audience,
          target_department
        `)
        .eq('type', 'notice')
        .order('created_at', { ascending: false })

      if (dateFrom) {
        query = query.gte('created_at', dateFrom)
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59')
      }

      const { data } = await query.limit(100)
      setData(data || [])
      setLoading(false)
    }

    fetchData()
  }, [dateFrom, dateTo])

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "sender.full_name",
      header: "Sender",
      cell: ({ row }) => (
        <div className="text-sm font-semibold">{row.original.sender?.full_name || 'System'}</div>
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
        <div className="text-xs text-muted-foreground/80 font-medium">{row.getValue("target_department") || '-'}</div>
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
            {row.original.body || '-'}
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
          {format(new Date(row.getValue("created_at")), 'MMM d, yyyy')}
          <span className="ml-2 opacity-50">{format(new Date(row.getValue("created_at")), 'HH:mm')}</span>
        </div>
      ),
    },
  ]

  const buildCsv = () => {
    const headers = ['Sender', 'Audience', 'Target Dept', 'Subject', 'Body', 'Sent At']
    const rows = data.map(entry => [
      entry.sender?.full_name || '-',
      entry.audience,
      entry.target_department || '-',
      entry.title,
      (entry.body || '').substring(0, 100),
      format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm:ss'),
    ])
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pulse-notices-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
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
        <Button 
          variant="outline" 
          onClick={buildCsv} 
          disabled={data.length === 0}
          className="rounded-xl border-indigo-500/20 hover:bg-indigo-500/5 hover:text-indigo-500 shadow-sm group/btn"
        >
          <Download className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" />
          Export Dataset (.csv)
        </Button>
      </div>

      <DataTable 
        columns={columns} 
        data={data} 
        isLoading={loading}
        noDataMessage={loading ? "Loading logs..." : "No notices found."}
        pageSize={15}
      />
    </div>
  )
}
