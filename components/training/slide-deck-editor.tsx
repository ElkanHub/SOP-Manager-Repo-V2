"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import {
    Loader2, Wand2, Save, LayoutTemplate, Presentation,
    GripVertical, Plus, Trash2, PlusCircle, ChevronDown, ChevronUp, Download
} from "lucide-react"
import { updateSlide, reorderSlides, addSlide, deleteSlide } from "@/actions/training"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import SlidePresenter from "@/components/training/slide-presenter"

const SLIDE_TYPES = [
    { value: 'content',    label: 'Content' },
    { value: 'objectives', label: 'Objectives' },
    { value: 'summary',    label: 'Summary' },
    { value: 'edge_cases', label: 'Edge Cases / Warnings' },
    { value: 'resources',  label: 'Resources' },
    { value: 'title',      label: 'Title' },
]

const TYPE_COLORS: Record<string, string> = {
    title:      'from-[#0D2B55] to-[#1A5EA8]',
    objectives: 'from-[#0D3B4E] to-[#00897B]',
    content:    'from-primary to-blue-500',
    summary:    'from-[#2D1B69] to-[#6750A4]',
    edge_cases: 'from-[#7B2D26] to-[#C94C4C]',
    resources:  'from-[#1A472A] to-[#40916C]',
}

interface Props {
    moduleData: any
}

