import { redirect } from "next/navigation"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { SopMasterIndexClient } from "@/components/library/sop-master-index-client"
import { SopRecord } from "@/types/app.types"

export const dynamic = "force-dynamic"

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

  const { data: sops } = await serviceClient
    .from("sops")
    .select("*")
    .eq("status", "active")
    .order("document_level", { ascending: true })
    .order("department", { ascending: true })
    .order("sop_number", { ascending: true })

  const { data: departments } = await serviceClient
    .from("departments")
    .select("name")
    .order("name", { ascending: true })

  return (
    <SopMasterIndexClient
      sops={(sops as SopRecord[]) || []}
      departments={(departments || []).map((dept) => dept.name)}
    />
  )
}
