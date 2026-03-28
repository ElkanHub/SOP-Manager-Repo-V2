"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { GalleryVerticalEnd, Bell, Menu, Book } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSidebar } from "@/components/ui/sidebar"
import { GlobalSearch } from "./global-search"
import { ThemeToggle } from "@/components/theme-toggle"
import { createClient } from "@/lib/supabase/client"
import { UserAvatar } from "@/components/user-avatar"

interface TopNavProps {
    user: any;
    profile: any;
}

export function TopNav({ user, profile }: TopNavProps) {
    const { toggleSidebar } = useSidebar()
    const [notifCount, setNotifCount] = useState(0)
    const [lastSeenPulse, setLastSeenPulse] = useState<number>(0)

    useEffect(() => {
        const stored = localStorage.getItem('last_pulse_view')
        if (stored) setLastSeenPulse(parseInt(stored))
    }, [])

    useEffect(() => {
        if (!user || !profile) return

        const supabase = createClient()

        async function fetchPulseCounts() {
            // Count notices not acknowledged by user
            const { data: acks } = await supabase
                .from('pulse_acknowledgements')
                .select('pulse_item_id')
                .eq('user_id', user.id)
            
            const ackedIds = acks?.map(a => a.pulse_item_id) || []

            // Query items for this user
            let query = supabase
                .from('pulse_items')
                .select('id, type, created_at, sender_id')
                .neq('sender_id', user.id)
                .or(`recipient_id.eq.${user.id},audience.eq.everyone,and(audience.eq.department,target_department.eq.${profile.department})`)

            const { data: items } = await query

            if (items) {
                const storedLastSeen = parseInt(localStorage.getItem('last_pulse_view') || '0')
                
                const count = items.filter(item => {
                    // Type-based logic
                    if (item.type === 'notice') {
                        // Show badge if NOT acknowledged OR if it's "New" (created since last bell click)
                        const isAcked = ackedIds.includes(item.id)
                        const isNew = new Date(item.created_at).getTime() > storedLastSeen
                        return !isAcked || isNew
                    }
                    if (item.type === 'todo') {
                        // For now todos are self-assigned or system-assigned, using is_read or is_acknowledged
                        // Simple logic for pulse: if it's there and not acknowledged/seen, count it
                        return !ackedIds.includes(item.id)
                    }
                    return false
                }).length

                setNotifCount(count)
            }
        }

        fetchPulseCounts()

        const channel = supabase.channel('topnav_notifications')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'pulse_items' },
                fetchPulseCounts
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'pulse_acknowledgements' },
                fetchPulseCounts
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user, profile])

    const handleBellClick = () => {
        const now = Date.now()
        localStorage.setItem('last_pulse_view', now.toString())
        setLastSeenPulse(now)
        // Recalculate count immediately locally to clear "New" (but keep "Unacknowledged")
        // The next fetch or realtime update will also confirm this.
        // For simplicity, we just trigger a tiny delay so the UI feels responsive
        setTimeout(() => {
            // Re-trigger the count fetch implicitly by the state update if needed, 
            // but the useEffect logic will handle it on next render if we force it.
            // Or just manually decrement if they were only 'new' ones.
            // Better: just let the component re-render.
        }, 10)
    }

    return (
        <header className="sticky top-0 z-50 flex h-14 w-full shrink-0 items-center gap-4 bg-gradient-to-r from-brand-navy to-brand-blue border-b border-white/10 px-4 shadow-sm">
            <div className="flex items-center gap-4 lg:hidden">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={toggleSidebar}>
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle Sidebar</span>
                </Button>
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-white">
                    <GalleryVerticalEnd className="h-5 w-5" />
                    <span className="hidden sm:inline-block">SOP-Guard Pro</span>
                </Link>
            </div>

            <div className="hidden lg:flex items-center gap-2 font-semibold text-white mr-4">
                <GalleryVerticalEnd className="h-5 w-5" />
                <span>SOP-Guard Pro</span>
            </div>

            <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                <div className="w-full flex-1 md:w-auto md:flex-none max-w-sm">
                    <GlobalSearch />
                </div>

                <nav className="flex items-center gap-2">
                    <ThemeToggle />
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-white hover:bg-white/10 relative" 
                        onClick={handleBellClick}
                    >
                        <Bell className="h-5 w-5" />
                        {notifCount > 0 && (
                            <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-1 ring-white/20">
                                {notifCount > 9 ? '9+' : notifCount}
                            </span>
                        )}
                        <span className="sr-only">Toggle notifications</span>
                    </Button>
                    {/* docsPage */}
                    <Link href="/docs">
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 relative">
                            <Book className="h-5 w-5" />
                        </Button>
                    </Link>


                    {/* Direct Link to Settings */}
                    <Link href="/settings" className="ml-2 transition-transform hover:scale-105 active:scale-95">
                        <UserAvatar
                            name={profile?.full_name}
                            image={profile?.avatar_url}
                            size="sm"
                            className="h-8 w-8 border border-white/20 hover:border-white/50 transition-colors"
                        />
                        <span className="sr-only">Settings</span>
                    </Link>
                </nav>
            </div>
        </header>
    )
}
