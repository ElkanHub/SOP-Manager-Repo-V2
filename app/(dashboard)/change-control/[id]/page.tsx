import { redirect, notFound } from 'next/navigation'
import { createServiceClient, createClient } from '@/lib/supabase/server'
import { ChangeControlClient } from './change-control-client'

interface Props {
    params: Promise<{ id: string }>
}

export default async function ChangeControlPage({ params }: Props) {
    const { id } = await params
    
    const supabase = await createClient()
    const serviceClient = await createServiceClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await serviceClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile?.is_active) {
        redirect('/login?reason=inactive')
    }

    const { data: changeControl, error } = await serviceClient
        .from('change_controls')
        .select(`
            *,
            sops(id, sop_number, title, department, version)
        `)
        .eq('id', id)
        .single()

    if (error || !changeControl) {
        notFound()
    }

    const { data: signatureCertificates } = await serviceClient
        .from('signature_certificates')
        .select('*')
        .eq('change_control_id', id)

    const { data: isAdmin } = await serviceClient.rpc('is_admin', { user_id: user.id })

    const isSignatory = changeControl.required_signatories?.some(
        (s: any) => s.user_id === user.id
    ) || false

    const hasSigned = signatureCertificates?.some(
        cert => cert.user_id === user.id
    ) || false

    const isWaived = changeControl.required_signatories?.find(
        (s: any) => s.user_id === user.id
    )?.waived || false

    const canSign = profile.role === 'manager' && isSignatory && !hasSigned && !isWaived

    return (
        <ChangeControlClient 
            changeControl={changeControl}
            signatureCertificates={signatureCertificates || []}
            currentUserId={user.id}
            currentUserProfile={profile}
            isAdmin={isAdmin || false}
            canSign={canSign}
        />
    )
}
