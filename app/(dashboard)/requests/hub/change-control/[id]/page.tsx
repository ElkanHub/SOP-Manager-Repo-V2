import { redirect, notFound } from "next/navigation"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { ChangeControlPackageClient } from "@/components/change-control/change-control-package-client"
import type { ChangeControlDocumentRecord, ChangeControlPackage, CcSignatory, SignatureCertificate } from "@/types/app.types"

interface Props { params: Promise<{ id: string }> }

export const dynamic = "force-dynamic"

export default async function ChangeControlHubDetailPage({ params }: Props) {
    const { id } = await params
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) redirect("/login")

    const service = await createServiceClient()
    const { data: profile } = await service.from("profiles").select("*").eq("id", user.id).single()
    if (!profile?.is_active) redirect("/login?reason=inactive")

    const { data: isQa } = await service.rpc("is_qa_manager", { user_id: user.id })
    const { data: isAdmin } = await service.rpc("is_admin", { user_id: user.id })
    if (!isQa && !isAdmin) redirect("/requests")

    const { data: cc } = await service
        .from("change_controls")
        .select(`*, documents:change_control_documents(*)`)
        .eq("id", id)
        .single()
    if (!cc) notFound()

    const { data: certs } = await service
        .from("signature_certificates")
        .select("*")
        .eq("change_control_id", id)

    const rawSignatories: CcSignatory[] = (cc.required_signatories as CcSignatory[]) || []
    const ids = rawSignatories.map((s) => s.user_id)
    const { data: avatars } = await service
        .from("profiles")
        .select("id, avatar_url")
        .in("id", ids.length ? ids : [""])
    const signatories = rawSignatories.map((s) => ({
        ...s,
        avatar_url: avatars?.find((a) => a.id === s.user_id)?.avatar_url || null,
    })) as CcSignatory[]

    const hasSigned = (certs || []).some((c) => c.user_id === user.id)
    const isWaived = rawSignatories.find((s) => s.user_id === user.id)?.waived || false
    const isSignatory = rawSignatories.some((s) => s.user_id === user.id)
    const canSign = profile.role === "manager" && isSignatory && !hasSigned && !isWaived

    const documents = ((cc.documents || []) as ChangeControlDocumentRecord[]).slice().sort((a, b) =>
        `${a.document_level}-${a.document_number}`.localeCompare(`${b.document_level}-${b.document_number}`))

    return (
        <ChangeControlPackageClient
            pkg={cc as ChangeControlPackage}
            documents={documents}
            signatories={signatories}
            signatureCertificates={(certs || []) as SignatureCertificate[]}
            currentUserId={user.id}
            isAdmin={!!isAdmin}
            isQa={!!isQa}
            canSign={canSign}
            isRequester={false}
            currentUserSignatureUrl={profile.signature_url}
        />
    )
}
