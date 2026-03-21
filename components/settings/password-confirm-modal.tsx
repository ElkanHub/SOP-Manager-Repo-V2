"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Loader2, KeyRound } from "lucide-react"

interface PasswordConfirmModalProps {
    open: boolean
    onClose: () => void
    title: string
    description: string
    confirmLabel?: string
    onConfirm: (password: string) => Promise<{ success: boolean; error?: string }>
}

export function PasswordConfirmModal({
    open,
    onClose,
    title,
    description,
    confirmLabel = "Confirm",
    onConfirm,
}: PasswordConfirmModalProps) {
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleConfirm() {
        if (!password) { setError("Password is required."); return }
        setLoading(true)
        setError(null)
        const result = await onConfirm(password)
        setLoading(false)
        if (!result.success) {
            setError(result.error ?? "An error occurred.")
            return
        }
        setPassword("")
        onClose()
    }

    function handleClose() {
        setPassword("")
        setError(null)
        onClose()
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/40 shadow-2xl bg-gradient-to-b from-background to-background/95">
                <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-brand-navy/10 to-transparent border-b border-border/50">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
                        <div className="p-2 rounded-lg bg-brand-navy/10">
                            <KeyRound className="w-5 h-5 text-brand-navy" />
                        </div>
                        {title}
                    </DialogTitle>
                </DialogHeader>
                <div className="p-6 space-y-4">
                    <p className="text-xs font-medium text-muted-foreground leading-relaxed">{description}</p>
                    <div className="space-y-2">
                        <Label htmlFor="admin-confirm-password" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Identity Verification Required</Label>
                        <Input
                            id="admin-confirm-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm() }}
                            placeholder="Current account password"
                            autoComplete="current-password"
                            className="bg-muted/30 border-border/50 focus:border-brand-navy/50 focus:ring-brand-navy/20 transition-all font-mono"
                        />
                    </div>
                    {error && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-xs font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                             <div className="w-1 h-1 rounded-full bg-destructive" />
                             {error}
                        </div>
                    )}
                </div>
                <DialogFooter className="p-6 pt-2 border-t border-border/40 bg-muted/5 flex-col-reverse sm:flex-row gap-2">
                    <Button variant="ghost" onClick={handleClose} disabled={loading} className="font-bold text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleConfirm} 
                        disabled={loading || !password}
                        className="bg-brand-navy hover:bg-brand-navy/90 shadow-xl font-bold px-8 rounded-lg text-white transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
                    >
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        {loading ? "AUTHENTICATING…" : (confirmLabel || "Confirm Identity")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
