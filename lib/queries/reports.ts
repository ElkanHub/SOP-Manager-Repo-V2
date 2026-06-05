import { createClient } from "@/lib/supabase/client"

const PAGE_SIZE = 50

interface DateParams {
  page: number
  dateFrom: string | null
  dateTo: string | null
}

// --- Change Control Log ---
export async function fetchSopChanges({ page, dateFrom, dateTo }: DateParams) {
  const supabase = createClient()
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from("change_controls")
    .select(
      `id, sop_id, cc_number, title, originating_department, old_version, new_version, status, created_at, completed_at,
       sops(sop_number, title, department),
       documents:change_control_documents(document_number, document_title, department, old_revision, new_revision),
       signatories:signature_certificates(id)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to)

  if (dateFrom) query = query.gte("created_at", dateFrom)
  if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59")

  const { data, count, error } = await query
  if (error) throw error

  return { data: data ?? [], count: count ?? 0, pageSize: PAGE_SIZE }
}

// --- Acknowledgements ---
export async function fetchAcknowledgements({ page, dateFrom, dateTo }: DateParams) {
  const supabase = createClient()
  const from = page * PAGE_SIZE

  let query = supabase
    .from("sop_acknowledgements")
    .select(
      `id, acknowledged_at, version,
       sop:sops(sop_number, title, department),
       user:profiles!sop_acknowledgements_user_id_fkey(full_name, department)`,
      { count: "exact" }
    )
    .order("acknowledged_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1)

  if (dateFrom) query = query.gte("acknowledged_at", dateFrom)
  if (dateTo) query = query.lte("acknowledged_at", dateTo + "T23:59:59")

  const { data, count, error } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0, pageSize: PAGE_SIZE }
}

// --- PM Completion ---
export async function fetchPmCompletions({ page, dateFrom, dateTo }: DateParams) {
  const supabase = createClient()
  const from = page * PAGE_SIZE

  let query = supabase
    .from("pm_tasks")
    .select(
      `id, completed_at, notes,
       equipment:equipment_id(asset_id, name, department),
       assigned_to_user:profiles!pm_tasks_assigned_to_fkey(full_name),
       completed_by_user:profiles!pm_tasks_completed_by_fkey(full_name)`,
      { count: "exact" }
    )
    .eq("status", "complete")
    .order("completed_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1)

  if (dateFrom) query = query.gte("completed_at", dateFrom)
  if (dateTo) query = query.lte("completed_at", dateTo + "T23:59:59")

  const { data, count, error } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0, pageSize: PAGE_SIZE }
}

// --- Pulse Notices ---
export async function fetchPulseNotices({ page, dateFrom, dateTo }: DateParams) {
  const supabase = createClient()
  const from = page * PAGE_SIZE

  let query = supabase
    .from("pulse_items")
    .select(
      `id, title, body, created_at, audience, target_department,
       sender:profiles!pulse_items_sender_id_fkey(full_name)`,
      { count: "exact" }
    )
    .eq("type", "notice")
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1)

  if (dateFrom) query = query.gte("created_at", dateFrom)
  if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59")

  const { data, count, error } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0, pageSize: PAGE_SIZE }
}

// --- Document Requests Report ---
export async function fetchDocumentRequests({ page, dateFrom, dateTo }: DateParams) {
  const supabase = createClient()
  const from = page * PAGE_SIZE

  let query = supabase
    .from('document_requests')
    .select(
      `id, reference_number, requester_id, requester_name, requester_department, requester_role, requester_job_title,
       requester_email, requester_employee_id, request_body,
       status, submitted_at, received_at, approved_at, fulfilled_at, qa_notes,
       received_by, approved_by, fulfilled_by, created_at, updated_at,
       received_by_profile:profiles!document_requests_received_by_fkey(id, full_name, avatar_url),
       approved_by_profile:profiles!document_requests_approved_by_fkey(id, full_name, avatar_url),
       fulfilled_by_profile:profiles!document_requests_fulfilled_by_fkey(id, full_name, avatar_url)`,
      { count: 'exact' }
    )
    .order('submitted_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)

  if (dateFrom) query = query.gte('submitted_at', dateFrom)
  if (dateTo) query = query.lte('submitted_at', dateTo + 'T23:59:59')

  const { data, count, error } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0, pageSize: PAGE_SIZE }
}

export async function fetchDocumentsDueForReview({ page, dateFrom, dateTo }: DateParams) {
  const supabase = createClient()
  const from = page * PAGE_SIZE
  const today = new Date().toISOString().slice(0, 10)
  const ninetyDays = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  let query = supabase
    .from("sops")
    .select(
      `id, sop_number, title, department, document_level, version, status, effective_date, due_for_revision, submitted_by,
       owner:profiles!sops_submitted_by_fkey(full_name, department)`,
      { count: "exact" }
    )
    .not("due_for_revision", "is", null)
    .gte("due_for_revision", dateFrom || today)
    .lte("due_for_revision", dateTo || ninetyDays)
    .order("due_for_revision", { ascending: true })
    .range(from, from + PAGE_SIZE - 1)

  const { data, count, error } = await query
  if (error) throw error
  return { data: data ?? [], count: count ?? 0, pageSize: PAGE_SIZE }
}
