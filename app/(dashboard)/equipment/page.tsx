import { redirect } from "next/navigation"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { AddEquipmentModal } from "@/components/equipment/add-equipment-modal"
import { EquipmentPageClient } from "./equipment-client"
import { Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Department, Profile } from "@/types/app.types"
import { getCapabilities } from "@/lib/utils/permissions"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function EquipmentPage({ searchParams }: PageProps) {
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

  const params = await searchParams
  const statusFilter = params.status

  const { data: departments } = await serviceClient
    .from("departments")
    .select("*")
    .order("name")

  const { data: allProfiles } = await serviceClient
    .from("profiles")
    .select("id, full_name, department, role, is_active")
    .eq("is_active", true)
    .order("full_name")

  // Equipment management (add / pending-QA + inactive filters) is available to
  // managers, admins, and ALL Engineering-department members regardless of role.
  const canManage = getCapabilities(profile as Profile).canManageEquipment

  // Fetch active SOPs for the linked SOP dropdown in the add equipment modal
  const { data: availableSops } = await supabase
    .from('sops')
    .select('id, sop_number, title')
    .eq('status', 'active')
    .order('sop_number')

  return (
    <EquipmentPageClient
      profile={profile as Profile}
      departments={(departments as Department[]) || []}
      assignableUsers={allProfiles || []}
      availableSops={availableSops || []}
      canManage={canManage}
      isAdmin={profile.is_admin || false}
      statusFilter={statusFilter}
    />
  )
}
