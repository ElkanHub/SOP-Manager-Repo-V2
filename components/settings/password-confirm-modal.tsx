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
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <KeyRound className="w-5 h-5 text-amber-500" />
                        {title}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-1">
                    <p className="text-sm text-muted-foreground">{description}</p>
                    <div className="space-y-2">
                        <Label htmlFor="admin-confirm-password">Your Password</Label>
                        <Input
                            id="admin-confirm-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm() }}
                            placeholder="Enter your current password"
                            autoComplete="current-password"
                        />
                    </div>
                    {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={loading || !password}>
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        {loading ? "Verifying…" : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
