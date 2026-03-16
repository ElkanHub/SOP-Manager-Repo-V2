"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { NumberTicker } from "@/components/ui/number-ticker"
import { Card, CardContent } from "@/components/ui/card"
import { Profile } from "@/types/app.types"

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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {profile.full_name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/library?status=active">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer rounded-t-none">
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-muted-foreground">Active SOPs</div>
              <div className="mt-2">
                <NumberTicker 
                  value={kpi.activeSops} 
                  duration={0.6} 
                  className="text-3xl font-bold text-brand-blue" 
                />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={profile.role === 'manager' || profile.is_admin ? "/approvals" : "/library"}>
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer rounded-t-none">
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-muted-foreground">Pending Approvals</div>
              <div className="mt-2">
                <NumberTicker 
                  value={kpi.pendingApprovals} 
                  duration={0.6} 
                  className={`text-3xl font-bold ${
                    kpi.pendingApprovals > 0 
                      ? "text-red-600 dark:text-red-400" 
                      : "text-green-600 dark:text-green-400"
                  }`} 
                />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/equipment">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer rounded-t-none">
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-muted-foreground">PM Compliance</div>
              <div className="mt-2">
                <NumberTicker 
                  value={kpi.pmCompliance} 
                  duration={0.6} 
                  className={`text-3xl font-bold ${getComplianceColor(kpi.pmCompliance)}`} 
                />
                <span className="text-lg font-bold">%</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/library?filter=due">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer rounded-t-none">
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-muted-foreground">SOPs Due for Revision</div>
              <div className="mt-2">
                <NumberTicker 
                  value={kpi.sopsDueForRevision} 
                  duration={0.6} 
                  className={`text-3xl font-bold ${
                    kpi.sopsDueForRevision > 0 
                      ? "text-amber-600 dark:text-amber-400" 
                      : "text-green-600 dark:text-green-400"
                  }`} 
                />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">Upcoming PM Tasks</h2>
            {upcomingPmTasks.length > 0 ? (
              <div className="space-y-3">
                {upcomingPmTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{task.equipment.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {task.equipment.asset_id}
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${getDueSoonColor(task.due_date, task.status)}`}>
                      {task.status === 'overdue' ? 'Overdue' : new Date(task.due_date).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No upcoming PM tasks</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            {auditEntries.length > 0 ? (
              <div className="space-y-3">
                {auditEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-brand-navy flex items-center justify-center text-white text-xs font-medium">
                      {entry.actor?.full_name?.substring(0, 2).toUpperCase() || '??'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <span className="font-medium">{entry.actor?.full_name || 'Unknown'}</span>
                        {' '}
                        <span className="text-muted-foreground">{getActionLabel(entry.action)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getEntityLabel(entry.entity_type)}
                        {' • '}
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
