"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Eraser, UploadCloud, CheckCircle2, Smartphone } from "lucide-react"
import SignatureCanvas from "react-signature-canvas"
import { createClient } from "@/lib/supabase/client"
import { redrawSignature } from "@/actions/settings"
import { MobileSignQR } from "@/components/ui/mobile-sign-qr"
import { base64ToBlob } from "@/lib/utils/base64-to-blob"

interface SignatureRedrawDialogProps {
    open: boolean
    onClose: () => void
    userId: string
    currentSignatureUrl?: string | null
    onSaved: (newUrl: string) => void
}

export function SignatureRedrawDialog({
    open,
    onClose,
    userId,
    currentSignatureUrl,
    onSaved,
}: SignatureRedrawDialogProps) {
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isDrawingEmpty, setIsDrawingEmpty] = useState(true)
    const [activeTab, setActiveTab] = useState("draw")
    const sigCanvas = useRef<SignatureCanvas>(null)
    const supabase = createClient()

    const clearCanvas = () => {
        sigCanvas.current?.clear()
        setIsDrawingEmpty(true)
    }

    const uploadAndSave = async (file: File | Blob) => {
        try {
            setUploading(true)
            setError(null)

            const filePath = `${userId}/signature.png`
            const { error: uploadError } = await supabase.storage
                .from("signatures")
                .upload(filePath, file, { upsert: true, contentType: "image/png" })

            if (uploadError) throw uploadError

            // Use createSignedUrl instead of getPublicUrl because the bucket is private
            const { data, error: signedError } = await supabase.storage
                .from("signatures")
                .createSignedUrl(filePath, 3600)

            if (signedError || !data?.signedUrl) throw new Error("Failed to generate preview URL")
            
            const signedUrl = data.signedUrl + `&t=${Date.now()}` // for cache busting

            const result = await redrawSignature(signedUrl.split('?')[0]) // Store the base URL in profile
            if (!result.success) throw new Error(result.error)

            onSaved(signedUrl)
            toast.success("Signature updated successfully")
            onClose()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to save signature")
        } finally {
            setUploading(false)
        }
    }

    const handleConfirmDrawing = () => {
        if (sigCanvas.current?.isEmpty()) {
            setError("Please provide a signature first.")
            return
        }
        const canvas = sigCanvas.current?.getTrimmedCanvas()
        canvas?.toBlob((blob) => {
            if (blob) uploadAndSave(blob)
        }, "image/png")
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return
        const file = e.target.files[0]
        if (file.size > 2 * 1024 * 1024) { setError("File must be under 2MB."); return }
        if (!file.type.startsWith("image/")) { setError("Only image files allowed."); return }
        uploadAndSave(file)
    }

    /** Called when the mobile device submits a signature via QR flow */
    const handleMobileCaptured = async (base64: string) => {
        try {
            setUploading(true)
            setError(null)

            // Convert base64 data URL to Blob (CSP-safe, no fetch(dataURL))
            const blob = base64ToBlob(base64)

            // Upload to storage and save to profile
            await uploadAndSave(blob)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to process mobile signature")
            setUploading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/40 shadow-2xl bg-gradient-to-b from-background to-background/95">
                <DialogHeader className="p-6 pb-2 bg-gradient-to-r from-brand-teal/10 via-brand-navy/5 to-transparent border-b border-border/50">
                    <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Update Digital Signature</DialogTitle>
                </DialogHeader>

                <div className="p-6 space-y-4">

                {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>
                )}

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-muted/30 p-1 rounded-xl">
                        <TabsTrigger value="draw" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest transition-all">Draw</TabsTrigger>
                        <TabsTrigger value="upload" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest transition-all">Upload</TabsTrigger>
                        <TabsTrigger value="mobile" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-1">
                            <Smartphone className="w-3 h-3" />
                            Mobile
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="draw" className="space-y-4 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="border border-border/60 rounded-2xl overflow-hidden relative bg-card shadow-inner group" style={{ height: "180px" }}>
                            <SignatureCanvas
                                ref={sigCanvas}
                                penColor="currentColor"
                                canvasProps={{ className: "w-full h-full cursor-crosshair" }}
                                onBegin={() => setIsDrawingEmpty(false)}
                            />
                            <div className="absolute inset-x-0 bottom-8 flex justify-center pointer-events-none select-none">
                                <span className="text-muted-foreground/20 text-sm font-bold uppercase tracking-[0.3em] border-b border-muted-foreground/10 pb-1 px-8">Sign Your Name Above</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <Button type="button" variant="ghost" size="sm" onClick={clearCanvas} disabled={isDrawingEmpty || uploading} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors">
                                <Eraser className="w-3.5 h-3.5 mr-1.5" /> Clear Canvas
                            </Button>
                            <Button type="button" onClick={handleConfirmDrawing} disabled={isDrawingEmpty || uploading} className="bg-brand-navy hover:bg-brand-navy/90 text-white shadow-xl font-bold px-8 rounded-lg transition-all active:scale-95 disabled:opacity-30 disabled:grayscale">
                                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                {uploading ? "SAVING…" : "CONFIRM SIGNATURE"}
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="upload" className="pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="border-2 border-dashed border-border/60 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-muted/20 hover:bg-muted/30 hover:border-brand-teal/40 transition-all group relative" style={{ height: "180px" }}>
                            <div className="p-3 rounded-full bg-background shadow-sm border border-border/50 text-muted-foreground group-hover:text-brand-teal transition-colors mb-3">
                                {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <UploadCloud className="w-6 h-6" />}
                            </div>
                            <p className="text-sm font-bold text-foreground">Upload signature image</p>
                            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">PNG (Transparent) or JPG, max 2MB</p>
                            <input type="file" accept="image/png,image/jpeg" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={uploading} />
                        </div>
                    </TabsContent>

                    <TabsContent value="mobile" className="pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <MobileSignQR
                            userId={userId}
                            onCaptured={handleMobileCaptured}
                            onCancel={() => setActiveTab("draw")}
                        />
                    </TabsContent>
                </Tabs>

                {currentSignatureUrl && (
                    <div className="flex flex-col gap-2 p-4 rounded-xl border border-border/50 bg-muted/10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                             <CheckCircle2 className="w-12 h-12 text-brand-teal" />
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                             <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">Active Signature on File</span>
                        </div>
                        <div 
                            className="w-full border border-border/40 rounded-lg p-4 flex items-center justify-center bg-white shadow-sm"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Crect width='4' height='4' fill='%23fff'/%3E%3Crect x='4' y='4' width='4' height='4' fill='%23fff'/%3E%3Crect x='4' y='0' width='4' height='4' fill='%23e5e7eb'/%3E%3Crect x='0' y='4' width='4' height='4' fill='%23e5e7eb'/%3E%3C/svg%3E")`,
                            }}
                        >
                            <Image 
                              src={currentSignatureUrl} 
                              alt="Current signature" 
                              width={200} 
                              height={40} 
                              unoptimized={currentSignatureUrl.startsWith('data:')}
                              className="h-10 object-contain drop-shadow-md" 
                            />
                        </div>
                    </div>
                )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
