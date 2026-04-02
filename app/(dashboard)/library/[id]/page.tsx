import { redirect } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/server"
import { SopViewerLazy as SopViewer } from "@/components/library/sop-viewer-lazy"
import { AcknowledgeButton } from "@/components/library/acknowledge-button"
import { StatusBadge } from "@/components/ui/status-badge"
import { DeptBadge } from "@/components/ui/dept-badge"
import { Button } from "@/components/ui/button"
import { PenLine, Lock, Eye } from "lucide-react"
import { SopVersion } from "@/types/app.types"
import VersionHistorySheetButton from "@/components/library/version-history-button"

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
    <div className="flex flex-col h-full">
      {sop.status === 'pending_cc' && activeChangeControlId && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
            <Lock className="h-4 w-4" />
            This SOP is currently locked under an active Change Control process.
          </div>
          <Link href={`/change-control/${activeChangeControlId}`}>
            <Button size="sm" variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-100 bg-white">
              View Change Control
            </Button>
          </Link>
        </div>
      )}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-sm">
              {sop.sop_number}
            </span>
            <h1 className="text-xl font-bold text-foreground">{sop.title}</h1>
            <DeptBadge department={sop.department} colour={sop.departments?.colour} />
            <span className="font-mono text-xs text-muted-foreground">{sop.version}</span>
            <StatusBadge status={sop.status} />
          </div>

          <div className="flex items-center gap-2">
            {isOwnDept && sop.status === "active" && (
              <>
                <AcknowledgeButton
                  sopId={sop.id}
                  sopVersion={sop.version}
                  hasAcknowledged={!!acknowledgement}
                  acknowledgedAt={acknowledgement?.acknowledged_at}
                />
                {isManager && !isLocked && (
                  <Button variant="secondary" size="sm">
                    <PenLine className="h-4 w-4 mr-2" />
                    Submit Edit
                  </Button>
                )}
                {isManager && isLocked && (
                  <div className="flex items-center gap-2 border border-amber-400 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md text-xs">
                    <Lock className="h-3 w-3" />
                    Change Control in Progress — Editing Locked
                  </div>
                )}
              </>
            )}
            {isCrossDept && (
              <div className="flex items-center gap-2 border border-brand-teal text-brand-teal bg-teal-50 px-3 py-1.5 rounded-md text-xs">
                <Eye className="h-3 w-3" />
                Read only — from {sop.department}
              </div>
            )}
            <VersionHistorySheetButton
              versions={(versions as SopVersion[]) || []}
              currentVersion={sop.version}
            />
          </div>
        </div>

        <div className="flex gap-6 mt-3 flex-wrap text-xs text-muted-foreground">
          {sop.date_listed && (
            <div className="flex items-center gap-1.5">
              <span>Date Listed:</span>
              <span className="text-foreground">
                {format(new Date(sop.date_listed), "dd MMM yyyy")}
              </span>
            </div>
          )}
          {sop.date_revised && (
            <div className="flex items-center gap-1.5">
              <span>Last Revised:</span>
              <span className="text-foreground">
                {format(new Date(sop.date_revised), "dd MMM yyyy")}
              </span>
            </div>
          )}
          {sop.due_for_revision && (
            <div className="flex items-center gap-1.5">
              <span>Due for Revision:</span>
              <span className="text-foreground">
                {format(new Date(sop.due_for_revision), "dd MMM yyyy")}
              </span>
            </div>
          )}
          {approverProfile && (
            <div className="flex items-center gap-1.5">
              <span>Approved By:</span>
              <span className="text-slate-700">{approverProfile.full_name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-12 py-8 bg-card flex flex-col">
        {signedFileUrl ? (
          <SopViewer fileUrl={signedFileUrl} className="max-w-4xl mx-auto flex-1 h-full min-h-[850px]" />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            No document available
          </div>
        )}
      </div>
    </div>
  )
}
