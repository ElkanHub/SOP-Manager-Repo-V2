"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

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

      const { data } = await query.limit(100)
      setData(data || [])
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

  const buildCsv = () => {
    const headers = ['SOP No.', 'Action', 'Actor Name', 'Department', 'Timestamp']
    const rows = data.map(entry => [
      entry.sop?.sop_number || entry.entity_id.substring(0, 8),
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

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">SOP Change History</h2>
        <Button variant="outline" onClick={buildCsv} disabled={data.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {data.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">No data found</p>
      ) : (
        <div className="border rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold">SOP No.</th>
                  <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Action</th>
                  <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Actor Name</th>
                  <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Dept</th>
                  <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {data.map((entry) => (
                  <tr key={entry.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-4 py-3 text-sm font-mono text-brand-teal font-medium">{entry.sop?.sop_number || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium">{getActionLabel(entry.action)}</td>
                    <td className="px-4 py-3 text-sm">{entry.actor?.full_name || 'Unknown'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{entry.actor?.department || '-'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {format(new Date(entry.created_at), 'MMM d, yyyy HH:mm')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
