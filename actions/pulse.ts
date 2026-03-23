"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

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
            body: content,
            audience,
            sender_name: profile?.full_name || 'User',
            // If audience is department and they have one, RLS matches it. We can store it in metadata if needed, but audience='department' implies sender's department.
        })

    if (error) {
        return { error: error.message }
    }

    // Revalidate paths if needed
    revalidatePath('/dashboard')

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
            body: content,
            audience: null, // Personal items don't have an audience
            sender_name: profile?.full_name || 'User',
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
        .select('thread_depth, audience')
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
        .select('full_name')
        .eq('id', user.id)
        .single()

    const { error } = await supabase
        .from('pulse_items')
        .insert({
            sender_id: user.id,
            type: 'notice',
            body: content,
            audience: parentNode.audience, // inherit audience
            sender_name: profile?.full_name || 'User',
            parent_id: parentId,
            thread_depth: 1
        })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/dashboard')

    return { success: true }
}
