"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Download, Users, FileText, Calendar, Hash, Building2, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"

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
        <Button 
          variant="outline" 
          onClick={buildCsv} 
          disabled={data.length === 0}
          className="rounded-xl border-blue-500/20 hover:bg-blue-500/5 hover:text-blue-500 shadow-sm group/btn"
        >
          <Download className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" />
          Export Dataset (.csv)
        </Button>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 bg-muted/20 rounded-2xl border border-dashed border-border/60">
          <div className="bg-background p-4 rounded-full shadow-sm">
            <Users className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-foreground/70">No acknowledgements found</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">No records match the current filters.</p>
          </div>
        </div>
      ) : (
        <div className="relative rounded-2xl border border-border/40 bg-background/30 backdrop-blur-sm overflow-hidden shadow-sm">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="bg-muted/30 border-b border-border/40">
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    <div className="flex items-center gap-2"><Hash className="h-3 w-3" /> SOP No.</div>
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    <div className="flex items-center gap-2"><FileText className="h-3 w-3" /> Title</div>
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Employee
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    <div className="flex items-center gap-2"><Building2 className="h-3 w-3" /> Dept</div>
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Version
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    <div className="flex items-center gap-2"><Calendar className="h-3 w-3" /> Acknowledged At</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {data.map((entry: any) => (
                  <tr key={entry.id} className="hover:bg-blue-500/[0.02] transition-colors group">
                    <td className="px-6 py-5">
                      <span className="font-mono text-xs font-bold text-blue-600 bg-blue-500/5 px-2 py-1 rounded">
                        {entry.sop?.sop_number || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-semibold truncate max-w-[200px]" title={entry.sop?.title}>
                        {entry.sop?.title || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                          {entry.user?.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                        </div>
                        <div className="text-sm font-medium">{entry.user?.full_name || 'Unknown'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-xs text-muted-foreground/80 font-medium">{entry.user?.department || '-'}</div>
                    </td>
                    <td className="px-6 py-5">
                      <Badge variant="secondary" className="font-mono text-[10px] font-bold px-1.5 h-4">
                        v{entry.version}
                      </Badge>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <ShieldCheck className="h-3 w-3 text-green-500" />
                        {format(new Date(entry.acknowledged_at), 'MMM d, yyyy')}
                        <span className="ml-1 opacity-50">{format(new Date(entry.acknowledged_at), 'HH:mm')}</span>
                      </div>
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
