"use client"

import { useState, useEffect, useCallback } from "react"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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

    // Query function exposed for manual trigger
    const fetchPulseCounts = useCallback(async () => {
        if (!user || !profile) return
        const supabase = createClient()

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
                const isAcked = ackedIds.includes(item.id)
                const isNew = new Date(item.created_at).getTime() > storedLastSeen
                if (item.type === 'notice') return !isAcked || isNew
                if (item.type === 'todo') return !isAcked
                return false
            }).length

            setNotifCount(count)
        }
    }, [user, profile])

    useEffect(() => {
        const handlePulseViewed = () => {
            const stored = localStorage.getItem('last_pulse_view')
            if (stored) {
                setLastSeenPulse(parseInt(stored))
                fetchPulseCounts()
            }
        }
        
        // Initial load
        handlePulseViewed()
        
        window.addEventListener('pulse-viewed', handlePulseViewed)
        return () => window.removeEventListener('pulse-viewed', handlePulseViewed)
    }, [fetchPulseCounts])


    useEffect(() => {
        if (!user || !profile) return
        const supabase = createClient()

        fetchPulseCounts()

        const channel = supabase.channel('topnav_notifications')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pulse_items' }, fetchPulseCounts)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pulse_acknowledgements' }, fetchPulseCounts)
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [user, profile, fetchPulseCounts])

    const handleBellClick = () => {
        // Toggle the pulse sidebar
        window.dispatchEvent(new CustomEvent('pulse-toggle', { detail: { open: true } }))
        
        const now = Date.now()
        localStorage.setItem('last_pulse_view', now.toString())
        setLastSeenPulse(now)
        fetchPulseCounts()
        
        // Notify other components (like PulseWrapper) that it was viewed
        window.dispatchEvent(new Event('pulse-viewed'))
    }

    return (
        <header className="sticky top-0 z-50 flex h-14 w-full shrink-0 items-center gap-4 bg-gradient-to-r from-brand-navy to-brand-blue border-b border-white/10 px-4 shadow-sm">
            <div className="flex items-center gap-4 lg:hidden">
                <Tooltip>
                    <TooltipTrigger
                        render={
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white hover:bg-white/10"
                                onClick={toggleSidebar}
                                aria-label="Toggle navigation menu"
                            />
                        }
                    >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle Sidebar</span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Open menu</TooltipContent>
                </Tooltip>
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
                    <Tooltip>
                        <TooltipTrigger render={<ThemeToggle />} />
                        <TooltipContent side="bottom">Toggle theme</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-white hover:bg-white/10 relative"
                                    onClick={handleBellClick}
                                    aria-label="Open Pulse notifications"
                                />
                            }
                        >
                            <Bell className="h-5 w-5" />
                            {notifCount > 0 && (
                                <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-1 ring-white/20">
                                    {notifCount > 9 ? '9+' : notifCount}
                                </span>
                            )}
                            <span className="sr-only">Toggle notifications</span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Notifications</TooltipContent>
                    </Tooltip>
                    {/* docsPage */}
                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <Link
                                    href="/docs"
                                    aria-label="Documentation"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white hover:bg-white/10 transition-colors"
                                />
                            }
                        >
                            <Book className="h-5 w-5" />
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Documentation</TooltipContent>
                    </Tooltip>


                    {/* Direct Link to Settings */}
                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <Link
                                    href="/settings"
                                    aria-label="Settings and profile"
                                    className="ml-2 inline-block transition-transform hover:scale-105 active:scale-95"
                                />
                            }
                        >
                            <UserAvatar
                                name={profile?.full_name}
                                image={profile?.avatar_url}
                                size="sm"
                                className="h-8 w-8 border border-white/20 hover:border-white/50 transition-colors"
                            />
                            <span className="sr-only">Settings</span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="end">Settings &amp; profile</TooltipContent>
                    </Tooltip>
                </nav>
            </div>
        </header>
    )
}
