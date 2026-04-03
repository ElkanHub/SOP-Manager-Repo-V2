"use client"

import { useState } from "react"
import { format } from "date-fns"
import Link from "next/link"
import {
  PenLine,
  Lock,
  ChevronUp,
  Info,
  ArrowLeft,
  ChevronDown
} from "lucide-react"
import { SopViewerLazy as SopViewer } from "@/components/library/sop-viewer-lazy"
import { AcknowledgeButton } from "@/components/library/acknowledge-button"
import { StatusBadge } from "@/components/ui/status-badge"
import { DeptBadge } from "@/components/ui/dept-badge"
import { Button } from "@/components/ui/button"
import VersionHistorySheetButton from "@/components/library/version-history-button"
import { Profile, SopVersion } from "@/types/app.types"
import { cn } from "@/lib/utils"

interface LibraryViewClientProps {
  sop: any
  profile: Profile
  acknowledgement: any
  versions: SopVersion[]
  approverProfile: any
  signedFileUrl: string | null
  activeChangeControlId: string | null
}

export default function LibraryViewClient({
  sop,
  profile,
  acknowledgement,
  versions,
  approverProfile,
  signedFileUrl,
  activeChangeControlId
}: LibraryViewClientProps) {
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false)

  const isOwnDept =
    sop.department === profile.department ||
    (sop.secondary_departments || []).includes(profile.department || '')

  const isManager = profile.role === "manager"
  const isLocked = sop.locked
  const isCrossDept = !isOwnDept

  return (
    <div className="flex flex-col h-full bg-slate-50/50">

      {/* Lock Notice */}
      {sop.status === 'pending_cc' && activeChangeControlId && (
        <div className="bg-amber-100 border-b border-amber-200 px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 text-amber-900 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
            <Lock className="h-3.5 w-3.5 animate-pulse" />
            Locked under Change Control
          </div>
          <Link href={`/change-control/${activeChangeControlId}`}>
            <Button size="sm" variant="outline" className="h-7 text-[10px] sm:text-xs font-bold uppercase border-amber-300 hover:bg-amber-200 bg-white shadow-sm">
              View Process
            </Button>
          </Link>
        </div>
      )}

      {/* Header */}
      <header className={cn(
        "bg-white/80 backdrop-blur-md border-b border-border/80 shadow-sm sticky top-0 z-20",
        "p-3 sm:p-4 md:p-5"
      )}>
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-2 sm:gap-3 px-1 sm:px-0">

          {/* Top Row */}
          <div className="flex flex-wrap items-start sm:items-center justify-between gap-2 sm:gap-3">

            {/* Left */}
            <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">

              {/* Back button */}
              <Link href="/library" className="sm:hidden text-muted-foreground hover:bg-muted p-1 rounded-md shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Link>

              <div className="flex flex-col min-w-0 w-full">

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[9px] sm:text-xs text-brand-navy font-bold bg-brand-navy/5 px-2 py-0.5 rounded-sm shrink-0 uppercase">
                    {sop.sop_number}
                  </span>

                  <h1
                    className={cn(
                      "font-bold text-slate-800 transition-all leading-tight",
                      "line-clamp-2 break-words",
                      isHeaderExpanded
                        ? "text-base sm:text-xl md:text-2xl"
                        : "text-sm sm:text-lg md:text-xl"
                    )}
                  >
                    {sop.title}
                  </h1>
                </div>

                {/* Desktop compact metadata */}
                {!isHeaderExpanded && (
                  <div className="hidden sm:flex flex-wrap items-center gap-2 mt-1.5">
                    <DeptBadge department={sop.department} colour={sop.departments?.colour} className="h-5 text-[10px]" />
                    <span className="font-mono text-[10px] text-muted-foreground font-bold bg-muted px-1.5 rounded-sm">
                      {sop.version}
                    </span>
                    <StatusBadge status={sop.status} className="h-5 text-[10px]" />
                  </div>
                )}
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end max-w-full">

              {isOwnDept && sop.status === "active" && (
                <div className="flex-shrink-0">
                  <AcknowledgeButton
                    sopId={sop.id}
                    sopVersion={sop.version}
                    hasAcknowledged={!!acknowledgement}
                    acknowledgedAt={acknowledgement?.acknowledged_at}
                  />
                </div>
              )}

              {/* Mobile toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:hidden shrink-0"
                onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
              >
                {isHeaderExpanded ? <ChevronUp className="h-4 w-4 text-brand-navy" /> : <ChevronDown className="h-4 w-4 text-brand-navy" />}
              </Button>

              {/* Desktop versions */}
              <div className="hidden sm:block">
                <VersionHistorySheetButton
                  versions={versions || []}
                  currentVersion={sop.version}
                />
              </div>
            </div>
          </div>

          {/* Expanded Section */}
          {isHeaderExpanded && (
            <div className="grid grid-cols-3 xs:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 pt-3 border-t border-slate-100">

              {/* Ownership */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ownership</p>
                <div className="flex items-center gap-2 mt-1">
                  <DeptBadge department={sop.department} colour={sop.departments?.colour} />
                  {isCrossDept && (
                    <span className="text-[10px] text-brand-teal font-bold bg-teal-50 px-1.5 rounded-sm">
                      READ-ONLY
                    </span>
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={sop.status} />
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5">
                    {sop.version}
                  </span>
                </div>
              </div>

              {/* Approval */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Approval</p>
                <p className="text-xs font-semibold text-slate-700 mt-1">
                  {approverProfile?.full_name || 'System Approved'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {sop.date_listed ? format(new Date(sop.date_listed), "dd MMM yyyy") : '-'}
                </p>
              </div>

              {/* Actions */}
              <div className="col-span-3 w-full flex flex-wrap gap-2 pt-2 border-t sm:border-0 sm:pt-0">
                {isManager && !isLocked && isOwnDept && (
                  <Button variant="secondary" size="sm" className="h-8 text-[10px] font-bold uppercase">
                    <PenLine className="h-3.5 w-3.5 mr-2" />
                    Submit Edit
                  </Button>
                )}

                <div className="sm:hidden">
                  <VersionHistorySheetButton
                    versions={versions || []}
                    currentVersion={sop.version}
                  />
                </div>
              </div>

            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden relative">
        <div className="h-full w-full mx-auto bg-white shadow-lg flex flex-col">
          <div className="flex-1 bg-slate-200/50 flex flex-col sm:p-8">
            <div className="max-w-5xl mx-auto w-full h-full bg-white shadow-2xl overflow-hidden sm:rounded-xl ring-1 ring-slate-200/50">
              {signedFileUrl ? (
                <SopViewer fileUrl={signedFileUrl} className="h-full w-full" />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-xs italic">
                  No document content available.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

    </div>
  )
}