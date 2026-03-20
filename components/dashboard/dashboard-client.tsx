"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { NumberTicker } from "@/components/ui/number-ticker"
import { Card, CardContent } from "@/components/ui/card"
import { Profile } from "@/types/app.types"
import { FileText } from "lucide-react"

interface KpiData {
  activeSops: number
  pendingApprovals: number
  pmCompliance: number
  sopsDueForRevision: number
}

interface AuditEntry {
  id: string
  action: string
  entity_type: string
  entity_id?: string
  created_at: string
  actor_id?: string
  actor?: {
    full_name: string
  }
}

interface PmTask {
  id: string
  due_date: string
  status: string
  equipment: {
    name: string
    asset_id: string
  }
}

interface DashboardClientProps {
  profile: Profile
  kpiData: KpiData
  auditEntries: AuditEntry[]
  upcomingPmTasks: PmTask[]
}

export function DashboardClient({
  profile,
  kpiData,
  auditEntries: initialAuditEntries,
  upcomingPmTasks,
}: DashboardClientProps) {
  const supabase = createClient()
  const [kpi, setKpi] = useState(kpiData)
  const [auditEntries, setAuditEntries] = useState(initialAuditEntries)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(false)
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('audit-log-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_log',
        },
        (payload) => {
          const newEntry = payload.new as AuditEntry
          setAuditEntries((prev) => [newEntry, ...prev.slice(0, 9)])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'sop_approved_new': 'approved new SOP',
      'sop_submitted': 'submitted SOP',
      'change_control_issued': 'issued change control',
      'change_control_completed': 'completed change control',
      'cc_signature_added': 'signed change control',
      'cc_signature_waived': 'waived signature',
      'equipment_submitted': 'submitted equipment',
      'equipment_approved': 'approved equipment',
      'equipment_rejected': 'rejected equipment',
      'pm_task_completed': 'completed PM task',
      'pm_task_reassigned': 'reassigned PM task',
      'pm_task_marked_overdue': 'marked PM overdue',
    }
    return labels[action] || action
  }

  const getEntityLabel = (entityType: string) => {
    return entityType.replace('_', ' ')
  }

  const getComplianceColor = (value: number) => {
    if (value < 70) return "text-red-600 dark:text-red-400"
    if (value < 90) return "text-amber-600 dark:text-amber-400"
    return "text-green-600 dark:text-green-400"
  }

  const getDueSoonColor = (dueDate: string, status: string) => {
    if (status === 'overdue') return "text-red-600 dark:text-red-400"
    const due = new Date(dueDate)
    const today = new Date()
    const daysUntil = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntil <= 7) return "text-amber-600 dark:text-amber-400"
    return "text-green-600 dark:text-green-400"
  }

  return (
    <div className="px-6 py-2 space-y-6">
      {/* <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {profile.full_name}</p>
      </div> */}
      {/* Page Header */}
      <div className="flex items-start gap-3 border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FileText className="h-4 w-4" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {profile.full_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/library?status=active">
          <Card className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-300 cursor-pointer rounded-xl border-t-4 border-t-brand-blue shadow-soft hover:-translate-y-1 hover:shadow-lg rounded-b-none">
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">Active SOPs</div>
              <div className="mt-2">
                <NumberTicker
                  value={kpi.activeSops}
                  duration={0.6}
                  className="text-4xl font-bold text-slate-800 dark:text-slate-100"
                />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={profile.role === 'manager' || profile.is_admin ? "/approvals" : "/library"}>
          <Card className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-300 cursor-pointer rounded-xl border-t-4 border-t-brand-teal shadow-soft hover:-translate-y-1 hover:shadow-lg rounded-b-none">
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">Pending Approvals</div>
              <div className="mt-2">
                <NumberTicker
                  value={kpi.pendingApprovals}
                  duration={0.6}
                  className={`text-4xl font-bold ${kpi.pendingApprovals > 0
                    ? "text-brand-teal"
                    : "text-slate-400"
                    }`}
                />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/equipment">
          <Card className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-300 cursor-pointer rounded-xl border-t-4 border-t-blue-500 shadow-soft hover:-translate-y-1 hover:shadow-lg rounded-b-none">
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">PM Compliance</div>
              <div className="mt-2 flex items-baseline gap-1">
                <NumberTicker
                  value={kpi.pmCompliance}
                  duration={0.6}
                  className={`text-4xl font-bold ${getComplianceColor(kpi.pmCompliance)}`}
                />
                <span className={`text-xl font-bold ${getComplianceColor(kpi.pmCompliance)}`}>%</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/library?filter=due">
          <Card className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-300 cursor-pointer rounded-xl border-t-4 border-t-amber-500 shadow-soft hover:-translate-y-1 hover:shadow-lg rounded-b-none">
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">Due For Revision</div>
              <div className="mt-2">
                <NumberTicker
                  value={kpi.sopsDueForRevision}
                  duration={0.6}
                  className={`text-4xl font-bold ${kpi.sopsDueForRevision > 0
                    ? "text-amber-600 dark:text-amber-500"
                    : "text-slate-400"
                    }`}
                />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">Upcoming PM Tasks</h2>
            {upcomingPmTasks.length > 0 ? (
              <div className="space-y-1">
                {upcomingPmTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 group hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
                  >
                    <div>
                      <div className="font-medium text-slate-700 dark:text-slate-200">{task.equipment.name}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {task.equipment.asset_id}
                      </div>
                    </div>
                    <div className={`text-sm font-medium px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-800/50 ${getDueSoonColor(task.due_date, task.status)}`}>
                      {task.status === 'overdue' ? 'Overdue' : new Date(task.due_date).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">No upcoming PM tasks</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">Recent Activity</h2>
            {auditEntries.length > 0 ? (
              <div className="space-y-2">
                {auditEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-4 p-3 group hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
                  >
                    <div className="w-10 h-10 rounded-full bg-brand-navy flex items-center justify-center text-white overflow-hidden shadow-sm">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-semibold">{profile?.full_name?.substring(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm leading-tight mb-1">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{entry.actor?.full_name || 'Unknown'}</span>
                        <span className="text-slate-500 dark:text-slate-400 ml-1.5">{getActionLabel(entry.action)}</span>
                      </div>
                      <div className="max-w-[80%] text-xs font-medium text-brand-teal truncate">
                        {getEntityLabel(entry.entity_type)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
