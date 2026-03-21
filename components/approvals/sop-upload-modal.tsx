"use client"

import { useState, useRef, useEffect } from "react"
import { Upload, FileText, CheckCircle2, Loader2, AlertCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { submitSopForApproval } from "@/actions/sop"
import { Profile, Department, SopRecord } from "@/types/app.types"

interface SopUploadModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    user: Profile
    departments: Department[]
    existingSops?: SopRecord[]
    onSuccess?: () => void
}

export function SopUploadModal({
    open,
    onOpenChange,
    user,
    departments,
    existingSops = [],
    onSuccess,
}: SopUploadModalProps) {
    const [step, setStep] = useState(1)
    const [file, setFile] = useState<File | null>(null)
    const [fileUrl, setFileUrl] = useState<string | null>(null)   // signed URL for preview only
    const [filePath, setFilePath] = useState<string | null>(null) // canonical storage path → saved to DB
    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)

    const [sopType, setSopType] = useState<'new' | 'update'>('new')
    const [sopNumber, setSopNumber] = useState('')
    const [title, setTitle] = useState('')
    const [primaryDept, setPrimaryDept] = useState(user.department)
    const [secondaryDepts, setSecondaryDepts] = useState<string[]>([])
    const [selectedSopId, setSelectedSopId] = useState<string>('')
    const [lockedError, setLockedError] = useState<string | null>(null)

    const [notesToQa, setNotesToQa] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [submitSuccess, setSubmitSuccess] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!open) {
            setStep(1)
            setFile(null)
            setFileUrl(null)
            setFilePath(null)
            setUploadError(null)
            setSopType('new')
            setSopNumber('')
            setTitle('')
            setPrimaryDept(user.department)
            setSecondaryDepts([])
            setSelectedSopId('')
            setLockedError(null)
            setNotesToQa('')
            setSubmitError(null)
            setSubmitSuccess(false)
        }
    }, [open, user.department])

    const validateFile = (f: File): string | null => {
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
        if (!allowedTypes.includes(f.type)) {
            return 'Invalid file type. Only .docx files are allowed.'
        }
        if (!f.name.toLowerCase().endsWith('.docx')) {
            return 'Invalid file extension. Only .docx files are allowed.'
        }
        if (f.size > 25 * 1024 * 1024) {
            return 'File too large. Maximum size is 25MB.'
        }
        return null
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        const error = validateFile(selectedFile)
        if (error) {
            setUploadError(error)
            return
        }

        setUploadError(null)
        setFile(selectedFile)

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', selectedFile)

            const response = await fetch('/api/storage/sop-upload', {
                method: 'POST',
                body: formData,
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to upload file')
            }

            setFileUrl(data.fileUrl)   // signed URL — for preview only
            setFilePath(data.filePath) // storage path — stored in DB
        } catch (err: any) {
            setUploadError(err.message)
            setFile(null)
        } finally {
            setUploading(false)
        }
    }

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile) {
            if (fileInputRef.current) {
                const dt = new DataTransfer()
                dt.items.add(droppedFile)
                fileInputRef.current.files = dt.files
                await handleFileChange({ target: { files: dt.files } } as any)
            }
        }
    }

    const handleSelectExistingSOP = (value: string | null) => {
        const sopId = value || ''
        setSelectedSopId(sopId)
        setLockedError(null)

        if (sopId) {
            const sop = existingSops.find(s => s.id === sopId)
            if (sop) {
                if (sop.locked) {
                    setLockedError('A Change Control is currently in progress for this SOP. Updates cannot be submitted until it is complete.')
                }
                setSopNumber(sop.sop_number)
                setTitle(sop.title)
                setPrimaryDept(sop.department)
            }
        }
    }

    const canProceedStep2 = () => {
        if (!fileUrl) return false
        if (sopType === 'new') {
            return sopNumber.trim() !== '' && title.trim() !== ''
        }
        return selectedSopId !== '' && !lockedError
    }

    const handleSubmit = async () => {
        setSubmitting(true)
        setSubmitError(null)

        try {
            const result = await submitSopForApproval({
                fileUrl: filePath!,
                type: sopType,
                sopId: sopType === 'update' ? selectedSopId : undefined,
                sopNumber: sopNumber.trim(),
                title: title.trim(),
                department: primaryDept,
                secondaryDepartments: secondaryDepts,
                notesToQa: notesToQa.trim() || undefined,
            })

            if (!result.success) {
                setSubmitError(result.error)
                return
            }

            setSubmitSuccess(true)
            onSuccess?.()
            setTimeout(() => {
                onOpenChange(false)
            }, 2000)
        } catch (err: any) {
            setSubmitError(err.message || 'Failed to submit SOP')
        } finally {
            setSubmitting(false)
        }
    }

    if (submitSuccess) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/40 shadow-2xl">
                    <div className="h-2 bg-gradient-to-r from-green-400 to-brand-teal" />
                    <div className="p-8 flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6 animate-in zoom-in duration-500">
                             <CheckCircle2 className="h-10 w-10 text-green-500" />
                        </div>
                        <DialogTitle className="text-2xl font-bold mb-2">Submitted for QA Review</DialogTitle>
                        <DialogDescription className="text-muted-foreground max-w-[280px]">
                            Your SOP has been successfully queued. You&apos;ll be notified once the QA team has completed their review.
                        </DialogDescription>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-border/40 shadow-2xl bg-gradient-to-b from-background to-background/98">
                <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-brand-teal/10 via-brand-navy/5 to-transparent border-b border-border/50 relative">
                    <div className="space-y-1">
                        <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">Submit SOP Document</DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase tracking-widest text-brand-teal/80">
                            Regulatory Compliance Submission
                        </DialogDescription>
                    </div>

                    {/* Progress Indicator */}
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-muted/30">
                        <div 
                           className="h-full bg-brand-teal transition-all duration-500 ease-in-out" 
                           style={{ width: `${(step / 3) * 100}%` }}
                        />
                    </div>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground/40 font-mono">
                         0{step} / 03
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Upload SOP Document</Label>
                                <p className="text-[11px] text-muted-foreground/70 ml-1">
                                    Microsoft Word files (.docx) up to 25MB
                                </p>
                            </div>

                            <div
                                className={`
                                    relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer
                                    transition-all duration-300 group
                                    ${file
                                        ? 'border-green-500/50 bg-green-500/5 shadow-inner'
                                        : 'border-border/60 bg-muted/20 hover:bg-muted/30 hover:border-brand-teal/40 hover:shadow-md'}
                                `}
                                onClick={() => fileInputRef.current?.click()}
                                onDrop={handleDrop}
                                onDragOver={(e) => e.preventDefault()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".docx"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />

                                {uploading ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="p-4 rounded-full bg-background shadow-sm border border-border/50">
                                            <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
                                        </div>
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Encrypting & Uploading...</p>
                                    </div>
                                ) : file ? (
                                    <div className="flex flex-col items-center gap-3 scale-in-center">
                                        <div className="p-4 rounded-full bg-green-500/10 text-green-600 shadow-sm border border-green-500/20">
                                            <FileText className="h-8 w-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-foreground max-w-[300px] truncate">{file.name}</p>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB · READY
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setFile(null)
                                                setFileUrl(null)
                                            }}
                                        >
                                            <X className="h-3 w-3 mr-1" /> Remove File
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3 transition-transform group-hover:scale-105">
                                        <div className="p-4 rounded-full bg-background shadow-sm border border-border/50 text-muted-foreground group-hover:text-brand-teal transition-colors">
                                            <Upload className="h-8 w-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-foreground">Drop document here</p>
                                            <p className="text-[11px] text-muted-foreground/60 uppercase tracking-tight">or click to browse filesystem</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {uploadError && (
                                <div className="flex items-center gap-2 text-destructive text-sm">
                                    <AlertCircle className="h-4 w-4" />
                                    {uploadError}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="space-y-3">
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Submission Type</Label>
                                <RadioGroup
                                    value={sopType}
                                    onValueChange={(v) => setSopType(v as 'new' | 'update')}
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2 p-3 rounded-xl border border-border/50 bg-muted/10 flex-1 hover:bg-muted/20 cursor-pointer transition-colors">
                                        <RadioGroupItem value="new" id="type-new" className="text-brand-teal" />
                                        <Label htmlFor="type-new" className="cursor-pointer font-bold text-sm">New SOP</Label>
                                    </div>
                                    <div className="flex items-center space-x-2 p-3 rounded-xl border border-border/50 bg-muted/10 flex-1 hover:bg-muted/20 cursor-pointer transition-colors">
                                        <RadioGroupItem value="update" id="type-update" className="text-brand-teal" />
                                        <Label htmlFor="type-update" className="cursor-pointer font-bold text-sm">Update Existing</Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {sopType === 'new' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="sop-number" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">SOP Number</Label>
                                        <Input
                                            id="sop-number"
                                            value={sopNumber}
                                            onChange={(e) => setSopNumber(e.target.value)}
                                            placeholder="e.g., SOP-001"
                                            className="bg-muted/30 border-border/50 focus:border-brand-teal/50 focus:ring-brand-teal/20"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="title" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Document Title</Label>
                                        <Input
                                            id="title"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Core Operational Procedure..."
                                            className="bg-muted/30 border-border/50 focus:border-brand-teal/50 focus:ring-brand-teal/20"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Target Document For Update</Label>
                                    <Select value={selectedSopId} onValueChange={handleSelectExistingSOP}>
                                        <SelectTrigger className="bg-muted/30 border-border/50 focus:border-brand-teal/50 focus:ring-brand-teal/20">
                                            <SelectValue placeholder="Search SOP Registry..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {existingSops
                                                .filter(s => s.status !== 'pending_cc')
                                                .map(sop => (
                                                    <SelectItem key={sop.id} value={sop.id}>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold font-mono text-xs">{sop.sop_number}</span>
                                                            <span className="text-muted-foreground text-xs opacity-70">- {sop.title}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>

                                    {selectedSopId && (
                                        <div className="mt-2 p-3 rounded-lg bg-brand-teal/5 border border-brand-teal/20 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="default" className="bg-brand-teal text-[10px] font-bold">{sopNumber}</Badge>
                                                <span className="text-sm font-semibold truncate max-w-[300px]">{title}</span>
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-teal">Selected</span>
                                        </div>
                                    )}

                                    {lockedError && (
                                        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs mt-2">
                                            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                            <p className="font-medium leading-tight">{lockedError}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="primary-dept" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Primary Department</Label>
                                <Select value={primaryDept} onValueChange={(v) => setPrimaryDept(v || user.department)}>
                                    <SelectTrigger id="primary-dept" className="bg-muted/30 border-border/50 focus:border-brand-teal/50 focus:ring-brand-teal/20">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map(dept => (
                                            <SelectItem key={dept.name} value={dept.name}>
                                                {dept.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Secondary Department Access</Label>
                                <div className="flex flex-wrap gap-2 p-3 rounded-2xl border border-dashed border-border/50 bg-muted/10">
                                    {departments
                                        .filter(d => d.name !== primaryDept)
                                        .map(dept => (
                                            <Button
                                                key={dept.name}
                                                variant={secondaryDepts.includes(dept.name) ? "default" : "outline"}
                                                size="sm"
                                                className={`h-7 text-[10px] font-bold uppercase tracking-tight rounded-md transition-all ${
                                                    secondaryDepts.includes(dept.name) 
                                                        ? 'bg-brand-teal hover:bg-teal-600' 
                                                        : 'hover:bg-brand-teal/5 hover:border-brand-teal/30'
                                                }`}
                                                onClick={() => {
                                                    setSecondaryDepts(prev =>
                                                        prev.includes(dept.name)
                                                            ? prev.filter(d => d !== dept.name)
                                                            : [...prev, dept.name]
                                                    )
                                                }}
                                            >
                                                {dept.name}
                                            </Button>
                                        ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="space-y-2">
                                <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Notes to QA (Optional)</Label>
                                <Textarea
                                    id="notes"
                                    value={notesToQa}
                                    onChange={(e) => setNotesToQa(e.target.value)}
                                    placeholder="Provide any additional context or notes for the QA reviewer..."
                                    maxLength={500}
                                    className="bg-muted/30 border-border/50 focus:border-brand-teal/50 focus:ring-brand-teal/20 min-h-[120px]"
                                />
                                <p className="text-[10px] font-bold text-muted-foreground tracking-widest text-right uppercase">
                                    {notesToQa.length} / 500 characters
                                </p>
                            </div>

                            <div className="bg-brand-navy/5 dark:bg-card border border-brand-navy/10 rounded-2xl p-6 space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-navy/60 dark:text-muted-foreground/60 border-b border-brand-navy/10 pb-2">Submission Summary</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Type</p>
                                        <p className="text-sm font-bold text-foreground capitalize">{sopType}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Document ID</p>
                                        <p className="text-sm font-mono font-bold text-brand-teal">{sopNumber}</p>
                                    </div>
                                    <div className="space-y-1 sm:col-span-2">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Title</p>
                                        <p className="text-sm font-bold text-foreground leading-tight">{title}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Department</p>
                                        <p className="text-sm font-bold text-foreground">{primaryDept}</p>
                                    </div>
                                </div>
                            </div>

                            {submitError && (
                                <div className="flex items-center gap-2 text-destructive text-sm">
                                    <AlertCircle className="h-4 w-4" />
                                    {submitError}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 pt-2 border-t border-border/40 bg-muted/10 sm:justify-between items-center gap-4">
                    <div>
                        {step > 1 && (
                            <Button 
                                variant="ghost" 
                                onClick={() => setStep(step - 1)}
                                className="text-muted-foreground hover:text-foreground font-bold text-xs uppercase tracking-widest"
                            >
                                Back
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {step < 3 ? (
                            <Button
                                onClick={() => setStep(step + 1)}
                                disabled={step === 1 ? !fileUrl : !canProceedStep2()}
                                className="bg-brand-navy hover:bg-brand-navy/90 px-8 rounded-lg shadow-xl font-bold text-white transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
                            >
                                Continue
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="bg-brand-teal hover:bg-teal-600 px-8 rounded-lg shadow-xl font-bold text-white transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    'Submit for QA'
                                )}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
