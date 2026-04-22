"use server"

import { createServiceClient, createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

export async function createEvent(formData: {
    title: string
    description?: string
    startDate: string
    endDate?: string
    visibility: 'public' | 'department'
}): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServiceClient()
    const client = await createClient()

    const { data: { user } } = await client.auth.getUser()
    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile || !profile.is_active) {
        return { success: false, error: 'User is not active' }
    }

    if (profile.role !== 'manager' && !profile.is_admin) {
        return { success: false, error: 'Only managers and admins can create events' }
    }

    if (formData.endDate && formData.endDate < formData.startDate) {
        return { success: false, error: 'End date must be on or after start date' }
    }

    const { data: inserted, error } = await supabase
        .from('events')
        .insert({
            title: formData.title,
            description: formData.description || null,
            start_date: formData.startDate,
            end_date: formData.endDate || null,
            type: 'manual',
            visibility: formData.visibility,
            department: formData.visibility === 'department' ? profile.department : null,
            created_by: user.id,
        })
        .select('id')
        .single()

    if (error) {
        return { success: false, error: error.message }
    }

    await logAudit({
        actorId: user.id,
        action: 'event_created',
        entityType: 'event',
        entityId: inserted?.id,
        metadata: {
            title: formData.title,
            visibility: formData.visibility,
            department: formData.visibility === 'department' ? profile.department : null,
            start_date: formData.startDate,
            end_date: formData.endDate ?? null,
        },
    })

    revalidatePath('/calendar')
    return { success: true }
}

export async function deleteEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServiceClient()
    const client = await createClient()

    const { data: { user } } = await client.auth.getUser()
    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    const { data: event } = await supabase
        .from('events')
        .select('created_by, title, visibility, department, start_date, end_date')
        .eq('id', eventId)
        .single()

    if (!event) {
        return { success: false, error: 'Event not found' }
    }

    if (event.created_by !== user.id) {
        return { success: false, error: 'You can only delete your own events' }
    }

    const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)

    if (error) {
        return { success: false, error: error.message }
    }

    await logAudit({
        actorId: user.id,
        action: 'event_deleted',
        entityType: 'event',
        entityId: eventId,
        metadata: {
            title: event.title,
            visibility: event.visibility,
            department: event.department,
            start_date: event.start_date,
            end_date: event.end_date,
        },
    })

    revalidatePath('/calendar')
    return { success: true }
}
