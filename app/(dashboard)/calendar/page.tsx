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

  const { data: events } = await serviceClient
    .from("events")
    .select("*")
    .or(`visibility.eq.public,department.eq.${profile.department}`)
    .gte("start_date", today.toISOString().split("T")[0])
    .lte("start_date", sixtyDaysFromNow.toISOString().split("T")[0])

  const { data: equipment } = await serviceClient
    .from("equipment")
    .select("id, name, department, secondary_departments, next_due, status")
    .eq("status", "active")
    .or(`department.eq.${profile.department},secondary_departments.cs.{${profile.department}}`)
    .gte("next_due", today.toISOString().split("T")[0])
    .lte("next_due", sixtyDaysFromNow.toISOString().split("T")[0])

  const equipmentPmDates = (equipment || [])
    .filter((eq) => eq.next_due)
    .map((eq) => ({
      date: eq.next_due!,
      equipment: eq as Equipment,
    }))

  return (
    <CalendarClient
      events={events || []}
      equipmentPmDates={equipmentPmDates}
      profile={profile as Profile}
    />
  )
}
