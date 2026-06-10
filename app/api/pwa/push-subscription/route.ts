import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

type PushSubscriptionPayload = {
  endpoint?: string
  expirationTime?: number | null
  keys?: {
    p256dh?: string
    auth?: string
  }
}

function expirationToIso(expirationTime: number | null | undefined) {
  return typeof expirationTime === "number"
    ? new Date(expirationTime).toISOString()
    : null
}

export async function POST(request: Request) {
  const client = await createClient()
  const {
    data: { user },
  } = await client.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = (await request.json()) as PushSubscriptionPayload
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 })
  }

  const service = await createServiceClient()
  const { error } = await service
    .from("pwa_push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        expiration_time: expirationToIso(body.expirationTime),
        user_agent: request.headers.get("user-agent"),
        is_active: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const client = await createClient()
  const {
    data: { user },
  } = await client.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { endpoint?: string }
  if (!body.endpoint) {
    return NextResponse.json({ error: "Endpoint is required" }, { status: 400 })
  }

  const service = await createServiceClient()
  const { error } = await service
    .from("pwa_push_subscriptions")
    .update({ is_active: false, last_seen_at: new Date().toISOString() })
    .eq("endpoint", body.endpoint)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
