"use client"

import { useState, useEffect } from "react"
import { FileText, Loader2, AlertTriangle, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { SopViewer } from "./sop-viewer"
import { getSopSignedUrl } from "@/actions/sop"
import { Badge } from "@/components/ui/badge"

interface SopReadModalProps {
    sopId: string | null
    sopNumber?: string
    sopTitle?: string
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function SopReadModal({
    sopId,
    sopNumber,
    sopTitle,
    open,
    onOpenChange,
}: SopReadModalProps) {
    const [loading, setLoading] = useState(false)
    const [signedUrl, setSignedUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (open && sopId) {
            fetchSignedUrl()
        } else if (!open) {
            setSignedUrl(null)
            setError(null)
        }
    }, [open, sopId])

    async function fetchSignedUrl() {
        if (!sopId) return
        setLoading(true)
        setError(null)
        try {
            const result = await getSopSignedUrl(sopId)
            if (result.success && result.signedUrl) {
                setSignedUrl(result.signedUrl)
            } else {
                setError(result.error || "Failed to load SOP document")
            }
        } catch (err) {
            setError("An unexpected error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden border-border/40 shadow-2xl bg-background">
                <DialogHeader className="p-4 border-b border-border/50 flex flex-row items-center justify-between space-y-0 shrink-0 bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-brand-navy/10 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-brand-navy" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">
                                    {sopNumber || "SOP-REF"}
                                </span>
                                <DialogTitle className="text-base font-bold truncate max-w-[400px]">
                                    {sopTitle || "View SOP"}
                                </DialogTitle>
                            </div>
                            <DialogDescription className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                                Read-Only Access
                            </DialogDescription>
                        </div>
                    </div>
                    {/* Close button is handled by DialogContent internally usually, but we can add more if needed */}
                </DialogHeader>

                <div className="flex-1 overflow-hidden relative bg-slate-50/30">
                    {loading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                            <Loader2 className="h-8 w-8 text-brand-teal animate-spin mb-4" />
                            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
                                Securing Document Access...
                            </p>
                        </div>
                    ) : error ? (
                        <div className="flex h-full items-center justify-center p-12">
                            <div className="max-w-md w-full p-8 rounded-2xl border-2 border-dashed border-red-200 bg-red-50 flex flex-col items-center text-center">
                                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                                    <AlertTriangle className="h-6 w-6 text-red-600" />
                                </div>
                                <h3 className="text-lg font-bold text-red-900 mb-2">Access Error</h3>
                                <p className="text-sm text-red-700/80 mb-6 font-medium">{error}</p>
                                <Button 
                                    onClick={fetchSignedUrl} 
                                    variant="outline" 
                                    className="border-red-200 text-red-700 hover:bg-red-100"
                                >
                                    Retry Connection
                                </Button>
                            </div>
                        </div>
                    ) : signedUrl ? (
                        <SopViewer 
                            fileUrl={signedUrl} 
                            className="h-full border-0 rounded-none shadow-none" 
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground font-medium italic">
                            No document available to view.
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
