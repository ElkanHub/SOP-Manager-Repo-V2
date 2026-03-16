import { redirect } from "next/navigation"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { ReportsClient } from "@/components/reports/reports-client"
import { Profile } from "@/types/app.types"

export const dynamic = "force-dynamic"

export default async function ReportsPage() {
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
  const { data: isAdmin } = await serviceClient.rpc('is_admin', { user_id: user.id })

  const canAccessReports = isQa || isAdmin

  return (
    <ReportsClient
      profile={profile as Profile}
      isQa={isQa || false}
      isAdmin={isAdmin || false}
    />
  )
}
