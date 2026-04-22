import { notFound, redirect } from "next/navigation"
import { createServiceClient, createClient } from "@/lib/supabase/server"
import { EquipmentPublicView } from "./equipment-public-view"

export const dynamic = "force-dynamic"

interface Props {
    params: Promise<{ id: string }>
}

export default async function PublicEquipmentPage({ params }: Props) {
    const { id } = await params

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
        notFound()
    }

    const service = await createServiceClient()

    const { data: equipment } = await service
        .from("equipment")
        .select(`
            id, asset_id, name, department, status, photo_url, serial_number, model,
            frequency, custom_interval_days, last_serviced, next_due,
            sops:linked_sop_id(id, title, sop_number)
        `)
        .eq("id", id)
        .single()

    if (!equipment) {
        notFound()
    }

    // If scanner is logged in, figure out whether they should jump straight
    // into the authenticated app view (assignee, dept manager, or admin).
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()

    if (user) {
        const { data: profile } = await service
            .from("profiles")
            .select("id, is_active, role, is_admin, department, onboarding_complete, signup_status")
            .eq("id", user.id)
            .single()

        const sessionReady =
            profile?.is_active &&
            profile.signup_status === "approved" &&
            profile.onboarding_complete

        if (sessionReady) {
            const { data: pendingTask } = await service
                .from("pm_tasks")
                .select("assigned_to")
                .eq("equipment_id", id)
                .neq("status", "complete")
                .order("due_date", { ascending: true })
                .limit(1)
                .maybeSingle()

            const isAssigned = pendingTask?.assigned_to === user.id
            const isDeptManager =
                profile.role === "manager" && profile.department === equipment.department
            const isSecondaryDeptManager =
                profile.role === "manager" &&
                (equipment as any).secondary_departments?.includes(profile.department)
            const isAdmin = profile.is_admin

            if (isAssigned || isDeptManager || isSecondaryDeptManager || isAdmin) {
                redirect(`/equipment/${id}`)
            }
        }
    }

    const { data: nextTask } = await service
        .from("pm_tasks")
        .select(`
            id, due_date, status,
            profiles:assigned_to(id, full_name, department, avatar_url)
        `)
        .eq("equipment_id", id)
        .neq("status", "complete")
        .order("due_date", { ascending: true })
        .limit(1)
        .maybeSingle()

    return (
        <EquipmentPublicView
            equipment={equipment as any}
            nextTask={nextTask as any}
            viewerIsAuthenticated={!!user}
            equipmentId={id}
        />
    )
}
