"use server"

import { createClient, createServiceClient } from "@/lib/supabase/server"
import { logAudit, logReportExport } from "@/lib/audit"

const PAGE_SIZE = 50

export interface AuditFilters {
  page: number
  dateFrom?: string | null
  dateTo?: string | null
  actorId?: string | null
  entityType?: string | null
  action?: string | null
}

async function requireQaOrAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Not authenticated" }
  const service = await createServiceClient()
  const [{ data: isQa }, { data: isAdmin }] = await Promise.all([
    service.rpc("is_qa_manager", { user_id: user.id }),
    service.rpc("is_admin", { user_id: user.id }),
  ])
  if (!isQa && !isAdmin) return { ok: false as const, error: "Forbidden" }
  return { ok: true as const, userId: user.id, isAdmin: !!isAdmin, isQa: !!isQa, service }
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Not authenticated" }
  const service = await createServiceClient()
  const { data: isAdmin } = await service.rpc("is_admin", { user_id: user.id })
  if (!isAdmin) return { ok: false as const, error: "Forbidden — admin only" }
  return { ok: true as const, userId: user.id, service }
}

async function requireTrainingReportAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Not authenticated" }

  const service = await createServiceClient()
  const [{ data: isQa }, { data: isAdmin }, { data: profile }] = await Promise.all([
    service.rpc("is_qa_manager", { user_id: user.id }),
    service.rpc("is_admin", { user_id: user.id }),
    service
      .from("profiles")
      .select("id, role, department, is_active")
      .eq("id", user.id)
      .single(),
  ])

  if (!profile?.is_active) return { ok: false as const, error: "Inactive user" }
  if (!isQa && !isAdmin && profile.role !== "manager") {
    return { ok: false as const, error: "Forbidden" }
  }

  return {
    ok: true as const,
    userId: user.id,
    service,
    isQa: !!isQa,
    isAdmin: !!isAdmin,
    department: profile.department as string | null,
  }
}

/**
 * Paginated audit trail fetch. QA + Admin only (enforced server-side here AND
 * by the SELECT RLS on audit_log — defense in depth). Returns actor as a
 * joined profile row for rendering.
 */
export async function fetchAuditTrail(filters: AuditFilters) {
  const auth = await requireQaOrAdmin()
  if (!auth.ok) return { success: false as const, error: auth.error }

  const page = Math.max(0, filters.page | 0)
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = auth.service
    .from("audit_log")
    .select(
      `id, actor_id, action, entity_type, entity_id, metadata, created_at,
       actor:profiles!audit_log_actor_id_fkey(id, full_name, avatar_url, department)`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to)

  if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom)
  if (filters.dateTo) query = query.lte("created_at", filters.dateTo + "T23:59:59")
  if (filters.actorId) query = query.eq("actor_id", filters.actorId)
  if (filters.entityType) query = query.eq("entity_type", filters.entityType)
  if (filters.action) query = query.eq("action", filters.action)

  const { data, count, error } = await query
  if (error) return { success: false as const, error: error.message }
  return {
    success: true as const,
    data: data ?? [],
    count: count ?? 0,
    pageSize: PAGE_SIZE,
  }
}

/**
 * Distinct facets for the filter dropdowns. Capped small — for large envs we'd
 * want a dedicated facet table, but DISTINCT on indexed columns is fine at our
 * current scale.
 */
export async function fetchAuditFacets() {
  const auth = await requireQaOrAdmin()
  if (!auth.ok) return { success: false as const, error: auth.error }

  // Pull a recent sample of rows and derive distinct facets in-memory.
  // For our current scale (audit_log ~tens of thousands), a 2000-row sample over
  // the created_at DESC index is cheap and gives accurate facets for recent
  // activity. A dedicated facet table can replace this when volume grows.
  const [sampleRes, actorsRes] = await Promise.all([
    auth.service
      .from("audit_log")
      .select("action, entity_type")
      .order("created_at", { ascending: false })
      .limit(2000),
    auth.service
      .from("profiles")
      .select("id, full_name, avatar_url, department")
      .eq("is_active", true)
      .order("full_name"),
  ])

  const sample = (sampleRes.data ?? []) as { action: string; entity_type: string }[]
  const actions = Array.from(new Set(sample.map((r) => r.action))).filter(Boolean).sort()
  const entityTypes = Array.from(new Set(sample.map((r) => r.entity_type))).filter(Boolean).sort()

  return {
    success: true as const,
    actions,
    entityTypes,
    actors: actorsRes.data ?? [],
  }
}

