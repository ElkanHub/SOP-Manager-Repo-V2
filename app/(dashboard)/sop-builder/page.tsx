import { redirect } from "next/navigation"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { SopBuilderHome } from "@/components/sop-builder/sop-builder-home"

export default async function SopBuilderPage() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) redirect("/login")

  const service = await createServiceClient()
  const { data: profile } = await service
    .from("profiles")
    .select("is_active, is_admin, role")
    .eq("id", user.id)
    .single()
  const { data: isQa } = await service.rpc("is_qa_manager", { user_id: user.id })

  if (!profile?.is_active || (!profile.is_admin && profile.role !== "manager" && !isQa)) {
    redirect("/dashboard")
  }

  const { data: sessions } = await service
    .from("sop_builder_sessions")
    .select(`
      *,
      active_draft:sop_builder_drafts!sop_builder_sessions_active_draft_fk(id, version, status, docx_path, created_at)
    `)
    .order("updated_at", { ascending: false })

  return <SopBuilderHome sessions={sessions || []} />
}

