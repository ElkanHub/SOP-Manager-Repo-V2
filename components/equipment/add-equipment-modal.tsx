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
    availableSops?: any[]
}

export function AddEquipmentModal({
    open,
    onOpenChange,
    departments,
    currentUser,
    assignableUsers,
    availableSops = [],
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
                <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/40 shadow-2xl">
                    <div className="h-2 bg-gradient-to-r from-green-400 to-brand-teal" />
                    <div className="p-8 flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6 animate-in zoom-in duration-500">
                             <CheckCircle2 className="h-10 w-10 text-green-500 dark:text-green-400" />
                        </div>
                        <DialogTitle className="text-2xl font-bold text-center mb-2">Submitted for Review</DialogTitle>
                        <DialogDescription className="text-center text-muted-foreground max-w-[280px]">
                            Equipment details have been sent to QA. It will be active once approved.
                        </DialogDescription>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-border/40 shadow-2xl bg-gradient-to-b from-background to-background/98">
                <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-brand-navy/10 via-brand-teal/5 to-transparent border-b border-border/50 relative">
                    <div className="space-y-1">
                        <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">Add New Equipment</DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase tracking-widest text-brand-teal/80">
                            Professional Asset Registration
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="asset-id" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Asset ID <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="asset-id"
                                        value={assetId}
                                        onChange={(e) => setAssetId(e.target.value)}
                                        placeholder="e.g., EQ-001"
                                        className="bg-muted/30 border-border/50 focus:border-brand-teal/50 focus:ring-brand-teal/20"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Equipment Name <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g., Forklift #1"
                                        className="bg-muted/30 border-border/50 focus:border-brand-teal/50 focus:ring-brand-teal/20"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="serial-number" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Serial Number</Label>
                                    <Input
                                        id="serial-number"
                                        value={serialNumber}
                                        onChange={(e) => setSerialNumber(e.target.value)}
                                        placeholder="Serial tag #"
                                        className="bg-muted/30 border-border/50 focus:border-brand-teal/50 focus:ring-brand-teal/20"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="model" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Model / Specs</Label>
                                    <Input
                                        id="model"
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                        placeholder="Model name/number"
                                        className="bg-muted/30 border-border/50 focus:border-brand-teal/50 focus:ring-brand-teal/20"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Primary Controlling Department</Label>
                                <Select value={primaryDept} onValueChange={(v) => setPrimaryDept(v || currentUser.department)}>
                                    <SelectTrigger className="bg-muted/30 border-border/50 focus:border-brand-teal/50 focus:ring-brand-teal/20">
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
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Secondary Access Departments</Label>
                                <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-dashed border-border/50 bg-muted/10">
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

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Equipment Photo</Label>
                                <div className="p-4 rounded-xl border-2 border-dashed border-border/30 bg-muted/20 flex flex-col items-center justify-center min-h-[160px] cursor-pointer hover:bg-muted/30 transition-all group" onClick={() => !photoUrl && photoInputRef.current?.click()}>
                                    <input
                                        ref={photoInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handlePhotoUpload}
                                    />
                                    {photoUrl ? (
                                        <div className="relative group">
                                            <img 
                                                src={photoUrl} 
                                                alt="Equipment" 
                                                className="h-32 w-48 object-cover rounded-lg border shadow-md"
                                            />
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => { e.stopPropagation(); setPhotoUrl(null); }}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="p-3 rounded-full bg-background/80 shadow-sm border border-border/50 group-hover:scale-110 transition-transform">
                                                {uploading ? (
                                                    <Loader2 className="h-6 w-6 animate-spin text-brand-teal" />
                                                ) : (
                                                    <Upload className="h-6 w-6 text-muted-foreground" />
                                                )}
                                            </div>
                                            <p className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-widest">
                                                {uploading ? 'Uploading...' : 'Tap to Upload Asset Photo'}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground/60 tracking-tight">Support: JPG, PNG · Max 2MB</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="space-y-4">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Preventive Maintenance (PM) Cycle <span className="text-red-500">*</span></Label>
                                <RadioGroup
                                    value={frequency}
                                    onValueChange={(v) => setFrequency(v as any)}
                                    className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                                >
                                    {['daily', 'weekly', 'monthly', 'quarterly', 'custom'].map((freq) => (
                                        <div 
                                            key={freq} 
                                            className={`flex items-center space-x-2 rounded-xl border p-3 cursor-pointer transition-all ${frequency === freq ? 'border-brand-teal bg-brand-teal/5 ring-1 ring-brand-teal/20' : 'border-border/40 hover:bg-muted/50'}`}
                                            onClick={() => setFrequency(freq as any)}
                                        >
                                            <RadioGroupItem value={freq} id={`freq-${freq}`} />
                                            <Label htmlFor={`freq-${freq}`} className="cursor-pointer capitalize font-bold text-xs">{freq}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>

                            {frequency === 'custom' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                    <Label htmlFor="custom-days" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Custom Recurrence (Days)</Label>
                                    <Input
                                        id="custom-days"
                                        type="number"
                                        min="1"
                                        value={customDays}
                                        onChange={(e) => setCustomDays(e.target.value)}
                                        placeholder="Enter number of days..."
                                        className="bg-muted/30 border-border/50 focus:border-brand-teal/50 focus:ring-brand-teal/20 transition-all"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="last-serviced" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Historical Last Service <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="last-serviced"
                                        type="date"
                                        value={lastServiced}
                                        onChange={(e) => setLastServiced(e.target.value)}
                                        className="bg-muted/30 border-border/50 focus:border-brand-teal/50 focus:ring-brand-teal/20 transition-all font-mono text-xs"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Responsible Technical Assignee <span className="text-red-500">*</span></Label>
                                    <Select value={initialAssigneeId} onValueChange={(v) => setInitialAssigneeId(v || '')}>
                                        <SelectTrigger className="bg-muted/30 border-border/50 focus:border-brand-teal/50 focus:ring-brand-teal/20">
                                            <SelectValue placeholder="Assign personnel..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {assignableUsers
                                                .filter(u => 
                                                    u.department === primaryDept || 
                                                    secondaryDepts.includes(u.department)
                                                )
                                                .map(user => (
                                                    <SelectItem key={user.id} value={user.id}>
                                                        {user.full_name} ({user.department})
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                             <div className="space-y-2 pt-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Protocol Linkage (Optional SOP)</Label>
                                {availableSops.length > 0 ? (
                                    <Select value={linkedSopId} onValueChange={(v) => setLinkedSopId(v || '')}>
                                        <SelectTrigger className="bg-muted/30 border-border/50 focus:border-brand-teal/50 focus:ring-brand-teal/20">
                                            <SelectValue placeholder="Select linked SOP (optional)..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableSops.map((sop: any) => (
                                                <SelectItem key={sop.id} value={sop.id}>
                                                    <span className="font-mono font-bold text-xs">{sop.sop_number}</span>
                                                    <span className="text-muted-foreground text-xs ml-1">— {sop.title}</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="relative">
                                        <Input
                                            value={linkedSopId}
                                            onChange={(e) => setLinkedSopId(e.target.value)}
                                            placeholder="Enter reference SOP-ID..."
                                            className="bg-muted/30 border-border/50 focus:border-brand-teal/50 focus:ring-brand-teal/20 transition-all pr-10"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-20 italic text-[10px] font-bold uppercase tracking-tighter">REF-ID</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in zoom-in-95 duration-300">
                            <div className="bg-brand-navy/5 dark:bg-card border border-brand-navy/10 rounded-2xl p-6 space-y-4">
                                <div className="flex items-center justify-between border-b border-border/40 pb-4">
                                     <h4 className="text-sm font-bold uppercase tracking-widest text-foreground/70">Registration Summary</h4>
                                     <Badge variant="outline" className="border-brand-teal/30 text-brand-teal bg-brand-teal/5 font-bold text-[10px]">PENDING APPROVAL</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">Asset Identification</span>
                                        <p className="font-mono font-bold text-foreground">{assetId}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">Equipment Title</span>
                                        <p className="font-bold text-foreground">{name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">Controlling Sector</span>
                                        <p className="font-bold text-foreground">{primaryDept}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">Service Interval</span>
                                        <p className="capitalize font-bold text-brand-teal">
                                            {frequency === 'custom' ? `Every ${customDays} days` : frequency}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">Assignee</span>
                                        <p className="font-bold text-foreground">
                                            {assignableUsers.find(u => u.id === initialAssigneeId)?.full_name || 'System Auto'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">Protocol Link</span>
                                        <p className="font-bold text-foreground/70">{linkedSopId || 'Not Applicable'}</p>
                                    </div>
                                </div>
                                
                                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex gap-2 items-start mt-2">
                                     <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                     <p className="text-[10px] text-amber-800/80 font-medium leading-relaxed">
                                         This registration will be logged in the facility audit trail. Please ensure all technical specifications are accurate before finalization.
                                     </p>
                                </div>
                            </div>

                            {submitError && (
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-bold animate-in fade-in slide-in-from-top-1">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
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
                                disabled={step === 1 ? !canProceedStep2() : !canProceedStep3()}
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
                                    'Register Equipment'
                                )}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
