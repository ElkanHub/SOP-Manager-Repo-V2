"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { QRCodeSVG } from "qrcode.react"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Smartphone, Clock, CheckCircle2, XCircle, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MobileSignQRProps {
    /** The authenticated user's ID */
    userId: string
    /** Called when the mobile device successfully submits a signature */
    onCaptured: (base64: string) => void
    /** Called when the user cancels the QR flow */
    onCancel: () => void
}

/**
 * Reusable Mobile Signature QR component.
 *
 * 1. Creates a `mobile_signatures` record (status: pending, 15-min expiry)
 * 2. Displays the QR code pointing to `/m/[token]`
 * 3. Subscribes to Supabase Realtime for status changes
 * 4. Fires `onCaptured` when the mobile submits the signature
 */
export function MobileSignQR({ userId, onCaptured, onCancel }: MobileSignQRProps) {
    const [token, setToken] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [creating, setCreating] = useState(true)
    const [timeLeft, setTimeLeft] = useState(15 * 60) // 15 minutes in seconds
    const [expired, setExpired] = useState(false)
    const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
    const supabase = createClient()

    // ─── Create the session ──────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false

        async function createSession() {
            try {
                setCreating(true)
                setError(null)

                const { data, error: insertError } = await supabase
                    .from('mobile_signatures')
                    .insert({ user_id: userId })
                    .select('id, expires_at')
                    .single()

                if (cancelled) return
                if (insertError) throw insertError
                if (!data) throw new Error('Failed to create signing session')

                setToken(data.id)

                // Calculate remaining time from server-set expiry
                const expiresAt = new Date(data.expires_at).getTime()
                const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
                setTimeLeft(remaining)
            } catch (err: unknown) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to create signing session')
                }
            } finally {
                if (!cancelled) setCreating(false)
            }
        }

        createSession()

        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId])

    // ─── Realtime subscription ───────────────────────────────────────────
    useEffect(() => {
        if (!token) return

        const channel = supabase.channel(`mobile_sign_${token}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'mobile_signatures',
                filter: `id=eq.${token}`
            }, (payload) => {
                const row = payload.new as { status: string; signature_base64?: string }
                if (row.status === 'completed' && row.signature_base64) {
                    onCaptured(row.signature_base64)
                }
            })
            .subscribe()

        channelRef.current = channel

        return () => {
            supabase.removeChannel(channel)
            channelRef.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token])

    // ─── Countdown timer ─────────────────────────────────────────────────
    useEffect(() => {
        if (!token || expired) return

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setExpired(true)
                    clearInterval(interval)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [token, expired])

    // ─── Cleanup channel on cancel ───────────────────────────────────────
    const handleCancel = useCallback(() => {
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current)
            channelRef.current = null
        }
        onCancel()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onCancel])

    // ─── Format time ─────────────────────────────────────────────────────
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    const qrUrl = token ? `${window.location.origin}/m/${token}` : ''
    const urgency = timeLeft <= 60 ? 'text-red-500' : timeLeft <= 180 ? 'text-amber-500' : 'text-muted-foreground'

    // ─── Loading state ───────────────────────────────────────────────────
    if (creating) {
        return (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
                <p className="text-sm text-muted-foreground font-medium">Generating secure signing session…</p>
            </div>
        )
    }

    // ─── Error state ─────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
                <div className="p-3 rounded-full bg-red-50 dark:bg-red-950/30">
                    <XCircle className="w-8 h-8 text-red-500" />
                </div>
                <p className="text-sm text-red-600 dark:text-red-400 font-medium text-center">{error}</p>
                <Button variant="outline" size="sm" onClick={handleCancel}>Go Back</Button>
            </div>
        )
    }

    // ─── Expired state ───────────────────────────────────────────────────
    if (expired) {
        return (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
                <div className="p-3 rounded-full bg-amber-50 dark:bg-amber-950/30">
                    <Clock className="w-8 h-8 text-amber-500" />
                </div>
                <p className="text-sm text-amber-600 dark:text-amber-400 font-bold">Session Expired</p>
                <p className="text-xs text-muted-foreground text-center max-w-[260px]">
                    The 15-minute window has passed. Please start a new session.
                </p>
                <Button variant="outline" size="sm" onClick={handleCancel}>Close</Button>
            </div>
        )
    }

    // ─── QR display ──────────────────────────────────────────────────────
    return (
        <div className="flex flex-col items-center gap-5 py-2">
            {/* Header */}
            <div className="flex items-center gap-2 text-brand-teal">
                <Smartphone className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-wider">Scan with your phone</span>
            </div>

            {/* QR Code */}
            <div className="relative p-4 bg-white rounded-2xl shadow-lg border border-border/50">
                <QRCodeSVG
                    value={qrUrl}
                    size={200}
                    level="H"
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor="#0D2B55"
                />
                {/* Center brand icon */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-border/30">
                        <QrCode className="w-5 h-5 text-brand-navy" />
                    </div>
                </div>
            </div>

            {/* Timer */}
            <div className="flex items-center gap-2">
                <Clock className={cn("w-4 h-4", urgency)} />
                <span className={cn("text-sm font-mono font-bold tabular-nums", urgency)}>
                    {formatTime(timeLeft)}
                </span>
                <span className="text-xs text-muted-foreground">remaining</span>
            </div>

            {/* Instructions */}
            <div className="text-center space-y-1.5 max-w-[280px]">
                <p className="text-xs text-muted-foreground leading-relaxed">
                    Open your phone's camera and point it at the QR code.
                    A signing page will open in your mobile browser.
                </p>
                <div className="flex items-center justify-center gap-1.5 text-brand-teal">
                    <div className="w-1.5 h-1.5 bg-brand-teal rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Waiting for signature…</span>
                </div>
            </div>

            {/* Cancel */}
            <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
                Cancel
            </Button>
        </div>
    )
}
