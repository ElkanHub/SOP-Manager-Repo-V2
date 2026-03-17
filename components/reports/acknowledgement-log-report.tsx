"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface AcknowledgementLogReportProps {
  dateFrom: string | null
  dateTo: string | null
  isQa: boolean
}

export function AcknowledgementLogReport({ dateFrom, dateTo, isQa }: AcknowledgementLogReportProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const supabase = createClient()

      let query = supabase
        .from('sop_acknowledgements')
        .select(`
          id,
          acknowledged_at,
          version,
          sop:sops(sop_number, title, department),
          user:profiles!sop_acknowledgements_user_id_fkey(full_name, department)
        `)
        .order('acknowledged_at', { ascending: false })

      if (dateFrom) {
        query = query.gte('acknowledged_at', dateFrom)
      }
      if (dateTo) {
        query = query.lte('acknowledged_at', dateTo + 'T23:59:59')
      }

      const { data } = await query.limit(100)
      setData(data || [])
      setLoading(false)
    }

    fetchData()
  }, [dateFrom, dateTo])

  const buildCsv = () => {
    const headers = ['SOP No.', 'SOP Title', 'Employee Name', 'Dept', 'Version', 'Acknowledged At']
    const rows = data.map((entry: any) => [
      entry.sop?.sop_number || '-',
      entry.sop?.title || '-',
      entry.user?.full_name || 'Unknown',
      entry.user?.department || '-',
      entry.version,
      format(new Date(entry.acknowledged_at), 'yyyy-MM-dd HH:mm:ss'),
    ])
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `acknowledgements-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Worker Acknowledgement Log</h2>
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
            <table className="w-full min-w-[900px]">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold">SOP No.</th>
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold">SOP Title</th>
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Employee Name</th>
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Dept</th>
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Version</th>
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Acknowledged At</th>
                </tr>
              </thead>
              <tbody>
                {data.map((entry: any) => (
                  <tr key={entry.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-4 py-3 text-sm font-mono text-brand-teal font-medium">{entry.sop?.sop_number || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium">{entry.sop?.title || '-'}</td>
                    <td className="px-4 py-3 text-sm">{entry.user?.full_name || 'Unknown'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{entry.user?.department || '-'}</td>
                    <td className="px-4 py-3 text-sm">{entry.version}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {format(new Date(entry.acknowledged_at), 'MMM d, yyyy HH:mm')}
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
