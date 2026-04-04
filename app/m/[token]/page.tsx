import { createServiceClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { MobileSignClient } from "./mobile-sign-client"

export const dynamic = 'force-dynamic'

interface MobileSignPageProps {
    params: Promise<{ token: string }>
}

export default async function MobileSignPage({ params }: MobileSignPageProps) {
    const { token } = await params

    // Validate UUID format to prevent SQL injection / garbage lookups
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(token)) {
        notFound()
    }

    // Use service client to bypass RLS for the initial validation check.
    // This ensures we can accurately check status & expiry even if RLS
    // policies change in the future.
    const supabase = await createServiceClient()

    const { data: record } = await supabase
        .from('mobile_signatures')
        .select('id, status, expires_at')
        .eq('id', token)
        .single()

    if (!record) {
        notFound()
    }

    const isExpired = new Date(record.expires_at) <= new Date()
    const isCompleted = record.status === 'completed'

    return (
        <MobileSignClient
            token={token}
            initialExpired={isExpired}
            initialCompleted={isCompleted}
            expiresAt={record.expires_at}
        />
    )
}
