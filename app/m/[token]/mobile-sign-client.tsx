"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import SignatureCanvas from "react-signature-canvas"
import { CheckCircle2, Eraser, Loader2, Clock, AlertTriangle, Send, ShieldCheck } from "lucide-react"

interface MobileSignClientProps {
    token: string
    initialExpired: boolean
    initialCompleted: boolean
    expiresAt: string
}

export function MobileSignClient({ token, initialExpired, initialCompleted, expiresAt }: MobileSignClientProps) {
    const [status, setStatus] = useState<'ready' | 'submitting' | 'success' | 'expired' | 'completed' | 'error'>(
        initialCompleted ? 'completed' : initialExpired ? 'expired' : 'ready'
    )
    const [error, setError] = useState<string | null>(null)
    const [isDrawingEmpty, setIsDrawingEmpty] = useState(true)
    const [timeLeft, setTimeLeft] = useState(() => {
        if (initialExpired || initialCompleted) return 0
        return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
    })
    const sigCanvas = useRef<SignatureCanvas>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    // ─── Viewport height fix for mobile browsers ─────────────────────────
    useEffect(() => {
        function setVH() {
            const vh = window.innerHeight * 0.01
            document.documentElement.style.setProperty('--vh', `${vh}px`)
        }
        setVH()
        window.addEventListener('resize', setVH)
        window.addEventListener('orientationchange', setVH)
        return () => {
            window.removeEventListener('resize', setVH)
            window.removeEventListener('orientationchange', setVH)
        }
    }, [])

    // ─── Canvas resize: sync internal buffer to container size ───────────
    // react-signature-canvas defaults its internal <canvas> to 300×150.
    // CSS w-full/h-full only stretches the visual, the drawing area stays
    // tiny. We must manually set the canvas width/height attributes to
    // match the container's actual pixel dimensions.
    useEffect(() => {
        function resizeCanvas() {
            const container = containerRef.current
            const canvas = sigCanvas.current
            if (!container || !canvas) return

            const canvasEl = canvas.getCanvas()
            const rect = container.getBoundingClientRect()
            const dpr = window.devicePixelRatio || 1

            // Set the canvas buffer to the container's CSS size × device pixel ratio
            canvasEl.width = rect.width * dpr
            canvasEl.height = rect.height * dpr

            // Scale the drawing context so 1 CSS px = 1 drawing unit
            const ctx = canvasEl.getContext('2d')
            if (ctx) {
                ctx.scale(dpr, dpr)
            }

            // Set the CSS display size to fill the container exactly
            canvasEl.style.width = `${rect.width}px`
            canvasEl.style.height = `${rect.height}px`

            // Clear any previous drawing (resize wipes the buffer anyway)
            canvas.clear()
            setIsDrawingEmpty(true)
        }

        // Run after a short delay so the flex layout has settled
        const timer = setTimeout(resizeCanvas, 100)

        window.addEventListener('resize', resizeCanvas)
        window.addEventListener('orientationchange', resizeCanvas)

        return () => {
            clearTimeout(timer)
            window.removeEventListener('resize', resizeCanvas)
            window.removeEventListener('orientationchange', resizeCanvas)
        }
    }, [status]) // re-run when status changes (e.g. from loading to ready)

    // ─── Countdown timer ─────────────────────────────────────────────────
    useEffect(() => {
        if (status !== 'ready') return

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setStatus('expired')
                    clearInterval(interval)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [status])

    const clearCanvas = useCallback(() => {
        sigCanvas.current?.clear()
        setIsDrawingEmpty(true)
    }, [])

    const handleSubmit = useCallback(async () => {
        if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
            setError("Please draw your signature first.")
            return
        }

        try {
            setStatus('submitting')
            setError(null)

            const dataURL = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png')

            // Validate the data URL is a proper PNG image
            if (!dataURL.startsWith('data:image/png')) {
                throw new Error('Invalid signature format')
            }

            // Limit payload size (base64 can be large) — 5MB max
            if (dataURL.length > 5 * 1024 * 1024) {
                throw new Error('Signature image is too large. Please try a simpler signature.')
            }

            const { error: updateError } = await supabase
                .from('mobile_signatures')
                .update({
                    signature_base64: dataURL,
                    status: 'completed'
                })
                .eq('id', token)

            if (updateError) {
                // RLS will reject if expired or already completed
                if (updateError.message.includes('row-level security')) {
                    throw new Error('This signing session has expired or was already completed.')
                }
                throw updateError
            }

            setStatus('success')
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to submit signature')
            setStatus('ready')
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token])

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    // ─── Already completed ───────────────────────────────────────────────
    if (status === 'completed') {
        return (
            <MobileShell>
                <div className="flex flex-col items-center justify-center flex-1 gap-4 px-6">
                    <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-amber-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Already Signed</h2>
                    <p className="text-sm text-slate-500 text-center max-w-[280px]">
                        This signing session has already been completed. You can close this page.
                    </p>
                </div>
            </MobileShell>
        )
    }

    // ─── Expired ─────────────────────────────────────────────────────────
    if (status === 'expired') {
        return (
            <MobileShell>
                <div className="flex flex-col items-center justify-center flex-1 gap-4 px-6">
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                        <Clock className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Session Expired</h2>
                    <p className="text-sm text-slate-500 text-center max-w-[280px]">
                        This signing session has expired. Please generate a new QR code from your desktop.
                    </p>
                </div>
            </MobileShell>
        )
    }

    // ─── Success ─────────────────────────────────────────────────────────
    if (status === 'success') {
        return (
            <MobileShell>
                <div className="flex flex-col items-center justify-center flex-1 gap-4 px-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-200/50 animate-in zoom-in-50 duration-500">
                        <CheckCircle2 className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">Signature Captured</h2>
                    <p className="text-sm text-slate-500 text-center max-w-[280px] animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
                        Your signature has been securely transmitted to your desktop.
                        You can close this page.
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 text-emerald-600 animate-in fade-in duration-500 delay-500">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">End-to-end secured</span>
                    </div>
                </div>
            </MobileShell>
        )
    }

    // ─── Signing canvas ──────────────────────────────────────────────────
    const urgency = timeLeft <= 60 ? 'text-red-500' : timeLeft <= 180 ? 'text-amber-500' : 'text-slate-500'

    return (
        <MobileShell>
            {/* Timer bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-white/80 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ready to sign</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Clock className={`w-3.5 h-3.5 ${urgency}`} />
                    <span className={`text-xs font-mono font-bold tabular-nums ${urgency}`}>
                        {formatTime(timeLeft)}
                    </span>
                </div>
            </div>

            {/* Error message */}
            {error && (
                <div className="mx-4 mt-3 p-2.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg font-medium">
                    {error}
                </div>
            )}

            {/* Canvas area */}
            <div className="flex-1 flex flex-col px-4 py-3 gap-3">
                <div
                    ref={containerRef}
                    className="flex-1 border-2 border-slate-200 rounded-2xl overflow-hidden relative bg-white shadow-inner touch-none"
                    style={{ minHeight: '200px' }}
                >
                    <SignatureCanvas
                        ref={sigCanvas}
                        penColor="#0D2B55"
                        minWidth={1.5}
                        maxWidth={3.5}
                        velocityFilterWeight={0.7}
                        canvasProps={{
                            style: {
                                touchAction: 'none',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                cursor: 'crosshair',
                            }
                        }}
                        onBegin={() => {
                            setIsDrawingEmpty(false)
                            setError(null)
                        }}
                    />
                    {/* Signing line */}
                    <div className="absolute inset-x-6 bottom-12 pointer-events-none select-none">
                        <div className="border-b-2 border-slate-200" />
                        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-slate-300 text-[10px] font-bold uppercase tracking-[0.25em] whitespace-nowrap">
                            Sign your name above
                        </span>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pb-2">
                    <button
                        onClick={clearCanvas}
                        disabled={isDrawingEmpty || status === 'submitting'}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-600 font-bold text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
                    >
                        <Eraser className="w-4 h-4" />
                        Clear
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isDrawingEmpty || status === 'submitting'}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#0D2B55] to-[#1A5EA8] text-white font-bold text-xs uppercase tracking-widest shadow-xl shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
                    >
                        {status === 'submitting' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                        {status === 'submitting' ? 'Sending…' : 'Submit Signature'}
                    </button>
                </div>
            </div>
        </MobileShell>
    )
}

/** Wrapper that provides full-screen mobile layout with SOP-Guard branding */
function MobileShell({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="flex flex-col bg-gradient-to-b from-slate-50 to-white"
            style={{ minHeight: 'calc(var(--vh, 1vh) * 100)' }}
        >
            {/* Brand header */}
            <div className="flex items-center justify-center gap-2.5 px-4 py-3 bg-gradient-to-r from-[#0D2B55] to-[#1A5EA8]">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-white/90" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-white tracking-tight leading-tight">SOP-Guard Pro</span>
                    <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest">Digital Signature</span>
                </div>
            </div>

            {children}
        </div>
    )
}
