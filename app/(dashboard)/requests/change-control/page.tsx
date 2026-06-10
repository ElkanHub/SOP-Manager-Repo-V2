import { redirect } from "next/navigation"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { ChangeControlRequestClient } from "@/components/change-control/change-control-request-client"
import type { ChangeControlDocumentRecord, ChangeControlPackage, Department, Profile, SopRecord } from "@/types/app.types"

export const dynamic = "force-dynamic"

export default async function ChangeControlRequestsPage() {
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

    const [{ data: departments }, { data: activeSops }, { data: changeControls }] = await Promise.all([
        service.from("departments").select("*").order("name"),
        service
            .from("sops")
            .select("id, sop_number, title, department, document_level, version, training_required")
            .eq("status", "active")
            .order("document_level", { ascending: true })
            .order("sop_number", { ascending: true }),
        service
            .from("change_controls")
            .select(`
                *,
                documents:change_control_documents(*),
                requester:profiles!change_controls_requester_id_fkey(id, full_name, avatar_url, department, role),
                qa_owner:profiles!change_controls_qa_owner_id_fkey(id, full_name, avatar_url, department, role)
            `)
            .eq("requester_id", user.id)
            .order("created_at", { ascending: false })
            .limit(200),
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
        <ChangeControlRequestClient
            profile={profile}
            departments={(departments || []) as Department[]}
            activeSops={(activeSops || []) as Pick<SopRecord, "id" | "sop_number" | "title" | "department" | "document_level" | "version" | "training_required">[]}
            myChangeControls={packages}
        />
    )
}
