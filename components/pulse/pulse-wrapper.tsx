"use client"

import { useState, useEffect } from "react"
import { PanelRightClose, PanelRightOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThePulse } from "./the-pulse"

interface PulseWrapperProps {
    user: any
    profile: any
}

export function PulseWrapper({ user, profile }: PulseWrapperProps) {
    const [isOpen, setIsOpen] = useState(true)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        const saved = localStorage.getItem("pulse-sidebar-open")
        if (saved !== null) {
            setIsOpen(saved === "true")
        }
        setIsMounted(true)
    }, [])

    const togglePulse = () => {
        const newState = !isOpen
        setIsOpen(newState)
        localStorage.setItem("pulse-sidebar-open", String(newState))
    }

    if (!isMounted) return null

    return (
        <>
            {/* Toggle Button - Fixed position, always visible */}
            <Button
                variant="ghost"
                size="icon"
                onClick={togglePulse}
                className={`
                    fixed right-0 top-1/2 -translate-y-1/2 z-50 h-12 w-6 rounded-l-md border-l border-t border-b
                    bg-card shadow-md hover:bg-muted
                    transition-all duration-300 ease-in-out
                    ${isOpen ? 'right-80' : 'right-0'}
                `}
                title={isOpen ? "Close Pulse" : "Open Pulse"}
            >
                {isOpen ? (
                    <PanelRightClose className="h-4 w-4" />
                ) : (
                    <PanelRightOpen className="h-4 w-4" />
                )}
            </Button>

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
