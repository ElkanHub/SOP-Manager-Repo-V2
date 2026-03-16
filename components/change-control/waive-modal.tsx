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
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserX className="h-5 w-5" />
                        Waive Signature Requirement
                    </DialogTitle>
                    <DialogDescription>
                        You are waiving the signature requirement for {targetUserName}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="bg-muted dark:bg-muted/50 rounded-lg p-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Reference:</span>
                            <span className="font-mono">{ccRef}</span>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium">
                            Reason for waiving <span className="text-destructive">*</span>
                        </label>
                        <Textarea 
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Provide a reason for waiving this signature..."
                            rows={3}
                            className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            This reason will be recorded in the audit log
                        </p>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-destructive text-sm">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2">
                    <Button 
                        variant="outline" 
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleWaive}
                        disabled={loading || !reason.trim()}
                        variant="destructive"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Waiving...
                            </>
                        ) : (
                            'Confirm Waive'
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
