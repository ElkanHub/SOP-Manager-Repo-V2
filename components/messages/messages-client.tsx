"use client"

import { useState, useEffect } from "react"
import { Plus, Search, MessageSquare, BellOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMessagesStore } from "@/store/messages-store"
import { createClient } from "@/lib/supabase/client"
import { formatDistanceToNow, isToday, format } from "date-fns"
import { cn } from "@/lib/utils"
// We'll build these later
import { ConversationThread } from "./conversation-thread"
import { NewConversationModal } from "./new-conversation-modal"
import { Conversation, ConversationMember } from "@/types/app.types"
import Image from "next/image"


// Temporary stub components
const EmptyState = ({ title, description }: { title: string, description: string }) => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/20">
    <MessageSquare className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
    <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
  </div>
)

const GroupAvatar = ({ members = [] }: { members: any[] }) => {
  return (
    <div className="relative w-9 h-9 shrink-0 flex items-center justify-center bg-slate-100 rounded-full border border-border">
      <span className="text-xs font-semibold text-slate-600">G</span>
    </div>
  )
}

export function MessagesClient({ userId, initialActiveId }: { userId: string, initialActiveId?: string }) {
  const { activeConversationId, setActive } = useMessagesStore()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    async function loadConversations() {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_members!inner(user_id, last_read_at, notify_setting),
          members:conversation_members(
            user_id,
            profile:profiles(id, full_name, avatar_url, department, role)
          )
        `)
        .eq('conversation_members.user_id', userId)
        .eq('is_archived', false)
        .order('last_message_at', { ascending: false })

      if (!error && data) {
        setConversations(data as unknown as Conversation[])
        if (initialActiveId && !activeConversationId) {
            setActive(initialActiveId)
        }
      } else {
        console.error("Failed to load conversations:", error)
      }
    }
    
    loadConversations()
    
    // Subscribe to pulse updates to refresh unread badges if needed
    // or to message insert
    const channel = supabase.channel('conversations-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
          loadConversations()
      })
      .subscribe()
      
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase])

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery) return true
    
    const term = searchQuery.toLowerCase()
    const nameMatch = c.name?.toLowerCase().includes(term)
    const bodyMatch = c.last_message_body?.toLowerCase().includes(term)
    
    // For direct, check other user's name
    let otherUserNameMatch = false
    if (c.type === 'direct') {
      const otherUser = c.members?.find(m => m.user_id !== userId)?.profile
      if (otherUser?.full_name?.toLowerCase().includes(term)) {
        otherUserNameMatch = true
      }
    }
    
    return nameMatch || bodyMatch || otherUserNameMatch
  })

  return (
    <div className="flex h-full w-full">
      {/* Left Panel */}
      <div className={cn(
        "w-full md:w-[280px] shrink-0 flex flex-col border-r bg-background",
        activeConversationId ? "hidden md:flex" : "flex"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 h-14 shrink-0 border-b">
          <h2 className="text-[15px] font-semibold text-foreground">Messages</h2>
          <Button variant="secondary" size="sm" className="h-8 w-8 p-0" onClick={() => setIsNewModalOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="p-2 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-8 h-8 text-sm bg-muted/50 border-transparent focus-visible:bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground italic">
              No conversations found.
            </div>
          ) : (
            filteredConversations.map(conv => {
              const isActive = conv.id === activeConversationId
              const myMember = conv.members?.find(m => m.user_id === userId)
              const otherUser = conv.type === 'direct' 
                ? conv.members?.find(m => m.user_id !== userId)?.profile 
                : null
                
              const displayTitle = conv.type === 'direct' 
                ? otherUser?.full_name || 'Unknown User'
                : conv.name || 'Group Chat'
                
              const avatar = conv.type === 'direct'
                ? (
                  <div className="w-9 h-9 shrink-0 bg-brand-navy rounded-full flex items-center justify-center text-white overflow-hidden">
                    {otherUser?.avatar_url ? (
                      <Image 
                        src={otherUser.avatar_url} 
                        alt="" 
                        width={36} 
                        height={36} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className="text-xs font-semibold">{otherUser?.full_name?.substring(0,2).toUpperCase()}</span>
                    )}
                  </div>
                )
                : <GroupAvatar members={conv.members || []} />

              const hasUnread = conv.last_message_at && myMember?.last_read_at 
                ? new Date(conv.last_message_at) > new Date(myMember.last_read_at)
                : false
                
              let displayTime = ""
              if (conv.last_message_at) {
                const date = new Date(conv.last_message_at)
                displayTime = isToday(date) ? formatDistanceToNow(date, { addSuffix: true }) : format(date, 'MMM d')
                // A quick hack for clean time-ago string parsing if needed: displayTime.replace('about ', '')
              }
              
              const isMuted = myMember?.notify_setting === 'muted'

              return (
                <div 
                  key={conv.id}
                  onClick={() => setActive(conv.id)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 h-16 cursor-pointer border-l-[3px] transition-colors",
                    isActive 
                      ? "bg-blue-50/50 dark:bg-brand-teal/10 border-brand-teal" 
                      : "border-transparent hover:bg-muted/50"
                  )}
                >
                  {avatar}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <h4 className="text-[13px] font-semibold text-foreground truncate">{displayTitle}</h4>
                      <span className="text-[11px] text-muted-foreground tracking-tight shrink-0 pl-2">{displayTime}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={cn(
                        "text-xs truncate",
                        hasUnread && !isActive ? "text-foreground font-medium" : "text-muted-foreground italic"
                      )}>
                        {conv.last_message_body || "No messages yet"}
                      </p>
                      <div className="flex shrink-0 items-center justify-end gap-1.5 pl-2">
                         {isMuted && <BellOff className="w-[11px] h-[11px] text-muted-foreground" />}
                         {hasUnread && !isActive && (
                           <span className="w-2 h-2 rounded-full bg-brand-teal" />
                         )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className={cn(
        "flex-1 flex-col h-full bg-background md:flex",
        activeConversationId ? "flex" : "hidden"
      )}>
        {activeConversationId ? (
          <ConversationThread conversationId={activeConversationId} userId={userId} />
        ) : (
          <EmptyState 
            title="Select a conversation" 
            description="Choose a conversation from the list or start a new one." 
          />
        )}
      </div>
      
      {/* New Conversation Modal Placeholder */}
      <NewConversationModal 
        isOpen={isNewModalOpen} 
        onClose={() => setIsNewModalOpen(false)} 
        userId={userId}
      />
    </div>
  )
}
