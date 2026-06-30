import { redirect } from "next/navigation"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { IntakeClient, type IntakeSop } from "@/components/intake/intake-client"
import type { Department, Profile } from "@/types/app.types"

export const dynamic = "force-dynamic"

export default async function IntakePage() {
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) redirect("/login")

    const service = await createServiceClient()
    const { data: profile } = await service
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

    if (!profile) redirect("/login")
    if (!profile.is_active) redirect("/login?reason=inactive")
    if (!profile.onboarding_complete) redirect("/onboarding")

    const [{ data: departments }, { data: activeSops }] = await Promise.all([
        service.from("departments").select("*").order("name"),
        service
            .from("sops")
            .select("id, sop_number, title, department, status, locked, document_level, version, training_required")
            .eq("status", "active")
            .order("document_level", { ascending: true })
            .order("sop_number", { ascending: true }),
    ])

    return (
        <IntakeClient
            profile={profile as Profile}
            departments={(departments || []) as Department[]}
            activeSops={(activeSops || []) as IntakeSop[]}
        />
    )
}
