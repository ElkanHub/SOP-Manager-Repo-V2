import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import type { SopBuilderProfile } from "./types"

export async function requireSopBuilderUser() {
  const client = await createClient()
  const { data: { user }, error: authError } = await client.auth.getUser()
  if (authError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const service = await createServiceClient()
  const { data: profile } = await service
    .from("profiles")
    .select("id, is_active, is_admin, role, department, full_name")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.is_active) {
    return { error: NextResponse.json({ error: "Inactive account" }, { status: 403 }) }
  }

  const { data: isQa } = await service.rpc("is_qa_manager", { user_id: user.id })
  const canUse = Boolean(profile.is_admin || profile.role === "manager" || isQa)
  if (!canUse) {
    return { error: NextResponse.json({ error: "AI SOP Builder is available to QA, admins, and managers." }, { status: 403 }) }
  }

  return { user, profile: profile as SopBuilderProfile, service, isQa: Boolean(isQa) }
}

export async function requireSopBuilderTemplateManager() {
  const ctx = await requireSopBuilderUser()
  if ("error" in ctx) return ctx

  if (!ctx.profile.is_admin && !ctx.isQa) {
    return { error: NextResponse.json({ error: "Only QA and admins can manage SOP templates." }, { status: 403 }) }
  }

  return ctx
}

