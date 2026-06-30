import { createClient, createServiceClient } from "@/lib/supabase/server"
import type { JoinedRetirement } from "@/components/retirements/retirements-review-client"

/**
 * Shared server-side loader for the two retirement-review routes
 * (/requests/retirements and /requests/hub/retirements). Returns null when the
 * caller is not an authenticated, active, onboarded user — the page redirects.
 */
export async function loadRetirementsReview(): Promise<{ retirements: JoinedRetirement[]; isQa: boolean } | null> {
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) return null

    const service = await createServiceClient()
    const { data: profile } = await service
        .from("profiles")
        .select("id, is_active, is_admin, onboarding_complete")
        .eq("id", user.id)
        .single()

    if (!profile || !profile.is_active || !profile.onboarding_complete) return null

    const [{ data: rows }, { data: isQaManager }] = await Promise.all([
        service
            .from("retirements")
            .select(`
                *,
                document:sops!retirements_document_id_fkey(id, sop_number, title, department, version),
                requester:profiles!retirements_requester_id_fkey(id, full_name),
                approver:profiles!retirements_approver_id_fkey(id, full_name)
            `)
            .order("requested_at", { ascending: false })
            .limit(200),
        service.rpc("is_qa_manager", { user_id: user.id }),
    ])

    // PostgREST returns to-one embeds as objects, but normalise defensively.
    const retirements = ((rows || []) as Record<string, unknown>[]).map((row) => {
        const pick = <T,>(value: unknown): T | null => (Array.isArray(value) ? (value[0] ?? null) : (value ?? null)) as T | null
        return {
            ...row,
            document: pick(row.document),
            requester: pick(row.requester),
            approver: pick(row.approver),
        }
    }) as JoinedRetirement[]

    return { retirements, isQa: !!isQaManager || !!profile.is_admin }
}
