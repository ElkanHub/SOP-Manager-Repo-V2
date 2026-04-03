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

    // Generate signed URL for signature and initials if they exist
    let signatureUrl = ""
    let initialsUrl = ""
    if (profile.signature_url) {
        const pathMatch = profile.signature_url.match(/signatures\/(.+)$/)
        const sigPath = pathMatch ? pathMatch[1] : `${user.id}/signature.png`
        const { data: signed } = await service.storage.from('signatures').createSignedUrl(sigPath, 3600)
        if (signed?.signedUrl) signatureUrl = signed.signedUrl
    }
    if (profile.initials_url) {
        const pathMatch = profile.initials_url.match(/signatures\/(.+)$/)
        const sigPath = pathMatch ? pathMatch[1] : `${user.id}/initials.png`
        const { data: signed } = await service.storage.from('signatures').createSignedUrl(sigPath, 3600)
        if (signed?.signedUrl) initialsUrl = signed.signedUrl
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

            // Batch sign all signatures and initials
            const pathsToSign: string[] = []
            allProfiles.forEach(p => {
                if (p.signature_url) {
                    const match = p.signature_url.match(/signatures\/(.+)$/)
                    if (match) pathsToSign.push(match[1])
                }
                if (p.initials_url) {
                    const match = p.initials_url.match(/signatures\/(.+)$/)
                    if (match) pathsToSign.push(match[1])
                }
            })

            let signedUrls: any[] = []
            if (pathsToSign.length > 0) {
                const { data } = await service.storage.from('signatures').createSignedUrls(pathsToSign, 3600)
                signedUrls = data || []
            }

            const getSignedUrl = (storedUrl?: string) => {
                if (!storedUrl) return ""
                const match = storedUrl.match(/signatures\/(.+)$/)
                if (!match) return ""
                const path = match[1]
                return signedUrls.find(s => s.path === path)?.signedUrl || ""
            }

            users = allProfiles.map((p) => ({
                ...p,
                notification_prefs: p.notification_prefs ?? { email: true, pulse: true },
                email: emailMap.get(p.id) ?? "",
                signature_url: getSignedUrl(p.signature_url),
                initials_url: getSignedUrl(p.initials_url),
            }))
        }
    }

    return (
        <SettingsClient
            profile={{
                ...profile,
                signature_url: signatureUrl,
                initials_url: initialsUrl,
                notification_prefs: profile.notification_prefs ?? { email: true, pulse: true },
            }}
            isAdmin={isAdmin}
            departments={(departments as Department[]) ?? []}
            users={users}
            currentUserId={user.id}
        />
    )
}
