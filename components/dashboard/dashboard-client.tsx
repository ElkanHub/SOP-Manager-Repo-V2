"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { formatDistanceToNow, format, isPast, addDays } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { NumberTicker } from "@/components/ui/number-ticker"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Profile } from "@/types/app.types"
import { 
  FileText, 
  ClipboardCheck, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Upload,
  Wrench,
  Megaphone,
  BarChart3,
  Building2,
  ShieldCheck,
  ChevronRight,
  Activity
} from "lucide-react"
import { UserAvatar } from "@/components/user-avatar"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { usePresenceStore } from "@/store/presence-store"
import { RollingNumber } from "@/components/ui/rolling-number"

interface KpiData {
  activeSops: number
  pendingApprovals: number
  pmCompliance: number
  sopsDueForRevision: number
  sopsAddedThisMonth: number
  oldestApprovalDate: string | null
  prevPmCompliance: number
  nextRevisionDate: string | null
}

interface StatusStripData {
  usersOnline: number
  sopsUpdatedThisWeek: number
  pmCompletedThisMonth: number
  openChangeControls: number
}

interface ComplianceHealth {
  ackRate: number
  overdueRevisions: number
  totalActiveSops: number
}

interface DepartmentStats {
  name: string
  activeSops: number
  pmCompliance: number
  pendingAcks: number
  openCCs: number
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
    avatar_url?: string
  }
}

interface PmTask {
  id: string
  due_date: string
  status: string
  equipment: {
    name: string
    asset_id: string
    frequency?: string
  }
  assignee?: {
    full_name: string
    avatar_url?: string
  }
}

interface OpenCC {
  id: string
  new_version: string
  created_at: string
  status: string
  deadline?: string | null
  sops: { title: string; department: string }
  required_signatories: any[]
  signature_certificates: any[]
}

interface DashboardClientProps {
  profile: Profile
  isQa?: boolean
  kpiData: KpiData
  statusStripData: StatusStripData
  complianceHealth: ComplianceHealth
  departmentStats: DepartmentStats[]
  auditEntries: AuditEntry[]
  upcomingPmTasks: PmTask[]
  openChangeControls: OpenCC[]
}

