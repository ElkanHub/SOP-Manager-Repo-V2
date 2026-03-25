import { redirect } from "next/navigation"
import { addDays } from "date-fns"
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

  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysFromNow = addDays(new Date(), 30).toISOString().split('T')[0]

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

  const isPrivileged = profile.is_admin || profile.role === 'manager'

  // Audit log — scoped to user's own department activity for employees
  let auditQuery = serviceClient
    .from('audit_log')
    .select('*, actor:profiles!actor_id(full_name, department, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(10)

  if (!isPrivileged) {
    // Show only entries from actors in the same department
    auditQuery = auditQuery.eq('actor.department', profile.department)
  }

  const { data: auditEntries } = await auditQuery

  // Upcoming PM tasks — scoped to department for employees
  let pmQuery = serviceClient
    .from('pm_tasks')
    .select(`
      id,
      due_date,
      status,
      equipment:equipment_id(name, asset_id, department, secondary_departments)
    `)
    .eq('status', 'pending')
    .order('due_date', { ascending: true })
    .limit(5)

  if (!isPrivileged) {
    pmQuery = pmQuery.or(
      `equipment.department.eq.${profile.department},equipment.secondary_departments.cs.{${profile.department}}`
    )
  }

  const { data: upcomingPmTasks } = await pmQuery

  // Fetch pending Change Controls requiring this user's signature
  let pendingChangeControls: any[] = []
  if (profile.role === 'manager') {
    const { data: ccs } = await serviceClient
      .from('change_controls')
      .select('id, new_version, created_at, required_signatories, sops(title, department)')
      .eq('status', 'pending')
      .contains('required_signatories', `[{"user_id": "${user.id}"}]`)
      
    if (ccs && ccs.length > 0) {
      const { data: certs } = await serviceClient
        .from('signature_certificates')
        .select('change_control_id')
        .eq('user_id', user.id)
        
      const signedCcIds = new Set(certs?.map(c => c.change_control_id) || [])
      
      pendingChangeControls = ccs.filter(cc => {
        if (signedCcIds.has(cc.id)) return false
        const sig = (cc.required_signatories as any[]).find((s: any) => s.user_id === user.id)
        if (sig?.waived) return false
        return true
      })
    }
  }

  return (
    <DashboardClient
      profile={profile as Profile}
      kpiData={{
        activeSops: activeSopsCount,
        pendingApprovals: pendingApprovalsCount,
        pmCompliance: pmCompliance || 0,
        sopsDueForRevision: sopsDueForRevisionCount,
      }}
      auditEntries={auditEntries || []}
      upcomingPmTasks={upcomingPmTasks as any[] || []}
      pendingChangeControls={pendingChangeControls}
    />
  )
}
