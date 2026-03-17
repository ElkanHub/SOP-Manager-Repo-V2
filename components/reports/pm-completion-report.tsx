"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface PmCompletionReportProps {
  dateFrom: string | null
  dateTo: string | null
  isQa: boolean
}

export function PmCompletionReport({ dateFrom, dateTo, isQa }: PmCompletionReportProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const supabase = createClient()

      let query = supabase
        .from('pm_tasks')
        .select(`
          id,
          completed_at,
          notes,
          equipment:equipment_id(asset_id, name, department),
          assigned_to_user:profiles!pm_tasks_assigned_to_fkey(full_name),
          completed_by_user:profiles!pm_tasks_completed_by_fkey(full_name)
        `)
        .eq('status', 'complete')
        .order('completed_at', { ascending: false })

      if (dateFrom) {
        query = query.gte('completed_at', dateFrom)
      }
      if (dateTo) {
        query = query.lte('completed_at', dateTo + 'T23:59:59')
      }

      const { data } = await query.limit(100)
      setData(data || [])
      setLoading(false)
    }

    fetchData()
  }, [dateFrom, dateTo])

  const buildCsv = () => {
    const headers = ['Asset ID', 'Asset Name', 'Dept', 'Assigned To', 'Completed By', 'Completion Date', 'Notes']
    const rows = data.map((entry: any) => [
      entry.equipment?.asset_id || '-',
      entry.equipment?.name || '-',
      entry.equipment?.department || '-',
      entry.assigned_to_user?.full_name || '-',
      entry.completed_by_user?.full_name || '-',
      entry.completed_at ? format(new Date(entry.completed_at), 'yyyy-MM-dd HH:mm:ss') : '-',
      entry.notes || '-',
    ])
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pm-completion-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">PM Completion Log</h2>
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
            <table className="w-full min-w-[1000px]">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Asset ID</th>
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Asset Name</th>
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Dept</th>
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Assigned To</th>
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Completed By</th>
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Completion Date</th>
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.map((entry: any) => (
                  <tr key={entry.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-4 py-3 text-sm font-mono text-brand-teal font-medium">{entry.equipment?.asset_id || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium">{entry.equipment?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{entry.equipment?.department || '-'}</td>
                    <td className="px-4 py-3 text-sm">{entry.assigned_to_user?.full_name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{entry.completed_by_user?.full_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {entry.completed_at ? format(new Date(entry.completed_at), 'MMM d, yyyy HH:mm') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">
                      {entry.notes || '-'}
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
