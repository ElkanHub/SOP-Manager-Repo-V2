import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import LibraryViewClient from "./library-view-client"
import { Profile, SopVersion } from "@/types/app.types"

interface PageProps {
  params: Promise<{ id: string }>
}

export const dynamic = "force-dynamic"

export default async function SopViewerPage({ params }: PageProps) {
  const supabase = await createClient()

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

  const { id } = await params

  const { data: sop } = await supabase
    .from("sops")
    .select("*, departments(colour)")
    .eq("id", id)
    .single()

  if (!sop) {
    redirect("/library")
  }

  // Generate a secure, 1-hour signed URL via the Supabase Service Role.
  // This satisfies the requirement to keep the underlying storage bucket completely private,
  // while generating a temporary cryptographic token that Microsoft's Office Viewer can safely read remotely.
  let signedFileUrl: string | null = null
  if (sop.file_url) {
    const { createServiceClient: createSvc } = await import('@/lib/supabase/server')
    const svcClient = await createSvc()
    const { data: signed } = await svcClient.storage
      .from('documents')
      .createSignedUrl(sop.file_url, 3600)
    signedFileUrl = signed?.signedUrl ?? null
  }

  const isOwnDept =
    sop.department === profile.department ||
    (sop.secondary_departments || []).includes(profile.department || '')

  const { data: acknowledgement } = await supabase
    .from("sop_acknowledgements")
    .select("*")
    .eq("sop_id", id)
    .eq("user_id", user.id)
    .eq("version", sop.version)
    .maybeSingle()

  const { data: versions } = await supabase
    .from("sop_versions")
    .select("*")
    .eq("sop_id", id)
    .order("created_at", { ascending: false })

  const { data: approverProfile } = sop.approved_by
    ? await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", sop.approved_by)
      .single()
    : { data: null }

  const isManager = profile.role === "manager"
  const isCrossDept = !isOwnDept
  const isLocked = sop.locked

  let activeChangeControlId: string | null = null
  if (sop.status === 'pending_cc') {
    const { data: cc } = await supabase
      .from('change_controls')
      .select('id')
      .eq('sop_id', id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (cc) activeChangeControlId = cc.id
  }

  return (
    <LibraryViewClient
      sop={sop}
      profile={profile as Profile}
      acknowledgement={acknowledgement}
      versions={versions || []}
      approverProfile={approverProfile}
      signedFileUrl={signedFileUrl}
      activeChangeControlId={activeChangeControlId}
    />
  )
}
