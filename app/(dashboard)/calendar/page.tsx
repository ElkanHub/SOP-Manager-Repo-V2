import { redirect } from "next/navigation"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { addDays } from "date-fns"
import { CalendarClient } from "@/components/calendar/calendar-client"
import { Department, Equipment, Profile } from "@/types/app.types"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ month?: string }>
}

export default async function CalendarPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile || !profile.onboarding_complete) {
    redirect("/onboarding")
  }

  const params = await searchParams

  const today = new Date()
  const sixtyDaysFromNow = addDays(today, 60)
  const sixtyDaysAgo = addDays(today, -60)

  const { data: events } = await serviceClient
    .from("events")
    .select("*")
    .or(`visibility.eq.public,department.eq.${profile.department || "unknown"}`)
    .gte("start_date", sixtyDaysAgo.toISOString().split("T")[0])
    .lte("start_date", sixtyDaysFromNow.toISOString().split("T")[0])

  // Get visible equipment IDs
  let equipmentQuery = serviceClient.from("equipment").select("id")
  
  if (profile.department) {
    equipmentQuery = equipmentQuery.or(`department.eq.${profile.department},secondary_departments.cs.{${profile.department}}`)
  }

  const { data: equipment } = await equipmentQuery

  const equipmentIds = (equipment || []).map(eq => eq.id)

  let pmTasks: any[] = []
  if (equipmentIds.length > 0) {
    const { data } = await serviceClient
      .from("pm_tasks")
      .select(`
          due_date,
          equipment(id, name, department, secondary_departments, status)
      `)
      .in("equipment_id", equipmentIds)
      .neq("status", "complete")
      .gte("due_date", sixtyDaysAgo.toISOString().split("T")[0])
      .lte("due_date", sixtyDaysFromNow.toISOString().split("T")[0])
    
    pmTasks = data || []
  }

  const equipmentPmDates = pmTasks.map((task: any) => ({
    date: task.due_date,
    equipment: task.equipment as Equipment,
  }))

  return (
    <CalendarClient
      events={events || []}
      equipmentPmDates={equipmentPmDates}
      profile={profile as Profile}
    />
  )
}
