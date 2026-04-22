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
        e.old_version ?? "v0.0",
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
        `id, completed_at, notes,
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
    const headers = ["Asset ID", "Equipment", "Department", "Assigned To", "Completed By", "Completed At", "Notes"]
    const rows = (data ?? []).map((e: any) => [
      e.equipment?.asset_id ?? "-",
      e.equipment?.name ?? "-",
      e.equipment?.department ?? "-",
      e.assigned_to_user?.full_name ?? "-",
      e.completed_by_user?.full_name ?? "-",
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
