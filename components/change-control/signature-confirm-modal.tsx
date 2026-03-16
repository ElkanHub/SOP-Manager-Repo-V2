"use client"

import { useState } from "react"
import { PenTool, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { signChangeControl } from "@/actions/sop"

interface SignatureConfirmModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    changeControlId: string
    sopTitle: string
    newVersion: string
    ccRef: string
    signatureUrl?: string | null
    onSuccess: () => void
}

export function SignatureConfirmModal({
    open,
    onOpenChange,
    changeControlId,
    sopTitle,
    newVersion,
    ccRef,
    signatureUrl,
    onSuccess
}: SignatureConfirmModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSign = async () => {
        setLoading(true)
        setError(null)

        try {
            const result = await signChangeControl(changeControlId)
            
            if (!result.success) {
                setError(result.error || 'Failed to sign')
                return
            }

            onSuccess()
            onOpenChange(false)
        } catch (err: any) {
            setError(err.message || 'Failed to sign')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PenTool className="h-5 w-5" />
                        Confirm Signature
                    </DialogTitle>
                    <DialogDescription>
                        You are signing this Change Control
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="bg-muted dark:bg-muted/50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">SOP:</span>
                            <span className="font-medium">{sopTitle}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Version:</span>
                            <span className="font-mono">{newVersion}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Reference:</span>
                            <span className="font-mono">{ccRef}</span>
                        </div>
                    </div>

                    {signatureUrl ? (
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Your signature:</p>
                            <div className="border rounded-lg p-4 bg-background dark:bg-card">
                                <img 
                                    src={signatureUrl} 
                                    alt="Your signature" 
                                    className="max-h-20 object-contain mx-auto"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4 text-muted-foreground">
                            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                            <p className="text-sm">No signature on file</p>
                            <p className="text-xs">Please upload your signature in Settings</p>
                        </div>
                    )}

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
                        onClick={handleSign}
                        disabled={loading || !signatureUrl}
                        className="bg-brand-teal hover:bg-teal-600"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Signing...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Confirm & Sign
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
