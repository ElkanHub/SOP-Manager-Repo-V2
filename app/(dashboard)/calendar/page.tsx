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
  const oneEightyDaysFromNow = addDays(today, 180)
  const sixtyDaysAgo = addDays(today, -60)

  const { data: events } = await serviceClient
    .from("events")
    .select("*")
    .or(`visibility.eq.public,department.eq.${profile.department || "unknown"}`)
    .gte("start_date", sixtyDaysAgo.toISOString().split("T")[0])
    .lte("start_date", oneEightyDaysFromNow.toISOString().split("T")[0])

  // 1. Get visible equipment
  let equipmentQuery = serviceClient
    .from("equipment")
    .select("id, name, department, secondary_departments, status, next_due, frequency, custom_interval_days")
    .eq("status", "active")
  
  if (profile.department) {
    equipmentQuery = equipmentQuery.or(`department.eq.${profile.department},secondary_departments.cs.{${profile.department}}`)
  }

  const { data: equipment } = await equipmentQuery
  const equipmentIds = (equipment || []).map(eq => eq.id)
  const equipmentMap = new Map((equipment || []).map(eq => [eq.id, eq]))

  // 2. Get Real PM Tasks (Pending/Overdue)
  let realPmTasks: any[] = []
  if (equipmentIds.length > 0) {
    const { data } = await serviceClient
      .from("pm_tasks")
      .select(`
          due_date,
          equipment_id
      `)
      .in("equipment_id", equipmentIds)
      .neq("status", "complete")
      .gte("due_date", sixtyDaysAgo.toISOString().split("T")[0])
      .lte("due_date", oneEightyDaysFromNow.toISOString().split("T")[0])
    
    realPmTasks = data || []
  }

  // 3. Get Projected PM Dates (Future cycles)
  let projectedPmDates: any[] = []
  if (equipmentIds.length > 0) {
    const { data } = await serviceClient.rpc('get_all_projected_pm_dates', {
      p_equipment_ids: equipmentIds,
      p_end_date: oneEightyDaysFromNow.toISOString().split('T')[0]
    })
    projectedPmDates = data || []
  }

  // 4. Merge and De-duplicate (Show real tasks if they exist for a day, else show projected)
  const equipmentPmDates: { date: string; equipment: Equipment }[] = []
  const seenToday = new Set<string>() // "equipmentId-date"

  // First, add all real tasks
  realPmTasks.forEach(task => {
    const eq = equipmentMap.get(task.equipment_id)
    if (eq) {
      equipmentPmDates.push({ date: task.due_date, equipment: eq as any as Equipment })
      seenToday.add(`${task.equipment_id}-${task.due_date}`)
    }
  })

  // Then, add projected dates ONLY if a real task doesn't already exist for that day
  projectedPmDates.forEach(proj => {
    const dateStr = proj.occurrence
    const key = `${proj.equipment_id}-${dateStr}`
    if (!seenToday.has(key)) {
      const eq = equipmentMap.get(proj.equipment_id)
      if (eq) {
        equipmentPmDates.push({ date: dateStr, equipment: eq as any as Equipment })
        seenToday.add(key)
      }
    }
  })

  return (
    <CalendarClient
      events={events || []}
      equipmentPmDates={equipmentPmDates}
      profile={profile as Profile}
    />
  )
}
