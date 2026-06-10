"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { ColumnDef } from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, GraduationCap } from "lucide-react"
import { fetchTrainingTimeline, type TrainingTimelineRow } from "@/actions/audit"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"

interface TrainingLogReportProps {
  dateFrom: string | null
  dateTo: string | null
  isQa: boolean
  isAdmin: boolean
}

const ACTION_LABELS: Record<string, string> = {
  module_created: "Module Created",
  training_module_created: "Module Created",
  module_published: "Module Published",
  training_module_published: "Module Published",
  module_archived: "Module Archived",
  training_module_archived: "Module Archived",
  module_needs_review: "Needs Review",
  trainee_assigned: "Trainee Assigned",
  trainees_assigned: "Trainees Assigned",
  training_started: "Training Started",
  attempt_submitted: "Attempt Submitted",
  training_completed: "Training Completed",
  paper_completion_recorded: "Paper Completion",
  questionnaire_created: "Questionnaire Created",
  questionnaire_published: "Questionnaire Published",
  slide_deck_generated: "Slides Generated",
  questionnaire_generated: "Questionnaire Generated",
  certificate_downloaded: "Certificate Downloaded",
  sop_training_gate_released: "Training Gate Released",
}

function actionLabel(action: string) {
  return ACTION_LABELS[action] || action.replace(/_/g, " ")
}

function actionVariant(action: string): "default" | "secondary" | "outline" | "destructive" {
  if (action.includes("completed") || action.includes("passed") || action.includes("released")) return "default"
  if (action.includes("created") || action.includes("published") || action.includes("generated")) return "secondary"
  if (action.includes("archived")) return "destructive"
  return "outline"
}

function sourceLabel(source: TrainingTimelineRow["source"]) {
  if (source === "audit_log") return "Audit"
  if (source === "training_attempt") return "Attempt"
  if (source === "training_assignment") return "Assignment"
  return "Training Log"
}

export function TrainingLogReport({ dateFrom, dateTo }: TrainingLogReportProps) {
  const [page, setPage] = useState(0)
  const queryClient = useQueryClient()

  const queryKey = ["report-training-log", page, dateFrom, dateTo]
  const { data: result, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () => fetchTrainingTimeline({ page, dateFrom, dateTo }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ["report-training-log", page + 1, dateFrom, dateTo],
      queryFn: () => fetchTrainingTimeline({ page: page + 1, dateFrom, dateTo }),
    })
  }, [page, dateFrom, dateTo, queryClient])

  const rows = result?.success ? result.data : []
  const totalCount = result?.success ? result.count : 0
  const pageSize = result?.success ? result.pageSize : 50
  const totalPages = Math.ceil(totalCount / pageSize)
  const loading = isLoading || isFetching

  const columns: ColumnDef<TrainingTimelineRow>[] = [
    {
      accessorKey: "created_at",
      header: "Date Time",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {format(new Date(row.original.created_at), "yyyy-MM-dd HH:mm")}
        </span>
      ),
    },
    {
      accessorKey: "actor",
      header: "Actor",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.actor?.full_name || "System"}</div>
          <div className="text-xs text-muted-foreground">{row.original.actor?.department || "N/A"}</div>
        </div>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <Badge variant={actionVariant(row.original.action)} className="w-fit capitalize text-[10px] tracking-wider sm:text-xs">
            {actionLabel(row.original.action)}
          </Badge>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {sourceLabel(row.original.source)}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "details",
      header: "Details",
      cell: ({ row }) => {
        const { module, target_user, metadata, entity_type, entity_id } = row.original
        const score = metadata?.score
        const passed = metadata?.passed
        const passedLabel = typeof passed === "boolean" ? `(${passed ? "Pass" : "Fail"})` : ""
        const completionMethod = metadata?.completion_method == null ? null : String(metadata.completion_method).replace(/_/g, " ")
        return (
          <div className="space-y-1 text-sm">
            {module?.title && <div><span className="font-semibold">Module:</span> {module.title}</div>}
            {target_user?.full_name && <div><span className="font-semibold">Trainee:</span> {target_user.full_name}</div>}
            {score !== undefined && (
              <div>
                <span className="font-semibold">Score:</span> {String(score)}% {passedLabel}
              </div>
            )}
            {completionMethod && (
              <div><span className="font-semibold">Method:</span> {completionMethod}</div>
            )}
            {entity_type && (
              <div className="text-xs text-muted-foreground">
                {entity_type}{entity_id ? ` · ${entity_id.slice(0, 8)}` : ""}
              </div>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-border/40 pb-6">
        <div className="bg-emerald-500/10 p-2 rounded-lg">
          <GraduationCap className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Training Log</h2>
          <p className="text-sm text-muted-foreground">Unified timeline of training assignments, starts, attempts, completions, and audit events</p>
        </div>
      </div>

      {!result?.success && result?.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {result.error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={rows}
        isLoading={loading}
        noDataMessage={loading ? "Loading training logs..." : "No training records found."}
        pageSize={pageSize}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages} &middot; {totalCount} records
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || loading}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1 || loading}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
