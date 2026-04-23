"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Loader2, MessageSquarePlus, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils/cn"
import type { SopAnnotationDraft } from "@/types/app.types"

export type ViewerAnnotation = SopAnnotationDraft & {
    id: string
    isDraft?: boolean
}

interface Props {
    requestId: string
    annotations: ViewerAnnotation[]
    readOnly?: boolean
    onAddAnnotation?: (a: SopAnnotationDraft) => void
    className?: string
}

const CONTEXT_LEN = 40

export function AnnotatedSopViewer({
    requestId,
    annotations,
    readOnly = false,
    onAddAnnotation,
    className,
}: Props) {
    const [html, setHtml] = useState<string | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [selection, setSelection] = useState<{
        text: string
        context: string
        rect: DOMRect
        line_number: number
        char_offset: number
        section_heading: string | null
    } | null>(null)
    const [composerOpen, setComposerOpen] = useState(false)
    const [draftComment, setDraftComment] = useState('')
    const viewerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let cancelled = false
        setLoadError(null)
        setHtml(null)
        fetch(`/api/approvals/${requestId}/preview`)
            .then(async r => {
                if (!r.ok) throw new Error((await r.json()).error || 'Failed to load document')
                return r.json()
            })
            .then(data => { if (!cancelled) setHtml(data.html) })
            .catch(err => { if (!cancelled) setLoadError(err.message) })
        return () => { cancelled = true }
    }, [requestId])

    const handleMouseUp = useCallback(() => {
        if (readOnly) return
        const sel = window.getSelection()
        if (!sel || sel.isCollapsed || !viewerRef.current) {
            setSelection(null)
            return
        }
        const range = sel.getRangeAt(0)
        if (!viewerRef.current.contains(range.commonAncestorContainer)) {
            setSelection(null)
            return
        }
        const text = sel.toString().trim()
        if (!text || text.length < 2) {
            setSelection(null)
            return
        }
        const fullText = viewerRef.current.innerText
        const idx = fullText.indexOf(text)
        const before = idx >= 0 ? fullText.slice(Math.max(0, idx - CONTEXT_LEN), idx) : ''
        const after = idx >= 0 ? fullText.slice(idx + text.length, idx + text.length + CONTEXT_LEN) : ''
        const char_offset = computeTextOffset(viewerRef.current, range.startContainer, range.startOffset)
        const line_number = fullText.slice(0, char_offset).split('\n').length
        const section_heading = findPrecedingHeading(viewerRef.current, range.startContainer)
        setSelection({
            text,
            context: `${before}…${after}`,
            rect: range.getBoundingClientRect(),
            line_number,
            char_offset,
            section_heading,
        })
    }, [readOnly])

    const openComposer = () => {
        setDraftComment('')
        setComposerOpen(true)
    }

    const submitDraft = async () => {
        if (!selection || !draftComment.trim() || !onAddAnnotation) return
        const anchor_hash = await sha1(selection.text + '|' + selection.context)
        onAddAnnotation({
            comment: draftComment.trim(),
            quoted_text: selection.text,
            quote_context: selection.context,
            anchor_hash,
            line_number: selection.line_number,
            char_offset: selection.char_offset,
            section_heading: selection.section_heading || undefined,
        })
        setDraftComment('')
        setComposerOpen(false)
        setSelection(null)
        window.getSelection()?.removeAllRanges()
    }

    // Re-apply highlight marks whenever annotations or html change.
    useEffect(() => {
        if (!viewerRef.current || !html) return
        // Remove stale marks first.
        const existing = viewerRef.current.querySelectorAll('mark[data-annotation-id]')
        existing.forEach(m => {
            const parent = m.parentNode
            if (!parent) return
            while (m.firstChild) parent.insertBefore(m.firstChild, m)
            parent.removeChild(m)
            parent.normalize()
        })
        annotations.forEach(a => {
            if (!a.quoted_text) return
            wrapFirstMatch(viewerRef.current!, a.quoted_text, a.id)
        })
    }, [annotations, html])

    if (loadError) {
        return (
            <div className={cn("flex flex-col items-center justify-center p-12 bg-red-50/50 rounded-lg", className)}>
                <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
                <p className="text-sm font-bold text-red-600 uppercase tracking-widest">{loadError}</p>
            </div>
        )
    }

    if (html === null) {
        return (
            <div className={cn("flex items-center justify-center p-12", className)}>
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className={cn("relative", className)}>
            <div
                ref={viewerRef}
                onMouseUp={handleMouseUp}
                className="prose prose-sm dark:prose-invert max-w-none p-6 bg-white dark:bg-slate-950 rounded-md border min-h-[75vh] overflow-auto [&_mark]:bg-amber-200/60 dark:[&_mark]:bg-amber-500/20 [&_mark]:rounded-sm [&_mark]:px-0.5 [&_mark]:cursor-pointer"
                dangerouslySetInnerHTML={{ __html: html }}
            />

            {selection && !composerOpen && !readOnly && (
                <FloatingButton rect={selection.rect} onClick={openComposer} />
            )}

            {composerOpen && selection && (
                <div className="fixed z-50 w-80 p-3 bg-popover border rounded-md shadow-lg"
                     style={{ top: Math.min(selection.rect.bottom + 8, window.innerHeight - 200), left: Math.min(selection.rect.left, window.innerWidth - 340) }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Comment on selection</p>
                    <p className="text-xs italic text-muted-foreground mb-1 line-clamp-2">"{selection.text}"</p>
                    <p className="text-[10px] text-muted-foreground mb-2">
                        {selection.section_heading && <>§ {selection.section_heading} · </>}
                        line {selection.line_number} · char {selection.char_offset}
                    </p>
                    <Textarea
                        autoFocus
                        value={draftComment}
                        onChange={e => setDraftComment(e.target.value)}
                        placeholder="Write your comment…"
                        rows={3}
                        className="mb-2 text-sm"
                    />
                    <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => { setComposerOpen(false); setSelection(null) }}>Cancel</Button>
                        <Button size="sm" onClick={submitDraft} disabled={!draftComment.trim()} className="bg-brand-teal hover:bg-brand-teal/90">Add</Button>
                    </div>
                </div>
            )}
        </div>
    )
}

