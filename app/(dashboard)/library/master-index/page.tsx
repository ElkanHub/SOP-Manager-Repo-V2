import { redirect } from "next/navigation"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { SopMasterIndexClient } from "@/components/library/sop-master-index-client"
import { SopRecord } from "@/types/app.types"

export const dynamic = "force-dynamic"

type MasterIndexSop = Partial<SopRecord> & {
  id: string
  sop_number: string
  title: string
  department: string
  version: string
  status: SopRecord["status"]
  created_at: string
  updated_at: string
}

function normalizeSop(row: MasterIndexSop): SopRecord {
  return {
    id: row.id,
    sop_number: row.sop_number,
    title: row.title,
    department: row.department,
    secondary_departments: row.secondary_departments || [],
    version: row.version,
    status: row.status,
    locked: row.locked || false,
    file_url: row.file_url,
    date_listed: row.date_listed,
    date_revised: row.date_revised,
    due_for_revision: row.due_for_revision,
    document_level: row.document_level || "level_2",
    approved_date: row.approved_date,
    effective_date: row.effective_date,
    revision_history: row.revision_history || [],
    reason_for_change: row.reason_for_change,
    training_required: row.training_required || false,
    training_deadline: row.training_deadline,
    retention_period_years: row.retention_period_years || 3,
    retention_expires_at: row.retention_expires_at,
    submitted_by: row.submitted_by,
    approved_by: row.approved_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export default async function SopMasterIndexPage() {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, onboarding_complete, is_active")
    .eq("id", user.id)
    .single()

  if (!profile?.is_active) {
    redirect("/login?reason=inactive")
  }

  if (!profile?.onboarding_complete) {
    redirect("/onboarding")
  }

  const masterIndexColumns = `
    id,
    sop_number,
    title,
    department,
    secondary_departments,
    version,
    status,
    locked,
    file_url,
    date_listed,
    date_revised,
    due_for_revision,
    document_level,
    approved_date,
    effective_date,
    revision_history,
    reason_for_change,
    training_required,
    training_deadline,
    retention_period_years,
    retention_expires_at,
    submitted_by,
    approved_by,
    created_at,
    updated_at
  `

  const extendedResult = await serviceClient
    .from("sops")
    .select(masterIndexColumns)
    .eq("status", "active")
    .order("document_level", { ascending: true })
    .order("department", { ascending: true })
    .order("sop_number", { ascending: true })

  let sops = extendedResult.data as MasterIndexSop[] | null
  let sopsError = extendedResult.error

  if (sopsError) {
    console.error("Master Index extended SOP query failed, falling back to legacy columns:", sopsError.message)
    const fallback = await serviceClient
      .from("sops")
      .select(`
        id,
        sop_number,
        title,
        department,
        secondary_departments,
        version,
        status,
        locked,
        file_url,
        date_listed,
        date_revised,
        due_for_revision,
        submitted_by,
        approved_by,
        created_at,
        updated_at
      `)
      .eq("status", "active")
      .order("department", { ascending: true })
      .order("sop_number", { ascending: true })

    sops = fallback.data
    sopsError = fallback.error
  }

  const { data: departments } = await serviceClient
    .from("departments")
    .select("name")
    .order("name", { ascending: true })

  const normalizedSops = ((sops as MasterIndexSop[]) || []).map(normalizeSop)
  const departmentNames = Array.from(new Set([
    ...((departments || []).map((dept) => dept.name)),
    ...normalizedSops.map((sop) => sop.department),
  ])).sort((a, b) => a.localeCompare(b))

  return (
    <SopMasterIndexClient
      sops={normalizedSops}
      departments={departmentNames}
      queryError={sopsError?.message || null}
    />
  )
}
