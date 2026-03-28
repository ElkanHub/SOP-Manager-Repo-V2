import { createClient } from "@/lib/supabase/client"

const PAGE_SIZE = 25

interface FetchEquipmentPageParams {
  page: number
  department: string
  role: "manager" | "employee"
  isAdmin: boolean
  statusFilter?: string
}

export async function fetchEquipmentPage({ page, department, role, isAdmin, statusFilter }: FetchEquipmentPageParams) {
  const supabase = createClient()

  let query = supabase
    .from("equipment")
    .select("*, departments(colour), sops:linked_sop_id(id, title, sop_number)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  if (role === "employee") {
    query = query.eq("status", "active")
  } else if (statusFilter) {
    query = query.eq("status", statusFilter)
  } else if (!isAdmin) {
    query = query.in("status", ["pending_qa", "active", "inactive"])
  }

  if (!isAdmin && department !== "QA") {
    query = query.or(`department.eq.${department},secondary_departments.cs.{${department}}`)
  }

  const { data, count, error } = await query

  if (error) throw error
  return { data: data ?? [], count: count ?? 0, pageSize: PAGE_SIZE }
}
