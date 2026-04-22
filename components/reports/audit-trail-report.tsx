"use client"

import { useEffect, useMemo, useState } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { ChevronDown, ChevronRight, ChevronLeft, Download, Loader2, ShieldCheck, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { fetchAuditTrail, fetchAuditFacets, exportReportCsv } from "@/actions/audit"
import { UserAvatar } from "@/components/user-avatar"

interface AuditTrailReportProps {
  dateFrom: string | null
  dateTo: string | null
  isAdmin: boolean
}

const ACTION_LABELS: Record<string, string> = {
  sop_submitted: "submitted an SOP",
  sop_approved: "approved an SOP",
  sop_changes_requested: "requested changes on an SOP",
  sop_acknowledged: "acknowledged an SOP",
  cc_created: "opened a change control",
  cc_signed: "signed a change control",
  cc_signature_waived: "waived a signature",
  cc_completed: "completed a change control",
  equipment_submitted: "submitted equipment",
  equipment_approved: "approved equipment",
  equipment_rejected: "rejected equipment",
  pm_completed: "completed a PM task",
  pm_reassigned: "reassigned a PM task",
  event_created: "created a calendar event",
  event_deleted: "deleted a calendar event",
  pulse_notice_broadcast: "broadcast a pulse notice",
  conversation_group_created: "created a group conversation",
  conversation_direct_created: "started a direct message",
  conversation_direct_deleted: "deleted a direct message",
  conversation_left: "left a group conversation",
  signature_updated: "updated their digital signature",
  report_exported: "exported a report (CSV)",
  training_module_published: "published a training module",
  training_completed: "completed a training module",
  user_invited: "invited a user",
  user_deactivated: "deactivated a user",
  user_role_changed: "changed a user's role",
  department_created: "created a department",
  department_deleted: "deleted a department",
}

const ENTITY_LABELS: Record<string, string> = {
  sop: "SOP",
  change_control: "Change Control",
  equipment: "Equipment",
  pm_task: "PM Task",
  training_module: "Training",
  training_assignment: "Training Assignment",
  profile: "User",
  department: "Department",
  event: "Calendar Event",
  pulse_item: "Pulse",
  conversation: "Conversation",
  document_request: "Document Request",
  request_form: "Request Form",
  request_form_submission: "Request Submission",
  report: "Report",
  system: "System",
}

const actionLabel = (a: string) => ACTION_LABELS[a] ?? a.replace(/_/g, " ")
const entityLabel = (e: string) => ENTITY_LABELS[e] ?? e.replace(/_/g, " ")

export function AuditTrailReport({ dateFrom, dateTo, isAdmin }: AuditTrailReportProps) {
  const [page, setPage] = useState(0)
  const [actorId, setActorId] = useState<string | null>(null)
  const [entityType, setEntityType] = useState<string | null>(null)
  const [action, setAction] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    setPage(0)
  }, [dateFrom, dateTo, actorId, entityType, action])

  const queryKey = ["audit-trail", page, dateFrom, dateTo, actorId, entityType, action]

  const { data: result, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () =>
      fetchAuditTrail({
        page,
        dateFrom: dateFrom ?? null,
        dateTo: dateTo ?? null,
        actorId,
        entityType,
        action,
      }),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })

  const { data: facets } = useQuery({
    queryKey: ["audit-facets"],
    queryFn: () => fetchAuditFacets(),
    staleTime: 5 * 60_000,
  })

  // Prefetch next page
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ["audit-trail", page + 1, dateFrom, dateTo, actorId, entityType, action],
      queryFn: () =>
        fetchAuditTrail({
          page: page + 1,
          dateFrom: dateFrom ?? null,
          dateTo: dateTo ?? null,
          actorId,
          entityType,
          action,
        }),
    })
  }, [page, dateFrom, dateTo, actorId, entityType, action, queryClient])

  const data = result?.success ? result.data : []
  const totalCount = result?.success ? result.count : 0
  const pageSize = result?.success ? result.pageSize : 50
  const totalPages = Math.ceil(totalCount / pageSize)
  const loading = isLoading || isFetching

  const actors = facets?.success ? facets.actors : []
  const actions = facets?.success ? facets.actions : []
  const entityTypes = facets?.success ? facets.entityTypes : []

  const activeFilterCount = useMemo(() => {
    return [actorId, entityType, action].filter(Boolean).length
  }, [actorId, entityType, action])

  const clearFilters = () => {
    setActorId(null)
    setEntityType(null)
    setAction(null)
  }

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await exportReportCsv({
        reportType: "audit-trail",
        dateFrom,
        dateTo,
        extra: { actorId, entityType, action },
      })
      if (!res.success) {
        alert(res.error || "Export failed")
        return
      }
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = res.filename
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-6">
        <div className="flex items-center gap-3">
          <div className="bg-purple-500/10 p-2 rounded-lg">
            <ShieldCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Audit Trail</h2>
            <p className="text-sm text-muted-foreground">
              Every logged action across the workspace — who did what, when, and against which entity.
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={data.length === 0 || exporting}
            className="rounded-xl border-purple-500/20 hover:bg-purple-500/5 hover:text-purple-600 shadow-sm"
          >
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Export (.csv)
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card p-3">
        <FilterSelect
          label="Actor"
          value={actorId}
          onChange={setActorId}
          options={actors.map((a: any) => ({ value: a.id, label: a.full_name || "Unknown" }))}
        />
        <FilterSelect
          label="Entity"
          value={entityType}
          onChange={setEntityType}
          options={entityTypes.map((t) => ({ value: t, label: entityLabel(t) }))}
        />
        <FilterSelect
          label="Action"
          value={action}
          onChange={setAction}
          options={actions.map((a) => ({ value: a, label: actionLabel(a) }))}
        />
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
            <X className="h-3.5 w-3.5 mr-1" />
            Clear {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"}
          </Button>
        )}
        <div className="ml-auto text-xs text-muted-foreground">
          {loading ? "Loading…" : `${totalCount.toLocaleString()} ${totalCount === 1 ? "entry" : "entries"}`}
        </div>
      </div>

      {/* Timeline */}
      {loading && data.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 py-16 text-center">
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">No audit entries match these filters</p>
          <p className="mt-1 text-xs text-muted-foreground">Try clearing filters or expanding the date range.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
          {data.map((entry: any) => {
            const isOpen = expanded.has(entry.id)
            const hasMeta = entry.metadata && Object.keys(entry.metadata).length > 0
            return (
              <li key={entry.id} className="group">
                <button
                  type="button"
                  onClick={() => hasMeta && toggleExpand(entry.id)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                    hasMeta ? "hover:bg-muted/40 cursor-pointer" : "cursor-default"
                  }`}
                >
                  <UserAvatar user={entry.actor} size="default" className="shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold text-foreground">
                        {entry.actor?.full_name || "System"}
                      </span>
                      <span className="text-muted-foreground">{actionLabel(entry.action)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wider h-5 px-1.5">
                        {entityLabel(entry.entity_type)}
                      </Badge>
                      {entry.entity_id && (
                        <span className="font-mono text-[11px] text-muted-foreground/80 truncate max-w-[180px]">
                          {entry.entity_id.slice(0, 8)}
                        </span>
                      )}
                      {entry.actor?.department && (
                        <span className="text-[11px]">· {entry.actor.department}</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                    </div>
                    <div className="text-[10px] text-muted-foreground/70 whitespace-nowrap">
                      {format(new Date(entry.created_at), "MMM d, HH:mm")}
                    </div>
                  </div>
                  {hasMeta && (
                    <div className="shrink-0 self-center text-muted-foreground/60">
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                  )}
                </button>
                {isOpen && hasMeta && (
                  <div className="bg-muted/30 px-4 py-3 border-t border-border/50">
                    <pre className="text-[11px] leading-relaxed font-mono text-foreground/90 whitespace-pre-wrap break-all">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages} &middot; {totalCount.toLocaleString()} records
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1 || loading}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string | null
  onChange: (v: string | null) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2 py-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <select
        className="bg-transparent text-xs font-medium text-foreground outline-none max-w-[160px] truncate"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
