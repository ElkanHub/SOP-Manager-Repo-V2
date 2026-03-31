"use client"

import { useState, useRef } from "react"
import { differenceInDays, format } from "date-fns"
import { ArrowLeft, CheckCircle2, Clock, AlertTriangle, Loader2, Upload, X } from "lucide-react"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { DeptBadge } from "@/components/ui/dept-badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { approveEquipment, rejectEquipment, completePmTask, reassignPmTask } from "@/actions/equipment"
import { Equipment, PmTask, Profile } from "@/types/app.types"
import { SopReadModal } from "@/components/library/sop-read-modal"
import { FileText } from "lucide-react"

interface EquipmentDetailClientProps {
    equipment: Equipment & {
        departments?: { colour: string }
        profiles?: { id: string; full_name: string; department: string; role: string }
        sops?: { id: string; title: string; sop_number: string; file_url: string; version: string }
    }
    pmTasks: (PmTask & {
        profiles?: { id: string; full_name: string; avatar_url?: string; department: string }
    })[]
    currentUserId: string
    currentUserProfile: Profile
    isQa: boolean
    assignableUsers: any[]
}

export function EquipmentDetailClient({
    equipment,
    pmTasks,
    currentUserId,
    currentUserProfile,
    isQa,
    assignableUsers,
}: EquipmentDetailClientProps) {
    const [loading, setLoading] = useState(false)
    const [action, setAction] = useState<'approve' | 'reject' | 'complete' | 'reassign' | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [completionNotes, setCompletionNotes] = useState('')
    const [completionPhoto, setCompletionPhoto] = useState<string | null>(null)
    const [photoUploading, setPhotoUploading] = useState(false)
    const [reassignUserId, setReassignUserId] = useState('')
    const [taskToReassign, setTaskToReassign] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [sopModalOpen, setSopModalOpen] = useState(false)

    const photoInputRef = useRef<HTMLInputElement>(null)

    const isManager = currentUserProfile.role === 'manager'
    const isOwnDept = currentUserProfile.department === equipment.department
    const isSecondaryDept = equipment.secondary_departments?.includes(currentUserProfile.department)

    const canLogPm = isManager || isOwnDept || isSecondaryDept

    const nextDue = equipment.next_due ? new Date(equipment.next_due) : null
    const today = new Date()
    const daysUntilDue = nextDue ? differenceInDays(nextDue, today) : null
    const isOverdue = daysUntilDue !== null && daysUntilDue < 0
    const isDueSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7

    const handleApprove = async () => {
        setLoading(true)
        try {
            const result = await approveEquipment(equipment.id)
            if (result.success) {
                setSuccess('Equipment approved and activated!')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleReject = async () => {
        if (!rejectReason.trim()) return
        setLoading(true)
        try {
            const result = await rejectEquipment(equipment.id, rejectReason)
            if (result.success) {
                setSuccess('Equipment rejected')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleCompleteTask = async (taskId: string) => {
        setLoading(true)
        try {
            const result = await completePmTask(taskId, completionNotes, completionPhoto || undefined)
            if (result.success) {
                setSuccess('PM task completed!')
                setAction(null)
                setCompletionNotes('')
                setCompletionPhoto(null)
            }
        } finally {
            setLoading(false)
        }
    }

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            return
        }

        if (file.size > 2 * 1024 * 1024) {
            return
        }

        setPhotoUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/storage/equipment-photo', {
                method: 'POST',
                body: formData,
            })

            const data = await response.json()

            if (!response.ok) {
                return
            }

            setCompletionPhoto(data.fileUrl)
        } catch (err) {
        } finally {
            setPhotoUploading(false)
        }
    }

    const handleReassign = async () => {
        if (!taskToReassign || !reassignUserId) return
        setLoading(true)
        try {
            const result = await reassignPmTask(taskToReassign, reassignUserId)
            if (result.success) {
                setSuccess('Task reassigned!')
                setAction(null)
                setTaskToReassign(null)
                setReassignUserId('')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="mb-6">
                <Link href="/equipment" className="text-brand-blue hover:underline flex items-center gap-1 text-sm">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Equipment
                </Link>
            </div>

            {success && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                    {success}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="font-mono text-sm text-muted-foreground">
                                            {equipment.asset_id}
                                        </span>
                                        <StatusBadge status={equipment.status} />
                                    </div>
                                    <CardTitle>{equipment.name}</CardTitle>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Department:</span>
                                    <DeptBadge department={equipment.department} colour="blue" />
                                </div>
                                {equipment.serial_number && (
                                    <div>
                                        <span className="text-muted-foreground">Serial Number:</span>
                                        <span className="ml-2">{equipment.serial_number}</span>
                                    </div>
                                )}
                                {equipment.model && (
                                    <div>
                                        <span className="text-muted-foreground">Model:</span>
                                        <span className="ml-2">{equipment.model}</span>
                                    </div>
                                )}
                                <div>
                                    <span className="text-muted-foreground">Frequency:</span>
                                    <span className="ml-2 capitalize">{equipment.frequency}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Last Serviced:</span>
                                    <span className="ml-2">
                                        {equipment.last_serviced ? format(new Date(equipment.last_serviced), 'dd MMM yyyy') : '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Next Due:</span>
                                    <span className={`
                                        ml-2 font-medium
                                        ${isOverdue ? 'text-red-600 dark:text-red-400' : 
                                          isDueSoon ? 'text-amber-600 dark:text-amber-400' : ''}
                                    `}>
                                        {nextDue ? format(nextDue, 'dd MMM yyyy') : '-'}
                                        {isOverdue && <span className="ml-2 text-xs bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded">OVERDUE</span>}
                                    </span>
                                </div>
                                {equipment.linked_sop_id && (
                                    <div className="col-span-2 mt-2 pt-2 border-t border-border/50">
                                        <span className="text-muted-foreground mr-3">Maintenance Protocol:</span>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="h-7 text-xs bg-brand-navy/5 border-brand-navy/20 text-brand-navy hover:bg-brand-navy/10"
                                            onClick={() => setSopModalOpen(true)}
                                        >
                                            <FileText className="h-3 w-3 mr-2" />
                                            {equipment.sops?.sop_number || 'View SOP'}: {equipment.sops?.title || equipment.linked_sop_id}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <SopReadModal 
                        sopId={equipment.linked_sop_id || null}
                        sopNumber={equipment.sops?.sop_number}
                        sopTitle={equipment.sops?.title}
                        open={sopModalOpen}
                        onOpenChange={setSopModalOpen}
                    />

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Service History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {pmTasks.length > 0 ? (
                                <div className="space-y-3">
                                    {pmTasks.map(task => (
                                        <div 
                                            key={task.id}
                                            className="flex items-center justify-between p-3 bg-muted/50 dark:bg-muted/30 rounded-lg"
                                        >
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${
                                                        task.status === 'complete' ? 'bg-green-500' :
                                                        task.status === 'overdue' ? 'bg-red-500' : 'bg-amber-500'
                                                    }`} />
                                                    <span className="text-sm font-medium">
                                                        Due: {format(new Date(task.due_date), 'dd MMM yyyy')}
                                                    </span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {task.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Assigned to: {task.profiles?.full_name || 'Unknown'}
                                                </p>
                                            </div>
                                            {task.status !== 'complete' && canLogPm && (
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => {
                                                        setTaskToReassign(task.id)
                                                        setAction('reassign')
                                                    }}
                                                >
                                                    Reassign
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center py-6 text-muted-foreground">
                                    No service history yet.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    {equipment.status === 'pending_qa' && isQa && (
                        <Card>
                            <CardContent className="p-4 space-y-4">
                                <h3 className="font-medium">QA Approval</h3>
                                <div className="space-y-2">
                                    <Button 
                                        onClick={handleApprove}
                                        disabled={loading}
                                        className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                                    >
                                        {loading && action === 'approve' ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                        )}
                                        Approve
                                    </Button>
                                    <Button 
                                        variant="outline"
                                        onClick={() => setAction('reject')}
                                        className="w-full border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                    >
                                        Reject
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {equipment.status === 'active' && canLogPm && (
                        <Card>
                            <CardContent className="p-4 space-y-4">
                                <h3 className="font-medium">Next Service</h3>
                                <div className={`
                                    p-3 rounded-lg border
                                    ${isOverdue ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' :
                                      isDueSoon ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' :
                                      'bg-muted/50'}
                                `}>
                                    <div className="flex items-center gap-2 mb-2">
                                        {isOverdue ? (
                                            <AlertTriangle className="h-4 w-4 text-red-600" />
                                        ) : (
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                        )}
                                        <span className="font-medium">
                                            {nextDue ? format(nextDue, 'EEEE, MMM d') : 'No date set'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {isOverdue 
                                            ? 'This equipment is overdue for maintenance' 
                                            : daysUntilDue === 0 
                                                ? 'Due today'
                                                : daysUntilDue === 1 
                                                    ? 'Due tomorrow'
                                                    : `Due in ${daysUntilDue} days`}
                                    </p>
                                </div>
                                <Button 
                                    className="w-full bg-brand-teal hover:bg-teal-600"
                                    onClick={() => setAction('complete')}
                                >
                                    Log PM Completion
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardContent className="p-4 space-y-4">
                            <h3 className="font-medium">QR Code</h3>
                            <div className="flex justify-center">
                                <div className="p-2 bg-white rounded-lg">
                                    <QRCodeSVG
                                        value={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/equipment/${equipment.id}`}
                                        size={128}
                                        level="M"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-center text-muted-foreground">
                                Scan to open equipment
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {action === 'reject' && (
                <Dialog open={true} onOpenChange={() => setAction(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Reject Equipment</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label>Reason for rejection</Label>
                                <Textarea 
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Provide a reason..."
                                    rows={3}
                                />
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setAction(null)}>Cancel</Button>
                                <Button 
                                    onClick={handleReject}
                                    disabled={loading || !rejectReason.trim()}
                                    variant="destructive"
                                >
                                    Confirm Reject
                                </Button>
                            </DialogFooter>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {action === 'complete' && (
                <Dialog open={true} onOpenChange={() => setAction(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Log PM Completion</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label>Notes <span className="text-destructive">*</span></Label>
                                <Textarea 
                                    value={completionNotes}
                                    onChange={(e) => setCompletionNotes(e.target.value)}
                                    placeholder="What was done?"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <Label>Photo (optional)</Label>
                                <div className="mt-1">
                                    <input
                                        ref={photoInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handlePhotoUpload}
                                    />
                                    {completionPhoto ? (
                                        <div className="relative inline-block">
                                            <Image 
                                                src={completionPhoto} 
                                                alt="PM Completion" 
                                                width={128} 
                                                height={128} 
                                                className="h-32 w-32 object-cover rounded-lg border"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="absolute -top-2 -right-2 h-6 w-6 p-0"
                                                onClick={() => setCompletionPhoto(null)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            onClick={() => photoInputRef.current?.click()}
                                            disabled={photoUploading}
                                        >
                                            {photoUploading ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <Upload className="h-4 w-4 mr-2" />
                                            )}
                                            Upload Photo
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => { setAction(null); setCompletionNotes(''); setCompletionPhoto(null); }}>Cancel</Button>
                                <Button 
                                    onClick={() => {
                                        const pendingTask = pmTasks.find(t => t.status !== 'complete')
                                        if (pendingTask) handleCompleteTask(pendingTask.id)
                                    }}
                                    disabled={loading || !completionNotes.trim()}
                                    className="bg-brand-teal hover:bg-teal-600"
                                >
                                    Mark Complete
                                </Button>
                            </DialogFooter>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {action === 'reassign' && (
                <Dialog open={true} onOpenChange={() => { setAction(null); setTaskToReassign(null); }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Reassign Task</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label>New Assignee</Label>
                                <Select value={reassignUserId} onValueChange={(v) => setReassignUserId(v || "")}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select person..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {assignableUsers
                                            .filter(u => u.department === equipment.department)
                                            .map(user => (
                                                <SelectItem key={user.id} value={user.id}>
                                                    {user.full_name}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => { setAction(null); setTaskToReassign(null); }}>Cancel</Button>
                                <Button 
                                    onClick={handleReassign}
                                    disabled={loading || !reassignUserId}
                                >
                                    Reassign
                                </Button>
                            </DialogFooter>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}
