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
    {
      id: "sop-changes",
      label: "SOP Change History",
      icon: FileText,
      access: "qa,manager",
    },
    {
      id: "acknowledgements",
      label: "Worker Acknowledgements",
      icon: Users,
      access: "qa,manager",
    },
    {
      id: "pm-completion",
      label: "PM Completion Log",
      icon: Wrench,
      access: "qa,manager",
    },
    {
      id: "pulse-notices",
      label: "Pulse / Notice Log",
      icon: Bell,
      access: "admin",
    },
    {
      id: "risk-insights",
      label: "AI Risk Insights",
      icon: Sparkles,
      access: "qa,admin",
    },
  ]

  const canAccess = (access: string) => {
    if (access.includes("admin") && isAdmin) return true
    if (access.includes("qa") && isQa) return true
    if (access.includes("manager") && profile.role === "manager") return true
    return false
  }

  const availableReports = reports.filter(r => canAccess(r.access))

  return (
    <div className="p-6">
      {/* <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
      </div> */}
      {/* Page Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-start gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileBarChart className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground">Review and approve SOP submissions</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-6">
        <div className="w-64 shrink-0">
          <Card className="rounded-l-none">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground mb-4">Select Report</div>
                {reports.map((report) => (
                  <Button
                    key={report.id}
                    variant={activeReport === report.id ? "default" : "ghost"}
                    className={`w-full justify-start ${!canAccess(report.access) && "opacity-50 cursor-not-allowed"}`}
                    onClick={() => canAccess(report.access) && setActiveReport(report.id as ReportType)}
                    disabled={!canAccess(report.access)}
                  >
                    <report.icon className="h-4 w-4 mr-2" />
                    {report.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1">
          <Card className="rounded-r-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div>
                    <label className="text-sm font-medium">From</label>
                    <input
                      type="date"
                      value={dateFrom || ""}
                      onChange={(e) => setDateRange(e.target.value || null, dateTo)}
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">To</label>
                    <input
                      type="date"
                      value={dateTo || ""}
                      onChange={(e) => setDateRange(dateFrom, e.target.value || null)}
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <Button variant="outline" onClick={clearFilters} className="mt-5">
                    Clear
                  </Button>
                </div>
              </div>

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
              {activeReport === "risk-insights" && (isQa || isAdmin) && (
                <RiskInsightsReport />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
