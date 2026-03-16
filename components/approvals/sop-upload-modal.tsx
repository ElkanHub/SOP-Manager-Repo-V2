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
    const [fileUrl, setFileUrl] = useState<string | null>(null)
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

            setFileUrl(data.fileUrl)
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
                fileUrl: fileUrl!,
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
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-center">Submitted for QA Review</DialogTitle>
                        <DialogDescription className="text-center">
                            You&apos;ll be notified when QA responds.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center py-4">
                        <CheckCircle2 className="h-16 w-16 text-green-500" />
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Submit SOP</DialogTitle>
                    <DialogDescription>
                        Step {step} of 3
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4">
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <Label className="text-base">Upload SOP Document</Label>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Upload a .docx file (max 25MB)
                                </p>
                            </div>

                            <div
                                className={`
                                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                                    transition-colors
                                    ${file 
                                        ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-950/30' 
                                        : 'border-input hover:border-muted-foreground dark:hover:border-muted-foreground'}
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
                                    <div className="flex flex-col items-center">
                                        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground">Uploading...</p>
                                    </div>
                                ) : file ? (
                                    <div className="flex flex-col items-center">
                                        <FileText className="h-10 w-10 text-green-500 mb-2" />
                                        <p className="font-medium">{file.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                        <Button 
                                            variant="link" 
                                            size="sm" 
                                            className="mt-2 text-muted-foreground"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setFile(null)
                                                setFileUrl(null)
                                            }}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground">
                                            Click to upload or drag and drop
                                        </p>
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
                        <div className="space-y-6">
                            <div>
                                <Label className="text-base">Submission Type</Label>
                                <RadioGroup
                                    value={sopType}
                                    onValueChange={(v) => setSopType(v as 'new' | 'update')}
                                    className="flex gap-4 mt-2"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="new" id="type-new" />
                                        <Label htmlFor="type-new" className="cursor-pointer">New SOP</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="update" id="type-update" />
                                        <Label htmlFor="type-update" className="cursor-pointer">Update Existing</Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {sopType === 'new' ? (
                                <>
                                    <div>
                                        <Label htmlFor="sop-number">SOP Number</Label>
                                        <Input
                                            id="sop-number"
                                            value={sopNumber}
                                            onChange={(e) => setSopNumber(e.target.value)}
                                            placeholder="e.g., SOP-001"
                                            className="mt-1"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="title">Title</Label>
                                        <Input
                                            id="title"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="e.g., Operating Procedure for X"
                                            className="mt-1"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <Label>Select SOP to Update</Label>
                                    <Select value={selectedSopId} onValueChange={handleSelectExistingSOP}>
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Search for an SOP..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {existingSops
                                                .filter(s => s.status !== 'pending_cc')
                                                .map(sop => (
                                                    <SelectItem key={sop.id} value={sop.id}>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono">{sop.sop_number}</span>
                                                            <span className="text-muted-foreground">- {sop.title}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                    
                                    {selectedSopId && (
                                        <div className="mt-2 text-sm">
                                            <span className="text-muted-foreground">Updating: </span>
                                            <Badge variant="outline">{sopNumber}</Badge>
                                            <span className="ml-2">{title}</span>
                                        </div>
                                    )}

                                    {lockedError && (
                                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm mt-2">
                                            <AlertCircle className="h-4 w-4" />
                                            {lockedError}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <Label htmlFor="primary-dept">Primary Department</Label>
                                <Select value={primaryDept} onValueChange={(v) => setPrimaryDept(v || user.department)}>
                                    <SelectTrigger id="primary-dept" className="mt-1">
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

                            <div>
                                <Label>Secondary Departments (Optional)</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {departments
                                        .filter(d => d.name !== primaryDept)
                                        .map(dept => (
                                            <Button
                                                key={dept.name}
                                                variant={secondaryDepts.includes(dept.name) ? "default" : "outline"}
                                                size="sm"
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
                        <div className="space-y-6">
                            <div>
                                <Label htmlFor="notes">Notes to QA (Optional)</Label>
                                <Textarea
                                    id="notes"
                                    value={notesToQa}
                                    onChange={(e) => setNotesToQa(e.target.value)}
                                    placeholder="Provide any additional context or notes for the QA reviewer..."
                                    maxLength={500}
                                    className="mt-1"
                                />
                                <p className="text-xs text-muted-foreground mt-1 text-right">
                                    {notesToQa.length}/500
                                </p>
                            </div>

                            <div className="bg-muted dark:bg-card rounded-lg p-4 space-y-2">
                                <h4 className="font-medium text-sm">Summary</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <span className="text-muted-foreground">Type:</span>
                                    <span>{sopType === 'new' ? 'New SOP' : 'Update'}</span>
                                    
                                    <span className="text-muted-foreground">SOP Number:</span>
                                    <span className="font-mono">{sopNumber}</span>
                                    
                                    <span className="text-muted-foreground">Title:</span>
                                    <span>{title}</span>
                                    
                                    <span className="text-muted-foreground">Department:</span>
                                    <span>{primaryDept}</span>
                                    
                                    {secondaryDepts.length > 0 && (
                                        <>
                                            <span className="text-muted-foreground">Also for:</span>
                                            <span>{secondaryDepts.join(', ')}</span>
                                        </>
                                    )}
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

                <DialogFooter className="sm:justify-between">
                    <div>
                        {step > 1 && (
                            <Button variant="outline" onClick={() => setStep(step - 1)}>
                                Back
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {step < 3 ? (
                            <Button 
                                onClick={() => setStep(step + 1)}
                                disabled={step === 1 ? !fileUrl : !canProceedStep2()}
                            >
                                Next
                            </Button>
                        ) : (
                            <Button 
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="bg-brand-teal hover:bg-teal-600"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    'Submit for QA Review'
                                )}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
