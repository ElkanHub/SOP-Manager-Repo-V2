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
            .select('id, type, sender_id, audience, target_department, recipient_id, created_at, due_at, completed_at')
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
        const now = Date.now()

        // Count based on three buckets.
        let count = 0
        for (const item of items) {
            // BUCKET 3 — Own To-Do: private, counts only when due and not yet done.
            // Own todos have sender_id === user.id, so they are handled before the
            // generic "skip own items" rule.
            if (item.type === 'todo' && item.recipient_id === user.id) {
                if (item.completed_at) continue
                // No due date: treat as a reminder — count once (until panel opened)
                if (!item.due_at) {
                    const itemTime = new Date(item.created_at).getTime()
                    if (itemTime > lastOpenedAt) count++
                    continue
                }
                // Has a due date: only count when it's due (now or past)
                if (new Date(item.due_at).getTime() <= now) count++
                continue
            }

            // Skip items sent by this user (non-todos, or someone else's todos)
            if (item.sender_id === user.id) continue

            // Is this item meant for this user?
            const isForMe =
                item.audience === 'everyone' ||
                (item.audience === 'department' && item.target_department === profile.department) ||
                item.recipient_id === user.id ||
                item.sender_id === null

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

        // Due-date ticker — todos that have just crossed their due time won't
        // fire a postgres_changes event, so poll every 60s to pick them up.
        const dueTicker = setInterval(fetchBadgeCount, 60_000)

        return () => {
            supabase.removeChannel(channel)
            window.removeEventListener('pulse-viewed', handlePulseViewed)
            window.removeEventListener('pulse-toggle', handleToggle)
            clearInterval(dueTicker)
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
