"use server"

import { createServiceClient, createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type SubmitEquipmentResult = 
    | { success: true; equipmentId: string }
    | { success: false; error: string }

export async function submitEquipment(
    formData: {
        assetId: string
        name: string
        department: string
        secondaryDepartments: string[]
        serialNumber?: string
        model?: string
        photoUrl?: string
        frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom'
        customDays?: number
        lastServiced: string
        linkedSopId?: string
        initialAssigneeId: string
    }
): Promise<SubmitEquipmentResult> {
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

    if (profile.role !== 'manager') {
        return { success: false, error: 'Only managers can submit equipment' }
    }

    const { data: existingAsset } = await supabase
        .from('equipment')
        .select('id')
        .eq('asset_id', formData.assetId)
        .single()

    if (existingAsset) {
        return { success: false, error: 'Asset ID already exists' }
    }

    const { data: equipment, error: equipmentError } = await supabase
        .from('equipment')
        .insert({
            asset_id: formData.assetId,
            name: formData.name,
            department: formData.department,
            secondary_departments: formData.secondaryDepartments,
            serial_number: formData.serialNumber || null,
            model: formData.model || null,
            photo_url: formData.photoUrl || null,
            linked_sop_id: formData.linkedSopId || null,
            frequency: formData.frequency,
            custom_interval_days: formData.customDays || null,
            last_serviced: formData.lastServiced,
            status: 'pending_qa',
            initial_assignee_id: formData.initialAssigneeId,
            submitted_by: user.id,
        })
        .select('id')
        .single()

    if (equipmentError) {
        return { success: false, error: equipmentError.message }
    }

    const { data: qaDepartment } = await supabase
        .from('departments')
        .select('name')
        .eq('is_qa', true)
        .single()

    if (qaDepartment) {
        await supabase
            .from('pulse_items')
            .insert({
                sender_id: user.id,
                type: 'approval_request',
                title: `New Equipment Submitted: ${formData.name}`,
                body: `Asset ID: ${formData.assetId}`,
                entity_type: 'equipment',
                entity_id: equipment.id,
                audience: 'department',
                target_department: qaDepartment.name,
            })
    }

    await supabase
        .from('audit_log')
        .insert({
            actor_id: user.id,
            action: 'equipment_submitted',
            entity_type: 'equipment',
            entity_id: equipment.id,
            metadata: {
                asset_id: formData.assetId,
                name: formData.name,
                department: formData.department,
            },
        })

    revalidatePath('/equipment')
    return { success: true, equipmentId: equipment.id }
}

export async function approveEquipment(equipmentId: string): Promise<{ success: boolean; error?: string }> {
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

    const { data: isQa } = await supabase.rpc('is_qa_manager', { user_id: user.id })
    if (!isQa) {
        return { success: false, error: 'Only QA managers can approve equipment' }
    }

    try {
        await supabase.rpc('approve_equipment', {
            p_equipment_id: equipmentId,
            p_qa_user_id: user.id,
        })
    } catch (error: any) {
        return { success: false, error: error.message }
    }

    revalidatePath('/equipment')
    return { success: true }
}

export async function rejectEquipment(equipmentId: string, reason: string): Promise<{ success: boolean; error?: string }> {
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

    const { data: isQa } = await supabase.rpc('is_qa_manager', { user_id: user.id })
    if (!isQa) {
        return { success: false, error: 'Only QA managers can reject equipment' }
    }

    const { data: equipment } = await supabase
        .from('equipment')
        .select('name, submitted_by')
        .eq('id', equipmentId)
        .single()

    await supabase
        .from('equipment')
        .update({ status: 'inactive' })
        .eq('id', equipmentId)

    await supabase
        .from('pulse_items')
        .insert({
            recipient_id: equipment?.submitted_by,
            sender_id: user.id,
            type: 'approval_update',
            title: 'Equipment Rejected',
            body: reason,
            entity_type: 'equipment',
            entity_id: equipmentId,
            audience: 'self',
        })

    await supabase
        .from('audit_log')
        .insert({
            actor_id: user.id,
            action: 'equipment_rejected',
            entity_type: 'equipment',
            entity_id: equipmentId,
            metadata: { reason },
        })

    revalidatePath('/equipment')
    return { success: true }
}

export type CompletePmTaskResult = 
    | { success: true }
    | { success: false; error: string }

export async function completePmTask(
    taskId: string,
    notes: string,
    photoUrl?: string
): Promise<CompletePmTaskResult> {
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

    const { data: task } = await supabase
        .from('pm_tasks')
        .select('equipment_id, assigned_to')
        .eq('id', taskId)
        .single()

    if (!task) {
        return { success: false, error: 'Task not found' }
    }

    const { data: equipment } = await supabase
        .from('equipment')
        .select('department, secondary_departments')
        .eq('id', task.equipment_id)
        .single()

    const isOwnDept = profile.department === equipment?.department
    const isSecondaryDept = equipment?.secondary_departments?.includes(profile.department)
    
    if (!isOwnDept && !isSecondaryDept && profile.role !== 'manager') {
        return { success: false, error: 'You cannot complete this task' }
    }

    try {
        await supabase.rpc('complete_pm_task', {
            p_task_id: taskId,
            p_user_id: user.id,
            p_notes: notes || null,
        })
    } catch (error: any) {
        return { success: false, error: error.message }
    }

    revalidatePath('/equipment')
    return { success: true }
}

export async function reassignPmTask(
    taskId: string,
    newAssigneeId: string
): Promise<{ success: boolean; error?: string }> {
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

    if (profile.role !== 'manager') {
        return { success: false, error: 'Only managers can reassign tasks' }
    }

    const { data: task } = await supabase
        .from('pm_tasks')
        .select('assigned_to')
        .eq('id', taskId)
        .single()

    await supabase
        .from('pm_tasks')
        .update({ assigned_to: newAssigneeId })
        .eq('id', taskId)

    await supabase
        .from('audit_log')
        .insert({
            actor_id: user.id,
            action: 'pm_task_reassigned',
            entity_type: 'pm_task',
            entity_id: taskId,
            metadata: {
                old_assignee_id: task?.assigned_to,
                new_assignee_id: newAssigneeId,
            },
        })

    revalidatePath('/equipment')
    return { success: true }
}
