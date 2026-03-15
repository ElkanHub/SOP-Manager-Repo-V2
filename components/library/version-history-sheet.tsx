"use client"

import { format } from "date-fns"
import { History, FileText } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SopVersion } from "@/types/app.types"

interface VersionHistorySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  versions: SopVersion[]
  currentVersion: string
  isLoading?: boolean
  onViewVersion?: (version: SopVersion) => void
}

export function VersionHistorySheet({
  open,
  onOpenChange,
  versions,
  currentVersion,
  isLoading,
  onViewVersion,
}: VersionHistorySheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[380px] sm:max-w-[380px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-0">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-6 py-4 border-b border-slate-100">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))
          ) : versions.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-slate-400">
              No version history available
            </div>
          ) : (
            versions.map((version, index) => (
              <div
                key={version.id}
                className={`flex items-start gap-3 px-6 py-4 border-b border-slate-100 ${
                  version.version === currentVersion ? "bg-green-50/30" : ""
                }`}
              >
                <div className="w-[60px]">
                  <span className="font-mono text-xs text-slate-500">
                    {version.version}
                  </span>
                  {version.version === currentVersion && (
                    <span className="ml-2 text-[11px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-600">
                    {version.uploaded_by
                      ? `Uploaded by User`
                      : "System generated"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {format(new Date(version.created_at), "dd MMM yyyy")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewVersion?.(version)}
                >
                  View
                </Button>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
