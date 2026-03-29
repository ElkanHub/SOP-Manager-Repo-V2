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

  const todayObj = new Date()
  const today = todayObj.toISOString().split('T')[0]
  const thirtyDaysFromNow = addDays(todayObj, 30).toISOString().split('T')[0]
  const thirtyDaysAgo = subDays(todayObj, 30).toISOString()
  const sevenDaysAgo = subDays(todayObj, 7).toISOString()
  const startOfMonth = new Date(todayObj.getFullYear(), todayObj.getMonth(), 1).toISOString()

  let activeSopsCount = 0
  let pendingApprovalsCount = 0
  let sopsDueForRevisionCount = 0

  if (profile.role === 'manager' || profile.is_admin || profile.department === 'QA') {
    const { count: sops } = await serviceClient
      .from('sops')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    activeSopsCount = sops || 0

    const { count: approvals } = await serviceClient
      .from('sop_approval_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    pendingApprovalsCount = approvals || 0

    const { count: revisions } = await serviceClient
      .from('sops')
      .select('*', { count: 'exact', head: true })
      .lte('due_for_revision', thirtyDaysFromNow)
      .gte('due_for_revision', today)

    sopsDueForRevisionCount = revisions || 0
  } else {
    const { count: sops } = await serviceClient
      .from('sops')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .or(`department.eq.${profile.department},secondary_departments.cs.{${profile.department}}`)

    activeSopsCount = sops || 0

    const { count: approvals } = await serviceClient
      .from('sop_approval_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('submitted_by', user.id)

    pendingApprovalsCount = approvals || 0

    const { count: revisions } = await serviceClient
      .from('sops')
      .select('*', { count: 'exact', head: true })
      .eq('department', profile.department)
      .lte('due_for_revision', thirtyDaysFromNow)
      .gte('due_for_revision', today)

    sopsDueForRevisionCount = revisions || 0
  }

  const { data: pmCompliance } = await serviceClient.rpc('get_pm_compliance', {
    p_dept: profile.department
  })

  // Mock previous month compliance for trend (since we don't have historical compliance snapshot table yet)
  const prevPmCompliance = pmCompliance ? Math.max(0, pmCompliance - Math.floor(Math.random() * 10)) : 0

  // 1. Status Strip Data
  // Active users in last 15 mins
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60000).toISOString()
  const { count: usersOnline } = await serviceClient
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('last_sign_in_at', fifteenMinsAgo) // fallback to total active if this doesn't work well

  // SOPs updated this week
  const { count: sopsUpdatedThisWeek } = await serviceClient
    .from('sops')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .gte('updated_at', sevenDaysAgo)

  // PM Tasks completed this month
  const { count: pmCompletedThisMonth } = await serviceClient
    .from('pm_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')
    .gte('completed_at', startOfMonth)

  // Open change controls count
  const { count: openChangeControlsCount } = await serviceClient
    .from('change_controls')
    .select('*', { count: 'exact', head: true })
    .in('status', ['pending', 'in_progress'])

  // 2. KPI Trends
  // Active SOPs added this month (for "+N this month" trend)
  const { count: sopsAddedThisMonth } = await serviceClient
    .from('sops')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .gte('created_at', thirtyDaysAgo)

  // Oldest Pending Approval
  const { data: oldestApproval } = await serviceClient
    .from('sop_approval_requests')
    .select('created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  
  const oldestApprovalDate = oldestApproval?.created_at || null

  // Next SOP due for revision
  const { data: nextRevision } = await serviceClient
    .from('sops')
    .select('due_for_revision')
    .gte('due_for_revision', today)
    .order('due_for_revision', { ascending: true })
    .limit(1)
    .single()

  const nextRevisionDate = nextRevision?.due_for_revision || null

  // 3. Compliance Health
  // Acknowledgement rate (mock calculations based on actual tables to simulate executive view)
  const { count: totalActiveSopsForHealth } = await serviceClient
    .from('sops')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    
  const { count: totalOverdueRevisions } = await serviceClient
    .from('sops')
    .select('*', { count: 'exact', head: true })
    .lt('due_for_revision', today)

  const isPrivileged = profile.is_admin || profile.role === 'manager'

  // 4. Department Overview (Admin/Manager only)
  let departmentStats: any[] = []
  if (isPrivileged) {
    const { data: depts } = await serviceClient.from('departments').select('name')
    if (depts) {
      // Just fetching raw counts for the demo - normally this would be a custom RPC
      for (const d of depts) {
        if (profile.role === 'manager' && d.name !== profile.department) continue
        
        const { count: activeSops } = await serviceClient
          .from('sops')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .eq('department', d.name)
          
        const { data: deptPmCompliance } = await serviceClient.rpc('get_pm_compliance', {
          p_dept: d.name
        })

        departmentStats.push({
          name: d.name,
          activeSops: activeSops || 0,
          pmCompliance: deptPmCompliance || 100,
          pendingAcks: Math.floor(Math.random() * 15), // Mock until ack mapping is perfected
          openCCs: Math.floor(Math.random() * 3) // Mock for visual layout
        })
      }
    }
  }

  // Audit log — scoped to user's own department activity for employees
  let auditQuery = serviceClient
    .from('audit_log')
    .select('*, actor:profiles!actor_id(full_name, department, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(20)

  if (!isPrivileged) {
    auditQuery = auditQuery.eq('actor.department', profile.department)
  }


  const { data: auditEntries } = await auditQuery

  // Upcoming PM tasks — richer query
  let pmQuery = serviceClient
    .from('pm_tasks')
    .select(`
      id,
      due_date,
      status,
      equipment:equipment_id(name, asset_id, department, secondary_departments, frequency),
      assignee:profiles!assignee_id(full_name, avatar_url)
    `)
    .in('status', ['pending', 'overdue'])
    .order('status', { ascending: false }) // overdue first
    .order('due_date', { ascending: true })
    .limit(5)

  if (!isPrivileged) {
    pmQuery = pmQuery.or(
      `equipment.department.eq.${profile.department},equipment.secondary_departments.cs.{${profile.department}}`
    )
  }

  const { data: upcomingPmTasks } = await pmQuery

  // Change Controls Tracker (Admin/Manager) - fetches ALL open CCs, not just pending signatures
  let openChangeControls: any[] = []
  if (isPrivileged) {
    let ccQuery = serviceClient
      .from('change_controls')
      .select(`
        id, 
        new_version, 
        created_at, 
        status,
        required_signatories, 
        sops(title, department),
        signature_certificates(user_id)
      `)
      .in('status', ['pending', 'in_progress'])
      .order('created_at', { ascending: false })

    if (profile.role === 'manager' && !profile.is_admin) {
        ccQuery = ccQuery.eq('sops.department', profile.department)
    }
    
    const { data: ccs } = await ccQuery
    openChangeControls = ccs || []
  }

  return (
    <DashboardClient
      profile={profile as Profile}
      kpiData={{
        activeSops: activeSopsCount,
        pendingApprovals: pendingApprovalsCount,
        pmCompliance: pmCompliance || 0,
        sopsDueForRevision: sopsDueForRevisionCount,
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
      openChangeControls={openChangeControls}
    />
  )
}
