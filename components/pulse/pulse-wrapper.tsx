"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { PanelRightClose, PanelRightOpen } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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

        const lastOpenedAt = parseInt(localStorage.getItem('last_pulse_view') || '0')

        // Step 1: Get all pulse items visible to anyone (we'll filter in JS)
        // Fetch recent top-level items only
        const { data: items } = await supabase
            .from('pulse_items')
            .select('id, type, sender_id, audience, target_department, recipient_id, created_at')
            .is('parent_id', null)
            .order('created_at', { ascending: false })
            .limit(200)

        if (!items) return

        // Step 2: Get this user's acknowledgements
        const { data: acks } = await supabase
            .from('pulse_acknowledgements')
            .select('pulse_item_id')
            .eq('user_id', user.id)

        const ackedIds = new Set((acks || []).map((a: any) => a.pulse_item_id))

        // Step 3: Count based on two-bucket rules
        let count = 0
        for (const item of items) {
            // Skip items sent by this user
            if (item.sender_id === user.id) continue

            // Check visibility: is this item meant for this user?
            const isForMe =
                item.audience === 'everyone' ||
                (item.audience === 'department' && item.target_department === profile.department) ||
                item.recipient_id === user.id ||
                item.sender_id === null // system-generated items broadcast to all

            if (!isForMe) continue

            const isAcked = ackedIds.has(item.id)

            // BUCKET 1 — Notices: count until explicitly acknowledged
            if (item.type === 'notice') {
                if (!isAcked) count++
                continue
            }

            // BUCKET 2 — Everything else: count if new since last panel open
            const itemTime = new Date(item.created_at).getTime()
            if (itemTime > lastOpenedAt && !isAcked) {
                count++
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
                <Tooltip>
                    <TooltipTrigger
                        render={
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={togglePulse}
                                className="h-16 w-8 rounded-l-md border-l border-t border-b bg-muted/60 hover:bg-muted text-muted-foreground shadow-sm relative"
                                aria-label={isOpen ? "Close Pulse" : "Open Pulse"}
                            />
                        }
                    >
                        {isOpen ? (
                            <PanelRightClose className="h-5 w-5" />
                        ) : (
                            <>
                                <PanelRightOpen className="h-5 w-5" />
                                {badgeCount > 0 && (
                                    <span className="absolute -top-1.5 -left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-1 ring-white/20">
                                        {badgeCount > 9 ? '9+' : badgeCount}
                                    </span>
                                )}
                            </>
                        )}
                    </TooltipTrigger>
                    <TooltipContent side="left">
                        {isOpen ? "Close Pulse" : "Open Pulse — notices & updates"}
                    </TooltipContent>
                </Tooltip>
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
