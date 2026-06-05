import { redirect } from "next/navigation"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { ChangeControlHubClient } from "@/components/change-control/change-control-hub-client"
import type { ChangeControlDocumentRecord, ChangeControlPackage, Department, Profile } from "@/types/app.types"

export const dynamic = "force-dynamic"

export default async function ChangeControlHubPage() {
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
    if (!isQa && !profile.is_admin) redirect("/requests")

    const [{ data: departments }, { data: changeControls }] = await Promise.all([
        service.from("departments").select("*").order("name"),
        service
            .from("change_controls")
            .select(`
                *,
                documents:change_control_documents(*),
                requester:profiles!change_controls_requester_id_fkey(id, full_name, avatar_url, department, role),
                qa_owner:profiles!change_controls_qa_owner_id_fkey(id, full_name, avatar_url, department, role)
            `)
            .order("created_at", { ascending: false })
            .limit(500),
    ])

    type JoinedChangeControlPackage = ChangeControlPackage & {
        requester?: ChangeControlPackage["requester"] | Profile[]
        qa_owner?: ChangeControlPackage["qa_owner"] | Profile[]
        documents?: ChangeControlDocumentRecord[]
    }

    const packages = ((changeControls || []) as JoinedChangeControlPackage[]).map((cc) => {
        if (Array.isArray(cc.requester)) cc.requester = cc.requester[0] || null
        if (Array.isArray(cc.qa_owner)) cc.qa_owner = cc.qa_owner[0] || null
        cc.documents = (cc.documents || []).slice().sort((a, b) =>
            `${a.document_level}-${a.document_number}`.localeCompare(`${b.document_level}-${b.document_number}`),
        )
        return cc
    }) as ChangeControlPackage[]

    return (
        <ChangeControlHubClient
            departments={(departments || []) as Department[]}
            changeControls={packages}
        />
    )
}
