import { redirect } from "next/navigation"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { SopBuilderIntake } from "@/components/sop-builder/sop-builder-intake"

export default async function NewSopBuilderPage() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) redirect("/login")

  const service = await createServiceClient()
  const { data: profile } = await service
    .from("profiles")
    .select("is_active, is_admin, role, department")
    .eq("id", user.id)
    .single()
  const { data: isQa } = await service.rpc("is_qa_manager", { user_id: user.id })

  if (!profile?.is_active || (!profile.is_admin && profile.role !== "manager" && !isQa)) {
    redirect("/dashboard")
  }

  const [{ data: departments }, { data: templates }] = await Promise.all([
    service.from("departments").select("name").order("name", { ascending: true }),
    service.from("sop_builder_templates").select("id, name, is_default").eq("status", "active").order("is_default", { ascending: false }),
  ])

  return (
    <SopBuilderIntake
      departments={(departments || []).map((department) => department.name)}
      templates={templates || []}
      defaultDepartment={profile.department || null}
    />
  )
}

