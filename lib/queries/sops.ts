import { createClient } from "@/lib/supabase/client"

const PAGE_SIZE = 25

interface FetchSopPageParams {
  page: number
  department: string
  role: "manager" | "employee"
  isAdmin: boolean
  isQa: boolean
  statusFilter?: string
}

export async function fetchSopPage({ page, department, role, isAdmin, isQa, statusFilter }: FetchSopPageParams) {
  const supabase = createClient()

  let query = supabase
    .from("sops")
    .select("*, departments(colour)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  // Apply role-based filters matching the server-side logic
  if (role === "employee") {
    query = query.eq("status", "active")
  } else if (statusFilter) {
    query = query.eq("status", statusFilter)
  } else if (!isAdmin) {
    query = query.in("status", ["draft", "pending_qa", "pending_cc", "active"])
  }

  // Scope to department unless admin or QA manager
  if (!isAdmin && !isQa) {
    query = query.or(`department.eq.${department},secondary_departments.cs.{${department}}`)
  }

  const { data, count, error } = await query

  if (error) throw error
  return { data: data ?? [], count: count ?? 0, pageSize: PAGE_SIZE }
}
