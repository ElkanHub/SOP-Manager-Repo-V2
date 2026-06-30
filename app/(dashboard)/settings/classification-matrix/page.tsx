import { createClient, createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ShieldAlert } from "lucide-react"
import { ClassificationMatrixEditor } from "@/components/classification-matrix/classification-matrix-editor"
import type { ClassificationMatrixRow } from "@/types/app.types"

export const metadata = {
    title: "Classification Matrix — QMS-MANAJA",
    description: "QA-controlled rules that drive who must sign each class of change.",
}

const ORDER: Record<ClassificationMatrixRow["classification"], number> = {
    minor: 0,
    major: 1,
    critical: 2,
}

export default async function ClassificationMatrixPage() {
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) redirect("/login")

    const service = await createServiceClient()
    const { data: profile } = await service
        .from("profiles")
        .select("id, role, is_admin, is_active")
        .eq("id", user.id)
        .single()

    if (!profile?.is_active) redirect("/login?reason=inactive")

    const { data: isQa } = await service.rpc("is_qa_manager", { user_id: user.id })
    const isAuthorized = profile.is_admin === true || isQa === true

    if (!isAuthorized) {
        return (
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
                    <ShieldAlert className="size-6 text-destructive" />
                </div>
                <h1 className="text-lg font-semibold text-foreground">QA only</h1>
                <p className="text-sm text-muted-foreground">
                    The classification matrix governs the signature set for every change. Only QA
                    managers can view or edit it.
                </p>
            </div>
        )
    }

    const { data: rows } = await service
        .from("classification_matrix")
        .select("*")

    const sorted = ((rows as ClassificationMatrixRow[]) ?? []).sort(
        (a, b) => ORDER[a.classification] - ORDER[b.classification],
    )

    return <ClassificationMatrixEditor rows={sorted} />
}
