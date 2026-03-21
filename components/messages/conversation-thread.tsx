"use client"

import { useState, useEffect, useRef } from "react"
import { MoreHorizontal, UserPlus, Settings, Paperclip, Send, FileText, Cog, GitBranch, BellOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { format, isSameDay } from "date-fns"
import { cn } from "@/lib/utils"
import { Message, Conversation, Profile } from "@/types/app.types"
import { ReferencePicker } from "./reference-picker"
import { sendMessage, editMessage, deleteMessage, markConversationRead } from "@/actions/messages"

export function ConversationThread({ conversationId, userId }: { conversationId: string, userId: string }) {
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [typingUsers, setTypingUsers] = useState<any[]>([])
  const [inputValue, setInputValue] = useState("")
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [reference, setReference] = useState<any | null>(null)
  const [isReferencePickerOpen, setIsReferencePickerOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    let active = true

    async function loadThread() {
      // 1. Fetch conversation details
      const { data: convData } = await supabase
        .from('conversations')
        .select(`
          *,
          members:conversation_members(
            user_id,
            profile:profiles(id, full_name, avatar_url, department, role)
          )
        `)
        .eq('id', conversationId)
        .single()

      if (active && convData) {
        setConversation(convData as unknown as Conversation)
      }

      // 2. Fetch messages
      const { data: msgData } = await supabase
        .from('messages')
        .select('*, sender:profiles(id, full_name, avatar_url), reply_to:messages(id, body, sender_id)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (active && msgData) {
        setMessages(msgData as unknown as Message[])
        setLoading(false)
        markConversationRead(conversationId)
      }
    }

    setLoading(true)
    loadThread()

    // 3. Subscriptions
    const msgSubscription = supabase.channel(`messages:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, async (payload) => {
          // Fetch sender info for new message
          const { data: senderData } = await supabase.from('profiles').select('id, full_name, avatar_url').eq('id', payload.new.sender_id).single()
          const newMsg = { ...payload.new, sender: senderData } as Message
          setMessages(prev => [newMsg, ...prev])
          if (payload.new.sender_id !== userId) {
            markConversationRead(conversationId)
          }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m))
      })
      .subscribe()

    // 4. Presence for typing indicator
    const presenceChannel = supabase.channel(`typing:${conversationId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const typing = Object.values(state)
          .flat()
          .filter((p: any) => p.user_id !== userId && p.is_typing)
        setTypingUsers(typing)
      })
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(msgSubscription)
      supabase.removeChannel(presenceChannel)
    }
  }, [conversationId, userId, supabase])

  // Debounced typing broadcast
  useEffect(() => {
    if (!conversation) return
    const presenceChannel = supabase.channel(`typing:${conversationId}`)
    
    if (inputValue.length > 0) {
      presenceChannel.track({ user_id: userId, is_typing: true })
    } else {
      presenceChannel.track({ user_id: userId, is_typing: false })
    }

    const timeout = setTimeout(() => {
      presenceChannel.track({ user_id: userId, is_typing: false })
    }, 2000)

    return () => clearTimeout(timeout)
  }, [inputValue, userId, conversationId, supabase, conversation])


  const handleSend = async () => {
    const body = inputValue.trim()
    if (!body) return
    setIsSubmitting(true)
    
    // We parse mentions naively for now based on @[Name]
    const mentionsRegex = /@\[(.*?)\]/g
    const mentions: string[] = []
    let match
    while ((match = mentionsRegex.exec(body)) !== null) {
        const name = match[1]
        // find user id
        const member = conversation?.members?.find(m => m.profile?.full_name === name)
        if (member) mentions.push(member.user_id)
    }

    try {
      await sendMessage({
        conversationId,
        body,
        mentions,
        referenceType: reference?.type || null,
        referenceId: reference?.id || null,
        replyToId: replyTo?.id || null
      })
      setInputValue("")
      setReplyTo(null)
      setReference(null)
      scrollToBottom()
    } catch (e) {
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading thread...</div>
  }

  if (!conversation) return null

  const otherUser = conversation.type === 'direct' 
    ? conversation.members?.find(m => m.user_id !== userId)?.profile 
    : null
    
  const displayTitle = conversation.type === 'direct' 
    ? otherUser?.full_name || 'Unknown User'
    : conversation.name || 'Group Chat'

  const avatar = conversation.type === 'direct'
    ? (
      <div className="w-9 h-9 shrink-0 bg-brand-navy rounded-full flex items-center justify-center text-white overflow-hidden">
        {otherUser?.avatar_url ? (
          <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs font-semibold">{otherUser?.full_name?.substring(0,2).toUpperCase()}</span>
        )}
      </div>
    )
    : (
      <div className="w-9 h-9 shrink-0 bg-slate-100 rounded-full border border-border flex items-center justify-center">
        <span className="text-xs font-semibold text-slate-600">G</span>
      </div>
    )

  // Render messages
  const renderedMessages = []
  let lastDate: Date | null = null
  let lastSenderId: string | null = null

  // Messages are fetched descending, so we process from bottom to top, but Array.reverse() for display.
  // Actually, easiest is to reverse them first so they go chronological.
  const chronologicalMsgs = [...messages].reverse()

  for (let i = 0; i < chronologicalMsgs.length; i++) {
    const msg = chronologicalMsgs[i]
    const msgDate = new Date(msg.created_at)

    // Insert date separator
    if (!lastDate || !isSameDay(lastDate, msgDate)) {
      renderedMessages.push(
        <div key={`date-${msg.id}`} className="flex items-center justify-center my-4 overflow-hidden">
          <div className="h-px bg-border flex-1 mx-4" />
          <span className="text-[12px] font-medium text-muted-foreground bg-background px-2">
            {format(msgDate, 'EEEE, d MMMM')}
          </span>
          <div className="h-px bg-border flex-1 mx-4" />
        </div>
      )
    }
    
    // Grouping
    let isGrouped = false;
    if (lastSenderId === msg.sender_id && i > 0) {
      const prevMsg = chronologicalMsgs[i-1]
      const diffMinutes = (msgDate.getTime() - new Date(prevMsg.created_at).getTime()) / 60000
      if (diffMinutes <= 2) {
        isGrouped = true
      }
    }

    const isOwn = msg.sender_id === userId

    renderedMessages.push(
      <div key={msg.id} className={cn("flex gap-3 px-4 py-1 hover:bg-surface-raised group", msg.deleted_at ? "opacity-60" : "")}>
        {!isGrouped && !isOwn && (
           <div className="w-8 h-8 shrink-0 bg-slate-200 rounded-full overflow-hidden flex items-center justify-center">
             {msg.sender?.avatar_url ? (
               <img src={msg.sender.avatar_url} alt="" className="w-full h-full object-cover" />
             ) : (
               <span className="text-xs font-semibold">{msg.sender?.full_name?.substring(0,2).toUpperCase()}</span>
             )}
           </div>
        )}
        {(isGrouped || isOwn) && <div className="w-8 h-8 shrink-0" />}
        
        <div className="flex-1 min-w-0">
          {!isGrouped && (
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-[14px] font-semibold text-foreground">{isOwn ? "You" : msg.sender?.full_name}</span>
              <span className="text-[11px] text-muted-foreground">{format(msgDate, 'HH:mm')}</span>
            </div>
          )}

          {msg.deleted_at ? (
            <span className="text-[13px] text-muted-foreground italic">This message was deleted.</span>
          ) : (
            <>
              {msg.reply_to_id && msg.reply_to && (
                <div className="bg-muted/50 border-l-2 border-brand-teal rounded-r-md px-3 py-1.5 mb-1.5 cursor-pointer">
                  <span className="block text-[11px] font-semibold text-muted-foreground">Replying to someone</span>
                  <span className="block text-[12px] text-muted-foreground truncate">{msg.reply_to.body}</span>
                </div>
              )}
              <div className="text-[14px] text-foreground leading-relaxed break-words whitespace-pre-wrap">
                  {/* Basic mention formatting */}
                  {msg.body.split(/(@\[.*?\])/g).map((part, index) => {
                      if (part.startsWith('@[') && part.endsWith(']')) {
                          const name = part.substring(2, part.length - 1)
                          const isMe = otherUser?.full_name === name || false
                          return <span key={index} className={cn("rounded-sm px-1 font-semibold text-[13px]", isMe ? "bg-brand-teal/25 text-brand-teal" : "bg-brand-teal/15 text-brand-teal")}>{part}</span>
                      }
                      return <span key={index}>{part}</span>
                  })}
              </div>
              
              {msg.is_edited && <span className="text-[11px] text-muted-foreground italic ml-2">edited</span>}

              {/* Reference Card Placeholder */}
              {msg.reference_type && msg.reference_id && (
                <div className="mt-2 bg-muted/30 border border-border rounded-lg px-4 py-3 border-l-4 border-l-brand-teal flex items-start gap-3">
                   <FileText className="w-[18px] h-[18px] text-brand-teal mt-0.5" />
                   <div className="flex-1">
                     <div className="text-[11px] uppercase text-muted-foreground">{msg.reference_type.replace('_', ' ')}</div>
                     <div className="text-[13px] font-semibold text-foreground mt-0.5">Reference ID: {msg.reference_id.substring(0,8)}</div>
                   </div>
                   <Button variant="ghost" size="sm" className="h-7 text-xs">Open &rarr;</Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )

    lastDate = msgDate
    lastSenderId = msg.sender_id
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background border-l">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b shrink-0">
        {avatar}
        <div className="flex flex-col flex-1 min-w-0">
          <h2 className="text-[14px] font-semibold text-foreground truncate">{displayTitle}</h2>
          {conversation.type === 'group' && (
            <span className="text-[12px] text-muted-foreground truncate">
              {conversation.members?.map(m => m.profile?.full_name?.split(' ')[0]).join(', ')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {conversation.type === 'group' && (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><UserPlus className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Settings className="w-4 h-4" /></Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><MoreHorizontal className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Typing Indicator Bar */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 h-6 shrink-0 bg-muted/20 border-b">
          <span className="text-[12px] text-muted-foreground italic">
            {typingUsers.map(u => u.name || 'Someone').join(', ')} is typing...
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col">
        {renderedMessages}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-background shrink-0">
        {replyTo && (
           <div className="bg-muted/50 border-l-2 border-brand-teal rounded-r-md px-3 py-2 mb-2 flex items-center justify-between">
             <div>
               <span className="text-[12px] font-semibold text-brand-teal">Replying to message</span>
               <span className="text-[12px] text-muted-foreground truncate ml-2">{replyTo.body.substring(0, 30)}...</span>
             </div>
             <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setReplyTo(null)}>X</Button>
           </div>
        )}
        
        {reference && (
           <div className="bg-muted/50 border-l-2 border-blue-500 rounded-r-md px-3 py-2 mb-2 flex items-center justify-between">
             <div>
               <span className="text-[12px] font-semibold text-blue-500">Attached Reference</span>
               <span className="text-[12px] text-muted-foreground truncate ml-2">{reference.type}: {reference.id.substring(0, 8)}</span>
             </div>
             <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setReference(null)}>X</Button>
           </div>
        )}

        <div className="flex gap-2 items-end">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground" onClick={() => setIsReferencePickerOpen(true)}>
            <Paperclip className="w-[20px] h-[20px]" />
          </Button>
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${displayTitle}...`}
            className="flex-1 min-h-[36px] max-h-[120px] bg-muted/50 border border-transparent focus:border-border rounded-md px-3 py-2 text-sm resize-none focus:outline-none"
            rows={1}
          />
          <Button 
            className="h-9 w-9 shrink-0 bg-brand-navy hover:bg-brand-navy/90 p-0" 
            onClick={handleSend}
            disabled={!inputValue.trim() || isSubmitting}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <ReferencePicker 
        isOpen={isReferencePickerOpen} 
        onClose={() => setIsReferencePickerOpen(false)} 
        onSelect={(ref) => { setReference(ref); setIsReferencePickerOpen(false) }}
      />
    </div>
  )
}