function FloatingButton({ rect, onClick }: { rect: DOMRect; onClick: () => void }) {
    const top = Math.max(8, rect.top - 40)
    const left = Math.min(window.innerWidth - 140, rect.left)
    return (
        <button
            onClick={onClick}
            className="fixed z-50 flex items-center gap-1 px-3 py-1.5 bg-brand-teal text-white text-xs font-medium rounded-full shadow-lg hover:bg-brand-teal/90"
            style={{ top, left }}
        >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            Comment
        </button>
    )
}

async function sha1(input: string): Promise<string> {
    const data = new TextEncoder().encode(input)
    const hash = await crypto.subtle.digest('SHA-1', data)
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function computeTextOffset(root: HTMLElement, container: Node, offset: number): number {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
    let total = 0
    let node: Node | null
    while ((node = walker.nextNode())) {
        if (node === container) return total + offset
        total += (node.nodeValue || '').length
    }
    return total
}

function findPrecedingHeading(root: HTMLElement, container: Node): string | null {
    const anchor: Node = container.nodeType === Node.TEXT_NODE ? (container.parentNode as Node) : container
    const headings = Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6')) as HTMLElement[]
    let best: HTMLElement | null = null
    for (const h of headings) {
        const pos = h.compareDocumentPosition(anchor)
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) best = h
        else break
    }
    const text = best?.textContent?.trim() || null
    if (!text) return null
    return text.length > 80 ? text.slice(0, 80) + '…' : text
}

function wrapFirstMatch(root: HTMLElement, needle: string, annotationId: string) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
    let node: Node | null
    while ((node = walker.nextNode())) {
        const text = node.nodeValue || ''
        const idx = text.indexOf(needle)
        if (idx === -1) continue
        const range = document.createRange()
        range.setStart(node, idx)
        range.setEnd(node, idx + needle.length)
        const mark = document.createElement('mark')
        mark.dataset.annotationId = annotationId
        try {
            range.surroundContents(mark)
        } catch {
            // Selection spans nodes — skip silently.
        }
        return
    }
}
