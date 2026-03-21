"use client"

import { useState } from "react"
import { UserX, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { waiveSignature } from "@/actions/sop"

interface WaiveModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    changeControlId: string
    targetUserName: string
    ccRef: string
    onSuccess: () => void
}

export function WaiveModal({
    open,
    onOpenChange,
    changeControlId,
    targetUserName,
    ccRef,
    onSuccess
}: WaiveModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [reason, setReason] = useState('')

    const handleWaive = async () => {
        if (!reason.trim()) {
            setError('Please provide a reason for waiving')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const result = await waiveSignature(changeControlId, targetUserName, reason)
            
            if (!result.success) {
                setError(result.error || 'Failed to waive signature')
                return
            }

            setReason('')
            onSuccess()
            onOpenChange(false)
        } catch (err: any) {
            setError(err.message || 'Failed to waive signature')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/40 shadow-2xl bg-gradient-to-b from-background to-background/95">
                <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-brand-navy/10 via-brand-navy/5 to-transparent border-b border-border/50">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
                        <div className="p-2 rounded-lg bg-brand-navy/10">
                            <UserX className="h-5 w-5 text-brand-navy" />
                        </div>
                        Waive Signature Requirement
                    </DialogTitle>
                    <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 ml-11">
                        Regulatory Compliance Override
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex gap-3">
                         <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                         <div className="space-y-1">
                             <p className="text-sm font-bold text-amber-900 dark:text-amber-400">Security Override Warning</p>
                             <p className="text-xs text-amber-800/70 dark:text-amber-400/60 leading-relaxed">
                                 You are waiving the signature for <span className="font-bold text-amber-900 dark:text-amber-300">{targetUserName}</span> for CC Reference <span className="font-mono font-bold text-amber-900 dark:text-amber-300">{ccRef}</span>.
                             </p>
                         </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                            Justification Statement <span className="text-destructive">*</span>
                        </label>
                        <Textarea 
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="State the formal reason for this regulatory override..."
                            rows={4}
                            className="bg-muted/30 border-border/50 focus:border-brand-navy/50 focus:ring-brand-navy/20 resize-none transition-all"
                        />
                        <div className="flex items-center justify-between px-1">
                            <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
                                This action is recorded in the permanent audit trail
                            </p>
                            <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest font-mono">
                                {reason.length} / 250
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-bold animate-in fade-in slide-in-from-top-1">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}
                </div>

                <div className="p-6 pt-2 border-t border-border/40 bg-muted/5 flex flex-col-reverse sm:flex-row justify-end gap-3">
                    <Button 
                        variant="ghost" 
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                        className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleWaive}
                        disabled={loading || !reason.trim()}
                        className="bg-destructive hover:bg-destructive/90 shadow-lg font-bold px-8 rounded-lg"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                PROCESSING OVERRIDE...
                            </>
                        ) : (
                            'CONFIRM REGULATORY WAIVER'
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
