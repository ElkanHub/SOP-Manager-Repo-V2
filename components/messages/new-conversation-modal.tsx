"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageSquare, Users, Search, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { createConversation } from "@/actions/messages"
import { useMessagesStore } from "@/store/messages-store"

export function NewConversationModal({ isOpen, onClose, userId }: { isOpen: boolean, onClose: () => void, userId: string }) {
  const [type, setType] = useState<'direct' | 'group'>('direct')
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [selectedMembers, setSelectedMembers] = useState<any[]>([])
  const [groupName, setGroupName] = useState("")
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { setActive } = useMessagesStore()
  const supabase = createClient()

  // Debounced search logic would go here
  const handleSearch = async (val: string) => {
      setSearch(val)
      if (val.length < 2) {
          setResults([])
          return
      }
      setLoading(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, department, role')
        .eq('is_active', true)
        .neq('id', userId)
        .ilike('full_name', `%${val}%`)
        .limit(10)
        
      setResults(data || [])
      setLoading(false)
  }

  const toggleMember = (user: any) => {
      if (selectedMembers.find(m => m.id === user.id)) {
          setSelectedMembers(prev => prev.filter(m => m.id !== user.id))
      } else {
          if (type === 'direct') {
              setSelectedMembers([user])
          } else {
              setSelectedMembers(prev => [...prev, user])
          }
      }
      setSearch("")
      setResults([])
  }

  const handleSubmit = async () => {
      if (type === 'direct' && selectedMembers.length !== 1) return
      if (type === 'group' && (selectedMembers.length < 2 || !groupName.trim())) return
      
      setIsSubmitting(true)
      try {
          const res = await createConversation({
              type,
              memberIds: selectedMembers.map(m => m.id),
              name: type === 'group' ? groupName : null
          })
          if (res?.id) {
              setActive(res.id)
              onClose()
              setSelectedMembers([])
              setGroupName("")
          }
      } catch (e) {
          console.error(e)
      } finally {
          setIsSubmitting(false)
      }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 mb-4 mt-2">
            <div 
              className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${type === 'direct' ? 'border-brand-teal bg-brand-teal/5' : 'border-border hover:bg-muted/50'}`}
              onClick={() => { setType('direct'); setSelectedMembers([]); setGroupName(''); setSearch('') }}
            >
                <MessageSquare className={`w-8 h-8 ${type === 'direct' ? 'text-brand-teal' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-semibold ${type === 'direct' ? 'text-brand-teal' : 'text-muted-foreground'}`}>Direct Message</span>
            </div>
            <div 
              className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${type === 'group' ? 'border-brand-teal bg-brand-teal/5' : 'border-border hover:bg-muted/50'}`}
              onClick={() => { setType('group'); setSelectedMembers([]); setGroupName(''); setSearch('') }}
            >
                <Users className={`w-8 h-8 ${type === 'group' ? 'text-brand-teal' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-semibold ${type === 'group' ? 'text-brand-teal' : 'text-muted-foreground'}`}>Group Chat</span>
            </div>
        </div>

        {/* Selected Members */}
        {selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
                {selectedMembers.map(m => (
                    <div key={m.id} className="flex items-center gap-1.5 bg-muted rounded-full pl-1.5 pr-2 py-1">
                        <div className="w-5 h-5 rounded-full bg-brand-navy flex items-center justify-center text-[9px] text-white font-semibold">
                            {m.full_name?.substring(0,2).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-foreground">{m.full_name.split(' ')[0]}</span>
                        <X className="w-3 h-3 text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => toggleMember(m)} />
                    </div>
                ))}
            </div>
        )}

        <div className="relative">
             <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
             <Input 
                 placeholder={type === 'direct' ? "Search for a person..." : "Add members..."} 
                 className="pl-9"
                 value={search}
                 onChange={(e) => handleSearch(e.target.value)}
             />
             {search && (
                 <div className="absolute top-12 left-0 w-[100%] bg-popover border border-border rounded-md shadow-lg z-50 max-h-[200px] overflow-y-auto">
                     {loading ? (
                         <div className="p-3 text-sm text-muted-foreground text-center">Searching...</div>
                     ) : results.length > 0 ? (
                         results.map(r => (
                             <div 
                               key={r.id} 
                               className="flex items-center gap-3 p-2 hover:bg-muted cursor-pointer"
                               onClick={() => toggleMember(r)}
                             >
                                 <div className="w-8 h-8 rounded-full bg-brand-navy flex items-center justify-center text-[10px] text-white font-semibold">
                                     {r.full_name?.substring(0,2).toUpperCase()}
                                 </div>
                                 <div className="flex-1">
                                     <div className="text-sm font-semibold">{r.full_name}</div>
                                     <div className="text-xs text-muted-foreground uppercase">{r.department} · {r.role}</div>
                                 </div>
                             </div>
                         ))
                     ) : (
                         <div className="p-3 text-sm text-muted-foreground text-center">No results found.</div>
                     )}
                 </div>
             )}
        </div>

        {type === 'group' && selectedMembers.length > 0 && (
            <div className="mt-4">
                <label className="text-sm font-semibold mb-1.5 block">Group Name</label>
                <Input placeholder="e.g. QA Team Chat" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
            </div>
        )}

        <DialogFooter className="mt-6">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button 
              className="bg-brand-navy hover:bg-brand-navy/90" 
              disabled={
                  (type === 'direct' && selectedMembers.length !== 1) ||
                  (type === 'group' && (selectedMembers.length < 2 || !groupName.trim())) ||
                  isSubmitting
              }
              onClick={handleSubmit}
            >
                {type === 'direct' ? 'Start Conversation' : 'Create Group'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
