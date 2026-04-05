import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TrainingClient from './training-client'

export const metadata = { title: 'Training Hub | SOP Manager' }

export default async function TrainingPage() {
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()

    if (!user) redirect('/login')

    const serviceClient = await createServiceClient()
    
    const { data: profile } = await serviceClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile?.is_active || (profile.role !== 'manager' && profile.role !== 'admin')) {
        redirect('/dashboard') // Or some unauthorized page
    }

    const { data: isQaResult } = await serviceClient.rpc('is_qa_manager', { user_id: user.id })
    const isQa = !!isQaResult

    const { data: modules } = await serviceClient
        .from('training_modules')
        .select(`
            *,
            sop:sops(id, title, version, status, sop_number),
            creator:profiles(id, full_name, avatar_url)
        `)
        // Service role ignores RLS, so we enforce access manually
        .or(isQa ? 'status.not.is.null' : `created_by.eq.${user.id}`)
        .order('updated_at', { ascending: false })

    const { data: sops } = await serviceClient
        .from('sops')
        .select('id, title, version, status, sop_number, department')
        .eq('status', 'active')
        .or(isQa ? 'status.not.is.null' : `department.eq.${profile.department}`)
        .order('title', { ascending: true })

    return (
        <TrainingClient 
            modules={modules || []} 
            activeSops={sops || []} 
            profile={profile}
            isQa={isQa}
        />
    )
}
