"use server"

import { createClient, createServiceClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { sendPulseEmail } from "./email"

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

    const { error } = await supabase
        .from('pulse_items')
        .insert({
            sender_id: user.id,
            type: 'notice',
            title: 'Notice',
            body: content,
            audience,
            target_department: audience === 'department' ? (profile?.department || null) : null,
        })

    if (error) {
        return { error: error.message }
    }

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

    const content = formData.get('content') as string

    if (!content) {
        return { error: 'Content is required' }
    }

    // Get sender profile for name
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

    const { error } = await supabase
        .from('pulse_items')
        .insert({
            sender_id: user.id,
            recipient_id: user.id, // Personal todo
            type: 'todo',
            title: 'Personal To-Do',
            body: content,
            audience: 'self',
        })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/dashboard')

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
