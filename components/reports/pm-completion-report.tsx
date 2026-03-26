"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Download, Wrench, Calendar, Hash, Building2, User, ClipboardList } from "lucide-react"
import { Badge } from "@/components/ui/badge"

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

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 bg-muted/20 rounded-2xl border border-dashed border-border/60">
          <div className="bg-background p-4 rounded-full shadow-sm">
            <Wrench className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-foreground/70">No PM records found</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">Try adjusting your date range filters.</p>
          </div>
        </div>
      ) : (
        <div className="relative rounded-2xl border border-border/40 bg-background/30 backdrop-blur-sm overflow-hidden shadow-sm">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="bg-muted/30 border-b border-border/40">
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    <div className="flex items-center gap-2"><Hash className="h-3 w-3" /> Asset ID</div>
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Asset Name
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    <div className="flex items-center gap-2"><Building2 className="h-3 w-3" /> Dept</div>
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Assigned To
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Completed By
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    <div className="flex items-center gap-2"><Calendar className="h-3 w-3" /> Date</div>
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    <div className="flex items-center gap-2"><ClipboardList className="h-3 w-3" /> Notes</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {data.map((entry: any) => (
                  <tr key={entry.id} className="hover:bg-orange-500/[0.02] transition-colors group">
                    <td className="px-6 py-5">
                      <span className="font-mono text-xs font-bold text-orange-600 bg-orange-500/5 px-2 py-1 rounded">
                        {entry.equipment?.asset_id || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-semibold truncate max-w-[180px]" title={entry.equipment?.name}>
                        {entry.equipment?.name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-xs text-muted-foreground/80 font-medium">{entry.equipment?.department || '-'}</div>
                    </td>
                    <td className="px-6 py-5 text-sm">{entry.assigned_to_user?.full_name || '-'}</td>
                    <td className="px-6 py-5 text-sm font-medium">{entry.completed_by_user?.full_name || '-'}</td>
                    <td className="px-6 py-5">
                      <div className="text-xs font-medium text-muted-foreground">
                        {entry.completed_at ? format(new Date(entry.completed_at), 'MMM d, yyyy') : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-xs text-muted-foreground/70 italic max-w-xs truncate" title={entry.notes}>
                        {entry.notes || 'No work notes'}
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
