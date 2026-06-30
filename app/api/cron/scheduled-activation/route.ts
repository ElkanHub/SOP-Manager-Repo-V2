import { createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Flips SOPs in the `scheduled` state to `active` once their effective date arrives
// (spec §6.6 — approval is decoupled from effectiveness). activate_scheduled_sops()
// runs the atomic activation/supersession for each due SOP. Idempotent: only SOPs with
// effective_date <= today are activated, so repeated runs are safe.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 })
  }
  if (process.env.NODE_ENV === 'production' && token !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createServiceClient()
  const { data, error } = await supabase.rpc('activate_scheduled_sops')
  if (error) {
    console.error('scheduled-activation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ activated: data ?? 0 })
}
