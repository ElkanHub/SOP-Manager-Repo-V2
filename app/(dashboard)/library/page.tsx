import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SopLibraryTable } from "@/components/library/sop-library-table"
import { SopTabStrip } from "@/components/library/sop-tab-strip"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SopRecord } from "@/types/app.types"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function LibraryPage({ searchParams }: PageProps) {
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

  const isManager = profile.role === "manager"

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-foreground">SOP Library</h1>
        {isManager && (
          <Button className="bg-brand-teal hover:bg-teal-600 text-white">
            <Upload className="h-4 w-4 mr-2" />
            Upload SOP
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <StatusFilterTab
          label="All"
          active={!statusFilter}
          href="/library"
        />
        <StatusFilterTab
          label="Active"
          active={statusFilter === "active"}
          href="/library?status=active"
        />
        {isManager && (
          <>
            <StatusFilterTab
              label="Draft"
              active={statusFilter === "draft"}
              href="/library?status=draft"
            />
            <StatusFilterTab
              label="Pending"
              active={statusFilter === "pending_qa"}
              href="/library?status=pending_qa"
            />
            <StatusFilterTab
              label="Pending CC"
              active={statusFilter === "pending_cc"}
              href="/library?status=pending_cc"
            />
          </>
        )}
      </div>

      <SopTabStrip />

      <SopLibraryTable
        sops={(sops as SopRecord[]) || []}
        userDepartment={profile.department}
        userRole={profile.role}
      />
    </div>
  )
}

function StatusFilterTab({
  label,
  active,
  href,
}: {
  label: string
  active: boolean
  href: string
}) {
  return (
    <a
      href={href}
      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
        active
          ? "bg-card shadow-sm border border-border text-brand-blue"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </a>
  )
}
