"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Camera, User, PenLine, CheckCircle2, LogOut } from "lucide-react"
import { updateProfile } from "@/actions/settings"
import { logoutUser } from "@/actions/auth"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/types/app.types"
import { SignatureRedrawDialog } from "./signature-redraw-dialog"
import Image from "next/image"

interface ProfileTabProps {
    profile: Profile
}

export function ProfileTab({ profile }: ProfileTabProps) {
    const [fullName, setFullName] = useState(profile.full_name)
    const [jobTitle, setJobTitle] = useState(profile.job_title)
    const [employeeId, setEmployeeId] = useState(profile.employee_id || "")
    const [phone, setPhone] = useState(profile.phone || "")
    const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "")
    const [signatureUrl, setSignatureUrl] = useState(profile.signature_url || "")
    const [sigImgError, setSigImgError] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [redrawOpen, setRedrawOpen] = useState(false)
    const supabase = createClient()

    // Sync state with props when server-side profile changes (e.g. after revalidation)
    useEffect(() => {
        if (profile.signature_url) {
            setSignatureUrl(profile.signature_url)
            setSigImgError(false)
        }
    }, [profile.signature_url])

    async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || e.target.files.length === 0) return
        const file = e.target.files[0]
        if (file.size > 5 * 1024 * 1024) { setError("Avatar must be under 5MB."); return }

        try {
            setUploading(true)
            setError(null)
            const fileExt = file.name.split('.').pop()
            const filePath = `${profile.id}/avatar.${fileExt}`
            const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
            if (uploadError) throw uploadError
            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
            await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile.id)
            setAvatarUrl(data.publicUrl)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to upload avatar")
        } finally {
            setUploading(false)
        }
    }

    async function handleSave() {
        if (!fullName.trim() || !jobTitle.trim()) {
            setError("Full Name and Job Title are required.")
            return
        }
        setSaving(true)
        setError(null)
        setSuccess(false)
        const result = await updateProfile({ full_name: fullName, job_title: jobTitle, employee_id: employeeId, phone })
        setSaving(false)
        if (!result.success) { setError(result.error); return }
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
    }

    return (
        <div className="space-y-6 sm:space-y-8 max-w-2xl">
            {/* Avatar */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                <div className="relative group w-20 h-20 rounded-full border-2 border-border overflow-hidden bg-muted flex items-center justify-center shrink-0">
                    {avatarUrl ? (
                        <Image 
                            src={avatarUrl} 
                            alt="Avatar" 
                            width={80} 
                            height={80} 
                            className="w-full h-full object-cover"
                            unoptimized={avatarUrl.startsWith('data:')}
                        />
                    ) : (
                        <User className="w-9 h-9 text-muted-foreground" />
                    )}
                    <label htmlFor="avatar-upload-settings" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        {uploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                    </label>
                    <input id="avatar-upload-settings" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                </div>
                <div className="text-center sm:text-left">
                    <p className="font-medium text-foreground">Profile Photo</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Click the photo to upload a new one. Max 5MB.</p>
                </div>
            </div>

            {/* Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                    <Label htmlFor="settings-full-name">Full Name <span className="text-red-500">*</span></Label>
                    <Input id="settings-full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="settings-job-title">Job Title <span className="text-red-500">*</span></Label>
                    <Input id="settings-job-title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="QA Lead" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="settings-employee-id">Employee ID</Label>
                    <Input id="settings-employee-id" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="EMP-12345" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="settings-phone">Phone</Label>
                    <Input id="settings-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
                </div>
            </div>

            {/* Signature */}
            <div className="border rounded-lg p-3 sm:p-4 space-y-3 bg-muted/30">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                    <div>
                        <p className="font-medium text-foreground">Digital Signature</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Used to sign Change Controls. Stored securely.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setRedrawOpen(true)} className="self-start sm:self-auto">
                        <PenLine className="w-4 h-4 mr-2" /> Re-draw Signature
                    </Button>
                </div>
                {signatureUrl && !sigImgError ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                            <span className="text-xs text-green-600 dark:text-green-400">Signature on file</span>
                        </div>
                        {/* Checkerboard background makes transparent PNG visible in both themes */}
                        <div
                            className="sm:ml-auto border rounded px-3 py-2 flex items-center justify-center"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Crect width='4' height='4' fill='%23fff'/%3E%3Crect x='4' y='4' width='4' height='4' fill='%23fff'/%3E%3Crect x='4' y='0' width='4' height='4' fill='%23e5e7eb'/%3E%3Crect x='0' y='4' width='4' height='4' fill='%23e5e7eb'/%3E%3C/svg%3E")`,
                                minWidth: '120px',
                            }}
                        >
                            <Image
                                src={signatureUrl}
                                alt="Signature preview"
                                width={200}
                                height={48}
                                className="h-12 w-auto object-contain"
                                onError={() => setSigImgError(true)}
                                unoptimized={true}
                            />
                        </div>
                    </div>
                ) : signatureUrl && sigImgError ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400">Signature on file but could not load preview. It will still be used for signing.</p>
                ) : (
                    <p className="text-xs text-amber-600 dark:text-amber-400">No signature on file. Please draw one to sign Change Controls.</p>
                )}
            </div>

            {error && <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">{error}</div>}
            {success && <div className="p-3 text-sm text-green-700 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">Profile saved successfully.</div>}

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving || uploading}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {saving ? "Saving…" : "Save Changes"}
                </Button>
            </div>

            {/* Danger Zone / Sign Out */}
            <div className="pt-8 border-t border-destructive/20">
                <div className="bg-destructive/5 dark:bg-red-950/20 rounded-lg p-4 border border-destructive/20">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                        <div>
                            <p className="font-semibold text-destructive dark:text-red-400">Sign Out</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Logout from your account on this device.</p>
                        </div>
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => logoutUser()}
                            className="bg-red-200 hover:bg-red-300"
                        >
                            <LogOut className="w-4 h-4 mr-2" /> Sign Out
                        </Button>
                    </div>
                </div>
            </div>

            <SignatureRedrawDialog
                open={redrawOpen}
                onClose={() => setRedrawOpen(false)}
                userId={profile.id}
                currentSignatureUrl={signatureUrl}
                onSaved={(url) => setSignatureUrl(url)}
            />
        </div>
    )
}
