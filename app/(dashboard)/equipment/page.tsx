import { redirect } from "next/navigation"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { AddEquipmentModal } from "@/components/equipment/add-equipment-modal"
import { EquipmentPageClient } from "./equipment-client"
import { Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Department, Profile } from "@/types/app.types"

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

  const isManager = profile.role === "manager"

  return (
    <EquipmentPageClient
      profile={profile as Profile}
      departments={(departments as Department[]) || []}
      assignableUsers={allProfiles || []}
      isManager={isManager}
      isAdmin={profile.is_admin || false}
      statusFilter={statusFilter}
    />
  )
}
