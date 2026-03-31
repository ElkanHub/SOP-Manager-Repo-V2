"use client"

import { useState, useEffect, useRef } from "react"
import { MoreHorizontal, UserPlus, Settings, Paperclip, Send, FileText, Cog, GitBranch, BellOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { format, isSameDay } from "date-fns"
import { cn } from "@/lib/utils"
import { Message, Conversation, Profile } from "@/types/app.types"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ReferencePicker } from "./reference-picker"
import { sendMessage, editMessage, deleteMessage, markConversationRead, leaveGroup, deleteConversation, updateNotifySetting } from "@/actions/messages"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Image from "next/image"


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
  const [isMuted, setIsMuted] = useState(false)
  const [profileModalUser, setProfileModalUser] = useState<Profile | null>(null)

  const router = useRouter()
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

        const me = convData.members?.find((m: any) => m.user_id === userId)
        if (me && me.notify_setting === 'muted') {
          setIsMuted(true)
        } else {
          setIsMuted(false)
        }
      }

      // 2. Fetch messages
      const { data: msgData } = await supabase
        .from('messages')
        .select('*, sender:profiles(id, full_name, avatar_url), reply_to:messages(id, body, sender_id)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (active) {
        if (msgData) {
          setMessages(msgData as unknown as Message[])
          markConversationRead(conversationId)
        }
        setLoading(false)
      }
    }

    setLoading(true)
    loadThread()

    // 3. Subscriptions
    const msgSubscription = supabase.channel(`messages:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, async (payload) => {
        // Fetch full message with joins to get sender and reply_to context
        const { data: msgData } = await supabase
          .from('messages')
          .select('*, sender:profiles(id, full_name, avatar_url), reply_to:messages(id, body, sender_id)')
          .eq('id', payload.new.id)
          .single()

        if (!msgData) return
        const newMsg = msgData as unknown as Message

        setMessages(prev => {
          // Optimization: Check if this message was already added optimistically by the current user
          // Deduplicate by searching for a temporary message with the same body and sender
          const optimisticIdx = prev.findIndex(m =>
            m.id.startsWith('temp-') &&
            m.body === newMsg.body &&
            m.sender_id === newMsg.sender_id
          )

          if (optimisticIdx !== -1) {
            const updated = [...prev]
            updated[optimisticIdx] = newMsg
            return updated
          }

          // If not optimistic, but message already exists (rare race condition), don't add
          if (prev.some(m => m.id === newMsg.id)) return prev

          return [newMsg, ...prev]
        })

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
      // Create an optimistic message object
      const optimisticMsg: Message = {
        id: 'temp-' + Date.now(),
        conversation_id: conversationId,
        sender_id: userId,
        body,
        mentions,
        reference_type: reference?.type || null,
        reference_id: reference?.id || null,
        reply_to_id: replyTo?.id || null,
        is_edited: false,
        edited_at: null,
        deleted_at: null,
        created_at: new Date().toISOString(),
        sender: (conversation?.members?.find(m => m.user_id === userId)?.profile as any) || { id: userId, full_name: "Me", avatar_url: undefined },
        reply_to: replyTo ? { id: replyTo.id, body: replyTo.body, sender_id: replyTo.sender_id } : undefined
      }

      // Optimistically add to UI immediately
      setMessages(prev => [optimisticMsg, ...prev])
      setInputValue("")
      setReplyTo(null)
      setReference(null)
      setTimeout(scrollToBottom, 100)

      await sendMessage({
        conversationId,
        body,
        mentions,
        referenceType: reference?.type || null,
        referenceId: reference?.id || null,
        replyToId: replyTo?.id || null
      })

      // We don't need to replace the temp message ID perfectly here because 
      // the realtime subscription will pull in the real one and React's `key` handles the rest reasonably well.
      // But ideally we'd swap it. For basic snappy UI, the realtime event will soon provide the real ID.
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
      <div className="w-9 h-9 shrink-0 bg-brand-navy rounded-full flex items-center justify-center text-white overflow-hidden relative">
        {otherUser?.avatar_url ? (
          <Image 
            src={otherUser.avatar_url} 
            alt="" 
            width={36} 
            height={36} 
            className="w-full h-full object-cover" 
          />
        ) : (
          <span className="text-xs font-semibold">{otherUser?.full_name?.substring(0, 2).toUpperCase()}</span>
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
      const prevMsg = chronologicalMsgs[i - 1]
      const diffMinutes = (msgDate.getTime() - new Date(prevMsg.created_at).getTime()) / 60000
      if (diffMinutes <= 2) {
        isGrouped = true
      }
    }

    const isOwn = msg.sender_id === userId

    renderedMessages.push(
      <div key={msg.id} className={cn("flex flex-col mb-1 group px-4", isOwn ? "items-end pl-12" : "items-start pr-12", !isGrouped ? "mt-4" : "")}>

        {/* Header for non-grouped messages */}
        {!isGrouped && (
          <div className={cn("flex items-end gap-2 mb-1", isOwn ? "justify-end mr-1" : "ml-1")}>
            {!isOwn && (
              <div className="w-6 h-6 shrink-0 bg-slate-200 rounded-full overflow-hidden flex items-center justify-center relative">
                {msg.sender?.avatar_url ? (
                  <Image 
                    src={msg.sender.avatar_url} 
                    alt="" 
                    width={24} 
                    height={24} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <span className="text-[10px] font-semibold text-slate-600">{msg.sender?.full_name?.substring(0, 2).toUpperCase()}</span>
                )}
              </div>
            )}
            {!isOwn && <span className="text-[12px] font-semibold text-muted-foreground">{msg.sender?.full_name}</span>}
            <span className="text-[10px] text-muted-foreground/80 mb-[1px]">{format(msgDate, 'HH:mm')}</span>
          </div>
        )}

        {/* Bubble */}
        <div className={cn(
          "relative max-w-[85%] px-3 py-2 rounded-2xl shadow-sm",
          isOwn ? "bg-brand-navy text-white rounded-tr-sm" : "bg-muted text-foreground border border-border/50 rounded-tl-sm",
          msg.deleted_at ? "opacity-60 italic" : ""
        )}>
          {msg.deleted_at ? (
            <span className="text-[14px]">This message was deleted.</span>
          ) : (
            <>
              {/* Reply Quote */}
              {msg.reply_to_id && msg.reply_to && (
                <div className={cn(
                  "rounded-md px-2 py-1 mb-2 border-l-[3px] text-[12px]",
                  isOwn ? "bg-white/10 border-white/50 text-white/90" : "bg-background border-brand-teal/50 text-muted-foreground"
                )}>
                  <span className="font-semibold text-[10px] uppercase tracking-wider opacity-80 block mb-0.5">Replying to</span>
                  <span className="block truncate line-clamp-1">{msg.reply_to.body}</span>
                </div>
              )}

              {/* Message Body */}
              <div className="text-[14px] leading-relaxed break-words whitespace-pre-wrap">
                {msg.body.split(/(@\[.*?\])/g).map((part, index) => {
                  if (part.startsWith('@[') && part.endsWith(']')) {
                    const name = part.substring(2, part.length - 1)
                    const isMe = userId && otherUser?.full_name === name // Assuming user is the other guy if not in group, simplistic for now
                    return <span key={index} className={cn("rounded px-1 font-semibold text-[13px]", isOwn ? "bg-white/20 text-white" : "bg-brand-teal/15 text-brand-teal")}>{part}</span>
                  }
                  return <span key={index}>{part}</span>
                })}
              </div>

              {msg.is_edited && <div className={cn("text-[10px] text-right mt-1.5 opacity-60", isOwn ? "text-white" : "text-muted-foreground")}>Edited</div>}

              {/* Reference Card */}
              {msg.reference_type && msg.reference_id && (
                <div className={cn(
                  "mt-2 border rounded-lg px-3 py-2 flex items-start gap-3",
                  isOwn ? "bg-white/10 border-white/20" : "bg-background border-border/50"
                )}>
                  <FileText className={cn("w-[16px] h-[16px] mt-0.5", isOwn ? "text-white" : "text-brand-teal")} />
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-[10px] uppercase font-bold tracking-wider", isOwn ? "text-white/70" : "text-muted-foreground")}>{msg.reference_type.replace('_', ' ')}</div>
                    <div className="text-[13px] font-semibold mt-0.5 truncate">Reference: {msg.reference_id.substring(0, 8)}</div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Actions Hover Menu (Absolute) */}
          {!msg.deleted_at && (
            <div className={cn(
              "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 -translate-y-1/2",
              isOwn ? "left-0 -translate-x-full pr-2" : "right-0 translate-x-full pl-2"
            )}>
              {/* Optional: Add hover actions like react, reply later here */}
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background shadow-sm border border-border text-muted-foreground hover:text-foreground" onClick={() => setReplyTo(msg)}>
                <span className="text-[10px] font-bold">↵</span>
              </Button>
            </div>
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
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" />}>
              <MoreHorizontal className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={async () => {
                const newSetting = isMuted ? 'all' : 'muted'
                setIsMuted(!isMuted)
                await updateNotifySetting(conversationId, newSetting)
                toast.success(isMuted ? "Notifications unmuted" : "Notifications muted")
              }}>
                <div className="flex items-center">
                  <BellOff className="w-4 h-4 mr-2" />
                  <span>{isMuted ? "Unmute" : "Mute"} Notifications</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {conversation.type === 'group' ? (
                <DropdownMenuItem className="text-red-500" onClick={async () => {
                  await leaveGroup(conversationId)
                  toast.success("You left the group")
                  router.push('/messages')
                }}>Leave Group</DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => {
                    const other = conversation.members?.find(m => m.user_id !== userId)
                    if (other && other.profile) setProfileModalUser(other.profile as unknown as Profile)
                  }}>View Profile</DropdownMenuItem>
                  <DropdownMenuItem className="text-red-500 font-medium" onClick={async () => {
                    await deleteConversation(conversationId)
                    toast.success("Chat deleted")
                    router.push('/messages')
                  }}>Delete Chat</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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

      <Dialog open={!!profileModalUser} onOpenChange={(open) => !open && setProfileModalUser(null)}>
        <DialogContent className="sm:max-w-xs md:max-w-sm rounded-3xl border border-border/10 shadow-3xl overflow-hidden p-0 bg-gradient-to-br from-background via-background to-brand-navy/[0.02]">
          <DialogHeader className="sr-only">
            <DialogTitle>Personnel Profile</DialogTitle>
          </DialogHeader>

          <div className="h-28 bg-gradient-to-r from-brand-navy via-brand-navy/90 to-brand-teal relative w-full overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)]" />
            <div className="absolute inset-0 bg-grid-white/[0.05] [mask-image:linear-gradient(to_bottom,white,transparent)]" />
            {profileModalUser?.department && (
              <div className="absolute top-4 left-4 bg-white/10 text-white backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] border border-white/20 shadow-sm">
                {profileModalUser.department}
              </div>
            )}
          </div>

          {profileModalUser && (
            <div className="flex flex-col items-center pb-10 px-8 -mt-14 relative z-10">
              <div className="rounded-[2rem] p-1.5 bg-background shadow-2xl mb-5 ring-1 ring-border/5">
                <Avatar className="h-24 w-24 border-2 border-transparent">
                  <AvatarImage src={profileModalUser.avatar_url || ""} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-brand-navy to-brand-teal text-white text-2xl font-bold">
                    {profileModalUser.full_name?.substring(0, 2).toUpperCase() || "PS"}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="text-center w-full space-y-3">
                <div className="space-y-1">
                    <h3 className="text-2xl font-bold text-foreground tracking-tight leading-none">{profileModalUser.full_name}</h3>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.3em]">{profileModalUser.job_title || "Personnel"}</p>
                </div>
                
                <div className="flex items-center justify-center gap-2 pt-2">
                  {profileModalUser.role && (
                    <span className="text-[11px] font-bold text-brand-teal uppercase tracking-widest bg-brand-teal/10 px-4 py-1.5 rounded-xl ring-1 ring-brand-teal/20 shadow-sm">
                      {profileModalUser.role.replace('_', ' ')}
                    </span>
                  )}
                  <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center border border-border/50">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H18c2.2 0 4 1.8 4 4v8Z"/><path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"/></svg>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
