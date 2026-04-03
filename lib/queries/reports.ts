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
      `id, old_version, new_version, status, created_at, completed_at,
       sops(sop_number, title, department),
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
      `id, reference_number, requester_name, requester_department, requester_role,
       requester_email, requester_employee_id, request_body,
       status, submitted_at, received_at, approved_at, fulfilled_at, qa_notes,
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

