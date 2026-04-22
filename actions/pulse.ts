"use server"

import { createClient, createServiceClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { sendPulseEmail } from "./email"
import { logAudit } from "@/lib/audit"

export async function broadcastNotice(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    const content = formData.get('content') as string
    const audience = formData.get('audience') as string

    if (!content || !audience) {
        return { error: 'Content and audience are required' }
    }

    // Get sender profile for name
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, department')
        .eq('id', user.id)
        .single()

    const { data: inserted, error } = await supabase
        .from('pulse_items')
        .insert({
            sender_id: user.id,
            type: 'notice',
            title: 'Notice',
            body: content,
            audience,
            target_department: audience === 'department' ? (profile?.department || null) : null,
        })
        .select('id')
        .single()

    if (error) {
        return { error: error.message }
    }

    await logAudit({
        actorId: user.id,
        action: 'pulse_notice_broadcast',
        entityType: 'pulse_item',
        entityId: inserted?.id,
        metadata: {
            audience,
            target_department: audience === 'department' ? (profile?.department || null) : null,
            content_length: content.length,
        },
    })

    // Revalidate paths if needed
    revalidatePath('/dashboard')

    // ─── EMAIL NOTIFICATION DISPATCH ───
    try {
        const service = await createServiceClient()
        let query = service
            .from('profiles')
            .select('id')
            .eq('is_active', true)
            .eq('notification_prefs->email', true)
            .neq('id', user.id) // Don't email the sender

        if (audience === 'department') {
            query = query.eq('department', profile?.department)
        }

        const { data: recipients } = await query
        
        if (recipients && recipients.length > 0) {
            const recipientIds = recipients.map(r => r.id)
            const { data: authUsers } = await service.auth.admin.listUsers()
            const targetEmails = authUsers.users
                .filter(u => recipientIds.includes(u.id) && u.email)
                .map(u => u.email!)

            if (targetEmails.length > 0) {
                await sendPulseEmail({
                    to: targetEmails,
                    subject: `New Notice from ${profile?.full_name || 'System'}`,
                    title: "New Operations Notice",
                    message: content,
                    buttonText: "Read in Pulse Panel"
                })
            }
        }
    } catch (e) {
        console.error("Pulse Email dispatch failed:", e)
    }

    return { success: true }
}

export async function createTodo(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    const content = (formData.get('content') as string | null)?.trim()
    const dueAtRaw = formData.get('dueAt') as string | null

    if (!content) {
        return { error: 'Content is required' }
    }

    // Validate / parse the optional due date. Accept either an ISO string or the
    // 'YYYY-MM-DDTHH:mm' shape emitted by <input type="datetime-local">.
    let dueAtIso: string | null = null
    if (dueAtRaw && dueAtRaw.trim()) {
        const parsed = new Date(dueAtRaw)
        if (isNaN(parsed.getTime())) {
            return { error: 'Invalid due date' }
        }
        dueAtIso = parsed.toISOString()
    }

    const { error } = await supabase
        .from('pulse_items')
        .insert({
            sender_id: user.id,
            recipient_id: user.id,
            type: 'todo',
            title: 'Personal To-Do',
            body: content,
            audience: 'self',
            due_at: dueAtIso,
        })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/dashboard')

    return { success: true }
}

/**
 * Flip a todo between open and complete. Returns the new state so the client
 * can reconcile without another round-trip.
 */
export async function toggleTodoComplete(todoId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: existing } = await supabase
        .from('pulse_items')
        .select('id, recipient_id, completed_at, type')
        .eq('id', todoId)
        .maybeSingle()

    if (!existing || existing.type !== 'todo' || existing.recipient_id !== user.id) {
        return { error: 'Todo not found' }
    }

    const nextCompletedAt = existing.completed_at ? null : new Date().toISOString()

    const { error } = await supabase
        .from('pulse_items')
        .update({ completed_at: nextCompletedAt })
        .eq('id', todoId)

    if (error) return { error: error.message }

    return { success: true, completed_at: nextCompletedAt }
}

export async function deleteTodo(todoId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // RLS policy 'pulse_items todo deletable by owner' enforces the ownership
    // check. This server-side guard is defense-in-depth.
    const { data: existing } = await supabase
        .from('pulse_items')
        .select('id, recipient_id, type')
        .eq('id', todoId)
        .maybeSingle()

    if (!existing || existing.type !== 'todo' || existing.recipient_id !== user.id) {
        return { error: 'Todo not found' }
    }

    const { error } = await supabase.from('pulse_items').delete().eq('id', todoId)
    if (error) return { error: error.message }

    return { success: true }
}

export async function replyToNotice(parentId: string, content: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    if (!content) {
        return { error: 'Content is required' }
    }

    // Verify parent exists and is top-level
    const { data: parentNode } = await supabase
        .from('pulse_items')
        .select('thread_depth, audience, sender_id')
        .eq('id', parentId)
        .single()

    if (!parentNode) {
        return { error: 'Parent notice not found' }
    }

    if (parentNode.thread_depth > 0) {
        return { error: 'Cannot reply to a reply. Maximum thread depth reached.' }
    }

    // Get sender profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, department')
        .eq('id', user.id)
        .single()

    const { error } = await supabase
        .from('pulse_items')
        .insert({
            sender_id: user.id,
            type: 'notice',
            title: 'Reply',
            body: content,
            audience: parentNode.audience, // inherit audience
            parent_id: parentId,
            thread_depth: 1
        })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/dashboard')

    // ─── EMAIL NOTIFICATION DISPATCH (REPLY) ───
    try {
        const service = await createServiceClient()
        
        // Find the sender of the original notice to notify them
        // Also notify the department if it was a department-scoped notice
        const { data: recipients } = await service
            .from('profiles')
            .select('id')
            .eq('is_active', true)
            .eq('notification_prefs->email', true)
            .neq('id', user.id) // Don't email the person replying
            .or(`id.eq.${parentNode.sender_id},department.eq.${profile?.department}`)

        if (recipients && recipients.length > 0) {
            const recipientIds = recipients.map(r => r.id)
            const { data: authUsers } = await service.auth.admin.listUsers()
            const targetEmails = authUsers.users
                .filter(u => recipientIds.includes(u.id) && u.email)
                .map(u => u.email!)

            if (targetEmails.length > 0) {
                await sendPulseEmail({
                    to: targetEmails,
                    subject: `New Reply from ${profile?.full_name || 'Personnel'}`,
                    title: "Pulse Reply Received",
                    message: content,
                    buttonText: "View conversation"
                })
            }
        }
    } catch (e) {
        console.error("Pulse Reply Email dispatch failed:", e)
    }

    return { success: true }

}

export async function acknowledgeNotice(itemId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    const { error } = await supabase
        .from('pulse_acknowledgements')
        .insert({
            pulse_item_id: itemId,
            user_id: user.id
        })

    if (error) {
        if (error.code === '23505') { // Unique constraint
            return { error: 'Already acknowledged' }
        }
        return { error: error.message }
    }

    revalidatePath('/dashboard')

    return { success: true }
}
