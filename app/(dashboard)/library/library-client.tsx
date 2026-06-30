"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { SopLibraryTable } from "@/components/library/sop-library-table"
import { SopTabStrip } from "@/components/library/sop-tab-strip"
import type { ExistingSopOption } from "@/components/approvals/sop-upload-modal"
import { Send, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Profile, Department } from "@/types/app.types"

interface LibraryPageClientProps {
  profile: Profile
  departments: Department[]
  existingSops: ExistingSopOption[]
  isManager: boolean
  isAdmin: boolean
  isQa: boolean
  statusFilter?: string
}

export function LibraryPageClient({
  profile,
  isManager,
  isAdmin,
  isQa,
  statusFilter,
}: LibraryPageClientProps) {
  const [activeStatus, setActiveStatus] = useState(statusFilter)

  useEffect(() => {
    const params = new URLSearchParams()
    if (activeStatus) params.set("status", activeStatus)
    const query = params.toString()
    window.history.replaceState(null, "", query ? `/library?${query}` : "/library")
  }, [activeStatus])

  return (
    <div className="p-0 md:p-6">
      {/* <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-foreground">SOP Library</h1>
        {isManager && (
          <Button 
            className="bg-brand-teal hover:bg-teal-600 text-white"
            onClick={() => setUploadModalOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload SOP
          </Button>
        )}
      </div> */}
      {/* Page Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 md:px-6 py-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="h-4 w-4" />
          </div>
          <h1 className="text-lg font-bold text-foreground">SOP Library</h1>
        </div>
        {isManager && (
          // One door: new SOPs and revisions both start at the unified intake, which
          // infers the request type. (Was a direct upload modal — removed to avoid a
          // second entry point.)
          <Button
            className="bg-brand-teal hover:bg-teal-600 text-white"
            render={<Link href="/intake" />}
          >
            <Send className="h-4 w-4 mr-2" />
            Start a Request
          </Button>
        )}
      </div>

      <div className="mt-6 space-y-3 mx-4 md:mx-0 mb-4">
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit overflow-x-auto no-scrollbar max-w-full">
        <StatusFilterTab
          label="All"
          active={!activeStatus}
          onClick={() => setActiveStatus(undefined)}
        />
        <StatusFilterTab
          label="Active"
          active={activeStatus === "active"}
          onClick={() => setActiveStatus("active")}
        />
        {isManager && (
          <>
            <StatusFilterTab
              label="Draft"
              active={activeStatus === "draft"}
              onClick={() => setActiveStatus("draft")}
            />
            <StatusFilterTab
              label="Pending"
              active={activeStatus === "pending_qa"}
              onClick={() => setActiveStatus("pending_qa")}
            />
            <StatusFilterTab
              label="HOD"
              active={activeStatus === "pending_hod"}
              onClick={() => setActiveStatus("pending_hod")}
            />
            <StatusFilterTab
              label="Training"
              active={activeStatus === "approved_pending_training"}
              onClick={() => setActiveStatus("approved_pending_training")}
            />
            <StatusFilterTab
              label="Pending CC"
              active={activeStatus === "pending_cc"}
              onClick={() => setActiveStatus("pending_cc")}
            />
          </>
        )}
        </div>
      </div>

      <div className="px-4 md:px-0">
        <SopTabStrip />

        <SopLibraryTable
          userDepartment={profile.department || ''}
          userRole={profile.role || 'employee'}
          isAdmin={isAdmin}
          isQa={isQa}
          statusFilter={activeStatus}
        />
      </div>
    </div>
  )
}

function StatusFilterTab({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${active
        ? "bg-background text-brand-blue shadow-sm border border-border/50"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
        }`}
    >
      {label}
    </button>
  )
}
