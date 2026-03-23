"use client"

import { useState, useEffect } from "react"
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
    const supabase = createClient()

    // 1. Initial Fetch
    useEffect(() => {
        async function fetchInitial() {
            // We fetch items that are relevant to this user
            // "everyone", or their "department", or directly to them
            const { data, error } = await supabase
                .from('pulse_items')
                .select('*, sender:profiles!sender_id(full_name)')
                .or(`audience.eq.everyone,audience.eq.department,recipient_id.eq.${user.id}`)
                .order('created_at', { ascending: false })
                .limit(50)

            if (!error && data) {
                // Filter the department items in memory since PostgREST doesn't support complex OR with different column correlations easily here if audience is just an enum
                // Actually the policy handles this! If they can SELECT it, we can just show it.
                setItems(data)
            }
        }
        fetchInitial()
    }, [user.id, supabase])

    // 2. Realtime Subscription
    useEffect(() => {
        const channel = supabase.channel('pulse_realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'pulse_items' },
                (payload) => {
                    const newItem = payload.new

                    // Client-side filtering check (backup to RLS if realtime bypasses it depending on config)
                    const isForMe =
                        newItem.audience === 'everyone' ||
                        (newItem.audience === 'department' && profile.department) || // Simplified dept check 
                        newItem.recipient_id === user.id

                    if (isForMe) {
                        // Fetch sender name for the new item if it's not a system message
                        if (newItem.sender_id) {
                            supabase.from('profiles').select('full_name').eq('id', newItem.sender_id).single().then(({ data }) => {
                                setItems(prev => [{ ...newItem, sender: data }, ...prev])
                            })
                        } else {
                            setItems(prev => [newItem, ...prev])
                        }
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user.id, profile.department, supabase])


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

                <ScrollArea className="flex-1">
                    <TabsContent value="all" className="m-0 p-4 space-y-4">
                        {topLevelItems.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No recent activity.</p>}
                        {topLevelItems.map(item => (
                            <PulseItem key={item.id} item={item} currentUser={user} replies={getReplies(item.id)} />
                        ))}
                    </TabsContent>

                    <TabsContent value="notices" className="m-0 p-4 space-y-4">
                        {notices.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No notices.</p>}
                        {notices.map(item => (
                            <PulseItem key={item.id} item={item} currentUser={user} replies={getReplies(item.id)} />
                        ))}
                    </TabsContent>

                    <TabsContent value="todos" className="m-0 p-4 space-y-4">
                        {todos.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No tasks right now.</p>}
                        {todos.map(item => (
                            <PulseItem key={item.id} item={item} currentUser={user} />
                        ))}
                    </TabsContent>
                </ScrollArea>
            </Tabs>

            <div className="p-4 border-t border-border bg-muted/10 mt-auto flex flex-col gap-3 shrink-0 relative z-10">
                <NoticeComposer profile={profile} />
                <TodoComposer />
            </div>
        </aside>
    )
}