export type TrainingTimelineRow = {
  id: string
  source: "training_log" | "audit_log" | "training_attempt" | "training_assignment"
  action: string
  created_at: string
  actor?: { full_name: string | null; department: string | null } | null
  target_user?: { full_name: string | null; department?: string | null } | null
  module?: { title: string | null; department?: string | null } | null
  entity_type?: string | null
  entity_id?: string | null
  metadata?: Record<string, unknown> | null
}

function firstJoined<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

function normalizeMetadata(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function trainingRowMatchesDepartment(row: TrainingTimelineRow, department: string | null) {
  if (!department) return true
  return (
    row.actor?.department === department
    || row.target_user?.department === department
    || row.module?.department === department
  )
}

export async function fetchTrainingTimeline(filters: {
  page: number
  dateFrom?: string | null
  dateTo?: string | null
}): Promise<
  | { success: true; data: TrainingTimelineRow[]; count: number; pageSize: number }
  | { success: false; error: string }
> {
  const auth = await requireTrainingReportAccess()
  if (!auth.ok) return { success: false, error: auth.error }

  const fromIso = filters.dateFrom ? `${filters.dateFrom}T00:00:00` : null
  const toIso = filters.dateTo ? `${filters.dateTo}T23:59:59` : null
  const limit = 2000

  let trainingLogQuery = auth.service
    .from("training_log")
    .select(`
      id, action, created_at, metadata, module_id, attempt_id, target_user_id,
      actor:profiles!training_log_actor_id_fkey(full_name, department),
      target_user:profiles!training_log_target_user_id_fkey(full_name, department),
      module:training_modules(title, department)
    `)
    .order("created_at", { ascending: false })
    .limit(limit)

  let auditQuery = auth.service
    .from("audit_log")
    .select(`
      id, action, entity_type, entity_id, metadata, created_at,
      actor:profiles!audit_log_actor_id_fkey(full_name, department)
    `)
    .or("action.ilike.training_%,entity_type.eq.training_module,entity_type.eq.training_assignment,entity_type.eq.training_attempt")
    .order("created_at", { ascending: false })
    .limit(limit)

  let attemptsQuery = auth.service
    .from("training_attempts")
    .select(`
      id, submitted_at, score, passed, completion_method,
      respondent:profiles!training_attempts_respondent_id_fkey(full_name, department),
      module:training_modules(title, department)
    `)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(limit)

  let assignmentsQuery = auth.service
    .from("training_assignments")
    .select(`
      id, assigned_at, completed_at, status,
      actor:profiles!training_assignments_assigned_by_fkey(full_name, department),
      target_user:profiles!training_assignments_assignee_id_fkey(full_name, department),
      module:training_modules(title, department)
    `)
    .order("assigned_at", { ascending: false })
    .limit(limit)

  if (fromIso) {
    trainingLogQuery = trainingLogQuery.gte("created_at", fromIso)
    auditQuery = auditQuery.gte("created_at", fromIso)
    attemptsQuery = attemptsQuery.gte("submitted_at", fromIso)
    assignmentsQuery = assignmentsQuery.or(`assigned_at.gte.${fromIso},completed_at.gte.${fromIso}`)
  }
  if (toIso) {
    trainingLogQuery = trainingLogQuery.lte("created_at", toIso)
    auditQuery = auditQuery.lte("created_at", toIso)
    attemptsQuery = attemptsQuery.lte("submitted_at", toIso)
    assignmentsQuery = assignmentsQuery.or(`assigned_at.lte.${toIso},completed_at.lte.${toIso}`)
  }

  const [trainingLogRes, auditRes, attemptsRes, assignmentsRes] = await Promise.all([
    trainingLogQuery,
    auditQuery,
    attemptsQuery,
    assignmentsQuery,
  ])

  const firstError = trainingLogRes.error || auditRes.error || attemptsRes.error || assignmentsRes.error
  if (firstError) return { success: false, error: firstError.message }

  const rows: TrainingTimelineRow[] = []

  for (const entry of trainingLogRes.data || []) {
    const actor = firstJoined(entry.actor)
    const target = firstJoined(entry.target_user)
    const module = firstJoined(entry.module)
    rows.push({
      id: `training_log:${entry.id}`,
      source: "training_log",
      action: entry.action,
      created_at: entry.created_at,
      actor,
      target_user: target,
      module,
      entity_type: "training_log",
      entity_id: entry.attempt_id || entry.module_id || entry.id,
      metadata: normalizeMetadata(entry.metadata),
    })
  }

  for (const entry of auditRes.data || []) {
    const actor = firstJoined(entry.actor)
    rows.push({
      id: `audit_log:${entry.id}`,
      source: "audit_log",
      action: entry.action,
      created_at: entry.created_at,
      actor,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      metadata: normalizeMetadata(entry.metadata),
    })
  }

  for (const attempt of attemptsRes.data || []) {
    if (!attempt.submitted_at) continue
    const respondent = firstJoined(attempt.respondent)
    const module = firstJoined(attempt.module)
    rows.push({
      id: `training_attempt:${attempt.id}`,
      source: "training_attempt",
      action: "training_completed",
      created_at: attempt.submitted_at,
      actor: respondent,
      target_user: respondent,
      module,
      entity_type: "training_attempt",
      entity_id: attempt.id,
      metadata: {
        score: attempt.score,
        passed: attempt.passed,
        completion_method: attempt.completion_method,
      },
    })
  }

  for (const assignment of assignmentsRes.data || []) {
    const actor = firstJoined(assignment.actor)
    const target = firstJoined(assignment.target_user)
    const module = firstJoined(assignment.module)
    rows.push({
      id: `training_assignment_assigned:${assignment.id}`,
      source: "training_assignment",
      action: "trainee_assigned",
      created_at: assignment.assigned_at,
      actor,
      target_user: target,
      module,
      entity_type: "training_assignment",
      entity_id: assignment.id,
      metadata: { status: assignment.status },
    })

    if (assignment.completed_at) {
      rows.push({
        id: `training_assignment_completed:${assignment.id}`,
        source: "training_assignment",
        action: "training_completed",
        created_at: assignment.completed_at,
        actor: target,
        target_user: target,
        module,
        entity_type: "training_assignment",
        entity_id: assignment.id,
        metadata: { status: assignment.status },
      })
    }
  }

  const scoped = (auth.isQa || auth.isAdmin)
    ? rows
    : rows.filter((row) => trainingRowMatchesDepartment(row, auth.department))

  const seen = new Set<string>()
  const deduped = scoped
    .filter((row) => {
      const key = `${row.action}:${row.entity_type || row.source}:${row.entity_id || row.id}:${row.created_at}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const page = Math.max(0, filters.page | 0)
  const from = page * PAGE_SIZE
  return {
    success: true,
    data: deduped.slice(from, from + PAGE_SIZE),
    count: deduped.length,
    pageSize: PAGE_SIZE,
  }
}

/**
 * Server-side CSV export. Admin-only. Fetches via the service client (bypasses
 * RLS after the admin check), enforces a hard row cap, and logs the export
 * as a `report_exported` audit entry. Returns the CSV as a string so the
 * client can trigger a Blob download.
 */
export async function exportReportCsv(args: {
  reportType: string
  dateFrom?: string | null
  dateTo?: string | null
  extra?: Record<string, unknown>
}): Promise<
  | { success: true; csv: string; rowCount: number; filename: string }
  | { success: false; error: string }
> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }

  const MAX_ROWS = 10_000
  const { reportType, dateFrom, dateTo, extra } = args

  try {
    const result = await buildReportRows({
      service: auth.service,
      reportType,
      dateFrom: dateFrom ?? null,
      dateTo: dateTo ?? null,
      maxRows: MAX_ROWS,
      extra: extra ?? {},
    })

    if (!result) {
      return { success: false, error: "Unknown report type" }
    }

    const csv = rowsToCsv(result.headers, result.rows)
    const todayStr = new Date().toISOString().slice(0, 10)
    const filename = `${reportType}-${todayStr}.csv`

    await logReportExport({
      actorId: auth.userId,
      reportType,
      rowCount: result.rows.length,
      filters: { dateFrom: dateFrom ?? null, dateTo: dateTo ?? null, ...(extra ?? {}) },
    })

    return { success: true, csv, rowCount: result.rows.length, filename }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Export failed" }
  }
}

type BuildArgs = {
  service: Awaited<ReturnType<typeof createServiceClient>>
  reportType: string
  dateFrom: string | null
  dateTo: string | null
  maxRows: number
  extra: Record<string, unknown>
}

async function buildReportRows(args: BuildArgs): Promise<{ headers: string[]; rows: string[][] } | null> {
  const { service, reportType, dateFrom, dateTo, maxRows } = args
  const fromIso = dateFrom ?? undefined
  const toIso = dateTo ? dateTo + "T23:59:59" : undefined

  if (reportType === "sop-changes") {
    let q = service
      .from("change_controls")
      .select(
        `id, old_version, new_version, status, created_at, completed_at,
         sops(sop_number, title, department),
         signatories:signature_certificates(id)`,
      )
      .order("created_at", { ascending: false })
      .limit(maxRows)
    if (fromIso) q = q.gte("created_at", fromIso)
    if (toIso) q = q.lte("created_at", toIso)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    const headers = ["CC Ref", "SOP Number", "Document Title", "Department", "From Version", "New Version", "Status", "Signatures", "Created Date"]
    const rows = (data ?? []).map((e: any) => {
      const ccRef = `CC-${new Date(e.created_at).getFullYear()}-${String(e.id).slice(0, 4).toUpperCase()}`
      return [
        ccRef,
        e.sops?.sop_number ?? "-",
        e.sops?.title ?? "-",
        e.sops?.department ?? "-",
        e.old_version ?? "00",
        e.new_version ?? "-",
        e.status ?? "-",
        String(e.signatories?.length ?? 0),
        new Date(e.created_at).toISOString(),
      ]
    })
    return { headers, rows }
  }

  if (reportType === "acknowledgements") {
    let q = service
      .from("sop_acknowledgements")
      .select(
        `id, acknowledged_at, version,
         sop:sops(sop_number, title, department),
         user:profiles!sop_acknowledgements_user_id_fkey(full_name, department)`,
      )
      .order("acknowledged_at", { ascending: false })
      .limit(maxRows)
    if (fromIso) q = q.gte("acknowledged_at", fromIso)
    if (toIso) q = q.lte("acknowledged_at", toIso)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    const headers = ["User", "User Dept", "SOP Number", "SOP Title", "SOP Dept", "Version", "Acknowledged At"]
    const rows = (data ?? []).map((e: any) => [
      e.user?.full_name ?? "-",
      e.user?.department ?? "-",
      e.sop?.sop_number ?? "-",
      e.sop?.title ?? "-",
      e.sop?.department ?? "-",
      e.version ?? "-",
      new Date(e.acknowledged_at).toISOString(),
    ])
    return { headers, rows }
  }

  if (reportType === "pm-completion") {
    let q = service
      .from("pm_tasks")
      .select(
        `id, due_date, completed_at, notes,
         equipment:equipment_id(asset_id, name, department),
         assigned_to_user:profiles!pm_tasks_assigned_to_fkey(full_name),
         completed_by_user:profiles!pm_tasks_completed_by_fkey(full_name)`,
      )
      .eq("status", "complete")
      .order("completed_at", { ascending: false })
      .limit(maxRows)
    if (fromIso) q = q.gte("completed_at", fromIso)
    if (toIso) q = q.lte("completed_at", toIso)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    const headers = ["Asset ID", "Equipment", "Department", "Assigned To", "Completed By", "Due Date", "Done Date", "Notes"]
    const rows = (data ?? []).map((e: any) => [
      e.equipment?.asset_id ?? "-",
      e.equipment?.name ?? "-",
      e.equipment?.department ?? "-",
      e.assigned_to_user?.full_name ?? "-",
      e.completed_by_user?.full_name ?? "-",
      e.due_date ? new Date(e.due_date).toISOString().slice(0, 10) : "-",
      e.completed_at ? new Date(e.completed_at).toISOString() : "-",
      (e.notes ?? "").replace(/\r?\n/g, " "),
    ])
    return { headers, rows }
  }

  if (reportType === "pulse-notices") {
    let q = service
      .from("pulse_items")
      .select(
        `id, title, body, created_at, audience, target_department,
         sender:profiles!pulse_items_sender_id_fkey(full_name)`,
      )
      .eq("type", "notice")
      .order("created_at", { ascending: false })
      .limit(maxRows)
    if (fromIso) q = q.gte("created_at", fromIso)
    if (toIso) q = q.lte("created_at", toIso)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    const headers = ["Sender", "Audience", "Target Department", "Title", "Body", "Created At"]
    const rows = (data ?? []).map((e: any) => [
      e.sender?.full_name ?? "-",
      e.audience ?? "-",
      e.target_department ?? "-",
      e.title ?? "-",
      (e.body ?? "").replace(/\r?\n/g, " "),
      new Date(e.created_at).toISOString(),
    ])
    return { headers, rows }
  }

  if (reportType === "document-requests") {
    let q = service
      .from("document_requests")
      .select(
        `id, reference_number, requester_name, requester_department, requester_email,
         status, submitted_at, received_at, approved_at, fulfilled_at, qa_notes`,
      )
      .order("submitted_at", { ascending: false })
      .limit(maxRows)
    if (fromIso) q = q.gte("submitted_at", fromIso)
    if (toIso) q = q.lte("submitted_at", toIso)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    const headers = ["Ref", "Requester", "Department", "Email", "Status", "Submitted", "Received", "Approved", "Fulfilled", "QA Notes"]
    const rows = (data ?? []).map((e: any) => [
      e.reference_number ?? "-",
      e.requester_name ?? "-",
      e.requester_department ?? "-",
      e.requester_email ?? "-",
      e.status ?? "-",
      e.submitted_at ? new Date(e.submitted_at).toISOString() : "-",
      e.received_at ? new Date(e.received_at).toISOString() : "-",
      e.approved_at ? new Date(e.approved_at).toISOString() : "-",
      e.fulfilled_at ? new Date(e.fulfilled_at).toISOString() : "-",
      (e.qa_notes ?? "").replace(/\r?\n/g, " "),
    ])
    return { headers, rows }
  }

  if (reportType === "audit-trail") {
    let q = service
      .from("audit_log")
      .select(
        `id, action, entity_type, entity_id, metadata, created_at,
         actor:profiles!audit_log_actor_id_fkey(full_name, department)`,
      )
      .order("created_at", { ascending: false })
      .limit(maxRows)
    if (fromIso) q = q.gte("created_at", fromIso)
    if (toIso) q = q.lte("created_at", toIso)
    const { actorId, entityType, action } = args.extra as {
      actorId?: string
      entityType?: string
      action?: string
    }
    if (actorId) q = q.eq("actor_id", actorId)
    if (entityType) q = q.eq("entity_type", entityType)
    if (action) q = q.eq("action", action)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    const headers = ["Timestamp", "Actor", "Actor Dept", "Action", "Entity Type", "Entity ID", "Metadata"]
    const rows = (data ?? []).map((e: any) => [
      new Date(e.created_at).toISOString(),
      e.actor?.full_name ?? "-",
      e.actor?.department ?? "-",
      e.action ?? "-",
      e.entity_type ?? "-",
      e.entity_id ?? "-",
      JSON.stringify(e.metadata ?? {}),
    ])
    return { headers, rows }
  }

  return null
}

function rowsToCsv(headers: string[], rows: string[][]): string {
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v)
    return `"${s.replace(/"/g, '""')}"`
  }
  const lines = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))]
  return lines.join("\r\n")
}

/**
 * Record-only (no data returned). Called from the client BEFORE it triggers
 * an admin-gated local CSV download — gives us a log even when the client
 * builds the file from already-fetched data.
 *
 * Admin-only. If a non-admin calls this, we refuse silently (returns error).
 */
export async function recordReportExport(args: {
  reportType: string
  rowCount: number
  filters?: Record<string, unknown>
}): Promise<{ success: boolean; error?: string }> {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false, error: auth.error }
  await logReportExport({
    actorId: auth.userId,
    reportType: args.reportType,
    rowCount: args.rowCount,
    filters: args.filters,
  })
  return { success: true }
}
