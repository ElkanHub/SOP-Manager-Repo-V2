import { redirect } from "next/navigation"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { EquipmentTable } from "@/components/equipment/equipment-table"
import { AddEquipmentModal } from "@/components/equipment/add-equipment-modal"
import { EquipmentPageClient } from "./equipment-client"
import { Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Department, Equipment, Profile } from "@/types/app.types"

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

  let query = supabase
    .from("equipment")
    .select("*, departments(colour), sops:linked_sop_id(id, title, sop_number)")
    .order("created_at", { ascending: false })

  if (profile.role === "employee") {
    query = query.eq("status", "active")
  } else if (statusFilter) {
    query = query.eq("status", statusFilter)
  } else if (!profile.is_admin) {
    query = query.in("status", ["pending_qa", "active", "inactive"])
  }

  if (!profile.is_admin && profile.department !== "QA") {
    query = query.or(
      `department.eq.${profile.department},secondary_departments.cs.{${profile.department}}`
    )
  }

  const { data: equipment, error } = await query

  if (error) {
    console.error("Error fetching equipment:", error)
  }

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
      equipment={(equipment as Equipment[]) || []}
      profile={profile as Profile}
      departments={(departments as Department[]) || []}
      assignableUsers={allProfiles || []}
      isManager={isManager}
      statusFilter={statusFilter}
    />
  )
}
