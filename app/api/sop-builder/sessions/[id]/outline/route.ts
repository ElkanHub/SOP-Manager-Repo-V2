import { NextResponse } from "next/server"
import { requireSopBuilderUser } from "@/lib/sop-builder/access"
import { isRouteError, loadSessionForUser } from "@/lib/sop-builder/api"
import { SopBuilderHarness, sopBuilderErrorMessage } from "@/lib/sop-builder/harness"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireSopBuilderUser()
  if ("error" in ctx) return ctx.error
  const { id } = await params
  const session = await loadSessionForUser(ctx.service, id)
  if (isRouteError(session)) return session

  try {
    await ctx.service.from("sop_builder_sessions").update({ status: "drafting" }).eq("id", session.id)
    const draft = await new SopBuilderHarness(ctx.service, ctx.user.id).generateOutline(session)
    return NextResponse.json({ draft })
  } catch (error) {
    await ctx.service.from("sop_builder_sessions").update({ status: "intake" }).eq("id", session.id)
    return NextResponse.json({ error: sopBuilderErrorMessage(error) }, { status: 500 })
  }
}

