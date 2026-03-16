"use server"

import { createServiceClient, createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type SubmitSopResult = 
    | { success: true; requestId: string }
    | { success: false; error: string }

export async function submitSopForApproval(
    formData: {
        fileUrl: string
        type: 'new' | 'update'
        sopId?: string
        sopNumber: string
        title: string
        department: string
        secondaryDepartments: string[]
        notesToQa?: string
    }
): Promise<SubmitSopResult> {
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
        return { success: false, error: 'Only managers can submit SOPs for approval' }
    }

    if (formData.type === 'update' && formData.sopId) {
        const { data: existingSop } = await supabase
            .from('sops')
            .select('locked, status')
            .eq('id', formData.sopId)
            .single()

        if (existingSop?.locked) {
            return { success: false, error: 'A Change Control is currently in progress for this SOP. Updates cannot be submitted until it is complete.' }
        }
    }

    if (formData.type === 'new') {
        const { data: existingSop } = await supabase
            .from('sops')
            .select('id')
            .eq('sop_number', formData.sopNumber)
            .single()

        if (existingSop) {
            return { success: false, error: 'SOP number already exists' }
        }
    }

    const versionLabel = formData.type === 'new' ? 'Submission 1' : 'Submission 1'

    let sopId = formData.sopId

    if (formData.type === 'new') {
        const { data: newSop, error: sopError } = await supabase
            .from('sops')
            .insert({
                sop_number: formData.sopNumber,
                title: formData.title,
                department: formData.department,
                secondary_departments: formData.secondaryDepartments,
                version: 'v1.0',
                status: 'pending_qa',
                file_url: formData.fileUrl,
                submitted_by: user.id,
            })
            .select('id')
            .single()

        if (sopError) {
            return { success: false, error: sopError.message }
        }

        sopId = newSop.id
    }

    const { data: approvalRequest, error: requestError } = await supabase
        .from('sop_approval_requests')
        .insert({
            sop_id: sopId,
            submitted_by: user.id,
            type: formData.type,
            status: 'pending',
            file_url: formData.fileUrl,
            version_label: versionLabel,
            notes_to_qa: formData.notesToQa || null,
        })
        .select('id')
        .single()

    if (requestError) {
        return { success: false, error: requestError.message }
    }

    const { data: qaDepartment } = await supabase
        .from('departments')
        .select('name')
        .eq('is_qa', true)
        .single()

    if (qaDepartment) {
        const { error: pulseError } = await supabase
            .from('pulse_items')
            .insert({
                sender_id: user.id,
                type: 'approval_request',
                title: formData.type === 'new' ? `New SOP Submitted: ${formData.title}` : `SOP Update Submitted: ${formData.title}`,
                body: formData.notesToQa || undefined,
                entity_type: 'sop',
                entity_id: sopId,
                audience: 'department',
                target_department: qaDepartment.name,
            })

        if (pulseError) {
            console.error('Failed to create pulse item:', pulseError)
        }
    }

    const { error: auditError } = await supabase
        .from('audit_log')
        .insert({
            actor_id: user.id,
            action: formData.type === 'new' ? 'sop_submitted_new' : 'sop_submitted_update',
            entity_type: 'sop',
            entity_id: sopId,
            metadata: {
                sop_number: formData.sopNumber,
                title: formData.title,
                department: formData.department,
                approval_request_id: approvalRequest.id,
            },
        })

    if (auditError) {
        console.error('Failed to write audit log:', auditError)
    }

    revalidatePath('/library')
    return { success: true, requestId: approvalRequest.id }
}

