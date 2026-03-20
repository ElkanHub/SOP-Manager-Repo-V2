"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Camera, User, PenLine, CheckCircle2 } from "lucide-react"
import { updateProfile } from "@/actions/settings"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/types/app.types"
import { SignatureRedrawDialog } from "./signature-redraw-dialog"

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
    const [uploading, setUploading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [redrawOpen, setRedrawOpen] = useState(false)
    const supabase = createClient()

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
        <div className="space-y-8 max-w-2xl">
            {/* Avatar */}
            <div className="flex items-center gap-6">
                <div className="relative group w-20 h-20 rounded-full border-2 border-border overflow-hidden bg-muted flex items-center justify-center shrink-0">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <User className="w-9 h-9 text-muted-foreground" />
                    )}
                    <label htmlFor="avatar-upload-settings" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        {uploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                    </label>
                    <input id="avatar-upload-settings" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                </div>
                <div>
                    <p className="font-medium text-foreground">Profile Photo</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Click the photo to upload a new one. Max 5MB.</p>
                </div>
            </div>

            {/* Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium text-foreground">Digital Signature</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Used to sign Change Controls. Stored securely.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setRedrawOpen(true)}>
                        <PenLine className="w-4 h-4 mr-2" /> Re-draw Signature
                    </Button>
                </div>
                {signatureUrl ? (
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        <span className="text-xs text-green-600 dark:text-green-400">Signature on file</span>
                        <div className="ml-auto border rounded px-3 py-1 bg-white">
                            <img src={signatureUrl} alt="Signature preview" className="h-10 object-contain max-w-[180px]" />
                        </div>
                    </div>
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
