import { redirect } from "next/navigation"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NewRequestsClient } from "@/components/requests/new-requests-client"
import type { RequestForm, RequestFormSubmission } from "@/types/app.types"

export const dynamic = "force-dynamic"

export default async function RequestsPage() {
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
    const isQaOrAdmin = !!(isQa || profile.is_admin)

    const [{ data: publishedForms }, { data: mySubs }] = await Promise.all([
        service
            .from("request_forms")
            .select(`
                *,
                fields:request_form_fields(id, position, label, helper_text, field_type, is_required, config, form_id, created_at)
            `)
            .eq("is_published", true)
            .eq("is_archived", false)
            .order("created_at", { ascending: false }),
        service
            .from("request_form_submissions")
            .select(`
                *,
                form:request_forms(id, title)
            `)
            .eq("requester_id", user.id)
            .order("submitted_at", { ascending: false })
            .limit(200),
    ])

    const formsSorted = ((publishedForms || []) as RequestForm[]).map((f) => ({
        ...f,
        fields: (f.fields || []).slice().sort((a, b) => a.position - b.position),
    }))

    const submissionsClean = ((mySubs || []) as any[]).map((s) => {
        if (Array.isArray(s.form)) s.form = s.form[0] || null
        return s
    }) as RequestFormSubmission[]

    return (
        <NewRequestsClient
            profile={profile}
            isQa={isQaOrAdmin}
            publishedForms={formsSorted}
            mySubmissions={submissionsClean}
        />
    )
}
