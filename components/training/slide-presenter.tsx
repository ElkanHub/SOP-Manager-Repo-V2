"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { 
    ChevronLeft, ChevronRight, X, Maximize2, Monitor, 
    StickyNote, BookOpen, Target, AlertTriangle, ClipboardList, LinkIcon
} from "lucide-react"
import { TrainingSlide } from "@/types/app.types"

interface Props {
    slides: TrainingSlide[]
    moduleTitle: string
    sopNumber?: string
    isOpen: boolean
    onClose: () => void
}

const SLIDE_TYPE_CONFIG: Record<string, { icon: any; gradient: string; label: string }> = {
    title:      { icon: BookOpen,       gradient: "from-[#0D2B55] via-[#1A4A8A] to-[#1A5EA8]", label: "Title Slide" },
    objectives: { icon: Target,         gradient: "from-[#0D3B4E] via-[#0C5C5C] to-[#00897B]", label: "Objectives" },
    content:    { icon: ClipboardList,  gradient: "from-[#1A365D] via-[#2A4A7F] to-[#3B6CB4]", label: "Content" },
    summary:    { icon: StickyNote,     gradient: "from-[#2D1B69] via-[#4A3588] to-[#6750A4]", label: "Summary" },
    edge_cases: { icon: AlertTriangle,  gradient: "from-[#7B2D26] via-[#A13D34] to-[#C94C4C]", label: "Edge Cases" },
    resources:  { icon: LinkIcon,       gradient: "from-[#1A472A] via-[#2D6A4F] to-[#40916C]", label: "Resources" },
}

