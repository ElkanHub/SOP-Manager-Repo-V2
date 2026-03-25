"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { PulseItem } from "./pulse-item"
import { NoticeComposer } from "./notice-composer"
import { TodoComposer } from "./todo-composer"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bell, CheckSquare, Plus } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

export function ThePulse({ user, profile }: { user: any, profile: any }) {
    const [items, setItems] = useState<any[]>([])
    const [counts, setCounts] = useState({ everyone: 0, department: 0 })
    const supabase = useMemo(() => createClient(), [])

    // Fetch total counts once
    useEffect(() => {
        const fetchCounts = async () => {
            const { count: everyoneCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true)

            const { count: deptCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('department', profile.department)
                .eq('is_active', true)

            setCounts({ 
                everyone: everyoneCount || 0, 
                department: deptCount || 0 
            })
        }
        fetchCounts()
    }, [profile.department, supabase])

    // Utility to slap counts onto an item
    const withCounts = useCallback((item: any) => {
        let total = 0
        if (item.audience === 'everyone') {
            total = Math.max(0, counts.everyone - 1)
        } else if (item.audience === 'department') {
            total = Math.max(0, counts.department - 1)
        } else if (item.recipient_id) {
            total = 1
        }
        return { ...item, total_recipients: total }
    }, [counts])

    // 1. Initial Fetch
    useEffect(() => {
        async function fetchInitial() {
            const { data, error } = await supabase
                .from('pulse_items')
                .select(`
                    *,
                    sender:profiles!pulse_items_sender_id_fkey(full_name),
                    acknowledgements:pulse_acknowledgements(user_id)
                `)
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) {
                console.error("Pulse fetch error:", error)
            } else if (data) {
                setItems(data.map(withCounts))
            }
        }
        fetchInitial()
    }, [user.id, supabase, withCounts])

    // 2. Realtime Subscription
    useEffect(() => {
        const channel = supabase.channel('pulse_realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'pulse_items' },
                (payload: any) => {
                    const newItem = payload.new as any
                    console.log('Pulse Realtime Insert:', newItem)
                    
                    const isPotentiallyForMe = 
                        newItem.recipient_id === user.id || 
                        newItem.audience === 'everyone' || 
                        (newItem.audience === 'department' && newItem.target_department === profile.department)

                    console.log('Pulse: isPotentiallyForMe?', isPotentiallyForMe, 'Dept:', profile.department, 'TargetDept:', newItem.target_department)

                    if (isPotentiallyForMe) {
                        const itemWithCounts = withCounts(newItem)
                        
                        // Play Notification Sound
                        const prefs = profile.notification_prefs || {}
                        const shouldPlayNotice = (newItem.type === 'notice' || newItem.type === 'todo') && (prefs.notice_sound !== false)
                        const shouldPlayMessage = newItem.type === 'message' && (prefs.message_sound !== false)

                        console.log('Pulse: shouldPlayNotice?', shouldPlayNotice, 'shouldPlayMessage?', shouldPlayMessage, 'Prefs:', prefs)

                        if (shouldPlayNotice) {
                            const audio = new Audio('https://upload.wikimedia.org/wikipedia/commons/5/5c/Notification_1.mp3')
                            audio.volume = 0.5
                            audio.play().catch(err => console.warn('Pulse: Notice sound blocked or failed:', err))
                        } else if (shouldPlayMessage) {
                            const audio = new Audio('https://upload.wikimedia.org/wikipedia/commons/a/a9/Announcement_chime.mp3')
                            audio.volume = 0.5
                            audio.play().catch(err => console.warn('Pulse: Message sound blocked or failed:', err))
                        }

                        if (newItem.sender_id) {
                            supabase.from('profiles').select('full_name').eq('id', newItem.sender_id).single().then(({ data }: any) => {
                                setItems(prev => [{ ...itemWithCounts, sender: data }, ...prev])
                            })
                        } else {
                            setItems(prev => [itemWithCounts, ...prev])
                        }
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'pulse_acknowledgements' },
                (payload: any) => {
                    const newAck = payload.new as any
                    setItems(prev => prev.map(item => 
                        item.id === newAck.pulse_item_id 
                            ? { ...item, acknowledgements: [...(item.acknowledgements || []), newAck] }
                            : item
                    ))
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user.id, supabase, withCounts])


    const topLevelItems = items.filter(i => !i.parent_id)
    const notices = topLevelItems.filter(i => i.type === 'notice')
    const todos = topLevelItems.filter(i => i.type === 'todo')

    // Sort replies chronologically (oldest first) for readable conversation flow
    const getReplies = (parentId: string) => {
        return items
            .filter(i => i.parent_id === parentId)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }

    return (
        <aside className="flex flex-col w-80 h-full border-l border-border bg-background shadow-2xl relative z-50">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-brand-navy relative overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-white/5 mix-blend-overlay"></div>
                <div className="flex items-center gap-2.5 font-bold text-lg text-white relative z-10 tracking-tight">
                    <div className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-teal opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-teal shadow-[0_0_8px_rgba(20,184,166,0.8)]"></span>
                    </div>
                    The Pulse
                </div>
            </div>

            <Tabs defaultValue="all" className="flex-1 flex flex-col pt-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/10 shrink-0">
                    <TabsList className="w-full grid grid-cols-3 h-9 bg-muted/50 p-1">
                        <TabsTrigger value="all" className="text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">All</TabsTrigger>
                        <TabsTrigger value="notices" className="text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Bell className="w-3 h-3 mr-1" /> Notices
                        </TabsTrigger>
                        <TabsTrigger value="todos" className="text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <CheckSquare className="w-3 h-3 mr-1" /> To-Do
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 custom-scrollbar">
                    <TabsContent value="all" className="m-0 p-4 space-y-4 focus-visible:outline-none">
                        {topLevelItems.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No recent activity.</p>}
                        {topLevelItems.map(item => (
                            <PulseItem key={item.id} item={item} currentUser={user} replies={getReplies(item.id)} />
                        ))}
                    </TabsContent>

                    <TabsContent value="notices" className="m-0 p-4 space-y-4 focus-visible:outline-none">
                        {notices.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No notices.</p>}
                        {notices.map(item => (
                            <PulseItem key={item.id} item={item} currentUser={user} replies={getReplies(item.id)} />
                        ))}
                    </TabsContent>

                    <TabsContent value="todos" className="m-0 p-4 space-y-4 focus-visible:outline-none">
                        {todos.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No tasks right now.</p>}
                        {todos.map(item => (
                            <PulseItem key={item.id} item={item} currentUser={user} />
                        ))}
                    </TabsContent>
                </div>
            </Tabs>

            <div className="p-4 border-t border-border bg-muted/10 mt-auto flex flex-col gap-3 shrink-0 relative z-10">
                <NoticeComposer profile={profile} />
                <TodoComposer />
            </div>
        </aside>
    )
}
