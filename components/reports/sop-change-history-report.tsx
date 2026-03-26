"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Download, FileText, Calendar, Hash, User, Building2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

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

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 bg-muted/20 rounded-2xl border border-dashed border-border/60">
          <div className="bg-background p-4 rounded-full shadow-sm">
            <FileText className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-foreground/70">No data found</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">Try adjusting your date range filters to see activity logs.</p>
          </div>
        </div>
      ) : (
        <div className="relative rounded-2xl border border-border/40 bg-background/30 backdrop-blur-sm overflow-hidden shadow-sm">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-muted/30 border-b border-border/40">
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    <div className="flex items-center gap-2"><Hash className="h-3 w-3" /> SOP No.</div>
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Action
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    <div className="flex items-center gap-2"><User className="h-3 w-3" /> Actor</div>
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    <div className="flex items-center gap-2"><Building2 className="h-3 w-3" /> Dept</div>
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    <div className="flex items-center gap-2"><Calendar className="h-3 w-3" /> Timestamp</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {data.map((entry) => (
                  <tr key={entry.id} className="hover:bg-brand-teal/[0.02] transition-colors group">
                    <td className="px-6 py-5">
                      <span className="font-mono text-xs font-bold text-brand-teal bg-brand-teal/5 px-2 py-1 rounded">
                        {entry.sop?.sop_number || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <Badge variant="outline" className="font-bold border-brand-teal/20 text-brand-teal">
                        {getActionLabel(entry.action)}
                      </Badge>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-semibold">{entry.actor?.full_name || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-xs text-muted-foreground/80 font-medium">{entry.actor?.department || '-'}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-xs font-medium text-muted-foreground">
                        {format(new Date(entry.created_at), 'MMM d, yyyy')}
                        <span className="ml-2 opacity-50">{format(new Date(entry.created_at), 'HH:mm')}</span>
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
