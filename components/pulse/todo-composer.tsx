"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createTodo } from "@/actions/pulse"
import { Loader2, Plus, X, CalendarClock } from "lucide-react"

export function TodoComposer() {
    const [isExpanded, setIsExpanded] = useState(false)
    const [content, setContent] = useState("")
    const [dueAt, setDueAt] = useState("")
    const [loading, setLoading] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (isExpanded && textareaRef.current) {
            textareaRef.current.focus()
        }
    }, [isExpanded])

    const reset = () => {
        setContent("")
        setDueAt("")
        setIsExpanded(false)
    }

    async function handleSubmit() {
        if (!content.trim()) return
        setLoading(true)

        const formData = new FormData()
        formData.append("content", content)
        if (dueAt) formData.append("dueAt", dueAt)

        const result = await createTodo(formData)
        setLoading(false)

        if (!result?.error) {
            reset()
        } else {
            console.error(result.error)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            handleSubmit()
        }
        if (e.key === "Escape") {
            reset()
        }
    }

    if (!isExpanded) {
        return (
            <Button
                variant="outline"
                className="w-full text-xs h-8 bg-background border-dashed text-foreground/70 hover:text-foreground hover:border-foreground/50 transition-colors shrink-0"
                onClick={() => setIsExpanded(true)}
            >
                <Plus className="w-3 h-3 mr-1" /> Add To-Do
            </Button>
        )
    }

    return (
        <div className="bg-background border border-border/50 rounded-lg p-2 shadow-sm ring-1 ring-transparent focus-within:ring-brand-teal/30 focus-within:border-brand-teal/50 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200">
            <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What do you need to do?"
                className="min-h-[56px] resize-none text-sm border-0 focus-visible:ring-0 px-2 py-1 bg-transparent"
                disabled={loading}
            />

            <div className="mt-1 flex items-center gap-2 px-1">
                <CalendarClock className="h-3 w-3 text-muted-foreground shrink-0" />
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">
                    Due
                </label>
                <input
                    type="datetime-local"
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                    className="text-[11px] font-medium bg-transparent border-0 outline-none text-foreground flex-1 min-w-0"
                    disabled={loading}
                />
                {dueAt && (
                    <button
                        type="button"
                        onClick={() => setDueAt("")}
                        className="text-[10px] text-muted-foreground hover:text-foreground"
                        aria-label="Clear due date"
                    >
                        <X className="h-3 w-3" />
                    </button>
                )}
            </div>

            <div className="flex justify-between items-center mt-2 px-1">
                <p className="text-[10px] text-muted-foreground font-medium">Ctrl/⌘ + Enter to save</p>
                <div className="flex gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={reset}
                        disabled={loading}
                    >
                        <X className="w-3 h-3" />
                    </Button>
                    <Button
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={handleSubmit}
                        disabled={loading || !content.trim()}
                    >
                        {loading && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        Save
                    </Button>
                </div>
            </div>
        </div>
    )
}
