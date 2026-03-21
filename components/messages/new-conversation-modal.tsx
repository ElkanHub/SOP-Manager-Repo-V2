"use client"

import { useState, useEffect } from "react"
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

  const [allUsers, setAllUsers] = useState<any[]>([])

  useEffect(() => {
      if (isOpen && allUsers.length === 0) {
          const fetchAllUsers = async () => {
              setLoading(true)
              const { data } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, department, role')
                .eq('is_active', true)
                .neq('id', userId)
                .order('full_name')
                
              setAllUsers(data || [])
              setLoading(false)
          }
          fetchAllUsers()
      }
  }, [isOpen, userId, supabase, allUsers.length])

  const displayedUsers = search.trim() === "" 
    ? allUsers 
    : allUsers.filter(u => u.full_name.toLowerCase().includes(search.toLowerCase()))

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
      <DialogContent className="max-w-[420px] p-0 overflow-hidden border-border/40 shadow-2xl bg-gradient-to-b from-background to-background/95">
        <DialogHeader className="p-6 pb-2 bg-gradient-to-r from-brand-navy/10 via-brand-teal/5 to-transparent border-b border-border/50">
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">New Conversation</DialogTitle>
        </DialogHeader>

        <div className="p-6 pt-2 space-y-6">

        <div className="flex gap-3">
            <div 
              className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-xl border transition-all duration-200 cursor-pointer shadow-sm group ${
                type === 'direct' 
                  ? 'border-brand-teal bg-brand-teal/5 ring-1 ring-brand-teal/20' 
                  : 'border-border bg-card/30 hover:bg-accent/50 hover:border-border/80'
              }`}
              onClick={() => { setType('direct'); setSelectedMembers([]); setGroupName(''); setSearch('') }}
            >
                <div className={`p-2 rounded-lg ${type === 'direct' ? 'bg-brand-teal/10' : 'bg-muted'}`}>
                  <MessageSquare className={`w-6 h-6 ${type === 'direct' ? 'text-brand-teal' : 'text-muted-foreground group-hover:text-foreground'}`} />
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider ${type === 'direct' ? 'text-brand-teal' : 'text-muted-foreground group-hover:text-foreground'}`}>Direct</span>
            </div>
            <div 
              className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-xl border transition-all duration-200 cursor-pointer shadow-sm group ${
                type === 'group' 
                  ? 'border-brand-navy bg-brand-navy/5 ring-1 ring-brand-navy/20' 
                  : 'border-border bg-card/30 hover:bg-accent/50 hover:border-border/80'
              }`}
              onClick={() => { setType('group'); setSelectedMembers([]); setGroupName(''); setSearch('') }}
            >
                <div className={`p-2 rounded-lg ${type === 'group' ? 'bg-brand-navy/10' : 'bg-muted'}`}>
                  <Users className={`w-6 h-6 ${type === 'group' ? 'text-brand-navy' : 'text-muted-foreground group-hover:text-foreground'}`} />
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider ${type === 'group' ? 'text-brand-navy' : 'text-muted-foreground group-hover:text-foreground'}`}>Group Chat</span>
            </div>
        </div>

        {/* Selected Members */}
        {selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-2 px-6 py-2 bg-muted/20 border-b border-border/40 animate-in fade-in duration-300">
                {selectedMembers.map(m => (
                    <div key={m.id} className="flex items-center gap-1.5 bg-brand-navy/90 text-white rounded-lg pl-1 pr-2 py-1 shadow-sm animate-in zoom-in-95">
                        <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center text-[9px] font-bold">
                            {m.full_name?.substring(0,2).toUpperCase()}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider">{m.full_name.split(' ')[0]}</span>
                        <X className="w-3 h-3 text-white/60 cursor-pointer hover:text-white transition-colors" onClick={() => toggleMember(m)} />
                    </div>
                ))}
            </div>
        )}

        <div className="p-6 pt-0 space-y-4">
            <div className="relative">
                 <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                 <Input 
                     placeholder={type === 'direct' ? "Search for a person..." : "Add members..."} 
                     className="pl-10 h-11 bg-muted/30 border-border/50 focus:border-brand-teal/50 focus:ring-brand-teal/20 transition-all font-medium"
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                 />
            </div>
            
            <div className="border border-border/50 rounded-2xl max-h-[260px] overflow-y-auto w-full bg-card/30 backdrop-blur-md shadow-inner custom-scrollbar">
                {loading ? (
                    <div className="p-10 text-sm text-muted-foreground text-center flex flex-col items-center gap-3">
                       <Loader2 className="w-6 h-6 animate-spin text-brand-teal" />
                       <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Synchronizing Directory...</span>
                    </div>
                ) : displayedUsers.length > 0 ? (
                    displayedUsers.map(r => (
                        <div 
                          key={r.id} 
                          className="flex items-center gap-4 p-4 hover:bg-brand-teal/[0.03] cursor-pointer transition-all border-b border-border/30 last:border-0 group"
                          onClick={() => toggleMember(r)}
                        >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-navy to-brand-navy/80 flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0 shadow-md transition-transform group-hover:scale-105 group-hover:rotate-3">
                                {r.full_name?.substring(0,2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-foreground truncate group-hover:text-brand-teal transition-colors tracking-tight">{r.full_name}</div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest bg-muted/50 px-1.5 py-0.5 rounded-md truncate">{r.department}</span>
                                    <span className="text-[9px] font-bold text-brand-teal/60 uppercase tracking-widest truncate">{r.role}</span>
                                </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <Plus className="w-4 h-4 text-brand-teal" />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-10 text-sm text-muted-foreground text-center flex flex-col items-center gap-2">
                        <Search className="w-6 h-6 opacity-20" />
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">No Personnel Found</span>
                    </div>
                )}
            </div>
        </div>

        {type === 'group' && selectedMembers.length > 0 && (
            <div className="px-6 pb-6 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Assigned Group Designation</label>
                <Input 
                  placeholder="e.g. Regional QA Consortium" 
                  value={groupName} 
                  onChange={(e) => setGroupName(e.target.value)} 
                  className="bg-muted/30 border-border/50 focus:border-brand-navy/50 focus:ring-brand-navy/20 h-11 font-bold"
                />
            </div>
        )}
        </div>

        <DialogFooter className="p-6 pt-2 border-t border-border/40 bg-muted/10 flex flex-col-reverse sm:flex-row gap-3">
            <Button variant="ghost" onClick={onClose} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">Discard</Button>
            <Button 
              className={`font-bold px-8 rounded-lg shadow-lg transition-all ${type === 'group' ? 'bg-brand-navy hover:bg-brand-navy/90 text-white' : 'bg-brand-teal hover:bg-teal-600'}`} 
              disabled={
                  (type === 'direct' && selectedMembers.length !== 1) ||
                  (type === 'group' && (selectedMembers.length < 2 || !groupName.trim())) ||
                  isSubmitting
              }
              onClick={handleSubmit}
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        INITIATING...
                    </>
                ) : (
                    type === 'direct' ? 'START CONVERSATION' : 'CREATE GROUP CLUSTER'
                )}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
