"use server"

import { createServiceClient, createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sendPulseEmail } from './email'

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
        } else {
            // ─── EMAIL QA DEPARTMENT ───
            try {
                const service = await createServiceClient()
                const { data: authUsers } = await service.auth.admin.listUsers()
                const { data: profiles } = await service
                    .from('profiles')
                    .select('id')
                    .eq('department', qaDepartment.name)
                    .eq('is_active', true)
                    .eq('notification_prefs->email', true)

                if (profiles && profiles.length > 0) {
                    const profileIds = profiles.map(p => p.id)
                    const targetEmails = authUsers.users
                        .filter(u => profileIds.includes(u.id) && u.email)
                        .map(u => u.email!)

                    if (targetEmails.length > 0) {
                        await sendPulseEmail({
                            to: targetEmails,
                            subject: `Audit Required: ${formData.title}`,
                            title: "SOP Approval Required",
                            message: `A new ${formData.type === 'new' ? 'SOP' : 'revision'} titled "${formData.title}" has been submitted for review by ${profile.full_name || 'System'}.`,
                            buttonText: "Review in App"
                        })
                    }
                }
            } catch (e) {
                console.error("SOP QA Email dispatch failed:", e)
            }
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
        const { error: pulseError } = await supabase
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

        if (!pulseError) {
            // ─── EMAIL QA DEPARTMENT ───
            try {
                const { data: authUsers } = await supabase.auth.admin.listUsers()
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('department', qaDepartment.name)
                    .eq('is_active', true)
                    .eq('notification_prefs->email', true)

                if (profiles && profiles.length > 0) {
                    const profileIds = profiles.map(p => p.id)
                    const targetEmails = authUsers.users
                        .filter(u => profileIds.includes(u.id) && u.email)
                        .map(u => u.email!)

                    if (targetEmails.length > 0) {
                        await sendPulseEmail({
                            to: targetEmails,
                            subject: `Audit Required (Resubmission): ${sop?.title}`,
                            title: "SOP Resubmitted for Review",
                            message: `The SOP "${sop?.title}" has been resubmitted for approval by ${profile.full_name}.`,
                            buttonText: "Review SOP"
                        })
                    }
                }
            } catch (e) {
                console.error("SOP QA Email dispatch failed:", e)
            }
        }
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

type Annotation = {
    comment: string
    quoted_text?: string
    quote_context?: string
    anchor_hash?: string
    line_number?: number
    char_offset?: number
    section_heading?: string
}

async function insertApprovalAnnotations(
    supabase: any,
    requestId: string,
    authorId: string,
    annotations: Annotation[] | undefined
) {
    if (!annotations || annotations.length === 0) return
    const rows = annotations
        .filter(a => a.comment?.trim())
        .map(a => ({
            request_id: requestId,
            author_id: authorId,
            comment: a.comment,
            action: 'comment',
            quoted_text: a.quoted_text || null,
            quote_context: a.quote_context || null,
            anchor_hash: a.anchor_hash || null,
            line_number: a.line_number ?? null,
            char_offset: a.char_offset ?? null,
            section_heading: a.section_heading || null,
        }))
    if (rows.length === 0) return
    await supabase.from('sop_approval_comments').insert(rows)
}

export async function approveSopRequest(
    requestId: string,
    changeType: 'minor' | 'significant' = 'significant',
    qaNote?: string,
    annotations?: Annotation[]
): Promise<ApproveResult> {
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
            p_change_type: changeType,
            p_qa_note: qaNote || null
        })

        if (result.error) {
            return { success: false, error: result.error.message }
        }

        await insertApprovalAnnotations(supabase, requestId, user.id, annotations)

        const resultData = result.data as { result: string; change_control_id?: string }

        const { data: request } = await supabase
            .from('sop_approval_requests')
            .select('sop_id, submitted_by, type, sops:sop_id(title, sop_number)')
            .eq('id', requestId)
            .single()

        const reqSop = Array.isArray((request as any)?.sops) ? (request as any)?.sops[0] : (request as any)?.sops
        const sopTitle = reqSop?.title || 'Your SOP'
        const sopNumber = reqSop?.sop_number || ''
        const sopLabel = sopNumber ? `${sopNumber} — ${sopTitle}` : sopTitle

        if (resultData.result === 'activated') {
            const { error: pulseError } = await supabase
                .from('pulse_items')
                .insert({
                    recipient_id: request?.submitted_by,
                    sender_id: user.id,
                    type: 'sop_active',
                    title: `SOP approved — ${sopLabel}`,
                    body: `Your SOP "${sopTitle}" has been approved by QA and is now active in the Library.`,
                    entity_type: 'sop',
                    entity_id: request?.sop_id,
                    audience: 'self',
                })
            
            if (!pulseError && request?.submitted_by) {
                // ─── EMAIL SUBMITTER ───
                try {
                    const { data: targetUser } = await supabase.auth.admin.getUserById(request.submitted_by)
                    if (targetUser?.user?.email) {
                        await sendPulseEmail({
                            to: targetUser.user.email,
                            subject: `SOP Activated: ${request.sop_id}`,
                            title: "SOP Now Live",
                            message: `Congratulations! Your SOP submission has been fully approved and is now active in the Library.`,
                            buttonText: "View SOP"
                        })
                    }
                } catch (e) { console.error("SOP activation email failed:", e) }
            }
        } else if (resultData.result === 'change_control_issued' && request) {
            const { error: pulseError } = await supabase
                .from('pulse_items')
                .insert({
                    recipient_id: request.submitted_by,
                    sender_id: user.id,
                    type: 'approval_update',
                    title: `SOP update approved — ${sopLabel}`,
                    body: `QA approved your update to "${sopTitle}". A Change Control has been issued for the required signatories.`,
                    entity_type: 'sop',
                    entity_id: request.sop_id,
                    audience: 'self',
                })

            if (!pulseError && request.submitted_by) {
                // ─── EMAIL SUBMITTER ───
                try {
                    const { data: targetUser } = await supabase.auth.admin.getUserById(request.submitted_by)
                    if (targetUser?.user?.email) {
                        await sendPulseEmail({
                            to: targetUser.user.email,
                            subject: `Change Control Issued: ${request.sop_id}`,
                            title: "Action Required: Sign Change Control",
                            message: `Your SOP update has been approved by QA. A Change Control document has been issued and requires your signature before the SOP can go live.`,
                            buttonText: "Sign Document"
                        })
                    }
                } catch (e) { console.error("Change control email failed:", e) }
            }
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
    comment: string,
    annotations?: Annotation[]
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
        .select('sop_id, submitted_by, sops:sop_id(title, sop_number)')
        .eq('id', requestId)
        .single()

    if (!request) {
        return { success: false, error: 'Request not found' }
    }

    const reqSop = Array.isArray((request as any).sops) ? (request as any).sops[0] : (request as any).sops
    const sopTitle = reqSop?.title || 'your SOP'
    const sopNumber = reqSop?.sop_number || ''
    const sopLabel = sopNumber ? `${sopNumber} — ${sopTitle}` : sopTitle

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

    await insertApprovalAnnotations(supabase, requestId, user.id, annotations)
    const annotationCount = (annotations || []).filter(a => a.comment?.trim()).length

    await supabase
        .from('sop_approval_requests')
        .update({ status: 'changes_requested', updated_at: new Date().toISOString() })
        .eq('id', requestId)

    const { error: pulseError } = await supabase
        .from('pulse_items')
        .insert({
            recipient_id: request.submitted_by,
            sender_id: user.id,
            type: 'approval_update',
            title: `Changes requested — ${sopLabel}`,
            body: annotationCount > 0
                ? `QA requested changes to "${sopTitle}" with ${annotationCount} highlighted comment${annotationCount === 1 ? '' : 's'}. Summary: ${comment}`
                : `QA requested changes to "${sopTitle}". Note from reviewer: ${comment}`,
            entity_type: 'sop',
            entity_id: request.sop_id,
            audience: 'self',
        })

    if (!pulseError && request.submitted_by) {
        // ─── EMAIL SUBMITTER ───
        try {
            const { data: targetUser } = await supabase.auth.admin.getUserById(request.submitted_by)
            if (targetUser?.user?.email) {
                await sendPulseEmail({
                    to: targetUser.user.email,
                    subject: `Revision Requested: ${request.sop_id}`,
                    title: "SOP Action Required",
                    message: annotationCount > 0
                        ? `QA has reviewed your SOP and left ${annotationCount} highlighted comment${annotationCount === 1 ? '' : 's'} along with this summary:\n\n${comment}\n\nOpen the request to view each annotation inline.`
                        : `QA has reviewed your SOP and requested the following changes: \n\n${comment}`,
                    buttonText: "Revise SOP"
                })
            }
        } catch (e) { console.error("SOP revision email failed:", e) }
    }
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

export type SignResult =
    | { success: true }
    | { success: false; error: string }

export async function signChangeControl(changeControlId: string): Promise<SignResult> {
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

    if (!profile.signature_url) {
        return { success: false, error: 'No signature on file. Please upload your signature in Settings.' }
    }

    const { data: existingCert } = await supabase
        .from('signature_certificates')
        .select('id')
        .eq('change_control_id', changeControlId)
        .eq('user_id', user.id)
        .single()

    if (existingCert) {
        return { success: false, error: 'You have already signed this Change Control' }
    }

    const forwardedFor = (await client.auth.getSession()).data.session?.access_token
    const ipAddress = forwardedFor || undefined

    const { error: insertError } = await supabase
        .from('signature_certificates')
        .insert({
            change_control_id: changeControlId,
            user_id: user.id,
            signature_url: profile.signature_url,
            ip_address: ipAddress,
        })

    if (insertError) {
        return { success: false, error: insertError.message }
    }

    const { data: changeControl } = await supabase
        .from('change_controls')
        .select('sop_id, new_version, required_signatories, sops:sop_id(title, sop_number)')
        .eq('id', changeControlId)
        .single()

    const ccSop = Array.isArray((changeControl as any)?.sops) ? (changeControl as any)?.sops[0] : (changeControl as any)?.sops
    const sopTitle = ccSop?.title || 'an SOP'
    const sopNumber = ccSop?.sop_number || ''
    const sopLabel = sopNumber ? `${sopNumber} — ${sopTitle}` : sopTitle

    const { error: pulseError } = await supabase
        .from('pulse_items')
        .insert({
            sender_id: user.id,
            type: 'cc_signature',
            title: `Change Control signed — ${sopLabel}`,
            body: `${profile.full_name} signed the Change Control for ${sopLabel}.`,
            entity_type: 'change_control',
            entity_id: changeControlId,
            audience: 'department',
            target_department: profile.department,
        })

    if (!pulseError && profile.department) {
        // ─── EMAIL DEPARTMENT ───
        try {
            const { data: authUsers } = await supabase.auth.admin.listUsers()
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id')
                .eq('department', profile.department)
                .eq('is_active', true)
                .eq('notification_prefs->email', true)
                .neq('id', user.id) // Don't email the person who just signed

            if (profiles && profiles.length > 0) {
                const profileIds = profiles.map(p => p.id)
                const targetEmails = authUsers.users
                    .filter(u => profileIds.includes(u.id) && u.email)
                    .map(u => u.email!)

                if (targetEmails.length > 0) {
                    await sendPulseEmail({
                        to: targetEmails,
                        subject: `CC Signed: ${changeControl?.sop_id || 'System Update'}`,
                        title: "Change Control Signature Captured",
                        message: `${profile.full_name} has signed the Change Control for SOP ${changeControl?.sop_id}.`,
                        buttonText: "Review CC"
                    })
                }
            }
        } catch (e) {
            console.error("CC Signature email failed:", e)
        }
    }

    await supabase
        .from('audit_log')
        .insert({
            actor_id: user.id,
            action: 'cc_signed',
            entity_type: 'change_control',
            entity_id: changeControlId,
            metadata: { user_id: user.id, full_name: profile.full_name },
        })

    revalidatePath('/change-control')
    return { success: true }
}

export async function waiveSignature(
    changeControlId: string,
    targetUserId: string,
    reason: string
): Promise<SignResult> {
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

    if (!profile.is_admin) {
        return { success: false, error: 'Only admins can waive signatures' }
    }

    try {
        await supabase.rpc('waive_cc_signature', {
            p_cc_id: changeControlId,
            p_target_user_id: targetUserId,
            p_admin_id: user.id,
            p_reason: reason,
        })
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to waive signature' }
    }

    revalidatePath('/change-control')
    return { success: true }
}

export async function generateDeltaSummary(changeControlId: string): Promise<{ success: boolean; summary?: string; error?: string }> {
    const supabase = await createServiceClient()
    const client = await createClient()

    const { data: { user } } = await client.auth.getUser()
    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    const { data: changeControl } = await supabase
        .from('change_controls')
        .select('old_file_url, new_file_url, sops(title)')
        .eq('id', changeControlId)
        .single()

    if (!changeControl?.new_file_url) {
        return { success: false, error: 'Files unavailable to generate summary' }
    }

    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/gemini/delta-summary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ old_file_url: changeControl.old_file_url, new_file_url: changeControl.new_file_url }),
        })

        if (!response.ok) {
            const error = await response.json()
            return { success: false, error: error.message || 'Failed to generate summary' }
        }

        const data = await response.json()

        await supabase
            .from('change_controls')
            .update({ delta_summary: data.summary })
            .eq('id', changeControlId)

        revalidatePath('/change-control')
        return { success: true, summary: data.summary }

    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to generate summary' }
    }
}

