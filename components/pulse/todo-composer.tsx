"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createTodo } from "@/actions/pulse"
import { Loader2, Plus, X } from "lucide-react"

export function TodoComposer() {
    const [isExpanded, setIsExpanded] = useState(false)
    const [content, setContent] = useState("")
    const [loading, setLoading] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (isExpanded && textareaRef.current) {
            textareaRef.current.focus()
        }
    }, [isExpanded])

    async function handleSubmit() {
        if (!content.trim()) return

        setLoading(true)

        const formData = new FormData()
        formData.append('content', content)

        const result = await createTodo(formData)

        if (!result?.error) {
            setContent("")
            setIsExpanded(false)
            setLoading(false)
        } else {
            setLoading(false)
            console.error(result.error)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
        if (e.key === 'Escape') {
            setIsExpanded(false)
            setContent("")
        }
    }

    if (!isExpanded) {
        return (
            <Button
                variant="outline"
                className="w-full text-xs h-8 bg-white border-dashed text-brand-navy hover:text-brand-navy hover:border-brand-navy shrink-0"
                onClick={() => setIsExpanded(true)}
            >
                <Plus className="w-3 h-3 mr-1" /> Create To-Do
            </Button>
        )
    }

    return (
        <div className="bg-white border rounded-lg p-2 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
            <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What do you need to do?"
                className="min-h-[60px] resize-none text-sm border-0 focus-visible:ring-0 px-2 py-1"
                disabled={loading}
            />
            <div className="flex justify-between items-center mt-2 px-1">
                <p className="text-[10px] text-slate-400">Press Enter to save</p>
                <div className="flex gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => { setIsExpanded(false); setContent(""); }}
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
