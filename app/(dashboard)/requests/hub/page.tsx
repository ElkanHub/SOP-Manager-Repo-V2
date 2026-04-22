import { redirect } from "next/navigation"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { QaHubClient } from "./qa-hub-client"
import type { RequestForm, RequestFormSubmission, Department } from "@/types/app.types"

export const dynamic = "force-dynamic"

export default async function RequestsHubPage() {
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

    const { data: isQa } = await service.rpc("is_qa_manager", { user_id: user.id })
    if (!isQa && !profile.is_admin) {
        redirect("/requests")
    }

    const [{ data: forms }, { data: submissions }, { data: departments }] = await Promise.all([
        service
            .from("request_forms")
            .select(`
                *,
                fields:request_form_fields(id, position, label, helper_text, field_type, is_required, config, form_id, created_at)
            `)
            .order("created_at", { ascending: false }),
        service
            .from("request_form_submissions")
            .select(`
                *,
                form:request_forms(id, title),
                received_by_profile:profiles!request_form_submissions_received_by_fkey(id, full_name, avatar_url),
                approved_by_profile:profiles!request_form_submissions_approved_by_fkey(id, full_name, avatar_url),
                fulfilled_by_profile:profiles!request_form_submissions_fulfilled_by_fkey(id, full_name, avatar_url),
                rejected_by_profile:profiles!request_form_submissions_rejected_by_fkey(id, full_name, avatar_url)
            `)
            .order("submitted_at", { ascending: false })
            .limit(500),
        service.from("departments").select("*").order("name"),
    ])

    // Sort fields inside each form
    const formsSorted = ((forms || []) as RequestForm[]).map((f) => ({
        ...f,
        fields: (f.fields || []).slice().sort((a, b) => a.position - b.position),
    }))

    // Flatten single-element joined arrays in submissions
    const subsClean = ((submissions || []) as any[]).map((s) => {
        for (const k of ["form", "received_by_profile", "approved_by_profile", "fulfilled_by_profile", "rejected_by_profile"]) {
            if (Array.isArray(s[k])) s[k] = s[k][0] || null
        }
        return s
    }) as RequestFormSubmission[]

    return (
        <QaHubClient
            profile={profile}
            forms={formsSorted}
            submissions={subsClean}
            departments={(departments || []) as Department[]}
        />
    )
}
