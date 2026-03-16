"use client"

import { useState, useRef, useEffect } from "react"
import { Upload, CheckCircle2, Loader2, AlertCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { submitEquipment } from "@/actions/equipment"
import { Profile, Department } from "@/types/app.types"

interface AddEquipmentModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    departments: Department[]
    currentUser: Profile
    assignableUsers: any[]
}

export function AddEquipmentModal({
    open,
    onOpenChange,
    departments,
    currentUser,
    assignableUsers,
}: AddEquipmentModalProps) {
    const [step, setStep] = useState(1)
    const [assetId, setAssetId] = useState('')
    const [name, setName] = useState('')
    const [primaryDept, setPrimaryDept] = useState(currentUser.department)
    const [secondaryDepts, setSecondaryDepts] = useState<string[]>([])
    const [serialNumber, setSerialNumber] = useState('')
    const [model, setModel] = useState('')
    const [photoUrl, setPhotoUrl] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
    
    const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom'>('monthly')
    const [customDays, setCustomDays] = useState('')
    const [lastServiced, setLastServiced] = useState('')
    const [linkedSopId, setLinkedSopId] = useState('')
    const [initialAssigneeId, setInitialAssigneeId] = useState('')
    
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [submitSuccess, setSubmitSuccess] = useState(false)

    const photoInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!open) {
            setStep(1)
            setAssetId('')
            setName('')
            setPrimaryDept(currentUser.department)
            setSecondaryDepts([])
            setSerialNumber('')
            setModel('')
            setPhotoUrl(null)
            setFrequency('monthly')
            setCustomDays('')
            setLastServiced('')
            setLinkedSopId('')
            setInitialAssigneeId('')
            setSubmitError(null)
            setSubmitSuccess(false)
        }
    }, [open, currentUser.department])

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            setSubmitError('Please upload an image file')
            return
        }

        if (file.size > 2 * 1024 * 1024) {
            setSubmitError('File too large. Max 2MB.')
            return
        }

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/storage/equipment-photo', {
                method: 'POST',
                body: formData,
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to upload')
            }

            setPhotoUrl(data.fileUrl)
        } catch (err: any) {
            setSubmitError(err.message)
        } finally {
            setUploading(false)
        }
    }

    const canProceedStep2 = () => {
        return assetId.trim() !== '' && name.trim() !== ''
    }

    const canProceedStep3 = () => {
        return frequency && lastServiced && initialAssigneeId
    }

    const handleSubmit = async () => {
        setSubmitting(true)
        setSubmitError(null)

        try {
            const result = await submitEquipment({
                assetId: assetId.trim(),
                name: name.trim(),
                department: primaryDept,
                secondaryDepartments: secondaryDepts,
                serialNumber: serialNumber.trim() || undefined,
                model: model.trim() || undefined,
                photoUrl: photoUrl || undefined,
                frequency,
                customDays: frequency === 'custom' ? parseInt(customDays) : undefined,
                lastServiced: lastServiced,
                linkedSopId: linkedSopId || undefined,
                initialAssigneeId,
            })

            if (!result.success) {
                setSubmitError(result.error)
                return
            }

            setSubmitSuccess(true)
            setTimeout(() => {
                onOpenChange(false)
            }, 2000)
        } catch (err: any) {
            setSubmitError(err.message || 'Failed to submit equipment')
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
                            Equipment will be active once approved by QA.
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
                    <DialogTitle>Add Equipment</DialogTitle>
                    <DialogDescription>
                        Step {step} of 3
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4">
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <Label htmlFor="asset-id">Asset ID <span className="text-destructive">*</span></Label>
                                <Input
                                    id="asset-id"
                                    value={assetId}
                                    onChange={(e) => setAssetId(e.target.value)}
                                    placeholder="e.g., EQ-001"
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Forklift #1"
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="serial-number">Serial Number</Label>
                                <Input
                                    id="serial-number"
                                    value={serialNumber}
                                    onChange={(e) => setSerialNumber(e.target.value)}
                                    placeholder="Optional"
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="model">Model</Label>
                                <Input
                                    id="model"
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    placeholder="Optional"
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label>Primary Department</Label>
                                <Select value={primaryDept} onValueChange={(v) => setPrimaryDept(v || currentUser.department)}>
                                    <SelectTrigger className="mt-1">
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

                            <div>
                                <Label>Photo (Optional)</Label>
                                <div className="mt-1">
                                    <input
                                        ref={photoInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handlePhotoUpload}
                                    />
                                    {photoUrl ? (
                                        <div className="relative inline-block">
                                            <img 
                                                src={photoUrl} 
                                                alt="Equipment" 
                                                className="h-32 w-32 object-cover rounded-lg border"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="absolute -top-2 -right-2 h-6 w-6 p-0"
                                                onClick={() => setPhotoUrl(null)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            onClick={() => photoInputRef.current?.click()}
                                            disabled={uploading}
                                        >
                                            {uploading ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <Upload className="h-4 w-4 mr-2" />
                                            )}
                                            Upload Photo
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <Label>Maintenance Frequency <span className="text-destructive">*</span></Label>
                                <RadioGroup
                                    value={frequency}
                                    onValueChange={(v) => setFrequency(v as any)}
                                    className="flex flex-wrap gap-4 mt-2"
                                >
                                    {['daily', 'weekly', 'monthly', 'quarterly', 'custom'].map((freq) => (
                                        <div key={freq} className="flex items-center space-x-2">
                                            <RadioGroupItem value={freq} id={`freq-${freq}`} />
                                            <Label htmlFor={`freq-${freq}`} className="cursor-pointer capitalize">
                                                {freq}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>

                            {frequency === 'custom' && (
                                <div>
                                    <Label htmlFor="custom-days">Custom Interval (days)</Label>
                                    <Input
                                        id="custom-days"
                                        type="number"
                                        min="1"
                                        value={customDays}
                                        onChange={(e) => setCustomDays(e.target.value)}
                                        placeholder="e.g., 14"
                                        className="mt-1"
                                    />
                                </div>
                            )}

                            <div>
                                <Label htmlFor="last-serviced">Last Serviced <span className="text-destructive">*</span></Label>
                                <Input
                                    id="last-serviced"
                                    type="date"
                                    value={lastServiced}
                                    onChange={(e) => setLastServiced(e.target.value)}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label>Initial Assignee (PM Responsible)</Label>
                                <Select value={initialAssigneeId} onValueChange={(v) => setInitialAssigneeId(v || '')}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select a person..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {assignableUsers
                                            .filter(u => 
                                                u.department === primaryDept || 
                                                secondaryDepts.includes(u.department)
                                            )
                                            .map(user => (
                                                <SelectItem key={user.id} value={user.id}>
                                                    {user.full_name} - {user.department}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground mt-1">
                                    This person will be responsible for PM tasks
                                </p>
                            </div>

                            <div>
                                <Label>Link to SOP (Optional)</Label>
                                <Input
                                    value={linkedSopId}
                                    onChange={(e) => setLinkedSopId(e.target.value)}
                                    placeholder="SOP ID if applicable"
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="bg-muted dark:bg-card rounded-lg p-4 space-y-2">
                                <h4 className="font-medium">Summary</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <span className="text-muted-foreground">Asset ID:</span>
                                    <span className="font-mono">{assetId}</span>
                                    
                                    <span className="text-muted-foreground">Name:</span>
                                    <span>{name}</span>
                                    
                                    <span className="text-muted-foreground">Department:</span>
                                    <span>{primaryDept}</span>
                                    
                                    {secondaryDepts.length > 0 && (
                                        <>
                                            <span className="text-muted-foreground">Also for:</span>
                                            <span>{secondaryDepts.join(', ')}</span>
                                        </>
                                    )}
                                    
                                    <span className="text-muted-foreground">Frequency:</span>
                                    <span className="capitalize">
                                        {frequency === 'custom' ? `Every ${customDays} days` : frequency}
                                    </span>
                                    
                                    <span className="text-muted-foreground">Last Serviced:</span>
                                    <span>{lastServiced}</span>
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
                                disabled={step === 1 ? !canProceedStep2() : !canProceedStep3()}
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
