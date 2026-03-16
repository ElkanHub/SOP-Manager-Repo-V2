"use client"

import { useState } from "react"
import { PanelLeftClose, PanelRightClose, PanelRightOpen, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThePulse } from "./the-pulse"

interface PulseWrapperProps {
    user: any
    profile: any
}

export function PulseWrapper({ user, profile }: PulseWrapperProps) {
    const [isOpen, setIsOpen] = useState(true)

    return (
        <>
            {/* Toggle Button - Visible on all breakpoints */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    fixed right-0 top-1/2 -translate-y-1/2 z-30 h-12 w-6 rounded-l-md border-l border-t border-b
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

            {/* Collapsible Pulse Panel */}
            <div
                className={`
                    transition-all duration-300 ease-in-out overflow-hidden shrink-0
                    ${isOpen ? 'w-80' : 'w-0'}
                `}
            >
                {isOpen && (
                    <ThePulse user={user} profile={profile} />
                )}
            </div>
        </>
    )
}
