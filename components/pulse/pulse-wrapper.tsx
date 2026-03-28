"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
    const [badgeCount, setBadgeCount] = useState(0)
    const prevCountRef = useRef(0)

    // Restore open state from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem("pulse-sidebar-open")
        if (saved !== null) setIsOpen(saved === "true")
        setIsMounted(true)
    }, [])

    // Sound notification when new items arrive
    useEffect(() => {
        if (badgeCount > prevCountRef.current) {
            const soundEnabled = profile?.notification_prefs?.notice_sound
            if (soundEnabled && !isOpen) {
                const audio = new Audio('/sounds/mixkit-retro-confirmation-tone-2860.wav')
                audio.play().catch(() => {})
            }
        }
        prevCountRef.current = badgeCount
    }, [badgeCount, profile?.notification_prefs?.notice_sound, isOpen])

    const fetchBadgeCount = useCallback(async () => {
        if (!user) return
        const supabase = createClient()

        // Get the timestamp of when the user last opened the Pulse
        const lastOpenedAt = parseInt(localStorage.getItem('last_pulse_view') || '0')

        // Fetch all pulse items that could be visible to this user
        const { data: items } = await supabase
            .from('pulse_items')
            .select(`
                id,
                type,
                sender_id,
                audience,
                target_department,
                created_at,
                pulse_acknowledgements(user_id)
            `)
            .neq('sender_id', user.id)
            .or(`audience.eq.everyone,and(audience.eq.department,target_department.eq.${profile.department}),recipient_id.eq.${user.id}`)
            .order('created_at', { ascending: false })

        if (!items) return

        let count = 0
        for (const item of items) {
            const isAcked = (item.pulse_acknowledgements as any[])?.some(
                (ack: any) => ack.user_id === user.id
            ) ?? false

            // BUCKET 1: Action required (Notices that require acknowledgement)
            // These only clear when the user clicks "Acknowledge"
            if (item.type === 'notice' && !isAcked) {
                count++
                continue
            }

            // BUCKET 2: New/Unread items (created after last time panel was opened)
            // These clear when the user opens the panel
            if (item.type === 'todo' && !isAcked) {
                const itemTime = new Date(item.created_at).getTime()
                if (itemTime > lastOpenedAt) {
                    count++
                    continue
                }
            }
        }

        setBadgeCount(count)
    }, [user, profile.department])

    // Realtime subscriptions + event sync
    useEffect(() => {
        if (!user) return
        const supabase = createClient()

        fetchBadgeCount()

        const channel = supabase.channel('pulse-wrapper-badges')
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'pulse_items'
            }, fetchBadgeCount)
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'pulse_acknowledgements'
            }, fetchBadgeCount)
            .subscribe()

        // Listen for cross-component events
        const handlePulseViewed = () => {
            // Re-fetch after a brief delay so localStorage is definitely updated
            setTimeout(fetchBadgeCount, 30)
        }
        const handleToggle = (e: Event) => {
            const detail = (e as CustomEvent).detail
            if (detail?.open !== undefined) {
                setIsOpen(detail.open)
                localStorage.setItem("pulse-sidebar-open", String(detail.open))
                if (detail.open) {
                    localStorage.setItem("last_pulse_view", Date.now().toString())
                    setTimeout(fetchBadgeCount, 30)
                }
            }
        }

        window.addEventListener('pulse-viewed', handlePulseViewed)
        window.addEventListener('pulse-toggle', handleToggle)

        return () => {
            supabase.removeChannel(channel)
            window.removeEventListener('pulse-viewed', handlePulseViewed)
            window.removeEventListener('pulse-toggle', handleToggle)
        }
    }, [user, fetchBadgeCount])

    const togglePulse = () => {
        const newState = !isOpen
        setIsOpen(newState)
        localStorage.setItem("pulse-sidebar-open", String(newState))

        if (newState) {
            // Mark as "seen" — clears "new item" part of badge
            localStorage.setItem("last_pulse_view", Date.now().toString())
            // Notify TopNav bell to also refresh
            window.dispatchEvent(new Event('pulse-viewed'))
            // Re-calculate badge (action-required items will remain)
            setTimeout(fetchBadgeCount, 30)
        }
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
                            {badgeCount > 0 && (
                                <span className="absolute -top-1.5 -left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-1 ring-white/20">
                                    {badgeCount > 9 ? '9+' : badgeCount}
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
