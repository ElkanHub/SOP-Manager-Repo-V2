"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

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

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Pulse / Notice Log</h2>
        <Button variant="outline" onClick={buildCsv} disabled={data.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {data.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">No data found</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium">Sender</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Audience</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Target Dept</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Subject</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Body</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Sent At</th>
              </tr>
            </thead>
            <tbody>
              {data.map((entry) => (
                <tr key={entry.id} className="border-t">
                  <td className="px-4 py-2 text-sm">{entry.sender?.full_name || '-'}</td>
                  <td className="px-4 py-2 text-sm capitalize">{entry.audience}</td>
                  <td className="px-4 py-2 text-sm">{entry.target_department || '-'}</td>
                  <td className="px-4 py-2 text-sm">{entry.title}</td>
                  <td className="px-4 py-2 text-sm text-muted-foreground max-w-xs truncate">
                    {entry.body ? entry.body.substring(0, 100) : '-'}
                  </td>
                  <td className="px-4 py-2 text-sm text-muted-foreground">
                    {format(new Date(entry.created_at), 'MMM d, yyyy HH:mm')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
