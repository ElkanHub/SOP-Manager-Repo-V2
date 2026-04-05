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
            <DialogContent className="sm:max-w-[500px] border-border/50 bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80">
                <DialogHeader>
                    <DialogTitle className="text-xl">Create Training Module</DialogTitle>
                    <DialogDescription>Link an active SOP to generate training materials and track completion.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Module Title <span className="text-destructive">*</span></Label>
                        <Input 
                            id="title" 
                            placeholder="e.g. Cleanroom Entry Procedures Training" 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            disabled={isLoading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="sop">Source SOP <span className="text-destructive">*</span></Label>
                        <Select value={sopId} onValueChange={setSopId} disabled={isLoading}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select an Active SOP" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {activeSops.filter(s => isQa || s.department === department).map(sop => (
                                    <SelectItem key={sop.id} value={sop.id}>
                                        {sop.sop_number} - {sop.title} (v{sop.version})
                                    </SelectItem>
                                ))}
                                {activeSops.length === 0 && (
                                    <SelectItem value="none" disabled>No active SOPs found</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {isQa && (
                        <div className="space-y-2">
                            <Label htmlFor="department">Target Department <span className="text-destructive">*</span></Label>
                            <Select value={department} onValueChange={setDepartment} disabled={isLoading}>
                                <SelectTrigger>
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

                    <div className="space-y-2">
                        <Label htmlFor="desc">Description (Optional)</Label>
                        <Textarea 
                            id="desc" 
                            placeholder="Brief context about this training..." 
                            value={description} 
                            onChange={e => setDescription(e.target.value)} 
                            disabled={isLoading}
                            className="resize-none h-20"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="flex items-center space-x-2 rounded-lg border border-border/50 p-3 bg-muted/20">
                            <Switch id="mandatory" checked={isMandatory} onCheckedChange={setIsMandatory} disabled={isLoading} />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="mandatory" className="font-semibold cursor-pointer">Mandatory</Label>
                                <p className="text-xs text-muted-foreground">Required for assignees</p>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="deadline" className="text-xs font-semibold">Assignee Deadline (Optional)</Label>
                            <Input 
                                id="deadline" 
                                type="date" 
                                value={deadline} 
                                onChange={e => setDeadline(e.target.value)} 
                                disabled={isLoading}
                                className="h-10"
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-4 border-t border-border/50 mt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
                        <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90">
                            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : 'Create Module'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
