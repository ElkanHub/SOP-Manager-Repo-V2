import { redirect, notFound } from 'next/navigation'
import { createServiceClient, createClient } from '@/lib/supabase/server'
import { EquipmentDetailClient } from './equipment-detail-client'

interface Props {
    params: Promise<{ id: string }>
}

export default async function EquipmentDetailPage({ params }: Props) {
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

    const { data: equipment, error } = await serviceClient
        .from('equipment')
        .select(`
            *,
            departments(colour),
            profiles!equipment_initial_assignee_id_fkey(id, full_name, department, role)
        `)
        .eq('id', id)
        .single()

    if (error || !equipment) {
        notFound()
    }

    const { data: isQa } = await serviceClient.rpc('is_qa_manager', { user_id: user.id })

    const { data: pmTasks } = await serviceClient
        .from('pm_tasks')
        .select(`
            *,
            profiles!pm_tasks_assigned_to_fkey(id, full_name, avatar_url, department)
        `)
        .eq('equipment_id', id)
        .order('due_date', { ascending: true })

    const { data: assignableUsers } = await serviceClient
        .from('profiles')
        .select('id, full_name, department, role')
        .eq('is_active', true)
        .order('full_name')

    return (
        <EquipmentDetailClient 
            equipment={equipment}
            pmTasks={pmTasks || []}
            currentUserId={user.id}
            currentUserProfile={profile}
            isQa={isQa || false}
            assignableUsers={assignableUsers || []}
        />
    )
}
