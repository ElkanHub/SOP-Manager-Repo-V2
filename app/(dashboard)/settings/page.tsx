import { createClient, createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SettingsClient } from "@/components/settings/settings-client"
import type { Profile, Department } from "@/types/app.types"

export const metadata = {
    title: "Settings — SOP-Guard Pro",
    description: "Manage your profile, notifications, departments, and users.",
}

export default async function SettingsPage() {
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const service = await createServiceClient()

    // Fetch the current user's profile
    const { data: profile, error: profileError } = await service
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (profileError || !profile) {
        redirect('/login')
    }

    if (!profile.is_active) {
        redirect('/login?reason=inactive')
    }

    const isAdmin = profile.is_admin === true

    // Always fetch departments (needed for non-admin dropdowns too... but mainly for admin tab)
    const { data: departments } = await service
        .from('departments')
        .select('*')
        .order('name')

    // Admin-only: fetch all users
    let users: (Profile & { email?: string })[] = []
    if (isAdmin) {
        const { data: allProfiles } = await service
            .from('profiles')
            .select('*')
            .order('full_name')

        if (allProfiles) {
            // Fetch auth user emails via admin API (server-side only)
            const { data: authUsers } = await service.auth.admin.listUsers({ perPage: 1000 })
            const emailMap = new Map<string, string>()
            authUsers?.users?.forEach((u) => {
                if (u.email) emailMap.set(u.id, u.email)
            })

            users = allProfiles.map((p) => ({
                ...p,
                notification_prefs: p.notification_prefs ?? { email: true, pulse: true },
                email: emailMap.get(p.id) ?? "",
            }))
        }
    }

    return (
        <SettingsClient
            profile={{
                ...profile,
                notification_prefs: profile.notification_prefs ?? { email: true, pulse: true },
            }}
            isAdmin={isAdmin}
            departments={(departments as Department[]) ?? []}
            users={users}
            currentUserId={user.id}
        />
    )
}
