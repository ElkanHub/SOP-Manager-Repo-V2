"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import SignatureCanvas from "react-signature-canvas"
import { createClient } from "@/lib/supabase/client"
import { AlertCircle, CheckCircle2, ChevronRight, Loader2, Sparkles, Upload, X, Eraser, UploadCloud } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

export function SignatureStep({ initialData, onNext }: any) {
    const [signatureUrl, setSignatureUrl] = useState<string | null>(initialData?.signature_url || null)
    const [initialsUrl, setInitialsUrl] = useState<string | null>(initialData?.initials_url || null)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [capturedSignature, setCapturedSignature] = useState(false)
    const [capturedInitials, setCapturedInitials] = useState(false)
    const [activeCaptureTab, setActiveCaptureTab] = useState<'signature' | 'initials'>('signature')

    const sigCanvas = useRef<any>(null)
    const [isDrawingEmpty, setIsDrawingEmpty] = useState(true)

    const supabase = createClient()

    // When the user has URLs already, mark as captured
    useEffect(() => {
        if (signatureUrl) setCapturedSignature(true)
        if (initialsUrl) setCapturedInitials(true)
    }, [signatureUrl, initialsUrl])

    const clearCanvas = () => {
        sigCanvas.current?.clear()
        setIsDrawingEmpty(true)
    }

    const uploadFile = async (file: File | Blob, type: 'signature' | 'initials') => {
        try {
            setUploading(true)
            setError(null)

            const fileName = type === 'signature' ? 'signature.png' : 'initials.png'
            const filePath = `${initialData.id}/${fileName}`

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('signatures')
                .upload(filePath, file, {
                    upsert: true,
                    contentType: 'image/png'
                })

            if (uploadError) throw uploadError

            // Create signed URL
            const { data, error: signedError } = await supabase.storage
                .from('signatures')
                .createSignedUrl(filePath, 3600)

            if (signedError || !data?.signedUrl) throw new Error("Failed to generate preview URL")

            const bustedUrl = `${data.signedUrl}&t=${Date.now()}`

            // Update profile
            const updateObj = type === 'signature' 
                ? { signature_url: data.signedUrl.split('?')[0] }
                : { initials_url: data.signedUrl.split('?')[0] }

            const { error: updateError } = await supabase
                .from('profiles')
                .update(updateObj)
                .eq('id', initialData.id)

            if (updateError) throw updateError

            if (type === 'signature') {
                setSignatureUrl(bustedUrl)
                setCapturedSignature(true)
                if (!capturedInitials) setActiveCaptureTab('initials')
            } else {
                setInitialsUrl(bustedUrl)
                setCapturedInitials(true)
            }

        } catch (error: any) {
            setError(error.message || `Failed to upload ${type}. Please try again.`)
        } finally {
            setUploading(false)
        }
    }

    const handleConfirmDrawing = async () => {
        if (sigCanvas.current?.isEmpty()) {
            setError(`Please provide your ${activeCaptureTab} first.`)
            return
        }

        const canvas = sigCanvas.current?.getTrimmedCanvas()
        canvas.toBlob((blob: Blob | null) => {
            if (blob) {
                uploadFile(blob, activeCaptureTab)
            }
        }, 'image/png')
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return
        const file = e.target.files[0]
        if (file.size > 2 * 1024 * 1024) {
            setError("File size must be less than 2MB.")
            return
        }
        if (!file.type.startsWith('image/')) {
            setError("Only image files are allowed.")
            return
        }
        uploadFile(file, activeCaptureTab)
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

            <div className="flex flex-col gap-4">
                <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit mx-auto">
                    <button 
                        onClick={() => setActiveCaptureTab('signature')}
                        className={cn(
                            "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                            activeCaptureTab === 'signature' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Full Signature
                    </button>
                    <button 
                        onClick={() => setActiveCaptureTab('initials')}
                        className={cn(
                            "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                            activeCaptureTab === 'initials' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Initials
                    </button>
                </div>

                {(activeCaptureTab === 'signature' ? !capturedSignature : !capturedInitials) ? (
                    <Tabs defaultValue="draw" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="draw">Draw {activeCaptureTab === 'signature' ? 'Signature' : 'Initials'}</TabsTrigger>
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
                                    <span className="text-2xl font-sans text-slate-300 pointer-events-none select-none w-3/4 border-b-2 border-slate-300">
                                        {activeCaptureTab === 'signature' ? 'Sign here' : 'Initials here'}
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
                                    {uploading ? "Saving..." : `Confirm & Save ${activeCaptureTab === 'signature' ? 'Signature' : 'Initials'}`}
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
                                <h3 className="font-semibold text-sm">Upload {activeCaptureTab} image</h3>
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
                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-semibold text-green-800">
                            {activeCaptureTab === 'signature' ? 'Full Signature' : 'Initials'} Captured
                        </h3>

                        <div 
                            className="bg-white border rounded p-4 inline-block mx-auto"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Crect width='4' height='4' fill='%23fff'/%3E%3Crect x='4' y='4' width='4' height='4' fill='%23fff'/%3E%3Crect x='4' y='0' width='4' height='4' fill='%23e5e7eb'/%3E%3Crect x='0' y='4' width='4' height='4' fill='%23e5e7eb'/%3E%3C/svg%3E")`,
                            }}
                        >
                            <Image 
                                src={activeCaptureTab === 'signature' ? signatureUrl! : initialsUrl!} 
                                alt={`Your ${activeCaptureTab}`} 
                                width={180} 
                                height={60} 
                                unoptimized={activeCaptureTab === 'signature' ? signatureUrl!.startsWith('data:') : initialsUrl!.startsWith('data:')}
                                className="max-w-[180px] max-h-[60px] object-contain" 
                            />
                        </div>

                        <div className="pt-2">
                            <Button 
                                variant="ghost" 
                                onClick={() => { 
                                    if (activeCaptureTab === 'signature') {
                                        setCapturedSignature(false); setSignatureUrl(null); 
                                    } else {
                                        setCapturedInitials(false); setInitialsUrl(null);
                                    }
                                }} 
                                size="sm" 
                                className="text-xs text-slate-600 hover:text-slate-900"
                            >
                                Clear and redraw
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Preview of both if available */}
            {(signatureUrl || initialsUrl) && (
                <div className="flex justify-center gap-4 py-4 px-6 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Signature</span>
                        <div className="h-10 w-24 bg-white border border-slate-200 rounded flex items-center justify-center p-1">
                            {signatureUrl ? (
                                <Image src={signatureUrl} alt="Signature" width={80} height={30} className="object-contain h-full" />
                            ) : (
                                <span className="text-[9px] text-slate-300 italic italic">Missing</span>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Initials</span>
                        <div className="h-10 w-24 bg-white border border-slate-200 rounded flex items-center justify-center p-1">
                            {initialsUrl ? (
                                <Image src={initialsUrl} alt="Initials" width={80} height={30} className="object-contain h-full" />
                            ) : (
                                <span className="text-[9px] text-slate-300 italic italic">Missing</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between pt-6 border-t mt-6">
                <Button variant="outline" onClick={() => {/* Handle back conceptually or wait, spec has no back button. */ }}>
                    Wait, no back button necessary
                </Button>
                <div className="flex-1 flex justify-end">
                    <Button 
                        onClick={onNext} 
                        disabled={!signatureUrl || !initialsUrl || uploading} 
                        size="lg"
                        className="bg-brand-navy hover:bg-brand-navy/90"
                    >
                        {(!signatureUrl || !initialsUrl) ? "Capture both to continue" : "Continue"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
