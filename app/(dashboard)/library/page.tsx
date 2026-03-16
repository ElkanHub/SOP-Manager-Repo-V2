import { redirect } from "next/navigation"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { SopLibraryTable } from "@/components/library/sop-library-table"
import { SopTabStrip } from "@/components/library/sop-tab-strip"
import { SopUploadModal } from "@/components/approvals/sop-upload-modal"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SopRecord, Profile, Department } from "@/types/app.types"
import { LibraryPageClient } from "./library-client"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function LibraryPage({ searchParams }: PageProps) {
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
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile || !profile.onboarding_complete) {
    redirect("/onboarding")
  }

  const params = await searchParams
  const statusFilter = params.status

  let query = supabase
    .from("sops")
    .select("*, departments(colour)")
    .order("created_at", { ascending: false })

  if (profile.role === "employee") {
    query = query.eq("status", "active")
  } else if (statusFilter) {
    query = query.eq("status", statusFilter)
  } else if (!profile.is_admin) {
    query = query.in("status", ["draft", "pending_qa", "pending_cc", "active"])
  }

  if (!profile.is_admin && profile.department !== "QA") {
    query = query.or(
      `department.eq.${profile.department},secondary_departments.cs.{${profile.department}}`
    )
  }

  const { data: sops, error } = await query

  if (error) {
    console.error("Error fetching SOPs:", error)
  }

  const { data: departments } = await serviceClient
    .from("departments")
    .select("*")
    .order("name")

  const isManager = profile.role === "manager"

  return (
    <LibraryPageClient
      sops={(sops as SopRecord[]) || []}
      profile={profile as Profile}
      departments={(departments as Department[]) || []}
      isManager={isManager}
      statusFilter={statusFilter}
    />
  )
}
