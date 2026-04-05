"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { assignTrainees } from "@/actions/training"
import { toast } from "sonner"
import { Loader2, Users } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

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
            <DialogContent className="sm:max-w-[600px] border-border/50 bg-card/95 backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Assign Trainees</DialogTitle>
                    <DialogDescription>Select the users who need to complete this training module.</DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-medium">{selectedIds.length} Selected</span>
                        <div className="space-x-2">
                            <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
                            <Button variant="outline" size="sm" onClick={selectNone}>Clear</Button>
                        </div>
                    </div>

                    <div className="h-[300px] overflow-y-auto rounded-lg border border-border/50 divide-y divide-border/30 bg-background/50">
                        {availableUsers.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground h-full flex items-center justify-center">
                                All available users in your department have already been assigned.
                            </div>
                        ) : (
                            availableUsers.map(u => (
                                <label key={u.id} className="flex items-center p-3 hover:bg-muted/50 cursor-pointer group transition-colors">
                                    <Checkbox 
                                        checked={selectedIds.includes(u.id)} 
                                        onCheckedChange={() => toggleUser(u.id)}
                                        className="mr-4 data-[state=checked]:bg-primary"
                                    />
                                    <div>
                                        <p className="font-medium">{u.full_name}</p>
                                        <p className="text-xs text-muted-foreground">{u.department} • {u.role}</p>
                                    </div>
                                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">Select</span>
                                    </div>
                                </label>
                            ))
                        )}
                    </div>
                </div>

                <DialogFooter className="border-t border-border/50 pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
                    <Button onClick={handleAssign} disabled={isLoading || selectedIds.length === 0} className="bg-primary hover:bg-primary/90">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Assign {selectedIds.length > 0 ? selectedIds.length : ''} Trainees
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
