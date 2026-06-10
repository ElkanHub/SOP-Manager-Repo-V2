import { redirect } from "next/navigation"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import type { ExistingSopOption } from "@/components/approvals/sop-upload-modal"
import { Profile, Department } from "@/types/app.types"
import { LibraryPageClient } from "./library-client"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function LibraryPage({ searchParams }: PageProps) {
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
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile || !profile.onboarding_complete) {
    redirect("/onboarding")
  }

  const params = await searchParams
  const statusFilter = params.status

  const { data: isQaManager } = await serviceClient.rpc('is_qa_manager', { user_id: user.id })

  const { data: departments } = await serviceClient
    .from("departments")
    .select("*")
    .order("name")

  const isManager = profile.role === "manager" || profile.role === "employee" || profile.is_admin

  // Fetch active SOPs for the "Update Existing" dropdown in the upload modal
  let existingSopsQuery = supabase
    .from('sops')
    .select('id, sop_number, title, department, status, locked, departments(colour, code)')
    .in('status', ['active', 'draft'])
    .order('sop_number')

  // Non-admin managers only see their own department SOPs
  if (!profile.is_admin && !isQaManager) {
    existingSopsQuery = existingSopsQuery.eq('department', profile.department)
  }

  const { data: existingSops } = await existingSopsQuery

  return (
    <LibraryPageClient
      profile={profile as Profile}
      departments={(departments as Department[]) || []}
      existingSops={(existingSops as ExistingSopOption[]) || []}
      isManager={isManager}
      isAdmin={profile.is_admin || false}
      isQa={isQaManager || false}
      statusFilter={statusFilter}
    />
  )
}
