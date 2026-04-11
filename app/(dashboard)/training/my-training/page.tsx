import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MyTrainingClient from './my-training-client'

export const metadata = { title: 'My Training | SOP Manager' }

export default async function MyTrainingPage() {
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()

    if (!user) redirect('/login')

    const serviceClient = await createServiceClient()
    
    const { data: profile } = await serviceClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile?.is_active) {
        redirect('/dashboard')
    }

    const { data: assignments } = await serviceClient
        .from('training_assignments')
        .select(`
            *,
            module:training_modules(
                id, title, description, department, is_mandatory, deadline, status, sop_id, sop_version, slide_deck,
                sop:sops(sop_number),
                questionnaires:training_questionnaires(id, status, version)
            )
        `)
        .eq('assignee_id', user.id)
        .order('assigned_at', { ascending: false })

    const { data: attempts } = await serviceClient
        .from('training_attempts')
        .select('*')
        .eq('respondent_id', user.id)

    return (
        <MyTrainingClient 
            assignments={assignments || []} 
            attempts={attempts || []}
            profile={profile}
        />
    )
}
