"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createTrainingModule } from "@/actions/training"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface Props {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    activeSops: any[]
    profile: any
    isQa: boolean
}

export default function CreateModuleModal({ isOpen, onOpenChange, activeSops, profile, isQa }: Props) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [sopId, setSopId] = useState("")
    const [department, setDepartment] = useState(profile?.department || "")
    const [isMandatory, setIsMandatory] = useState(false)
    const [deadline, setDeadline] = useState("")

    // Unique departments from active sops if QA, else just their own
    const deps = isQa ? Array.from(new Set(activeSops.map(s => s.department))) : [profile.department]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || !sopId.trim() || !department.trim()) {
            toast.error("Please fill in all required fields.")
            return
        }

        setIsLoading(true)
        try {
            const res = await createTrainingModule({
                title,
                description,
                sopId,
                department,
                isMandatory,
                deadline: deadline || undefined
            })

            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success('Training module created successfully!')
                onOpenChange(false)
                router.push(`/training/${res.moduleId}`)
                
                setTitle("")
                setDescription("")
                setSopId("")
                setIsMandatory(false)
                setDeadline("")
            }
        } catch (error: any) {
            toast.error(error.message || 'Something went wrong')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl md:max-w-2xl w-[95vw] p-0 overflow-hidden border-border/40 shadow-2xl bg-gradient-to-b from-background to-background/98 max-h-[90vh] flex flex-col">
                <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-brand-navy/10 via-brand-teal/5 to-transparent border-b border-border/50 relative">
                    <div className="space-y-1">
                        <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">Create Training Module</DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase tracking-widest text-brand-teal/80">
                            Link SOP & Generate Materials
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                        {/* Source Metadata */}
                        <div className="bg-brand-navy/5 dark:bg-card border border-brand-navy/10 rounded-2xl p-4 space-y-4">
                            <div className="flex items-center justify-between border-b border-border/40 pb-2">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Module Core Info</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">Creator</span>
                                    <p className="font-bold text-foreground">{profile.full_name}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">Date Initiated</span>
                                    <p className="font-bold text-foreground">{new Date().toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                                    Module Title <span className="text-destructive">*</span>
                                </label>
                                <Input 
                                    id="title" 
                                    placeholder="e.g. Cleanroom Entry Procedures Training" 
                                    value={title} 
                                    onChange={e => setTitle(e.target.value.toUpperCase())}
                                    disabled={isLoading}
                                    className="bg-muted/30 border-border/50 focus:border-brand-teal/50 focus:ring-brand-teal/20 transition-all font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                                        Source SOP <span className="text-destructive">*</span>
                                    </label>
                                    <Select value={sopId} onValueChange={(val) => setSopId(val || "")} disabled={isLoading}>
                                        <SelectTrigger className="w-full bg-muted/30 border-border/50">
                                            <SelectValue placeholder="Select an Active SOP" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px]">
                                            {activeSops.filter(s => isQa || s.department === department).map(sop => (
                                                <SelectItem key={sop.id} value={sop.id}>
                                                    {sop.sop_number} - {sop.title} (v{sop.version})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {isQa && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                                            Target Department <span className="text-destructive">*</span>
                                        </label>
                                        <Select value={department} onValueChange={setDepartment} disabled={isLoading}>
                                            <SelectTrigger className="w-full bg-muted/30 border-border/50">
                                                <SelectValue placeholder="Select Department" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {deps.map(d => (
                                                    <SelectItem key={d} value={d}>{d}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                                    Description (Optional)
                                </label>
                                <Textarea 
                                    id="desc" 
                                    placeholder="Brief context about this training..." 
                                    value={description} 
                                    onChange={e => setDescription(e.target.value)} 
                                    disabled={isLoading}
                                    className="resize-none h-20 bg-muted/30 border-border/50 focus:border-brand-teal/50 focus:ring-brand-teal/20 transition-all text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div className="flex items-center justify-between rounded-xl border border-border/40 p-3 bg-brand-navy/5 dark:bg-card/50">
                                    <div className="grid gap-0.5 leading-none px-1">
                                        <label htmlFor="mandatory" className="text-[10px] font-bold uppercase tracking-widest text-foreground cursor-pointer">Mandatory</label>
                                        <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tight">Requirement for trainees</p>
                                    </div>
                                    <Switch id="mandatory" checked={isMandatory} onCheckedChange={setIsMandatory} disabled={isLoading} />
                                </div>

                                <div className="space-y-1.5 px-1 flex flex-col justify-center">
                                    <label htmlFor="deadline" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-0.5">Assignee Deadline</label>
                                    <Input 
                                        id="deadline" 
                                        type="date" 
                                        value={deadline} 
                                        onChange={e => setDeadline(e.target.value)} 
                                        disabled={isLoading}
                                        className="h-10 bg-muted/30 border-border/50"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 pt-3 border-t border-border/40 bg-muted/10 sm:justify-end items-center gap-3">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading} className="bg-brand-navy hover:bg-brand-navy/90 px-8 rounded-lg shadow-xl font-bold text-white transition-all active:scale-95 disabled:opacity-30">
                            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : 'Create Module'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