export async function resubmitSop(
    formData: {
        fileUrl: string
        sopId: string
        notesToQa?: string
    }
): Promise<SubmitSopResult> {
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
        return { success: false, error: 'Only managers can resubmit SOPs' }
    }

    const { data: existingRequests, error: countError } = await supabase
        .from('sop_approval_requests')
        .select('id')
        .eq('sop_id', formData.sopId)

    if (countError) {
        return { success: false, error: countError.message }
    }

    const submissionNumber = (existingRequests?.length || 0) + 1
    const versionLabel = submissionNumber === 1 ? 'Submission 1' : `Resubmission ${submissionNumber}`

    const { data: approvalRequest, error: requestError } = await supabase
        .from('sop_approval_requests')
        .insert({
            sop_id: formData.sopId,
            submitted_by: user.id,
            type: 'update',
            status: 'pending',
            file_url: formData.fileUrl,
            version_label: versionLabel,
            notes_to_qa: formData.notesToQa || null,
        })
        .select('id')
        .single()

    if (requestError) {
        return { success: false, error: requestError.message }
    }

    const { data: sop } = await supabase
        .from('sops')
        .select('title, department')
        .eq('id', formData.sopId)
        .single()

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
                title: `SOP Resubmitted: ${sop?.title || 'Unknown'}`,
                body: formData.notesToQa || undefined,
                entity_type: 'sop',
                entity_id: formData.sopId,
                audience: 'department',
                target_department: qaDepartment.name,
            })
    }

    await supabase
        .from('audit_log')
        .insert({
            actor_id: user.id,
            action: 'sop_resubmitted',
            entity_type: 'sop',
            entity_id: formData.sopId,
            metadata: {
                approval_request_id: approvalRequest.id,
                version_label: versionLabel,
            },
        })

    revalidatePath('/approvals')
    return { success: true, requestId: approvalRequest.id }
}

export type ApproveResult = 
    | { success: true; result: 'activated' | 'change_control_issued'; changeControlId?: string }
    | { success: false; error: string }

export async function approveSopRequest(requestId: string): Promise<ApproveResult> {
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
        return { success: false, error: 'Only QA managers can approve SOP requests' }
    }

    try {
        const result = await supabase.rpc('approve_sop_request', {
            p_request_id: requestId,
            p_qa_user_id: user.id,
        })

        if (result.error) {
            return { success: false, error: result.error.message }
        }

        const resultData = result.data as { result: string; change_control_id?: string }

        const { data: request } = await supabase
            .from('sop_approval_requests')
            .select('sop_id, submitted_by, type')
            .eq('id', requestId)
            .single()

        if (resultData.result === 'activated') {
            await supabase
                .from('pulse_items')
                .insert({
                    recipient_id: request?.submitted_by,
                    sender_id: user.id,
                    type: 'sop_active',
                    title: 'Your SOP has been approved',
                    body: 'Your SOP is now active in the library.',
                    entity_type: 'sop',
                    entity_id: request?.sop_id,
                    audience: 'self',
                })
        } else if (resultData.result === 'change_control_issued' && request) {
            await supabase
                .from('pulse_items')
                .insert({
                    recipient_id: request.submitted_by,
                    sender_id: user.id,
                    type: 'approval_update',
                    title: 'Your SOP update was approved',
                    body: 'A Change Control has been issued for signing.',
                    entity_type: 'sop',
                    entity_id: request.sop_id,
                    audience: 'self',
                })
        }

        revalidatePath('/library')
        revalidatePath('/approvals')

        return { 
            success: true, 
            result: resultData.result as 'activated' | 'change_control_issued',
            changeControlId: resultData.change_control_id 
        }
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to approve SOP request' }
    }
}

export async function requestChangesSop(
    requestId: string,
    comment: string
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

    const { data: isQa } = await supabase.rpc('is_qa_manager', { user_id: user.id })
    if (!isQa) {
        return { success: false, error: 'Only QA managers can request changes' }
    }

    const { data: request } = await supabase
        .from('sop_approval_requests')
        .select('sop_id, submitted_by')
        .eq('id', requestId)
        .single()

    if (!request) {
        return { success: false, error: 'Request not found' }
    }

    const { error: commentError } = await supabase
        .from('sop_approval_comments')
        .insert({
            request_id: requestId,
            author_id: user.id,
            comment: comment,
            action: 'changes_requested',
        })

    if (commentError) {
        return { success: false, error: commentError.message }
    }

    await supabase
        .from('sop_approval_requests')
        .update({ status: 'changes_requested', updated_at: new Date().toISOString() })
        .eq('id', requestId)

    await supabase
        .from('pulse_items')
        .insert({
            recipient_id: request.submitted_by,
            sender_id: user.id,
            type: 'approval_update',
            title: 'QA has requested changes to your SOP',
            body: comment,
            entity_type: 'sop',
            entity_id: request.sop_id,
            audience: 'self',
        })

    await supabase
        .from('audit_log')
        .insert({
            actor_id: user.id,
            action: 'sop_changes_requested',
            entity_type: 'sop_approval_request',
            entity_id: requestId,
            metadata: { comment },
        })

    revalidatePath('/approvals')
    return { success: true }
}
