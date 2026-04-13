import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ModuleDetailClient from './module-detail-client'

export const metadata = { title: 'Module Details | SOP Manager' }

export default async function ModulePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
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
        redirect('/dashboard')
    }

    const { data: isQaResult } = await serviceClient.rpc('is_qa_manager', { user_id: user.id })
    const isQa = !!isQaResult

    const { data: moduleData } = await serviceClient
        .from('training_modules')
        .select(`
            *,
            sop:sops(id, title, version, status, sop_number, file_url),
            creator:profiles(id, full_name, avatar_url)
        `)
        .eq('id', id)
        .single()

    if (!moduleData) notFound()

    // Enforce access manually
    if (!isQa && moduleData.created_by !== user.id) {
        redirect('/training')
    }

    // Fetch dependent data
    const [qRes, assignRes, attemptRes, deptRes] = await Promise.all([
        serviceClient.from('training_questionnaires')
            .select(`*, questions:training_questions(*)`)
            .eq('module_id', id)
            .order('created_at', { ascending: false }),
            
        serviceClient.from('training_assignments')
            .select(`*, assignee:profiles!training_assignments_assignee_id_fkey(id, full_name, avatar_url, department)`)
            .eq('module_id', id),

        serviceClient.from('training_attempts')
            .select(`*, respondent:profiles(id, full_name, department)`)
            .eq('module_id', id)
            .order('submitted_at', { ascending: false }),
            
        serviceClient.from('profiles')
            .select('id, full_name, department, role, is_active')
            .eq('is_active', true)
    ])

    // available users for assignment (same department unless QA)
    let availableUsers = deptRes.data || []
    if (!isQa) {
        availableUsers = availableUsers.filter(u => u.department === profile.department)
    }
    // mark already assigned users
    const assignedIds = new Set(assignRes.data?.map(a => a.assignee_id) || [])
    availableUsers = availableUsers.map(u => ({ ...u, isAssigned: assignedIds.has(u.id) }))

    return (
        <ModuleDetailClient 
            moduleData={moduleData}
            questionnaires={qRes.data || []}
            assignments={assignRes.data || []}
            attempts={attemptRes.data || []}
            availableUsers={availableUsers}
            profile={profile}
            isQa={isQa}
        />
    )
}