export function DashboardClient({
  profile,
  isQa = false,
  kpiData,
  statusStripData,
  complianceHealth,
  departmentStats,
  auditEntries: initialAuditEntries,
  upcomingPmTasks,
  openChangeControls,
}: DashboardClientProps) {
  const supabase = createClient()
  const [kpi, setKpi] = useState(kpiData)
  const [auditEntries, setAuditEntries] = useState(initialAuditEntries)
  const [loading, setLoading] = useState(true)

  // Live presence: count online users from the shared Realtime channel.
  // QA managers + admins see the org-wide count; everyone else sees only
  // their own department. Until the first presence sync arrives we fall
  // back to the server-rendered value to avoid a flash of "0".
  const hasOrgWideOversight = profile.is_admin || (profile.department === 'QA' && profile.role === 'manager')
  const presenceSynced = usePresenceStore((s) => s.synced)
  const onlineUsers = usePresenceStore((s) => s.onlineUsers)
  const liveUsersOnline = hasOrgWideOversight
    ? onlineUsers.length
    : onlineUsers.filter((u) => u.department === profile.department).length
  const displayedUsersOnline = presenceSynced ? liveUsersOnline : statusStripData.usersOnline

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
      'sop_approved_new': 'approved a new SOP for distribution.',
      'sop_submitted': 'submitted an SOP for approval.',
      'sop_submitted_new': 'created a new SOP draft.',
      'sop_revision_submitted': 'submitted an SOP revision.',
      'sop_rejected': 'rejected an SOP submission.',
      'sop_archived': 'archived an obsolete SOP.',
      'change_control_issued': 'initiated a new Change Control.',
      'change_control_completed': 'closed out a Change Control.',
      'cc_signature_added': 'signed a Change Control document.',
      'cc_signature_waived': 'waived a required signature on a Change Control.',
      'equipment_submitted': 'registered new equipment.',
      'equipment_approved': 'approved new equipment for use.',
      'equipment_rejected': 'rejected an equipment registration.',
      'equipment_updated': 'updated equipment specifications.',
      'pm_task_completed': 'completed a scheduled PM task.',
      'pm_task_reassigned': 'reassigned a PM task to another technician.',
      'pm_task_marked_overdue': 'logged a PM task as overdue.',
      'user_login': 'logged into the system.',
      'pulse_notice_sent': 'broadcasted a company-wide notice.'
    }
    return labels[action] || `performed an action (${action}).`
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
    if (daysUntil <= 7) return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
    return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
  }

  const getUrgencyBorder = (dueDate: string, status: string) => {
    if (status === 'overdue') return "border-l-red-500"
    const due = new Date(dueDate)
    const today = new Date()
    const daysUntil = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntil <= 7) return "border-l-amber-500"
    return "border-l-green-500"
  }

  return (
    <div className="px-0 md:px-6 py-2 space-y-6">
      {/* <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {profile.full_name}</p>
      </div> */}
      {/* Page Header */}
      <div className="flex items-start gap-3 border-b border-border bg-card px-4 md:px-6 py-4 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FileText className="h-4 w-4" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {profile.full_name}</p>
        </div>
      </div>

      {/* Status Strip */}
      <div className="bg-slate-100 dark:bg-slate-800/50 border-y border-border px-4 md:px-6 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <RollingNumber
            value={displayedUsersOnline}
            className="text-slate-700 dark:text-slate-300"
          />{" "}
          Online Now
        </div>
        <div className="hidden sm:block w-px h-4 bg-slate-300 dark:bg-slate-700" />
        <div className="flex items-center gap-2">
          <Upload className="w-3.5 h-3.5" />
          <span className="text-slate-700 dark:text-slate-300">{statusStripData.sopsUpdatedThisWeek}</span> SOPs Updated This Week
        </div>
        <div className="hidden sm:block w-px h-4 bg-slate-300 dark:bg-slate-700" />
        <div className="flex items-center gap-2">
          <Wrench className="w-3.5 h-3.5" />
          <span className="text-slate-700 dark:text-slate-300">{statusStripData.pmCompletedThisMonth}</span> PMs Done This Month
        </div>
        <div className="hidden sm:block w-px h-4 bg-slate-300 dark:bg-slate-700" />
        <div className="flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          <span className="text-amber-600 dark:text-amber-500">{statusStripData.openChangeControls}</span> Open Change Controls
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4 md:px-0 mt-6">
        <Link href="/library?status=active">
          <Card className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-300 cursor-pointer rounded-xl border-t-4 border-t-brand-blue shadow-soft hover:-translate-y-1 hover:shadow-lg rounded-b-none group">
            <CardContent className="pt-6 px-4 md:px-6">
              <div className="flex justify-between items-start">
                  <div className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] md:text-xs">Active SOPs</div>
                  <FileText className="w-4 h-4 text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="mt-2">
                <NumberTicker
                  value={kpi.activeSops}
                  duration={0.6}
                  className="text-2xl md:text-4xl font-bold text-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-brand-teal">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+{kpi.sopsAddedThisMonth} this month</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={isQa ? "/approvals" : "/library"}>
          <Card className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-300 cursor-pointer rounded-xl border-t-4 border-t-brand-teal shadow-soft hover:-translate-y-1 hover:shadow-lg rounded-b-none group">
            <CardContent className="pt-6 px-4 md:px-6">
              <div className="flex justify-between items-start">
                  <div className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] md:text-xs">Pending Approvals</div>
                  <ClipboardCheck className="w-4 h-4 text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="mt-2">
                <NumberTicker
                  value={kpi.pendingApprovals}
                  duration={0.6}
                  className={`text-2xl md:text-4xl font-bold ${kpi.pendingApprovals > 0
                    ? "text-brand-teal"
                    : "text-slate-400"
                    }`}
                />
              </div>
              <div className={`mt-3 flex items-center gap-1.5 text-xs font-semibold ${kpi.pendingApprovals === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                {kpi.pendingApprovals === 0 ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>All clear</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    <span>Oldest: {kpi.oldestApprovalDate ? formatDistanceToNow(new Date(kpi.oldestApprovalDate), { addSuffix: true }) : 'N/A'}</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/equipment">
          <Card className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-300 cursor-pointer rounded-xl border-t-4 border-t-blue-500 shadow-soft hover:-translate-y-1 hover:shadow-lg rounded-b-none group">
            <CardContent className="pt-6 px-4 md:px-6">
              <div className="flex justify-between items-start">
                  <div className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] md:text-xs">PM Compliance</div>
                  <Wrench className="w-4 h-4 text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <NumberTicker
                  value={kpi.pmCompliance}
                  duration={0.6}
                  className={`text-2xl md:text-4xl font-bold ${getComplianceColor(kpi.pmCompliance)}`}
                />
                <span className={`text-lg md:text-xl font-bold ${getComplianceColor(kpi.pmCompliance)}`}>%</span>
              </div>
              <div className={`mt-3 flex items-center gap-1.5 text-xs font-semibold ${kpi.pmCompliance >= kpi.prevPmCompliance ? 'text-green-600' : 'text-amber-600'}`}>
                {kpi.pmCompliance >= kpi.prevPmCompliance ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>from {kpi.prevPmCompliance}% last month</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/library?filter=due">
          <Card className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-300 cursor-pointer rounded-xl border-t-4 border-t-amber-500 shadow-soft hover:-translate-y-1 hover:shadow-lg rounded-b-none group">
            <CardContent className="pt-6 px-4 md:px-6">
              <div className="flex justify-between items-start">
                  <div className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] md:text-xs">Due For Revision</div>
                  <AlertCircle className="w-4 h-4 text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="mt-2">
                <NumberTicker
                  value={kpi.sopsDueForRevision}
                  duration={0.6}
                  className={`text-2xl md:text-4xl font-bold ${kpi.sopsDueForRevision > 0
                    ? "text-amber-600 dark:text-amber-500"
                    : "text-slate-400"
                    }`}
                />
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                <span>Next due: {kpi.nextRevisionDate ? format(new Date(kpi.nextRevisionDate), 'dd MMM') : 'None'}</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Actions Bar */}
      <div className="px-4 md:px-0 mt-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-card border border-border/50 rounded-xl p-3 shadow-sm">
          <Link href="/library?upload=true" className="w-full">
            <Button variant="ghost" className="w-full justify-start h-auto py-3 px-4 hover:bg-brand-teal/5 hover:text-brand-teal group">
              <div className="flex items-center gap-3">
                <div className="bg-brand-teal/10 p-2 rounded-lg group-hover:bg-brand-teal group-hover:text-white transition-colors">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-semibold">Upload SOP</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">Submit new document</span>
                </div>
              </div>
            </Button>
          </Link>
          <Link href="/equipment?add=true" className="w-full">
            <Button variant="ghost" className="w-full justify-start h-auto py-3 px-4 hover:bg-blue-500/5 hover:text-blue-600 group">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/10 p-2 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <Wrench className="w-4 h-4" />
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-semibold">Add Equipment</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">Register new asset</span>
                </div>
              </div>
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            className="w-full justify-start h-auto py-3 px-4 hover:bg-amber-500/5 hover:text-amber-600 group"
            onClick={() => document.dispatchEvent(new CustomEvent('pulse-toggle'))}
          >
            <div className="flex items-center gap-3">
              <div className="bg-amber-500/10 p-2 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <Megaphone className="w-4 h-4" />
              </div>
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-semibold">Send Notice</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">Broadcast message</span>
              </div>
            </div>
          </Button>
          {(isQa || profile.is_admin) && (
            <Link href="/reports" className="w-full">
              <Button variant="ghost" className="w-full justify-start h-auto py-3 px-4 hover:bg-purple-500/5 hover:text-purple-600 group">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-500/10 p-2 rounded-lg group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-semibold">View Reports</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">Analytics & audits</span>
                  </div>
                </div>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Operations Row 1: Compliance Health & Department Overview (or CC Tracker) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4 md:px-0">
        
        {/* Compliance Health Card */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 lg:col-span-1">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-teal" />
              Compliance Health
            </CardTitle>
            <CardDescription className="text-xs">Overall organisational readiness</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Staff Acknowledgement</div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{complianceHealth.ackRate}%</div>
              </div>
              <Progress value={complianceHealth.ackRate} className="h-2" indicatorColor={complianceHealth.ackRate > 90 ? "bg-green-500" : "bg-amber-500"} />
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Target: 95% Completion</div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Document Currency</div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {complianceHealth.totalActiveSops - complianceHealth.overdueRevisions} / {complianceHealth.totalActiveSops}
                </div>
              </div>
              <Progress 
                value={complianceHealth.totalActiveSops ? ((complianceHealth.totalActiveSops - complianceHealth.overdueRevisions) / complianceHealth.totalActiveSops) * 100 : 100} 
                className="h-2" 
                indicatorColor={complianceHealth.overdueRevisions === 0 ? "bg-green-500" : "bg-red-500"} 
              />
              <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-widest">
                <span>Active SOPs within review lifecycle</span>
                {complianceHealth.overdueRevisions > 0 && <span className="text-red-500 font-bold">{complianceHealth.overdueRevisions} Overdue</span>}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">PM Completion (MTD)</div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{kpi.pmCompliance}%</div>
              </div>
              <Progress value={kpi.pmCompliance} className="h-2" indicatorColor={getComplianceColor(kpi.pmCompliance).replace('text-', 'bg-').split(' ')[0]} />
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Month-to-date schedule adherence</div>
            </div>

          </CardContent>
        </Card>

        {/* Change Controls Tracker */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 lg:col-span-2">
          <CardHeader className="pb-4 border-b border-border/50">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-amber-500" />
                  Active Change Controls
                </CardTitle>
                <CardDescription className="text-xs mt-1">Ongoing protocol modifications requiring signatures</CardDescription>
              </div>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 font-bold">
                {openChangeControls.length} Open
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {openChangeControls.length > 0 ? (
              <div className="space-y-4">
                {openChangeControls.slice(0, 3).map((cc) => {
                  const requiredCount = cc.required_signatories?.length || 0;
                  const signedCount = cc.signature_certificates?.length || 0;
                  const progressPct = requiredCount > 0 ? (signedCount / requiredCount) * 100 : 0;
                  const isActionRequired = !cc.signature_certificates?.some((c: any) => c.user_id === profile.id) && cc.required_signatories?.some((s: any) => s.user_id === profile.id);
                  const isOverdue = cc.deadline ? isPast(new Date(cc.deadline)) : false;
                  
                  return (
                    <div key={cc.id} className={`flex flex-col p-4 rounded-xl border ${isActionRequired ? 'border-amber-300 bg-amber-50/30 dark:border-amber-700/50 dark:bg-amber-900/10' : 'border-border bg-card'} gap-3 transition-colors hover:border-slate-300`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-sm text-foreground flex items-center gap-2">
                            {cc.sops?.title || 'Unknown Document'}
                            {isOverdue && <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 uppercase tracking-widest scale-90">SLA Breach</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 font-medium">Draft Version {cc.new_version} • <span className="uppercase tracking-widest text-[10px]">{cc.sops?.department}</span></div>
                        </div>
                        <Link href={`/change-control/${cc.id}`}>
                          <Button size="sm" variant={isActionRequired ? "default" : "outline"} className={`h-8 text-xs font-bold ${isActionRequired ? 'bg-amber-500 hover:bg-amber-600' : ''}`}>
                            {isActionRequired ? 'Sign Now' : 'View'}
                          </Button>
                        </Link>
                      </div>
                      
                      <div className="mt-1 space-y-1.5">
                        <div className="flex justify-between items-end text-xs font-semibold">
                          <span className="text-slate-600 dark:text-slate-400">Signature Routing Progress</span>
                          <span className="text-brand-navy dark:text-brand-teal">{signedCount} of {requiredCount} Signatures</span>
                        </div>
                        <Progress value={progressPct} className="h-1.5" indicatorColor={progressPct === 100 ? "bg-green-500" : "bg-brand-navy"} />
                      </div>
                    </div>
                  );
                })}
                {openChangeControls.length > 3 && (
                  <Button variant="ghost" className="w-full text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
                    View All {openChangeControls.length} Controls <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed border-border">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200">No Open Controls</h4>
                <p className="text-xs text-muted-foreground max-w-[250px] mt-1">All documentation changes have been fully executed.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Operations Row 2: Department Overview (Managers/Admins only) */}
      {(profile.role === 'manager' || profile.is_admin) && departmentStats.length > 0 && (
        <div className="px-4 md:px-0 mt-2">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
            <CardHeader className="pb-3 border-b border-border bg-slate-50/50 dark:bg-slate-900/20">
              <CardTitle className="text-sm flex items-center gap-2 font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">
                <Building2 className="w-4 h-4 text-brand-navy dark:text-brand-teal" />
                Departmental Output Matrix
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-border text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="px-6 py-3">Division</th>
                    <th className="px-6 py-3 text-center">Active SOPs</th>
                    <th className="px-6 py-3">PM Schedule Adherence</th>
                    <th className="px-6 py-3 text-center">Pending Acks</th>
                    <th className="px-6 py-3 text-center">Open CCs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {departmentStats.map((dept, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-3 font-semibold text-slate-800 dark:text-slate-200">{dept.name}</td>
                      <td className="px-6 py-3 text-center font-medium">{dept.activeSops}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <Progress value={dept.pmCompliance} className="h-2 w-24" indicatorColor={getComplianceColor(dept.pmCompliance).replace('text-', 'bg-').split(' ')[0]} />
                          <span className={`font-bold ${getComplianceColor(dept.pmCompliance)}`}>{dept.pmCompliance}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        {dept.pendingAcks > 0 ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">{dept.pendingAcks}</Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {dept.openCCs > 0 ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">{dept.openCCs}</Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Operations Row 3: PM Tasks & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4 md:px-0">
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 flex flex-col">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Wrench className="w-4 h-4 text-blue-500" />
                Upcoming Maintenance
              </CardTitle>
              <Link href="/equipment" className="text-xs font-bold text-brand-teal hover:underline uppercase tracking-wider">
                Full Schedule →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-4 flex-1 overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {upcomingPmTasks.length > 0 ? (
                <div className="space-y-3">
                  {upcomingPmTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between p-3.5 group hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-all border border-border/50 hover:shadow-md border-l-4 ${getUrgencyBorder(task.due_date, task.status)}`}
                    >
                      <div className="flex items-center gap-4">
                        {task.assignee ? (
                          <UserAvatar
                            user={task.assignee}
                            className="size-9 border-2 border-background shadow-sm"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-700">
                            <Users className="h-4 w-4 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            {task.equipment.name}
                            {task.equipment.frequency && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase font-semibold tracking-wider">
                                {task.equipment.frequency}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {task.equipment.asset_id} • {task.assignee?.full_name || 'Unassigned'}
                          </div>
                        </div>
                      </div>
                      <div className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-md border ${getDueSoonColor(task.due_date, task.status)}`}>
                        {task.status === 'overdue' ? 'Overdue' : new Date(task.due_date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <CheckCircle2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-500">No pending maintenance</p>
                  <p className="text-xs text-slate-400 mt-1">All equipment is currently up to date.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 dark:border-slate-800 flex flex-col">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Activity className="w-4 h-4 text-purple-500" />
              Live Audit Trail
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex-1 overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {auditEntries.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-[19px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="space-y-4 relative">
                    {auditEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-4 group"
                      >
                        <div className="relative z-10 shrink-0">
                          <UserAvatar
                            user={entry.actor}
                            size="lg"
                            className="border-2 border-background shadow-sm"
                          />
                        </div>
                        <div className="flex-1 min-w-0 bg-slate-50/50 dark:bg-slate-800/20 p-3 rounded-xl border border-transparent group-hover:border-slate-200 dark:group-hover:border-slate-700 transition-colors">
                          <div className="text-sm leading-snug">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{entry.actor?.full_name || 'System'}</span>
                            <span className="text-slate-600 dark:text-slate-400 ml-1.5">{getActionLabel(entry.action)}</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between">
                            <div className="text-xs font-semibold text-brand-teal max-w-[70%] truncate">
                              {getEntityLabel(entry.entity_type)}
                            </div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold flex shrink-0 ml-2">
                              {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-center py-12">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
