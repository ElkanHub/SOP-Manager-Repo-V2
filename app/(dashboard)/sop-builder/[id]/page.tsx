import { notFound, redirect } from "next/navigation"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { SopBuilderWorkspace } from "@/components/sop-builder/sop-builder-workspace"

export default async function SopBuilderSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  const [{ data: session }, { data: drafts }, { data: messages }, { data: sessions }] = await Promise.all([
    service.from("sop_builder_sessions").select("*").eq("id", id).maybeSingle(),
    service.from("sop_builder_drafts").select("*").eq("session_id", id).order("version", { ascending: false }),
    service.from("sop_builder_messages").select("*").eq("session_id", id).order("created_at", { ascending: true }),
    service
      .from("sop_builder_sessions")
      .select("id, title, status, updated_at, active_draft_id")
      .eq("created_by", user.id)
      .order("updated_at", { ascending: false })
      .limit(60),
  ])

  if (!session) notFound()

  return (
    <SopBuilderWorkspace
      initialSession={session}
      initialDrafts={drafts || []}
      initialMessages={messages || []}
      sessions={sessions || []}
    />
  )
}

