"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { GalleryVerticalEnd, Bell, Menu } from "lucide-react"
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

interface TopNavProps {
    user: any;
    profile: any;
}

export function TopNav({ user, profile }: TopNavProps) {
    const { toggleSidebar } = useSidebar()
    const [newNotifs, setNewNotifs] = useState(0)

    useEffect(() => {
        if (!user) return

        const supabase = createClient()
        const channel = supabase.channel('topnav_notifications')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'pulse_items' },
                (payload) => {
                    const newItem = payload.new
                    const isForMe =
                        newItem.audience === 'everyone' ||
                        (newItem.audience === 'department' && profile.department) ||
                        newItem.recipient_id === user.id

                    if (isForMe && newItem.sender_id !== user.id) {
                        setNewNotifs(prev => prev + 1)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user, profile])

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
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 relative" onClick={() => setNewNotifs(0)}>
                        <Bell className="h-5 w-5" />
                        {newNotifs > 0 && (
                            <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                                {newNotifs > 9 ? '9+' : newNotifs}
                            </span>
                        )}
                        <span className="sr-only">Toggle notifications</span>
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" className="relative h-8 w-8 rounded-full border border-white/20 ml-2 hover:bg-white/10" />}>
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || "User"} />
                                <AvatarFallback className="bg-brand-navy text-white text-xs">
                                    {profile?.full_name?.substring(0, 2).toUpperCase() || "US"}
                                </AvatarFallback>
                            </Avatar>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end">
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{profile?.full_name}</p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        {user?.email}
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem render={<Link href="/settings/profile" />}>
                                Profile Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem render={<Link href="/settings/preferences" />}>
                                Preferences
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem render={
                                <form action="/auth/signout" method="post" className="w-full cursor-pointer" />
                            }>
                                <button type="submit" className="w-full text-left inline-flex min-w-full">Log out</button>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </nav>
            </div>
        </header>
    )
}
