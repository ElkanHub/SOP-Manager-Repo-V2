import { redirect } from "next/navigation"
import { addDays, subDays } from "date-fns"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { DashboardClient } from "@/components/dashboard/dashboard-client"
import { Profile } from "@/types/app.types"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile || !profile.onboarding_complete) {
    redirect("/onboarding")
  }

  const { data: isQa } = await serviceClient.rpc('is_qa_manager', { user_id: user.id })

  const todayObj = new Date()
  const today = todayObj.toISOString().split('T')[0]
  const thirtyDaysFromNow = addDays(todayObj, 30).toISOString().split('T')[0]
  const thirtyDaysAgo = subDays(todayObj, 30).toISOString()
  const sevenDaysAgo = subDays(todayObj, 7).toISOString()
  const startOfMonth = new Date(todayObj.getFullYear(), todayObj.getMonth(), 1).toISOString()
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60000).toISOString()

  // Define roles explicitly
  const hasOrgWideOversight = profile.is_admin || (profile.department === 'QA' && profile.role === 'manager')

  // Helpers to apply department scope
  const applyDeptScope = (query: any, column: string = 'department') => {
    if (!hasOrgWideOversight) {
      return query.eq(column, profile.department)
    }
    return query
  }

  const applyCrossDeptScope = (query: any, prefix: string = '') => {
    if (!hasOrgWideOversight) {
      const field = prefix ? `${prefix}.department` : 'department'
      const secField = prefix ? `${prefix}.secondary_departments` : 'secondary_departments'
      return query.or(`${field}.eq.${profile.department},${secField}.cs.{${profile.department}}`)
    }
    return query
  }

  /* --------------------------------------------------------------------------
   * 1. Core KPIs
   * -------------------------------------------------------------------------- */
  // Active SOPs
  let activeSopsQuery = serviceClient.from('sops').select('*', { count: 'exact', head: true }).eq('status', 'active')
  activeSopsQuery = applyCrossDeptScope(activeSopsQuery)
  const { count: activeSopsCount } = await activeSopsQuery
  
  // Pending Approvals
  let pendingApprovalsQuery = serviceClient.from('sop_approval_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
  if (!hasOrgWideOversight) {
    pendingApprovalsQuery = pendingApprovalsQuery.eq('submitted_by', user.id)
  }
  const { count: pendingApprovalsCount } = await pendingApprovalsQuery

  // SOPs Due for Revision
  let revisionsQuery = serviceClient.from('sops').select('*', { count: 'exact', head: true }).lte('due_for_revision', thirtyDaysFromNow).gte('due_for_revision', today)
  revisionsQuery = applyDeptScope(revisionsQuery)
  const { count: sopsDueForRevisionCount } = await revisionsQuery

  // PM Compliance (Calculated manually to support org-wide overview without modifying RPC immediately)
  let pmTasksQuery = serviceClient.from('pm_tasks').select('status, equipment!inner(department)').gte('due_date', startOfMonth)
  if (!hasOrgWideOversight) {
    pmTasksQuery = pmTasksQuery.eq('equipment.department', profile.department)
  }
  const { data: monthPmTasks } = await pmTasksQuery
  let pmCompliance = 100
  if (monthPmTasks && monthPmTasks.length > 0) {
    const completed = monthPmTasks.filter(t => t.status === 'complete' || t.status === 'completed').length
    pmCompliance = Math.round((completed / monthPmTasks.length) * 1000) / 10
  }
  const prevPmCompliance = Math.max(0, pmCompliance - Math.floor(Math.random() * 10)) // Mock trend

  /* --------------------------------------------------------------------------
   * 2. Status Strip Data (Must be scoped!)
   * -------------------------------------------------------------------------- */
  // Active users in last 15 mins
  let usersQuery = serviceClient.from('profiles').select('*', { count: 'exact', head: true }).gte('last_sign_in_at', fifteenMinsAgo)
  usersQuery = applyDeptScope(usersQuery)
  const { count: usersOnline } = await usersQuery

  // SOPs updated this week
  let sopsUpdatedQuery = serviceClient.from('sops').select('*', { count: 'exact', head: true }).eq('status', 'active').gte('updated_at', sevenDaysAgo)
  sopsUpdatedQuery = applyCrossDeptScope(sopsUpdatedQuery)
  const { count: sopsUpdatedThisWeek } = await sopsUpdatedQuery

  // PM Tasks completed this month
  let pmCompletedQuery = serviceClient.from('pm_tasks').select('id, equipment!inner(department)', { count: 'exact' }).in('status', ['complete', 'completed']).gte('completed_at', startOfMonth)
  if (!hasOrgWideOversight) {
    pmCompletedQuery = pmCompletedQuery.eq('equipment.department', profile.department)
  }
  const { count: pmCompletedThisMonth } = await pmCompletedQuery

  // Open change controls count
  let openCCsCountQuery = serviceClient.from('change_controls').select('id, sops!inner(department)', { count: 'exact' }).in('status', ['pending', 'in_progress'])
  if (!hasOrgWideOversight) {
    openCCsCountQuery = openCCsCountQuery.eq('sops.department', profile.department)
  }
  const { count: openChangeControlsCount } = await openCCsCountQuery

  /* --------------------------------------------------------------------------
   * 3. KPI Trends
   * -------------------------------------------------------------------------- */
  // Active SOPs added this month
  let sopsAddedQuery = serviceClient.from('sops').select('*', { count: 'exact', head: true }).eq('status', 'active').gte('created_at', thirtyDaysAgo)
  sopsAddedQuery = applyCrossDeptScope(sopsAddedQuery)
  const { count: sopsAddedThisMonth } = await sopsAddedQuery

  // Oldest Pending Approval
  let oldestApprovalQuery = serviceClient.from('sop_approval_requests').select('created_at').eq('status', 'pending').order('created_at', { ascending: true }).limit(1)
  if (!hasOrgWideOversight) {
    oldestApprovalQuery = oldestApprovalQuery.eq('submitted_by', user.id)
  }
  const { data: oldestApproval } = await oldestApprovalQuery.single()
  const oldestApprovalDate = oldestApproval?.created_at || null

  // Next SOP due for revision
  let nextRevisionQuery = serviceClient.from('sops').select('due_for_revision').gte('due_for_revision', today).order('due_for_revision', { ascending: true }).limit(1)
  nextRevisionQuery = applyDeptScope(nextRevisionQuery)
  const { data: nextRevision } = await nextRevisionQuery.single()
  const nextRevisionDate = nextRevision?.due_for_revision || null

  /* --------------------------------------------------------------------------
   * 4. Compliance Health
   * -------------------------------------------------------------------------- */
  let healthActiveSopsQuery = serviceClient.from('sops').select('*', { count: 'exact', head: true }).eq('status', 'active')
  healthActiveSopsQuery = applyDeptScope(healthActiveSopsQuery)
  const { count: totalActiveSopsForHealth } = await healthActiveSopsQuery
    
  let healthOverdueQuery = serviceClient.from('sops').select('*', { count: 'exact', head: true }).lt('due_for_revision', today)
  healthOverdueQuery = applyDeptScope(healthOverdueQuery)
  const { count: totalOverdueRevisions } = await healthOverdueQuery

  /* --------------------------------------------------------------------------
   * 5. Department Overview (Admin/QA Manager only)
   * -------------------------------------------------------------------------- */
  let departmentStats: any[] = []
  if (hasOrgWideOversight) {
    const { data: depts } = await serviceClient.from('departments').select('name')
    if (depts) {
      for (const d of depts) {
        const { count: activeSops } = await serviceClient.from('sops').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('department', d.name)
        const { data: deptPmCompliance } = await serviceClient.rpc('get_pm_compliance', { p_dept: d.name })
        departmentStats.push({
          name: d.name,
          activeSops: activeSops || 0,
          pmCompliance: deptPmCompliance || 100,
          pendingAcks: Math.floor(Math.random() * 15), 
          openCCs: Math.floor(Math.random() * 3) 
        })
      }
    }
  }

  /* --------------------------------------------------------------------------
   * 6. Lists and Feeds
   * -------------------------------------------------------------------------- */
  // Audit log
  let auditQuery = serviceClient.from('audit_log').select('*, actor:profiles!actor_id(full_name, department, avatar_url)').order('created_at', { ascending: false }).limit(20)
  if (!hasOrgWideOversight) {
    auditQuery = auditQuery.eq('actor.department', profile.department)
  }
  const { data: auditEntries } = await auditQuery

  // Upcoming PM tasks
  let pmQuery = serviceClient
    .from('pm_tasks')
    .select(`
      id, due_date, status,
      equipment:equipment_id(name, asset_id, department, secondary_departments, frequency),
      assignee:profiles!assigned_to(full_name, avatar_url)
    `)
    .in('status', ['pending', 'overdue'])
    .order('status', { ascending: false })
    .order('due_date', { ascending: true })
    .limit(20)
  pmQuery = applyCrossDeptScope(pmQuery, 'equipment')
  const { data: upcomingPmTasks } = await pmQuery

  // Change Controls Tracker
  let ccQuery = serviceClient
    .from('change_controls')
    .select(`
      id, new_version, created_at, status, required_signatories,
      sops(title, department),
      signature_certificates(user_id)
    `)
    .in('status', ['pending', 'in_progress'])
    .order('created_at', { ascending: false })
  if (!hasOrgWideOversight) {
    ccQuery = ccQuery.eq('sops.department', profile.department)
  }
  const { data: openChangeControlsResult } = await ccQuery
  const openChangeControls = openChangeControlsResult || []

  return (
    <DashboardClient
      profile={profile as Profile}
      isQa={isQa || false}
      kpiData={{
        activeSops: activeSopsCount || 0,
        pendingApprovals: pendingApprovalsCount || 0,
        pmCompliance: pmCompliance || 0,
        sopsDueForRevision: sopsDueForRevisionCount || 0,
        // New trend data
        sopsAddedThisMonth: sopsAddedThisMonth || 0,
        oldestApprovalDate,
        prevPmCompliance,
        nextRevisionDate,
      }}
      statusStripData={{
        usersOnline: usersOnline || 1, // fallback to 1 (self) if none
        sopsUpdatedThisWeek: sopsUpdatedThisWeek || 0,
        pmCompletedThisMonth: pmCompletedThisMonth || 0,
        openChangeControls: openChangeControlsCount || 0,
      }}
      complianceHealth={{
        ackRate: 94, // Mock until ack relation fully tested
        overdueRevisions: totalOverdueRevisions || 0,
        totalActiveSops: totalActiveSopsForHealth || 0,
      }}
      departmentStats={departmentStats}
      auditEntries={auditEntries || []}
      upcomingPmTasks={upcomingPmTasks as any[] || []}
      openChangeControls={openChangeControls as any[]}
    />
  )
}
