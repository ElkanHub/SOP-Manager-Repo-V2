import { createClient } from "@/lib/supabase/client"

const PAGE_SIZE = 25

interface FetchSopPageParams {
  page: number
  department: string
  role: "manager" | "employee"
  isAdmin: boolean
  isQa: boolean
  statusFilter?: string
  levelFilter?: string
  departmentFilter?: string
}

export async function fetchSopPage({ page, department, role, isAdmin, isQa, statusFilter, levelFilter, departmentFilter }: FetchSopPageParams) {
  const supabase = createClient()

  let query = supabase
    .from("sops")
    .select("*, departments(colour, code)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  // Apply role-based filters matching the server-side logic
  if (role === "employee") {
    query = query.eq("status", "active")
  } else if (statusFilter) {
    query = query.eq("status", statusFilter)
  } else if (!isAdmin) {
    query = query.in("status", ["draft", "draft_in_review", "pending_hod", "pending_qa", "approved_pending_training", "pending_cc", "active", "superseded", "pending_destruction"])
  }

  // Scope to department unless admin or QA manager
  if (!isAdmin && !isQa) {
    query = query.or(`department.eq.${department},secondary_departments.cs.{${department}}`)
  } else if (departmentFilter) {
    query = query.eq("department", departmentFilter)
  }

  if (levelFilter) {
    query = query.eq("document_level", levelFilter)
  }

  const { data, count, error } = await query

  if (error) throw error
  return { data: data ?? [], count: count ?? 0, pageSize: PAGE_SIZE }
}
