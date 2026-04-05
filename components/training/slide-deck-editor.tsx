"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Loader2, Wand2, Save, MoreVertical, LayoutTemplate } from "lucide-react"
import { updateSlide } from "@/actions/training"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
    moduleData: any
}

export default function SlideDeckEditor({ moduleData }: Props) {
    const router = useRouter()
    const [isGenerating, setIsGenerating] = useState(false)
    const [editingSlideId, setEditingSlideId] = useState<string | null>(null)
    const [editData, setEditData] = useState({ title: "", body: "", notes: "" })
    const [isSaving, setIsSaving] = useState(false)

    const handleGenerate = async () => {
        setIsGenerating(true)
        try {
            const res = await fetch('/api/training/generate-slides', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    moduleId: moduleData.id,
                    sopId: moduleData.sop_id
                })
            })
            const data = await res.json()
            if (data.error) throw new Error(data.error)
            toast.success("Slide deck generated successfully!")
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || "Failed to generate slide deck")
        } finally {
            setIsGenerating(false)
        }
    }

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
        }
    }

    const slides = moduleData.slide_deck || []

    if (slides.length === 0) {
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                    <strong>Generated on:</strong> {new Date(moduleData.slide_deck_generated_at).toLocaleString()}
                </p>
                <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating} className="gap-2 text-blue-600 hover:text-blue-700">
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    Regenerate
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {slides.map((s: any, i: number) => (
                    <Card key={s.id} className="overflow-hidden border-border/50 bg-card group transition-all">
                        <div className="h-2 bg-gradient-to-r from-primary to-blue-500"></div>
                        <CardContent className="p-0">
                            {editingSlideId === s.id ? (
                                <div className="p-4 space-y-3">
                                    <Input value={editData.title} onChange={e => setEditData({...editData, title: e.target.value})} className="font-bold text-lg" />
                                    <Textarea value={editData.body} onChange={e => setEditData({...editData, body: e.target.value})} rows={5} />
                                    <Input placeholder="Presenter Notes" value={editData.notes} onChange={e => setEditData({...editData, notes: e.target.value})} className="text-xs text-muted-foreground bg-muted/30" />
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button variant="ghost" size="sm" onClick={() => setEditingSlideId(null)} disabled={isSaving}>Cancel</Button>
                                        <Button size="sm" onClick={() => handleSave(s.id)} disabled={isSaving}>
                                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Save
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 relative min-h-[220px] flex flex-col">
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="secondary" size="sm" onClick={() => startEditing(s)}>Edit</Button>
                                    </div>
                                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Slide {i + 1} • {s.type}</div>
                                    <h3 className="text-xl font-bold mb-4">{s.title}</h3>
                                    <div className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed mb-4 flex-1">
                                        {s.body}
                                    </div>
                                    {s.notes && (
                                        <div className="mt-auto bg-muted/40 p-3 rounded text-xs text-muted-foreground border border-border/50 italic border-l-4 border-l-primary/50">
                                            Tip: {s.notes}
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