// ─── Acknowledge SOP ────────────────────────────────────────────────────────
// Server-side action so we can verify department membership before inserting.

export async function acknowledgeSop(
    sopId: string,
    sopVersion: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createServiceClient()
    const client = await createClient()

    const { data: { user } } = await client.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('department, is_active')
        .eq('id', user.id)
        .single()

    if (!profile?.is_active) return { success: false, error: 'User is inactive' }

    // Verify user belongs to this SOP's department (primary or secondary)
    const { data: sop } = await supabase
        .from('sops')
        .select('department, secondary_departments')
        .eq('id', sopId)
        .single()

    if (!sop) return { success: false, error: 'SOP not found' }

    const isOwnDept =
        sop.department === profile.department ||
        (sop.secondary_departments || []).includes(profile.department)

    if (!isOwnDept) {
        return { success: false, error: 'You can only acknowledge SOPs from your own department' }
    }

    // Idempotent — ignore duplicate key
    const { error } = await supabase.from('sop_acknowledgements').insert({
        sop_id: sopId,
        user_id: user.id,
        version: sopVersion,
    })

    if (error && !error.message.includes('duplicate')) {
        return { success: false, error: error.message }
    }

    revalidatePath('/library')
    return { success: true }
}

export async function getSopSignedUrl(sopId: string): Promise<{ success: boolean; signedUrl?: string; error?: string }> {
    const supabase = await createServiceClient()
    const client = await createClient()

    const { data: { user } } = await client.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const { data: sop } = await supabase
        .from('sops')
        .select('file_url')
        .eq('id', sopId)
        .single()

    if (!sop || !sop.file_url) {
        return { success: false, error: 'SOP or file not found' }
    }

    const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(sop.file_url, 3600)

    if (error) {
        return { success: false, error: error.message }
    }

    return { success: true, signedUrl: data.signedUrl }
}
