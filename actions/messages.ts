"use server"

import { createClient } from "@/lib/supabase/server"

export async function sendMessage({ 
  conversationId, 
  body, 
  mentions = [], 
  referenceType = null, 
  referenceId = null, 
  replyToId = null 
}: { 
  conversationId: string, 
  body: string, 
  mentions?: string[], 
  referenceType?: string | null, 
  referenceId?: string | null, 
  replyToId?: string | null 
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Verify membership
  const { data: member } = await supabase
    .from('conversation_members')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .single()

  if (!member) throw new Error("Not a member of this conversation")

  if (body.trim().length === 0) throw new Error("Message cannot be empty")
  if (body.trim().length > 2000) throw new Error("Message too long")

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: body.trim(),
      mentions,
      reference_type: referenceType,
      reference_id: referenceId,
      reply_to_id: replyToId
    })
    .select('*')
    .single()

  if (error) {
    console.error(error)
    throw new Error("Failed to send message")
  }

  // Update last read for self
  await supabase
    .from('conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)

  return message
}

export async function editMessage(messageId: string, newBody: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Verify ownership and time
  const { data: msg } = await supabase
    .from('messages')
    .select('created_at, sender_id')
    .eq('id', messageId)
    .single()

  if (!msg || msg.sender_id !== user.id) throw new Error("Unauthorized")

  const diffMinutes = (new Date().getTime() - new Date(msg.created_at).getTime()) / 60000
  if (diffMinutes > 15) throw new Error("Edit window closed")

  const { error } = await supabase
    .from('messages')
    .update({
      body: newBody.trim(),
      is_edited: true,
      edited_at: new Date().toISOString()
    })
    .eq('id', messageId)

  if (error) throw new Error("Failed to edit")
  return true
}

export async function deleteMessage(messageId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('sender_id', user.id)

  if (error) throw new Error("Failed to delete")
  return true
}

export async function createConversation({ type, memberIds, name }: { type: 'direct' | 'group', memberIds: string[], name?: string | null }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const allMembers = Array.from(new Set([...memberIds, user.id]))

  if (type === 'direct' && allMembers.length !== 2) throw new Error("Direct must have 2 members")
  if (type === 'group' && (allMembers.length < 3 || !name?.trim())) throw new Error("Group requires name and 3+ total members")

  if (type === 'direct') {
    // Check if exists
    const otherId = memberIds.find(id => id !== user.id)
    const { data: existingConvs } = await supabase.rpc('get_direct_conversation', { user1: user.id, user2: otherId })
    // If we don't have an RPC, we can query it manually, but due to lack of RPC in schema, let's query:
    // This is a naive check. A better check is finding conversations where type='direct' and both members exist.
    // For now, let's just create it directly, or do a complex query.
    // Actually, we can fetch all direct convs for user
    const { data: myDMs } = await supabase
      .from('conversations')
      .select('id, members:conversation_members(user_id)')
      .eq('type', 'direct')
      .eq('conversation_members.user_id', user.id)

    if (myDMs) {
       for (const dm of myDMs) {
          const members = dm.members as any[]
          if (members?.length === 2 && members.find(m => m.user_id === otherId)) {
             return { id: dm.id } // return existing
          }
       }
    }
  }

  // Create new
  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .insert({ type, name: type === 'group' ? name?.trim() : null, created_by: user.id })
    .select('id')
    .single()

  if (convErr || !conv) throw new Error("Failed to create conversation")

  // Insert members
  const memberRows = allMembers.map(id => ({
    conversation_id: conv.id,
    user_id: id,
    notify_setting: 'all'
  }))

  const { error: memErr } = await supabase
    .from('conversation_members')
    .insert(memberRows)

  if (memErr) throw new Error("Failed to add members")

  return conv
}

export async function markConversationRead(conversationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
}

export async function updateNotifySetting(conversationId: string, setting: 'all' | 'mentions_only' | 'muted') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('conversation_members')
    .update({ notify_setting: setting })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
}

export async function leaveGroup(conversationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Must be group
  const { data: conv } = await supabase.from('conversations').select('type').eq('id', conversationId).single()
  if (conv?.type !== 'group') throw new Error("Cannot leave direct")

  await supabase
    .from('conversation_members')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)

  // check remaining
  const { count } = await supabase
    .from('conversation_members')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)

  if (count === 0) {
     await supabase.from('conversations').update({ is_archived: true }).eq('id', conversationId)
  }
}
