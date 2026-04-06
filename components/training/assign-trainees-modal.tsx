"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { assignTrainees } from "@/actions/training"
import { toast } from "sonner"
import { Loader2, Users } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

interface Props {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    availableUsers: any[]
    moduleId: string
}

export default function AssignTraineesModal({ isOpen, onOpenChange, availableUsers, moduleId }: Props) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    const toggleUser = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
    }

    const selectAll = () => setSelectedIds(availableUsers.map(u => u.id))
    const selectNone = () => setSelectedIds([])

    const handleAssign = async () => {
        if (selectedIds.length === 0) return
        setIsLoading(true)

        const res = await assignTrainees(moduleId, selectedIds)
        setIsLoading(false)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success(`Successfully assigned ${res.assigned} trainees!`)
            onOpenChange(false)
            setSelectedIds([])
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl md:max-w-2xl w-[95vw] p-0 overflow-hidden border-border/40 shadow-2xl bg-gradient-to-b from-background to-background/98">
                <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-brand-navy/10 via-brand-teal/5 to-transparent border-b border-border/50 relative">
                    <div className="space-y-1">
                        <DialogTitle className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                             Assign Trainees
                        </DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase tracking-widest text-brand-teal/80">
                            Select Personnel for Training
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    {/* Selection Summary */}
                    <div className="bg-brand-navy/5 dark:bg-card border border-brand-navy/10 rounded-2xl p-4 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60 block">Selection Summary</span>
                            <p className="font-black text-brand-teal tracking-tight text-lg leading-none">
                                {selectedIds.length} <span className="text-xs font-bold text-foreground/70 uppercase tracking-widest ml-1">Trainees Selected</span>
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={selectAll} className="text-[9px] font-bold uppercase tracking-widest h-8 px-3 rounded-lg border-brand-navy/20 hover:bg-brand-navy/5">
                                Select All
                            </Button>
                            <Button variant="outline" size="sm" onClick={selectNone} className="text-[9px] font-bold uppercase tracking-widest h-8 px-3 rounded-lg border-destructive/20 hover:bg-destructive/5 text-destructive">
                                Clear
                            </Button>
                        </div>
                    </div>

                    <div className="h-[340px] overflow-y-auto rounded-2xl border border-border/40 divide-y divide-border/20 bg-background/50 custom-scrollbar shadow-inner relative">
                        {availableUsers.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground h-full flex flex-col items-center justify-center space-y-3">
                                <Users className="h-8 w-8 opacity-20" />
                                <p className="text-xs font-bold uppercase tracking-widest opacity-50 underline underline-offset-4">Department Fully Assigned</p>
                            </div>
                        ) : (
                            availableUsers.map(u => (
                                <label key={u.id} className="flex items-center p-4 hover:bg-brand-navy/5 cursor-pointer group transition-all duration-200">
                                    <div className="relative flex items-center justify-center">
                                        <Checkbox 
                                            checked={selectedIds.includes(u.id)} 
                                            onCheckedChange={() => toggleUser(u.id)}
                                            className="h-5 w-5 rounded-md border-border/60 data-[state=checked]:bg-brand-teal data-[state=checked]:border-brand-teal transition-colors"
                                        />
                                    </div>
                                    <div className="ml-4 flex-1">
                                        <p className="font-bold text-sm text-foreground group-hover:text-brand-navy transition-colors">{u.full_name}</p>
                                        <div className="flex gap-2 mt-0.5">
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">{u.department}</span>
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-brand-teal/80">· {u.role}</span>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "ml-auto px-3 py-1 rounded-full border text-[9px] font-bold uppercase tracking-[0.1em] transition-all",
                                        selectedIds.includes(u.id) 
                                            ? "bg-brand-teal/10 border-brand-teal/30 text-brand-teal shadow-sm" 
                                            : "opacity-0 group-hover:opacity-100 bg-muted/50 border-border/40 text-muted-foreground"
                                    )}>
                                        {selectedIds.includes(u.id) ? "Selected" : "Add Trainee"}
                                    </div>
                                </label>
                            ))
                        )}
                    </div>
                </div>

                <DialogFooter className="p-6 pt-3 border-t border-border/40 bg-muted/10 sm:justify-end items-center gap-3">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
                        Cancel Selection
                    </Button>
                    <Button 
                        onClick={handleAssign} 
                        disabled={isLoading || selectedIds.length === 0} 
                        className="bg-brand-navy hover:bg-brand-navy/90 px-8 rounded-lg shadow-xl font-bold text-white transition-all active:scale-95 disabled:opacity-30"
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Users className="h-4 w-4 mr-2" />}
                        {isLoading ? 'Processing...' : `Assign ${selectedIds.length > 0 ? selectedIds.length : ''} Trainees`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
