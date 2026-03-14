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
                .select('*')
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
                        setItems(prev => [newItem, ...prev])
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user.id, profile.department, supabase])


    const notices = items.filter(i => i.type === 'notice')
    const todos = items.filter(i => i.type === 'todo')
    const alerts = items.filter(i => i.type !== 'notice' && i.type !== 'todo')

    return (
        <aside className="hidden xl:flex w-80 flex-col border-l bg-white shrink-0 z-20 shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.1)] relative">
            <div className="flex items-center justify-between p-4 border-b bg-slate-50">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    The Pulse
                </div>
            </div>

            <Tabs defaultValue="all" className="flex-1 flex flex-col pt-2">
                <div className="px-4 pb-2 border-b">
                    <TabsList className="w-full grid grid-cols-3">
                        <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                        <TabsTrigger value="notices" className="text-xs">
                            <Bell className="w-3 h-3 mr-1" /> Notices
                        </TabsTrigger>
                        <TabsTrigger value="todos" className="text-xs">
                            <CheckSquare className="w-3 h-3 mr-1" /> To-Do
                        </TabsTrigger>
                    </TabsList>
                </div>

                <ScrollArea className="flex-1">
                    <TabsContent value="all" className="m-0 p-4 space-y-4">
                        {items.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No recent activity.</p>}
                        {items.map(item => (
                            <PulseItem key={item.id} item={item} currentUser={user} />
                        ))}
                    </TabsContent>

                    <TabsContent value="notices" className="m-0 p-4 space-y-4">
                        {notices.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No notices.</p>}
                        {notices.map(item => (
                            <PulseItem key={item.id} item={item} currentUser={user} />
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

            <div className="p-4 border-t bg-slate-50 mt-auto flex flex-col gap-2">
                <NoticeComposer profile={profile} />
                <TodoComposer />
            </div>
        </aside>
    )
}
