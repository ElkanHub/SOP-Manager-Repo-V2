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
      <SheetContent className="w-[400px] sm:max-w-[400px] p-0 flex flex-col gap-0 border-l border-border/40 shadow-2xl bg-gradient-to-b from-background to-background/98">
        <SheetHeader className="p-6 bg-gradient-to-r from-brand-teal/10 to-transparent border-b border-border/50">
          <SheetTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
            <div className="p-2 rounded-lg bg-brand-teal/10">
               <History className="h-5 w-5 text-brand-teal" />
            </div>
            Version History
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pt-2 custom-scrollbar">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-6 py-5 border-b border-border/30">
                <Skeleton className="h-4 w-20 mb-3 bg-muted/60" />
                <Skeleton className="h-3 w-48 bg-muted/40" />
              </div>
            ))
          ) : versions.length === 0 ? (
            <div className="px-6 py-12 text-center">
               <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground/20" />
               <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/40">No record found</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className={`flex flex-col gap-3 px-6 py-6 transition-all group hover:bg-muted/10 relative ${
                    version.version === currentVersion 
                      ? "bg-brand-teal/5 border-l-4 border-l-brand-teal" 
                      : "border-l-4 border-l-transparent"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                       <span className="font-mono text-xs font-bold text-brand-teal bg-brand-teal/10 px-2 py-0.5 rounded">
                         v{version.version}
                       </span>
                       {version.version === currentVersion && (
                         <Badge variant="default" className="bg-brand-teal text-[10px] font-bold uppercase tracking-tighter px-1.5 py-0 h-4">
                           LIVE
                         </Badge>
                       )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewVersion?.(version)}
                      className="h-7 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      View Archive
                    </Button>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-foreground/80">
                      {version.uploaded_by
                        ? `Submission by Authorized Personnel`
                        : "Automated Lifecycle Version"}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                       {format(new Date(version.created_at), "dd MMM yyyy")}
                       <span className="opacity-30">|</span>
                       {format(new Date(version.created_at), "HH:mm")}
                    </div>
                  </div>

                  {version.version === currentVersion && (
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <CheckCircle2 className="w-12 h-12 text-brand-teal" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