export default function SlidePresenter({ slides, moduleTitle, sopNumber, isOpen, onClose }: Props) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [showNotes, setShowNotes] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const sortedSlides = [...slides].sort((a, b) => a.order - b.order)
    const currentSlide = sortedSlides[currentIndex]
    const total = sortedSlides.length

    // Use refs so the keyboard listener never goes stale
    const totalRef = useRef(total)
    totalRef.current = total
    const onCloseRef = useRef(onClose)
    onCloseRef.current = onClose

    const goNext = useCallback(() => {
        setCurrentIndex(prev => (prev < totalRef.current - 1 ? prev + 1 : prev))
    }, [])

    const goPrev = useCallback(() => {
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : prev))
    }, [])

    // Reset index when presenter opens
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(0)
            setShowNotes(false)
        }
    }, [isOpen])

    // Keyboard handler — stable ref, registered once
    const handlerRef = useRef<(e: KeyboardEvent) => void>(() => {})
    handlerRef.current = (e: KeyboardEvent) => {
        switch (e.key) {
            case "ArrowRight":
            case "ArrowDown":
            case " ":
            case "PageDown":
                e.preventDefault()
                goNext()
                break
            case "ArrowLeft":
            case "ArrowUp":
            case "PageUp":
                e.preventDefault()
                goPrev()
                break
            case "Escape":
                e.preventDefault()
                onCloseRef.current()
                break
            case "n":
            case "N":
                e.preventDefault()
                setShowNotes(p => !p)
                break
            case "Home":
                e.preventDefault()
                setCurrentIndex(0)
                break
            case "End":
                e.preventDefault()
                setCurrentIndex(totalRef.current - 1)
                break
        }
    }

    useEffect(() => {
        if (!isOpen) return
        const listener = (e: KeyboardEvent) => handlerRef.current(e)
        document.addEventListener("keydown", listener)
        document.body.style.overflow = "hidden"
        return () => {
            document.removeEventListener("keydown", listener)
            document.body.style.overflow = ""
        }
    }, [isOpen])

    // Request browser fullscreen
    useEffect(() => {
        if (isOpen && containerRef.current) {
            containerRef.current.requestFullscreen?.().catch(() => {})
        }
        return () => {
            if (document.fullscreenElement) {
                document.exitFullscreen?.().catch(() => {})
            }
        }
    }, [isOpen])

    // Exit on fullscreen close
    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && isOpen) {
                onClose()
            }
        }
        document.addEventListener("fullscreenchange", handleFullscreenChange)
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }, [isOpen, onClose])

    if (!isOpen || !currentSlide) return null

    const config = SLIDE_TYPE_CONFIG[currentSlide.type] || SLIDE_TYPE_CONFIG.content
    const SlideIcon = config.icon

    // Format body: handle bullet points (lines starting with • or -)
    const formatBody = (text: string) => {
        const lines = text.split("\n").filter(l => l.trim())
        return lines.map((line, i) => {
            const trimmed = line.trim()
            const isBullet = trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")
            const cleanText = isBullet ? trimmed.replace(/^[•\-*]\s*/, "") : trimmed

            if (isBullet) {
                return (
                    <div key={i} className="flex items-start gap-4 mb-4 animate-in fade-in slide-in-from-left-4 duration-300" style={{ animationDelay: `${i * 80}ms` }}>
                        <span className="mt-2 h-3 w-3 rounded-full bg-white/60 shrink-0" />
                        <span className="text-2xl md:text-3xl leading-relaxed">{cleanText}</span>
                    </div>
                )
            }
            return (
                <p key={i} className="text-2xl md:text-3xl leading-relaxed mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${i * 80}ms` }}>
                    {cleanText}
                </p>
            )
        })
    }

    const portalContent = (
        <div
            ref={containerRef}
            className="fixed inset-0 z-[9999] bg-black flex flex-col select-none"
            onClick={(e) => {
                // Click right half = next, left half = prev
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                const clickX = e.clientX - rect.left
                if (clickX > rect.width / 2) goNext()
                else goPrev()
            }}
        >
            {/* Slide Content Area */}
            <div className={`flex-1 flex flex-col bg-gradient-to-br ${config.gradient} relative overflow-hidden`}>
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-1/3 h-full bg-white/[0.03] rounded-bl-[200px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-1/4 h-1/3 bg-black/10 rounded-tr-[150px] pointer-events-none" />

                {/* Top bar */}
                <div className="flex items-center justify-between px-8 py-4 relative z-10">
                    <div className="flex items-center gap-3 text-white/70">
                        <SlideIcon className="h-5 w-5" />
                        <span className="text-sm font-medium tracking-wider uppercase">{config.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setShowNotes(p => !p) }}
                            className={`p-2 rounded-lg transition-colors ${showNotes ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/10'}`}
                            title="Toggle presenter notes (N)"
                        >
                            <StickyNote className="h-5 w-5" />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onClose() }}
                            className="p-2 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/10 transition-colors"
                            title="Exit (Escape)"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Main Slide Content */}
                <div className="flex-1 flex items-center justify-center px-8 md:px-16 lg:px-24 relative z-10">
                    <div key={currentIndex} className="w-full max-w-5xl animate-in fade-in zoom-in-95 duration-300">
                        {currentSlide.type === "title" ? (
                            /* TITLE SLIDE — centered, large text */
                            <div className="text-center space-y-8">
                                <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight leading-tight">
                                    {currentSlide.title}
                                </h1>
                                <div className="text-xl md:text-2xl text-white/70 leading-relaxed max-w-3xl mx-auto">
                                    {formatBody(currentSlide.body)}
                                </div>
                                {sopNumber && (
                                    <div className="inline-block px-6 py-2 rounded-full border border-white/20 text-white/50 text-sm tracking-widest uppercase">
                                        {sopNumber}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* ALL OTHER SLIDES — title + body */
                            <div className="space-y-8">
                                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
                                    {currentSlide.title}
                                </h2>
                                <div className="text-white/90 pl-2">
                                    {formatBody(currentSlide.body)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Presenter Notes Panel */}
                {showNotes && currentSlide.notes && (
                    <div 
                        className="absolute bottom-20 left-8 right-8 md:left-16 md:right-16 bg-black/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 animate-in slide-in-from-bottom-4 duration-300 z-20"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-widest mb-3">
                            <StickyNote className="h-3.5 w-3.5" />
                            Presenter Notes
                        </div>
                        <p className="text-white/90 text-lg leading-relaxed">{currentSlide.notes}</p>
                    </div>
                )}
            </div>

            {/* Bottom Navigation Bar */}
            <div 
                className="h-16 bg-black/90 border-t border-white/10 flex items-center justify-between px-8 shrink-0"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-4">
                    <button
                        onClick={goPrev}
                        disabled={currentIndex === 0}
                        className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                        onClick={goNext}
                        disabled={currentIndex === total - 1}
                        className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>
                </div>

                {/* Slide Progress */}
                <div className="flex items-center gap-4">
                    {/* Mini slide dots */}
                    <div className="hidden md:flex items-center gap-1.5">
                        {sortedSlides.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentIndex(i)}
                                className={`h-2 rounded-full transition-all duration-300 ${
                                    i === currentIndex 
                                        ? "w-8 bg-white" 
                                        : i < currentIndex 
                                            ? "w-2 bg-white/40" 
                                            : "w-2 bg-white/20"
                                }`}
                            />
                        ))}
                    </div>
                    <span className="text-white/60 text-sm font-mono tabular-nums">
                        {currentIndex + 1} / {total}
                    </span>
                </div>

                <div className="text-white/30 text-xs hidden md:block">
                    ← → Navigate &nbsp;•&nbsp; N Notes &nbsp;•&nbsp; Esc Exit
                </div>
            </div>
        </div>
    )

    return createPortal(portalContent, document.body)
}
