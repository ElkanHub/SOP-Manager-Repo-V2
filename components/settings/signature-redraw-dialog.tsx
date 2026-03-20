"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Eraser, UploadCloud, CheckCircle2 } from "lucide-react"
import SignatureCanvas from "react-signature-canvas"
import { createClient } from "@/lib/supabase/client"
import { redrawSignature } from "@/actions/settings"

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

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Re-draw Signature</DialogTitle>
                </DialogHeader>

                {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>
                )}

                <Tabs defaultValue="draw" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="draw">Draw</TabsTrigger>
                        <TabsTrigger value="upload">Upload</TabsTrigger>
                    </TabsList>

                    <TabsContent value="draw" className="space-y-3 pt-3">
                        <div className="border border-border rounded-lg overflow-hidden relative bg-background" style={{ height: "180px" }}>
                            <SignatureCanvas
                                ref={sigCanvas}
                                penColor="currentColor"
                                canvasProps={{ className: "w-full h-full cursor-crosshair" }}
                                onBegin={() => setIsDrawingEmpty(false)}
                            />
                            <div className="absolute inset-x-0 bottom-6 flex justify-center pointer-events-none">
                                <span className="text-slate-200 text-xl w-2/3 border-b border-slate-200 dark:border-slate-700 text-center">Sign here</span>
                            </div>
                        </div>
                        <div className="flex justify-between">
                            <Button type="button" variant="outline" size="sm" onClick={clearCanvas} disabled={isDrawingEmpty || uploading}>
                                <Eraser className="w-4 h-4 mr-1" /> Clear
                            </Button>
                            <Button type="button" onClick={handleConfirmDrawing} disabled={isDrawingEmpty || uploading}>
                                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                {uploading ? "Saving…" : "Confirm Signature"}
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="upload" className="pt-3">
                        <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center bg-muted hover:bg-muted/80 transition-colors relative" style={{ height: "180px" }}>
                            {uploading ? <Loader2 className="w-8 h-8 text-muted-foreground animate-spin mb-2" /> : <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />}
                            <p className="text-sm font-medium">Upload signature image</p>
                            <p className="text-xs text-muted-foreground mt-1">PNG or JPG, max 2MB</p>
                            <input type="file" accept="image/png,image/jpeg" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={uploading} />
                        </div>
                    </TabsContent>
                </Tabs>

                {currentSignatureUrl && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground border rounded p-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        <span>Current signature on file</span>
                        <div 
                            className="ml-auto border rounded px-2 flex items-center justify-center bg-white"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Crect width='4' height='4' fill='%23fff'/%3E%3Crect x='4' y='4' width='4' height='4' fill='%23fff'/%3E%3Crect x='4' y='0' width='4' height='4' fill='%23e5e7eb'/%3E%3Crect x='0' y='4' width='4' height='4' fill='%23e5e7eb'/%3E%3C/svg%3E")`,
                            }}
                        >
                            <img src={currentSignatureUrl} alt="Current signature" className="h-8 object-contain" />
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
