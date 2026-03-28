import { createClient } from "@/lib/supabase/client"

const PAGE_SIZE = 50

interface DateParams {
  page: number
  dateFrom: string | null
  dateTo: string | null
}

// --- SOP Change History ---
export async function fetchSopChanges({ page, dateFrom, dateTo }: DateParams) {
  const supabase = createClient()
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from("audit_log")
    .select(
      `id, action, entity_type, entity_id, created_at, actor_id,
       actor:profiles!actor_id(full_name, department)`,
      { count: "exact" }
    )
    .in("entity_type", ["sop", "change_control"])
    .order("created_at", { ascending: false })
    .range(from, to)

  if (dateFrom) query = query.gte("created_at", dateFrom)
  if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59")

  const { data: logs, count, error } = await query
  if (error) throw error
  if (!logs || logs.length === 0) return { data: [], count: 0, pageSize: PAGE_SIZE }

  const sopIds = logs.filter((l) => l.entity_type === "sop").map((l) => l.entity_id)
  const ccIds = logs.filter((l) => l.entity_type === "change_control").map((l) => l.entity_id)

  const [{ data: sops }, { data: ccs }] = await Promise.all([
    supabase.from("sops").select("id, sop_number").in("id", sopIds.length ? sopIds : [""]),
    supabase.from("change_controls").select("id, sop_id, sops(sop_number)").in("id", ccIds.length ? ccIds : [""]),
  ])

  const enriched = logs.map((log) => {
    let sopNumber = "-"
    if (log.entity_type === "sop") {
      sopNumber = sops?.find((s) => s.id === log.entity_id)?.sop_number || "-"
    } else if (log.entity_type === "change_control") {
      const cc = ccs?.find((c) => c.id === log.entity_id)
      sopNumber = (cc?.sops as any)?.sop_number || "-"
    }
    return { ...log, sop_number: sopNumber }
  })

  return { data: enriched, count: count ?? 0, pageSize: PAGE_SIZE }
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
