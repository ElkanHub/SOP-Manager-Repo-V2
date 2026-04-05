"use client"

import { useState } from "react"
import { format, subDays } from "date-fns"
import { FileBarChart, FileText, Users, Wrench, Bell, Sparkles, Download, ClipboardList, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import dynamic from "next/dynamic"
import { useReportStore } from "@/store/report-store"
import { Profile } from "@/types/app.types"
import { report } from "process"

const SopChangeHistoryReport = dynamic(() => import("./sop-change-history-report").then(mod => mod.SopChangeHistoryReport), {
  ssr: false,
  loading: () => <div className="h-96 flex items-center justify-center"><Sparkles className="h-8 w-8 animate-pulse text-muted-foreground/20" /></div>
})

const AcknowledgementLogReport = dynamic(() => import("./acknowledgement-log-report").then(mod => mod.AcknowledgementLogReport), {
  ssr: false,
  loading: () => <div className="h-96 flex items-center justify-center"><Sparkles className="h-8 w-8 animate-pulse text-muted-foreground/20" /></div>
})

const PmCompletionReport = dynamic(() => import("./pm-completion-report").then(mod => mod.PmCompletionReport), {
  ssr: false,
  loading: () => <div className="h-96 flex items-center justify-center"><Sparkles className="h-8 w-8 animate-pulse text-muted-foreground/20" /></div>
})

const PulseNoticeReport = dynamic(() => import("./pulse-notice-report").then(mod => mod.PulseNoticeReport), {
  ssr: false,
  loading: () => <div className="h-96 flex items-center justify-center"><Sparkles className="h-8 w-8 animate-pulse text-muted-foreground/20" /></div>
})

const RiskInsightsReport = dynamic(() => import("./risk-insights-report").then(mod => mod.RiskInsightsReport), {
  ssr: false,
  loading: () => <div className="h-96 flex items-center justify-center"><Sparkles className="h-8 w-8 animate-pulse text-muted-foreground/20" /></div>
})

const DocumentRequestsReport = dynamic(() => import("./document-requests-report").then(mod => mod.DocumentRequestsReport), {
  ssr: false,
  loading: () => <div className="h-96 flex items-center justify-center"><Sparkles className="h-8 w-8 animate-pulse text-muted-foreground/20" /></div>
})

const TrainingLogReport = dynamic(() => import("./training-log-report").then(mod => mod.TrainingLogReport), {
  ssr: false,
  loading: () => <div className="h-96 flex items-center justify-center"><Sparkles className="h-8 w-8 animate-pulse text-muted-foreground/20" /></div>
})


interface ReportsClientProps {
  profile: Profile
  isQa: boolean
  isAdmin: boolean
}

type ReportType = "sop-changes" | "acknowledgements" | "pm-completion" | "pulse-notices" | "risk-insights" | "document-requests" | "training-log"

export function ReportsClient({ profile, isQa, isAdmin }: ReportsClientProps) {
  const [activeReport, setActiveReport] = useState<ReportType>("sop-changes")
  const { dateFrom, dateTo, setDateRange, clearFilters } = useReportStore()

  const reports = [
    { id: "sop-changes", label: "SOP Change History", icon: FileText, access: "qa", color: "text-teal-600" },
    { id: "acknowledgements", label: "Worker Acknowledgements", icon: Users, access: "all", color: "text-blue-600" },
    { id: "pm-completion", label: "PM Completion Log", icon: Wrench, access: "qa", color: "text-orange-600" },
    { id: "pulse-notices", label: "Pulse / Notice Log", icon: Bell, access: "admin", color: "text-indigo-600" },
    { id: "document-requests", label: "Document Requests", icon: ClipboardList, access: "qa+admin", color: "text-amber-600" },
    { id: "training-log", label: "Training Log", icon: GraduationCap, access: "manager", color: "text-emerald-600" },
  ]

  const canAccess = (access: string) => {
    if (access === "qa+admin" && (isQa || isAdmin)) return true
    if (access.includes("admin") && isAdmin) return true
    if (access.includes("qa") && isQa) return true
    if (access.includes("manager") && profile.role === "manager") return true
    if (access.includes("all")) return true
    return false
  }

  const availableReports = reports.filter(r => canAccess(r.access))

  return (
    <div className="flex flex-col min-h-full p-4 sm:p-6 max-w-7xl mx-auto w-full">
      {/* Page Header */}
      <div className="mb-6 flex items-start gap-3 border-b border-border bg-card px-6 py-4 shrink-0 rounded-none overflow-hidden shadow-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-inner">
          <GraduationCap className="h-4 w-4" />
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
                  <report.icon className={`h-3.5 w-3.5 opacity-70 ${report.color}`} />
                  {report.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-card p-1 rounded-lg border border-border/50 w-full sm:w-auto self-end md:self-auto justify-end sm:justify-start">
            <div className="flex items-center px-2 gap-1.5 border-r border-border/50">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 shrink-0">From</span>
              <input
                type="date"
                value={dateFrom || ""}
                onChange={(e) => setDateRange(e.target.value || null, dateTo)}
                className="bg-transparent border-none text-[11px] font-semibold focus:ring-0 p-0 w-24 h-8 text-foreground"
              />
            </div>
            <div className="flex items-center px-2 gap-1.5 min-w-[100px]">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 shrink-0">To</span>
              <input
                type="date"
                value={dateTo || ""}
                onChange={(e) => setDateRange(dateFrom, e.target.value || null)}
                className="bg-transparent border-none text-[11px] font-semibold focus:ring-0 p-0 w-24 h-8 text-foreground"
              />
            </div>
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 px-2 text-[9px] font-bold uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 rounded-md shrink-0 sm:ml-auto"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        <Card className="border-border shadow-md bg-card relative overflow-hidden mb-8">
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
              {activeReport === "document-requests" && (isQa || isAdmin) && (
                <DocumentRequestsReport dateFrom={dateFrom} dateTo={dateTo} />
              )}
              {activeReport === "training-log" && (isQa || isAdmin || profile.role === "manager") && (
                <TrainingLogReport dateFrom={dateFrom} dateTo={dateTo} isQa={isQa} />
              )}
            </div>
          </CardContent>
        </Card>
      </Tabs>

      {/* AI Insights Section - Always visible at bottom for QA/Admins */}
      {(isQa || isAdmin) && (
        <Card className="mt-4 border-border shadow-md bg-card overflow-hidden">
          <CardContent className="p-4 sm:p-8">
            <RiskInsightsReport />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