export default function SlideDeckEditor({ moduleData }: Props) {
    const router = useRouter()
    const [isGenerating, setIsGenerating] = useState(false)
    const [editingSlideId, setEditingSlideId] = useState<string | null>(null)
    const [editData, setEditData] = useState({ title: "", body: "", notes: "" })
    const [isSaving, setIsSaving] = useState(false)
    const [isPresenting, setIsPresenting] = useState(false)
    const [isReordering, setIsReordering] = useState(false)

    // Add Slide modal state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [addAfterOrder, setAddAfterOrder] = useState<number | undefined>(undefined)
    const [newSlideData, setNewSlideData] = useState({ type: "content", title: "", body: "", notes: "" })
    const [isAdding, setIsAdding] = useState(false)

    // Delete state
    const [deletingSlideId, setDeletingSlideId] = useState<string | null>(null)

    // Drag state
    const [draggedId, setDraggedId] = useState<string | null>(null)
    const [dragOverId, setDragOverId] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [localSlides, setLocalSlides] = useState<any[] | null>(null)

    // Use local slides during drag, otherwise use server data
    const rawSlides: any[] = localSlides || moduleData.slide_deck || []
    const slides = [...rawSlides].sort((a, b) => a.order - b.order)

    // ─── AI Generate ────────────────────────────────────────────────────
    const handleGenerate = async () => {
        setIsGenerating(true)
        try {
            const res = await fetch('/api/training/generate-slides', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ moduleId: moduleData.id, sopId: moduleData.sop_id })
            })
            const data = await res.json()
            if (data.error) throw new Error(data.error)
            toast.success("Slide deck generated successfully!")
            setLocalSlides(null)
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || "Failed to generate slide deck")
        } finally {
            setIsGenerating(false)
        }
    }

    // ─── Edit Slide ─────────────────────────────────────────────────────
    const startEditing = (slide: any) => {
        setEditingSlideId(slide.id)
        setEditData({ title: slide.title, body: slide.body, notes: slide.notes || "" })
    }

    const handleSave = async (slideId: string) => {
        setIsSaving(true)
        const res = await updateSlide(moduleData.id, slideId, editData)
        setIsSaving(false)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Slide saved!")
            setEditingSlideId(null)
            setLocalSlides(null)
        }
    }

    // ─── Drag & Drop Reorder ────────────────────────────────────────────
    const handleDragStart = (e: React.DragEvent, slideId: string) => {
        setDraggedId(slideId)
        setIsDragging(true)
        e.dataTransfer.effectAllowed = 'move'
        // Make drag image semi-transparent
        const el = e.currentTarget as HTMLElement
        e.dataTransfer.setDragImage(el, el.offsetWidth / 2, 20)
    }

    const handleDragOver = (e: React.DragEvent, slideId: string) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (draggedId && slideId !== draggedId) {
            setDragOverId(slideId)
        }
    }

    const handleDragLeave = () => {
        setDragOverId(null)
    }

    const handleDrop = async (e: React.DragEvent, targetSlideId: string) => {
        e.preventDefault()
        setDragOverId(null)

        if (!draggedId || draggedId === targetSlideId) {
            setDraggedId(null)
            return
        }

        // Reorder optimistically in local state
        const currentOrder = slides.map(s => s.id)
        const dragIdx = currentOrder.indexOf(draggedId)
        const dropIdx = currentOrder.indexOf(targetSlideId)

        if (dragIdx === -1 || dropIdx === -1) {
            setDraggedId(null)
            return
        }

        // Remove dragged item and insert at target position
        const newOrder = [...currentOrder]
        newOrder.splice(dragIdx, 1)
        newOrder.splice(dropIdx, 0, draggedId)

        // Update local slides optimistically with new order numbers
        const reorderedSlides = newOrder.map((id, i) => {
            const slide = slides.find(s => s.id === id)!
            return { ...slide, order: i + 1 }
        })
        setLocalSlides(reorderedSlides)
        setDraggedId(null)
        setIsDragging(false)

        // Persist to server
        setIsReordering(true)
        const res = await reorderSlides(moduleData.id, newOrder)
        setIsReordering(false)

        if (res.error) {
            toast.error(res.error)
            setLocalSlides(null) // revert
        } else {
            toast.success("Slides reordered!")
            setLocalSlides(null)
            router.refresh()
        }
    }

    const handleDragEnd = () => {
        setDraggedId(null)
        setDragOverId(null)
        setIsDragging(false)
    }

    // ─── Move Up/Down (keyboard-friendly alternative) ───────────────────
    const handleMoveSlide = async (slideId: string, direction: 'up' | 'down') => {
        const currentOrder = slides.map(s => s.id)
        const idx = currentOrder.indexOf(slideId)
        if (idx === -1) return
        if (direction === 'up' && idx === 0) return
        if (direction === 'down' && idx === slides.length - 1) return

        const swapIdx = direction === 'up' ? idx - 1 : idx + 1
        const newOrder = [...currentOrder]
        ;[newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]]

        // Optimistic update
        const reorderedSlides = newOrder.map((id, i) => {
            const slide = slides.find(s => s.id === id)!
            return { ...slide, order: i + 1 }
        })
        setLocalSlides(reorderedSlides)

        setIsReordering(true)
        const res = await reorderSlides(moduleData.id, newOrder)
        setIsReordering(false)

        if (res.error) {
            toast.error(res.error)
            setLocalSlides(null)
        } else {
            setLocalSlides(null)
            router.refresh()
        }
    }

    // ─── Add Slide ──────────────────────────────────────────────────────
    const openAddModal = (afterOrder?: number) => {
        setAddAfterOrder(afterOrder)
        setNewSlideData({ type: "content", title: "", body: "", notes: "" })
        setIsAddModalOpen(true)
    }

    const handleAddSlide = async () => {
        if (!newSlideData.title.trim()) {
            toast.error("Slide title is required")
            return
        }
        if (!newSlideData.body.trim()) {
            toast.error("Slide content is required")
            return
        }

        setIsAdding(true)
        const res = await addSlide(moduleData.id, newSlideData, addAfterOrder)
        setIsAdding(false)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("New slide added!")
            setIsAddModalOpen(false)
            setLocalSlides(null)
            router.refresh()
        }
    }

    // ─── Delete Slide ───────────────────────────────────────────────────
    const handleDeleteSlide = async (slideId: string) => {
        setDeletingSlideId(slideId)
        const res = await deleteSlide(moduleData.id, slideId)
        setDeletingSlideId(null)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Slide deleted!")
            setLocalSlides(null)
            setEditingSlideId(null)
            router.refresh()
        }
    }

    // ─── Empty State ────────────────────────────────────────────────────
    if (slides.length === 0 && !localSlides) {
        return (
            <div className="py-24 flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-muted/10 text-center">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <LayoutTemplate className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">No Slides Generated</h3>
                <p className="text-muted-foreground mt-2 max-w-md mb-6">
                    Use our AI to automatically generate a complete instructional slide deck from the associated SOP text.
                </p>
                <Button onClick={handleGenerate} disabled={isGenerating} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg px-8 shadow-primary/20">
                    {isGenerating ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing SOP & Generating...</> : <><Wand2 className="mr-2 h-5 w-5" /> Generate Slides with AI</>}
                </Button>
            </div>
        )
    }

    // ─── Main Render ────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Info Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                        <strong>Generated on:</strong> {new Date(moduleData.slide_deck_generated_at).toLocaleString()}
                    </p>
                    {isReordering && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> Saving order...
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => openAddModal()} className="gap-2">
                        <Plus className="h-4 w-4" /> Add Slide
                    </Button>
                    <Button variant="default" size="sm" onClick={() => setIsPresenting(true)} className="gap-2 bg-primary hover:bg-primary/90">
                        <Presentation className="h-4 w-4" /> Present
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/api/training/export-slides?moduleId=${moduleData.id}`, '_blank')}
                        className="gap-2"
                    >
                        <Download className="h-4 w-4" /> Export PPTX
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating} className="gap-2 text-blue-600 hover:text-blue-700">
                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                        Regenerate
                    </Button>
                </div>
            </div>

            {/* Drag hint */}
            <p className="text-xs text-muted-foreground flex items-center gap-2">
                <GripVertical className="h-3.5 w-3.5" /> Drag slides to reorder — all slides collapse while dragging for easy targeting. Use arrows or click <Plus className="h-3 w-3 inline" /> between slides to insert.
            </p>

            {/* Slide List */}
            <div className={`space-y-1 transition-all ${isDragging ? 'max-w-2xl mx-auto' : ''}`}>
                {slides.map((s: any, i: number) => (
                    <div key={s.id}>
                        {/* Insert button between slides (hidden while dragging) */}
                        {i === 0 && !isDragging && (
                            <div className="flex justify-center py-1">
                                <button
                                    onClick={() => openAddModal(0)}
                                    className="group flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-primary transition-colors py-1 px-3 rounded-full hover:bg-primary/5"
                                    title="Insert slide at the beginning"
                                >
                                    <PlusCircle className="h-3.5 w-3.5" />
                                    <span className="hidden group-hover:inline">Insert before</span>
                                </button>
                            </div>
                        )}

                        {/* Compact drag row (shown when any slide is being dragged) */}
                        {isDragging ? (
                            <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, s.id)}
                                onDragOver={(e) => handleDragOver(e, s.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, s.id)}
                                onDragEnd={handleDragEnd}
                                className={`flex items-center gap-3 px-3 py-2 rounded-md border border-border/50 bg-card cursor-grab active:cursor-grabbing select-none transition-all ${
                                    draggedId === s.id ? 'opacity-30' : 'hover:border-primary/50'
                                } ${
                                    dragOverId === s.id ? 'ring-2 ring-primary border-primary bg-primary/5' : ''
                                }`}
                                title="Drop here to reorder"
                            >
                                <GripVertical className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                                <span className={`h-6 w-1 rounded bg-gradient-to-b ${TYPE_COLORS[s.type] || TYPE_COLORS.content} shrink-0`} />
                                <span className="text-[10px] font-bold text-muted-foreground/60 w-6 shrink-0">#{i + 1}</span>
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 shrink-0 w-20 truncate">
                                    {s.type.replace('_', ' ')}
                                </span>
                                <span className="text-sm font-medium truncate flex-1">{s.title}</span>
                            </div>
                        ) : (
                        <Card
                            draggable={editingSlideId !== s.id}
                            onDragStart={(e) => handleDragStart(e, s.id)}
                            onDragOver={(e) => handleDragOver(e, s.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, s.id)}
                            onDragEnd={handleDragEnd}
                            className={`overflow-hidden border-border/50 bg-card group transition-all ${
                                draggedId === s.id ? 'opacity-40 scale-[0.98]' : ''
                            } ${
                                dragOverId === s.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
                            }`}
                        >
                            {/* Color bar per type */}
                            <div className={`h-1.5 bg-gradient-to-r ${TYPE_COLORS[s.type] || TYPE_COLORS.content}`} />
                            <CardContent className="p-0">
                                {editingSlideId === s.id ? (
                                    /* ─── EDIT MODE ─── */
                                    <div className="p-4 space-y-3">
                                        <Input value={editData.title} onChange={e => setEditData({...editData, title: e.target.value.toUpperCase()})} className="font-bold text-lg" placeholder="Slide Title" />
                                        <Textarea value={editData.body} onChange={e => setEditData({...editData, body: e.target.value})} rows={6} placeholder="Slide content. Use line breaks for paragraphs, start lines with • or - for bullet points." />
                                        <Input placeholder="Presenter Notes (optional)" value={editData.notes} onChange={e => setEditData({...editData, notes: e.target.value})} className="text-xs text-muted-foreground bg-muted/30" />
                                        <div className="flex justify-between pt-2">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                                                onClick={() => handleDeleteSlide(s.id)}
                                                disabled={deletingSlideId === s.id || slides.length <= 1}
                                            >
                                                {deletingSlideId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                                Delete Slide
                                            </Button>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => setEditingSlideId(null)} disabled={isSaving}>Cancel</Button>
                                                <Button size="sm" onClick={() => handleSave(s.id)} disabled={isSaving}>
                                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Save
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* ─── VIEW MODE ─── */
                                    <div className="flex">
                                        {/* Drag Handle */}
                                        <div
                                            className="w-10 shrink-0 flex flex-col items-center justify-center bg-muted/30 border-r border-border/30 cursor-grab active:cursor-grabbing gap-1"
                                            title="Drag to reorder"
                                        >
                                            <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                                            <span className="text-[10px] font-bold text-muted-foreground/60">{i + 1}</span>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 p-5 relative min-h-[160px] flex flex-col">
                                            {/* Actions (top-right) */}
                                            <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost" size="icon" className="h-7 w-7"
                                                    onClick={() => handleMoveSlide(s.id, 'up')}
                                                    disabled={i === 0 || isReordering}
                                                    title="Move up"
                                                >
                                                    <ChevronUp className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost" size="icon" className="h-7 w-7"
                                                    onClick={() => handleMoveSlide(s.id, 'down')}
                                                    disabled={i === slides.length - 1 || isReordering}
                                                    title="Move down"
                                                >
                                                    <ChevronDown className="h-4 w-4" />
                                                </Button>
                                                <Button variant="secondary" size="sm" onClick={() => startEditing(s)} className="h-7 text-xs">Edit</Button>
                                            </div>

                                            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                                                Slide {i + 1} • {s.type.replace('_', ' ')}
                                            </div>
                                            <h3 className="text-lg font-bold mb-3 pr-24">{s.title}</h3>
                                            <div className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed mb-3 flex-1 line-clamp-5">
                                                {s.body}
                                            </div>
                                            {s.notes && (
                                                <div className="mt-auto bg-muted/40 p-2.5 rounded text-xs text-muted-foreground border border-border/50 italic border-l-4 border-l-primary/50">
                                                    📝 {s.notes}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        )}

                        {/* Insert button after each slide (hidden while dragging) */}
                        {!isDragging && (
                            <div className="flex justify-center py-1">
                                <button
                                    onClick={() => openAddModal(s.order)}
                                    className="group flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-primary transition-colors py-1 px-3 rounded-full hover:bg-primary/5"
                                    title={`Insert slide after Slide ${i + 1}`}
                                >
                                    <PlusCircle className="h-3.5 w-3.5" />
                                    <span className="hidden group-hover:inline">Insert after</span>
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* ─── Add Slide Modal ─── */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Add New Slide</DialogTitle>
                        <DialogDescription>
                            {addAfterOrder !== undefined && addAfterOrder > 0
                                ? `This slide will be inserted after Slide ${addAfterOrder}.`
                                : addAfterOrder === 0
                                    ? 'This slide will be inserted at the beginning of the deck.'
                                    : 'This slide will be added to the end of the deck.'
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Slide Type</label>
                            <Select value={newSlideData.type} onValueChange={(v: string | null) => v && setNewSlideData({...newSlideData, type: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {SLIDE_TYPES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Title <span className="text-destructive">*</span></label>
                            <Input
                                value={newSlideData.title}
                                onChange={e => setNewSlideData({...newSlideData, title: e.target.value.toUpperCase()})}
                                placeholder="e.g. Safety Precautions"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Content <span className="text-destructive">*</span></label>
                            <Textarea
                                value={newSlideData.body}
                                onChange={e => setNewSlideData({...newSlideData, body: e.target.value})}
                                rows={5}
                                placeholder={"Slide content. Use line breaks for paragraphs.\nStart lines with • or - for bullet points."}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Presenter Notes <span className="text-muted-foreground">(optional)</span></label>
                            <Input
                                value={newSlideData.notes}
                                onChange={e => setNewSlideData({...newSlideData, notes: e.target.value})}
                                placeholder="Notes for the trainer when presenting"
                                className="bg-muted/30"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} disabled={isAdding}>Cancel</Button>
                        <Button onClick={handleAddSlide} disabled={isAdding}>
                            {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                            Add Slide
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Fullscreen Slide Presenter */}
            <SlidePresenter
                slides={slides}
                moduleTitle={moduleData.title}
                sopNumber={moduleData.sop?.sop_number || undefined}
                isOpen={isPresenting}
                onClose={() => setIsPresenting(false)}
            />
        </div>
    )
}
