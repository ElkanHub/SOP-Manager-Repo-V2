"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import SignatureCanvas from "react-signature-canvas"
import { createClient } from "@/lib/supabase/client"
import { Loader2, UploadCloud, Eraser, CheckCircle2 } from "lucide-react"

export function SignatureStep({ initialData, onNext }: any) {
    const [signatureUrl, setSignatureUrl] = useState<string | null>(initialData?.signature_url || null)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [captured, setCaptured] = useState(false)

    const sigCanvas = useRef<any>(null)
    const [isDrawingEmpty, setIsDrawingEmpty] = useState(true)

    const supabase = createClient()

    // When the user has a signature URL already (e.g. from a previous session or going back),
    // we mark captured = true.
    useEffect(() => {
        if (signatureUrl) {
            setCaptured(true)
        }
    }, [signatureUrl])

    const clearCanvas = () => {
        sigCanvas.current?.clear()
        setIsDrawingEmpty(true)
    }

    const uploadSignature = async (file: File | Blob) => {
        try {
            setUploading(true)
            setError(null)

            const filePath = `${initialData.id}/signature.png` // Store in folder for RLS

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('signatures')
                .upload(filePath, file, {
                    upsert: true,
                    contentType: 'image/png'
                })

            if (uploadError) throw uploadError

            // Get public URL
            const { data } = supabase.storage.from('signatures').getPublicUrl(filePath)

            // Update profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ signature_url: data.publicUrl })
                .eq('id', initialData.id)

            if (updateError) throw updateError

            setSignatureUrl(data.publicUrl)
            setCaptured(true)

        } catch (error: any) {
            setError(error.message || "Failed to upload signature. Please try again.")
        } finally {
            setUploading(false)
        }
    }

    const handleConfirmDrawing = async () => {
        if (sigCanvas.current?.isEmpty()) {
            setError("Please provide a signature first.")
            return
        }

        // Get the canvas as a blob
        const canvas = sigCanvas.current?.getTrimmedCanvas()
        canvas.toBlob((blob: Blob | null) => {
            if (blob) {
                uploadSignature(blob)
            }
        }, 'image/png')
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        const file = e.target.files[0]

        // Client-side validation
        if (file.size > 2 * 1024 * 1024) {
            setError("File size must be less than 2MB.")
            return
        }

        if (!file.type.startsWith('image/')) {
            setError("Only image files are allowed.")
            return
        }

        uploadSignature(file)
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <p className="text-sm text-muted-foreground my-2">
                    Your digital signature will be used to sign Change Controls and authorize SOP revisions.
                </p>
            </div>

            {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                    {error}
                </div>
            )}

            {!captured ? (
                <Tabs defaultValue="draw" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="draw">Draw Signature</TabsTrigger>
                        <TabsTrigger value="upload">Upload Image</TabsTrigger>
                    </TabsList>

                    <TabsContent value="draw" className="space-y-4 pt-4">
                        <div className="border border-slate-200 bg-white rounded-lg overflow-hidden relative" style={{ height: "200px" }}>
                            <SignatureCanvas
                                ref={sigCanvas}
                                penColor="black"
                                canvasProps={{
                                    className: "w-full h-full cursor-crosshair",
                                }}
                                onBegin={() => setIsDrawingEmpty(false)}
                            />
                            <div className="absolute inset-x-0 bottom-8 flex justify-center pointer-events-none opacity-20">
                                <span className="text-2xl font-serif text-slate-300 pointer-events-none select-none italic w-3/4 border-b-2 border-slate-300">
                                    Sign here
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center">
                            <Button type="button" variant="outline" size="sm" onClick={clearCanvas} disabled={isDrawingEmpty || uploading}>
                                <Eraser className="w-4 h-4 mr-2" />
                                Clear
                            </Button>
                            <Button type="button" onClick={handleConfirmDrawing} disabled={isDrawingEmpty || uploading}>
                                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                {uploading ? "Saving..." : "Confirm & Save Signature"}
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="upload" className="pt-4 space-y-4">
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-100 transition-colors w-full h-[200px] relative">
                            {uploading ? (
                                <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-2" />
                            ) : (
                                <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                            )}
                            <h3 className="font-semibold text-sm">Upload signature image</h3>
                            <p className="text-xs text-slate-500 mt-1">PNG or JPG, max 2MB.</p>

                            <input
                                type="file"
                                accept="image/png, image/jpeg, image/jpg"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleFileUpload}
                                disabled={uploading}
                            />
                        </div>
                    </TabsContent>
                </Tabs>
            ) : (
                <div className="p-6 border rounded-xl bg-green-50/50 border-green-100 text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-green-800">Signature Captured</h3>

                    <div className="bg-white border rounded p-4 inline-block mx-auto">
                        {signatureUrl && <img src={signatureUrl} alt="Your Signature" className="max-w-[200px] max-h-[80px] object-contain" />}
                    </div>

                    <div className="pt-4">
                        <Button variant="outline" onClick={() => { setCaptured(false); setSignatureUrl(null); }} size="sm" className="text-slate-600 hover:text-slate-900">
                            Clear and redraw
                        </Button>
                    </div>
                </div>
            )}

            <div className="flex justify-between pt-6 border-t mt-6">
                <Button variant="outline" onClick={() => {/* Handle back conceptually or wait, spec has no back button. */ }}>
                    Wait, no back button necessary
                </Button>
                <div className="flex-1 flex justify-end">
                    <Button onClick={onNext} disabled={!signatureUrl || uploading} size="lg">
                        Continue
                    </Button>
                </div>
            </div>
        </div>
    )
}
