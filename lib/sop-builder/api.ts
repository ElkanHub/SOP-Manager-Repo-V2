import { NextResponse } from "next/server"
import type { SopBuilderDraft, SopBuilderSession } from "./types"

type ServiceClient = Awaited<ReturnType<typeof import("@/lib/supabase/server").createServiceClient>>

export async function loadSessionForUser(
  service: ServiceClient,
  sessionId: string,
): Promise<SopBuilderSession | NextResponse> {
  const { data, error } = await service
    .from("sop_builder_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "SOP Builder session not found" }, { status: 404 })
  return data as SopBuilderSession
}

export async function loadDraftForUser(
  service: ServiceClient,
  draftId: string,
): Promise<SopBuilderDraft | NextResponse> {
  const { data, error } = await service
    .from("sop_builder_drafts")
    .select("*")
    .eq("id", draftId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Draft not found" }, { status: 404 })
  return data as SopBuilderDraft
}

export function isRouteError<T>(value: T | NextResponse): value is NextResponse {
  return value instanceof NextResponse
}

export function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

