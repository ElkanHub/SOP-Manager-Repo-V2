"use client"

import { useState } from "react"
import { format, subDays } from "date-fns"
import { FileBarChart, FileText, Users, Wrench, Bell, Sparkles, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useReportStore } from "@/store/report-store"
import { SopChangeHistoryReport } from "./sop-change-history-report"
import { AcknowledgementLogReport } from "./acknowledgement-log-report"
import { PmCompletionReport } from "./pm-completion-report"
import { PulseNoticeReport } from "./pulse-notice-report"
import { RiskInsightsReport } from "./risk-insights-report"
import { Profile } from "@/types/app.types"

interface ReportsClientProps {
  profile: Profile
  isQa: boolean
  isAdmin: boolean
}

type ReportType = "sop-changes" | "acknowledgements" | "pm-completion" | "pulse-notices" | "risk-insights"

export function ReportsClient({ profile, isQa, isAdmin }: ReportsClientProps) {
  const [activeReport, setActiveReport] = useState<ReportType>("sop-changes")
  const { dateFrom, dateTo, setDateRange, clearFilters } = useReportStore()

  const reports = [
    { id: "sop-changes", label: "SOP Change History", icon: FileText, access: "qa" },
    { id: "acknowledgements", label: "Worker Acknowledgements", icon: Users, access: "all" },
    { id: "pm-completion", label: "PM Completion Log", icon: Wrench, access: "qa" },
    { id: "pulse-notices", label: "Pulse / Notice Log", icon: Bell, access: "admin" },
  ]

  const canAccess = (access: string) => {
    if (access.includes("admin") && isAdmin) return true
    if (access.includes("qa") && isQa) return true
    if (access.includes("manager") && profile.role === "manager") return true
    // Added to handle "all" access type, assuming it means accessible to anyone with any role.
    // If "all" means truly all users, this logic might need adjustment based on overall app access rules.
    if (access.includes("all")) return true; 
    return false
  }

  const availableReports = reports.filter(r => canAccess(r.access))

  return (
    <div className="flex flex-col min-h-full p-4 sm:p-6 max-w-7xl mx-auto w-full">
      {/* Page Header */}
      <div className="mb-6 flex items-start gap-3 border-b border-border bg-card px-6 py-4 shrink-0 rounded-none overflow-hidden shadow-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-inner">
          <FileBarChart className="h-4 w-4" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Intelligence & Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Generate and export enterprise governance reports</p>
        </div>
      </div>

      <Tabs 
        value={activeReport} 
        onValueChange={(val) => setActiveReport(val as ReportType)}
        className="flex-1"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex h-auto gap-1 bg-muted/50 p-1 rounded-xl whitespace-nowrap min-w-full sm:min-w-0">
              {availableReports.map((report) => (
                <TabsTrigger
                  key={report.id}
                  value={report.id}
                  className="gap-1.5 rounded-lg text-xs sm:text-sm px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                >
                  <report.icon className="h-3.5 w-3.5 opacity-70" />
                  {report.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg border border-border/50 self-end md:self-auto">
            <div className="flex items-center px-2 gap-1.5 border-r border-border/50">
               <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">From</span>
               <input
                 type="date"
                 value={dateFrom || ""}
                 onChange={(e) => setDateRange(e.target.value || null, dateTo)}
                 className="bg-transparent border-none text-[11px] font-semibold focus:ring-0 p-0 w-24 h-6 text-foreground"
               />
            </div>
            <div className="flex items-center px-2 gap-1.5">
               <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">To</span>
               <input
                 type="date"
                 value={dateTo || ""}
                 onChange={(e) => setDateRange(dateFrom, e.target.value || null)}
                 className="bg-transparent border-none text-[11px] font-semibold focus:ring-0 p-0 w-24 h-6 text-foreground"
               />
            </div>
            { (dateFrom || dateTo) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="h-6 px-2 text-[9px] font-bold uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 rounded-md"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        <Card className="border-border/40 shadow-xl shadow-black/5 bg-background/50 backdrop-blur-md relative overflow-hidden mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-teal/5 via-transparent to-transparent opacity-50 pointer-events-none" />
          <CardContent className="p-0 relative z-10">
            <div className="p-4 sm:p-8">
              {activeReport === "sop-changes" && (
                <SopChangeHistoryReport dateFrom={dateFrom} dateTo={dateTo} isQa={isQa} />
              )}
              {activeReport === "acknowledgements" && (
                <AcknowledgementLogReport dateFrom={dateFrom} dateTo={dateTo} isQa={isQa} />
              )}
              {activeReport === "pm-completion" && (
                <PmCompletionReport dateFrom={dateFrom} dateTo={dateTo} isQa={isQa} />
              )}
              {activeReport === "pulse-notices" && isAdmin && (
                <PulseNoticeReport dateFrom={dateFrom} dateTo={dateTo} />
              )}
            </div>
          </CardContent>
        </Card>
      </Tabs>

      {/* AI Insights Section - Always visible at bottom for QA/Admins */}
      {(isQa || isAdmin) && (
        <div className="mt-4 pt-8 border-t border-border/40">
           <RiskInsightsReport />
        </div>
      )}
    </div>
  )
}
