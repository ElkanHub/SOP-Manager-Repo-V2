import { redirect } from "next/navigation"
import { addDays, subDays, startOfMonth as dfStartOfMonth, endOfMonth as dfEndOfMonth, subMonths } from "date-fns"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { DashboardClient } from "@/components/dashboard/dashboard-client"
import { Profile } from "@/types/app.types"

export const dynamic = "force-dynamic"

// Canonical status enums (must match DB CHECK constraints)
// pm_tasks.status:        'pending' | 'complete' | 'overdue'
// change_controls.status: 'pending' | 'complete' | 'waived'
// sops.status:            'draft' | 'pending_qa' | 'active' | 'superseded' | 'pending_cc'
// sop_approval_requests:  'pending' | 'changes_requested' | 'approved' | 'rejected'

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
  const startOfMonth = dfStartOfMonth(todayObj).toISOString()
  const startOfMonthDate = dfStartOfMonth(todayObj).toISOString().split('T')[0]
  const startOfPrevMonthDate = dfStartOfMonth(subMonths(todayObj, 1)).toISOString().split('T')[0]
  const endOfPrevMonthDate = dfEndOfMonth(subMonths(todayObj, 1)).toISOString().split('T')[0]
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60000).toISOString()

  // QA managers + admins get organisation-wide visibility. Everyone else is
  // scoped to their own department (primary or cross-listed).
  const hasOrgWideOversight = profile.is_admin || (profile.department === 'QA' && profile.role === 'manager')
  const deptName: string | null = profile.department || null

  // ──────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────
  const applyDeptScope = (query: any, column: string = 'department') => {
    if (!hasOrgWideOversight && deptName) {
      return query.eq(column, deptName)
    }
    return query
  }

  // For tables that support cross-listed departments (sops, equipment)
  const applyCrossDeptScope = (query: any, prefix: string = '') => {
    if (!hasOrgWideOversight && deptName) {
      const field = prefix ? `${prefix}.department` : 'department'
      const secField = prefix ? `${prefix}.secondary_departments` : 'secondary_departments'
      return query.or(`${field}.eq.${deptName},${secField}.cs.{${deptName}}`)
    }
    return query
  }

  // PM compliance over an arbitrary date range for an optional department.
  // Mirrors the get_pm_compliance RPC but is flexible on the date range.
  const pmComplianceForRange = async (fromDate: string, toDate: string, dept?: string | null) => {
    let q = serviceClient
      .from('pm_tasks')
      .select('status, equipment!inner(department)')
      .gte('due_date', fromDate)
      .lte('due_date', toDate)
    if (dept) q = q.eq('equipment.department', dept)
    const { data } = await q
    if (!data || data.length === 0) return 100
    const completed = data.filter((t: any) => t.status === 'complete').length
    return Math.round((completed / data.length) * 1000) / 10
  }

  /* --------------------------------------------------------------------------
   * 1. Core KPIs
   * -------------------------------------------------------------------------- */
  // Active SOPs
  let activeSopsQuery = serviceClient.from('sops').select('*', { count: 'exact', head: true }).eq('status', 'active')
  activeSopsQuery = applyCrossDeptScope(activeSopsQuery)
  const { count: activeSopsCount } = await activeSopsQuery

  // Pending Approvals: QA/admin see every pending request org-wide;
  // everyone else only sees their own submissions awaiting action.
  let pendingApprovalsQuery = serviceClient
    .from('sop_approval_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
  if (!hasOrgWideOversight) {
    pendingApprovalsQuery = pendingApprovalsQuery.eq('submitted_by', user.id)
  }
  const { count: pendingApprovalsCount } = await pendingApprovalsQuery

  // SOPs Due for Revision (next 30 days)
  let revisionsQuery = serviceClient
    .from('sops')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .lte('due_for_revision', thirtyDaysFromNow)
    .gte('due_for_revision', today)
  revisionsQuery = applyDeptScope(revisionsQuery)
  const { count: sopsDueForRevisionCount } = await revisionsQuery

  // PM Compliance (month-to-date, scoped)
  const pmCompliance = await pmComplianceForRange(
    startOfMonthDate,
    today,
    hasOrgWideOversight ? null : deptName,
  )

  // Previous-month PM compliance for an honest trend comparison
  const prevPmCompliance = await pmComplianceForRange(
    startOfPrevMonthDate,
    endOfPrevMonthDate,
    hasOrgWideOversight ? null : deptName,
  )

  /* --------------------------------------------------------------------------
   * 2. Status Strip
   * -------------------------------------------------------------------------- */
  // "Systems Online" = distinct users with any audit activity in the last 15 min.
  // Uses audit_log as a proxy for presence since we don't have a live presence
  // table and profiles.last_sign_in_at doesn't exist.
  let recentActorIds: Set<string> = new Set()
  {
    let q = serviceClient.from('audit_log').select('actor_id').gte('created_at', fifteenMinsAgo)
    // Scope by department: only count actors whose profile is in this dept.
    if (!hasOrgWideOversight && deptName) {
      const { data: deptProfileIds } = await serviceClient
        .from('profiles')
        .select('id')
        .eq('department', deptName)
      const ids = (deptProfileIds || []).map(p => p.id)
      if (ids.length === 0) {
        // short-circuit: no one in this dept
      } else {
        q = q.in('actor_id', ids)
      }
    }
    const { data: recentActors } = await q
    recentActorIds = new Set((recentActors || []).map((r: any) => r.actor_id).filter(Boolean))
  }
  const usersOnline = recentActorIds.size

  // SOPs updated this week
  let sopsUpdatedQuery = serviceClient
    .from('sops')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .gte('updated_at', sevenDaysAgo)
  sopsUpdatedQuery = applyCrossDeptScope(sopsUpdatedQuery)
  const { count: sopsUpdatedThisWeek } = await sopsUpdatedQuery

  // PM Tasks completed this month
  let pmCompletedQuery = serviceClient
    .from('pm_tasks')
    .select('id, equipment!inner(department)', { count: 'exact', head: true })
    .eq('status', 'complete')
    .gte('completed_at', startOfMonth)
  if (!hasOrgWideOversight && deptName) {
    pmCompletedQuery = pmCompletedQuery.eq('equipment.department', deptName)
  }
  const { count: pmCompletedThisMonth } = await pmCompletedQuery

  // Open change controls (pending — the only "open" status per schema)
  let openCCsCountQuery = serviceClient
    .from('change_controls')
    .select('id, sops!inner(department)', { count: 'exact', head: true })
    .eq('status', 'pending')
  if (!hasOrgWideOversight && deptName) {
    openCCsCountQuery = openCCsCountQuery.eq('sops.department', deptName)
  }
  const { count: openChangeControlsCount } = await openCCsCountQuery

  /* --------------------------------------------------------------------------
   * 3. KPI Trends
   * -------------------------------------------------------------------------- */
  // Active SOPs added this month
  let sopsAddedQuery = serviceClient
    .from('sops')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .gte('created_at', thirtyDaysAgo)
  sopsAddedQuery = applyCrossDeptScope(sopsAddedQuery)
  const { count: sopsAddedThisMonth } = await sopsAddedQuery

  // Oldest Pending Approval (scoped the same way as the count above)
  let oldestApprovalQuery = serviceClient
    .from('sop_approval_requests')
    .select('created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
  if (!hasOrgWideOversight) {
    oldestApprovalQuery = oldestApprovalQuery.eq('submitted_by', user.id)
  }
  const { data: oldestApproval } = await oldestApprovalQuery.maybeSingle()
  const oldestApprovalDate = oldestApproval?.created_at || null

  // Next SOP due for revision (upcoming only)
  let nextRevisionQuery = serviceClient
    .from('sops')
    .select('due_for_revision')
    .eq('status', 'active')
    .gte('due_for_revision', today)
    .order('due_for_revision', { ascending: true })
    .limit(1)
  nextRevisionQuery = applyDeptScope(nextRevisionQuery)
  const { data: nextRevision } = await nextRevisionQuery.maybeSingle()
  const nextRevisionDate = nextRevision?.due_for_revision || null

  /* --------------------------------------------------------------------------
   * 4. Compliance Health
   * -------------------------------------------------------------------------- */
  let healthActiveSopsQuery = serviceClient
    .from('sops')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
  healthActiveSopsQuery = applyDeptScope(healthActiveSopsQuery)
  const { count: totalActiveSopsForHealth } = await healthActiveSopsQuery

  let healthOverdueQuery = serviceClient
    .from('sops')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .lt('due_for_revision', today)
  healthOverdueQuery = applyDeptScope(healthOverdueQuery)
  const { count: totalOverdueRevisions } = await healthOverdueQuery

  // Staff Acknowledgement rate (real, scoped).
  // Expected acks = sum over active SOPs in scope of (# active staff in that
  //                 SOP's primary department).
  // Actual acks   = count of sop_acknowledgements for the current live version
  //                 of each SOP, by users whose department matches the SOP's.
  let ackRate = 100
  {
    let sopsListQuery = serviceClient
      .from('sops')
      .select('id, version, department')
      .eq('status', 'active')
    sopsListQuery = applyDeptScope(sopsListQuery)
    const { data: activeSopsList } = await sopsListQuery

    // Count active staff per department (single roll-up query)
    const { data: activeStaff } = await serviceClient
      .from('profiles')
      .select('id, department')
      .eq('is_active', true)

    const staffCountByDept: Record<string, number> = {}
    const staffIdsByDept: Record<string, string[]> = {}
    for (const s of activeStaff || []) {
      if (!s.department) continue
      staffCountByDept[s.department] = (staffCountByDept[s.department] || 0) + 1
      if (!staffIdsByDept[s.department]) staffIdsByDept[s.department] = []
      staffIdsByDept[s.department].push(s.id)
    }

    let expected = 0
    let actual = 0
    for (const s of activeSopsList || []) {
      const staffIds = staffIdsByDept[s.department] || []
      const staffCount = staffCountByDept[s.department] || 0
      expected += staffCount
      if (staffIds.length === 0) continue
      const { count: ackCount } = await serviceClient
        .from('sop_acknowledgements')
        .select('*', { count: 'exact', head: true })
        .eq('sop_id', s.id)
        .eq('version', s.version)
        .in('user_id', staffIds)
      actual += ackCount || 0
    }
    ackRate = expected === 0 ? 100 : Math.round((actual / expected) * 1000) / 10
  }

  /* --------------------------------------------------------------------------
   * 5. Department Overview (Admin / QA manager only)
   * -------------------------------------------------------------------------- */
  let departmentStats: any[] = []
  if (hasOrgWideOversight) {
    const { data: depts } = await serviceClient.from('departments').select('name')

    const { data: allActiveStaff } = await serviceClient
      .from('profiles')
      .select('id, department')
      .eq('is_active', true)

    const staffByDept: Record<string, string[]> = {}
    for (const s of allActiveStaff || []) {
      if (!s.department) continue
      if (!staffByDept[s.department]) staffByDept[s.department] = []
      staffByDept[s.department].push(s.id)
    }

    for (const d of depts || []) {
      const staffIds = staffByDept[d.name] || []

      // Active SOPs (primary dept only — matches the "division owns the SOP" view)
      const { count: activeSops } = await serviceClient
        .from('sops')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('department', d.name)

      // PM compliance (uses existing RPC)
      const { data: deptPmCompliance } = await serviceClient.rpc('get_pm_compliance', { p_dept: d.name })

      // Open change controls for SOPs owned by this department
      const { count: openCCs } = await serviceClient
        .from('change_controls')
        .select('id, sops!inner(department)', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('sops.department', d.name)

      // Pending acknowledgements: for each active SOP owned by this dept,
      // how many of the dept's staff have NOT yet acked the current version.
      let pendingAcks = 0
      if (staffIds.length > 0) {
        const { data: deptSops } = await serviceClient
          .from('sops')
          .select('id, version')
          .eq('status', 'active')
          .eq('department', d.name)
        for (const s of deptSops || []) {
          const { count: ackCount } = await serviceClient
            .from('sop_acknowledgements')
            .select('*', { count: 'exact', head: true })
            .eq('sop_id', s.id)
            .eq('version', s.version)
            .in('user_id', staffIds)
          pendingAcks += Math.max(0, staffIds.length - (ackCount || 0))
        }
      }

      departmentStats.push({
        name: d.name,
        activeSops: activeSops || 0,
        pmCompliance: deptPmCompliance ?? 100,
        pendingAcks,
        openCCs: openCCs || 0,
      })
    }
  }

  /* --------------------------------------------------------------------------
   * 6. Lists and Feeds
   * -------------------------------------------------------------------------- */
  // Audit log — properly scoped. For non-oversight users, restrict actors to
  // members of their own department (and always include self).
  let scopedActorIds: string[] | null = null
  if (!hasOrgWideOversight && deptName) {
    const { data: deptProfiles } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('department', deptName)
    scopedActorIds = (deptProfiles || []).map(p => p.id)
    if (!scopedActorIds.includes(user.id)) scopedActorIds.push(user.id)
  }

  let auditQuery = serviceClient
    .from('audit_log')
    .select('*, actor:profiles!actor_id(full_name, department, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(20)
  if (scopedActorIds) {
    if (scopedActorIds.length === 0) {
      auditQuery = auditQuery.eq('actor_id', user.id) // guaranteed empty-safe filter
    } else {
      auditQuery = auditQuery.in('actor_id', scopedActorIds)
    }
  }
  const { data: auditEntries } = await auditQuery

  // Upcoming PM tasks
  let pmQuery = serviceClient
    .from('pm_tasks')
    .select(`
      id, due_date, status,
      equipment:equipment_id!inner(name, asset_id, department, secondary_departments, frequency),
      assignee:profiles!assigned_to(full_name, avatar_url)
    `)
    .in('status', ['pending', 'overdue'])
    .order('status', { ascending: false })
    .order('due_date', { ascending: true })
    .limit(20)
  if (!hasOrgWideOversight && deptName) {
    pmQuery = pmQuery.or(
      `department.eq.${deptName},secondary_departments.cs.{${deptName}}`,
      { foreignTable: 'equipment' },
    )
  }
  const { data: upcomingPmTasks } = await pmQuery

  // Change Controls Tracker
  let ccQuery = serviceClient
    .from('change_controls')
    .select(`
      id, new_version, created_at, status, deadline, required_signatories,
      sops!inner(title, department),
      signature_certificates(user_id)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (!hasOrgWideOversight && deptName) {
    ccQuery = ccQuery.eq('sops.department', deptName)
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
        sopsAddedThisMonth: sopsAddedThisMonth || 0,
        oldestApprovalDate,
        prevPmCompliance,
        nextRevisionDate,
      }}
      statusStripData={{
        usersOnline,
        sopsUpdatedThisWeek: sopsUpdatedThisWeek || 0,
        pmCompletedThisMonth: pmCompletedThisMonth || 0,
        openChangeControls: openChangeControlsCount || 0,
      }}
      complianceHealth={{
        ackRate,
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
