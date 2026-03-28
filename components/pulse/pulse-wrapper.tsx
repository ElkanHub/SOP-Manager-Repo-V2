"use client"

import { useState, useEffect, useRef } from "react"
import { PanelRightClose, PanelRightOpen } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ThePulse } from "./the-pulse"

interface PulseWrapperProps {
    user: any
    profile: any
}

export function PulseWrapper({ user, profile }: PulseWrapperProps) {
    const [isOpen, setIsOpen] = useState(true)
    const [isMounted, setIsMounted] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const prevUnreadRef = useRef(0)

    useEffect(() => {
        if (unreadCount > prevUnreadRef.current) {
            const soundEnabled = profile?.notification_prefs?.notice_sound
            // Play if sound enabled AND pulse is either closed OR open but new items arrived
            if (soundEnabled && (document.hidden || !isOpen)) {
                const audio = new Audio('/sounds/mixkit-retro-confirmation-tone-2860.wav')
                audio.play().catch(err => console.log('Pulse sound prevented:', err))
            }
        }
        prevUnreadRef.current = unreadCount
    }, [unreadCount, profile?.notification_prefs?.notice_sound, isOpen])

    useEffect(() => {
        const saved = localStorage.getItem("pulse-sidebar-open")
        if (saved !== null) {
            setIsOpen(saved === "true")
        }
        setIsMounted(true)
    }, [])

    useEffect(() => {
        if (!user) return
        const supabase = createClient()

        async function fetchUnread() {
            // Unread calculation: 
            // 1. Get pulse_items for user/dept/everyone
            // 2. Filter those that don't have an acknowledgement from this user
            const { data: items } = await supabase
                .from('pulse_items')
                .select(`
                    id,
                    recipient_id,
                    audience,
                    target_department,
                    pulse_acknowledgements(user_id)
                `)
                .or(`recipient_id.eq.${user.id},audience.eq.everyone,target_department.eq.${profile.department}`)
            
            if (items) {
                const unread = items.filter((item: any) => 
                    !item.pulse_acknowledgements?.some((ack: any) => ack.user_id === user.id)
                ).length
                setUnreadCount(unread)
            }
        }

        fetchUnread()

        const channel = supabase.channel('pulse-wrapper-badges')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pulse_items' }, fetchUnread)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pulse_acknowledgements' }, fetchUnread)
            .subscribe()
        
        return () => { supabase.removeChannel(channel) }
    }, [user, profile.department])

    const togglePulse = () => {
        const newState = !isOpen
        setIsOpen(newState)
        localStorage.setItem("pulse-sidebar-open", String(newState))
    }

    if (!isMounted) return null

    return (
        <>
            {/* Toggle Button - Fixed position, always visible */}
            <div 
                className={`
                    fixed top-1/2 -translate-y-1/2 z-50 flex items-center
                    transition-all duration-300 ease-in-out
                    ${isOpen ? 'right-80' : 'right-0'}
                `}
            >
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={togglePulse}
                    className="h-12 w-6 rounded-l-md border-l border-t border-b bg-card shadow-md hover:bg-muted relative"
                    title={isOpen ? "Close Pulse" : "Open Pulse"}
                >
                    {isOpen ? (
                        <PanelRightClose className="h-4 w-4" />
                    ) : (
                        <>
                            <PanelRightOpen className="h-4 w-4" />
                            {!isOpen && unreadCount > 0 && (
                                <span className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-teal text-[9px] font-bold text-white shadow-sm ring-2 ring-background">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </>
                    )}
                </Button>
            </div>

            {/* Overlay Pulse Panel - Fixed position, slides over content */}
            <div
                className={`
                    fixed right-0 top-0 h-full z-40 w-80 flex flex-col overflow-hidden
                    transition-transform duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                `}
                style={{ paddingTop: '56px' }}
            >
                <ThePulse user={user} profile={profile} />
            </div>
        </>
    )
}
