"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { SopLibraryTable } from "@/components/library/sop-library-table"
import { SopTabStrip } from "@/components/library/sop-tab-strip"
import { SopUploadModal } from "@/components/approvals/sop-upload-modal"
import { Upload, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SopRecord, Profile, Department } from "@/types/app.types"

interface LibraryPageClientProps {
  sops: SopRecord[]
  profile: Profile
  departments: Department[]
  isManager: boolean
  statusFilter?: string
}

export function LibraryPageClient({
  sops,
  profile,
  departments,
  isManager,
  statusFilter,
}: LibraryPageClientProps) {
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  return (
    <div className="p-6">
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
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="h-4 w-4" />
          </div>
          <h1 className="text-lg font-bold text-foreground">SOP Library</h1>
        </div>
        {isManager && (
          <Button
            className="bg-brand-teal hover:bg-teal-600 text-white"
            onClick={() => setUploadModalOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload SOP
          </Button>
        )}
      </div>

      <div className="mt-6 flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit mb-4 overflow-x-auto no-scrollbar max-w-full">
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
        sops={sops}
        userDepartment={profile.department}
        userRole={profile.role}
      />

      {isManager && (
        <SopUploadModal
          open={uploadModalOpen}
          onOpenChange={setUploadModalOpen}
          user={profile}
          departments={departments}
          existingSops={sops.filter(s => s.status !== 'pending_cc')}
        />
      )}
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
      className={`px-4 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${active
        ? "bg-background text-brand-blue shadow-sm border border-border/50"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
        }`}
    >
      {label}
    </a>
  )
}
