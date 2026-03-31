"use client"
import Image from "next/image"


import { useState } from "react"
import { PenTool, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
            <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/40 shadow-2xl bg-gradient-to-b from-background to-background/95">
                <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-brand-teal/10 via-brand-navy/5 to-transparent border-b border-border/50">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
                        <div className="p-2 rounded-lg bg-brand-teal/10">
                            <PenTool className="h-5 w-5 text-brand-teal" />
                        </div>
                        Confirm Digital Signature
                    </DialogTitle>
                    <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 ml-11">
                        Electronic Signature Authentication
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    <div className="bg-brand-navy/5 dark:bg-card border border-brand-navy/10 rounded-2xl p-4 space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Document</span>
                            <span className="font-bold text-foreground text-right max-w-[200px] truncate">{sopTitle}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Version</span>
                            <Badge variant="outline" className="font-mono text-[10px] font-bold px-2 py-0 border-brand-teal/30 text-brand-teal bg-brand-teal/5">{newVersion}</Badge>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">CC Reference</span>
                            <span className="font-mono font-bold text-xs text-foreground/80">{ccRef}</span>
                        </div>
                    </div>

                    {signatureUrl ? (
                        <div className="space-y-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Authentication Artifact</p>
                            <div className="bg-white/80 dark:bg-slate-900/50 rounded-xl p-4 border border-border/50 flex items-center justify-center min-h-[100px] relative overflow-hidden">
                                <Image
                                    src={signatureUrl}
                                    alt="Digital Signature"
                                    width={200}
                                    height={80}
                                    unoptimized={signatureUrl?.startsWith('data:')}
                                    className="max-h-[80px] w-auto object-contain dark:invert grayscale brightness-0 contrast-200"
                                />
                                <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
                                    <CheckCircle2 className="w-3 h-3" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 rounded-2xl border-2 border-dashed border-destructive/20 bg-destructive/5 text-destructive">
                            <AlertCircle className="h-8 w-8 mx-auto mb-3 opacity-50" />
                            <p className="text-sm font-bold uppercase tracking-widest">No Signature Metadata</p>
                            <p className="text-[10px] font-medium opacity-70 mt-1 max-w-[200px] mx-auto leading-relaxed">Please initialize your digital signature in user settings.</p>
                        </div>
                    )}

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
                        onClick={handleSign}
                        disabled={loading || !signatureUrl}
                        className="bg-brand-navy hover:bg-brand-navy/90 shadow-xl font-bold px-8 rounded-lg text-white transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4 mr-2 text-green-400" />
                                Confirm & Cryptographically Sign
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
