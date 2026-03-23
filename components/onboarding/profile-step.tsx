"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveStepTwo } from "@/actions/onboarding"
import { createClient } from "@/lib/supabase/client"
import { Camera, Loader2, User } from "lucide-react"
import { UserAvatar } from "@/components/user-avatar"

export function ProfileStep({ initialData, onNext }: any) {
    const [fullName, setFullName] = useState(initialData?.full_name || "")
    const [jobTitle, setJobTitle] = useState(initialData?.job_title || "")
    const [employeeId, setEmployeeId] = useState(initialData?.employee_id || "")
    const [phone, setPhone] = useState(initialData?.phone || "")

    const [avatarUrl, setAvatarUrl] = useState<string | null>(initialData?.avatar_url || null)
    const [uploading, setUploading] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const supabase = createClient()

    async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
        try {
            setUploading(true)
            setError(null)

            if (!e.target.files || e.target.files.length === 0) {
                return
            }
            const file = e.target.files[0]
            const fileExt = file.name.split('.').pop()
            const filePath = `${initialData.id}/avatar.${fileExt}`

            // Upload the file
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true })

            if (uploadError) throw uploadError

            // Get public URL
            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)

            // Update profile immediately
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: data.publicUrl })
                .eq('id', initialData.id)

            if (updateError) throw updateError

            setAvatarUrl(data.publicUrl)
        } catch (error: any) {
            setError(error.message)
        } finally {
            setUploading(false)
        }
    }

    async function handleContinue() {
        if (!fullName || !jobTitle) {
            setError("Full Name and Job Title are required.")
            return
        }

        setLoading(true)
        setError(null)

        const result = await saveStepTwo({
            full_name: fullName,
            job_title: jobTitle,
            employee_id: employeeId,
            phone: phone
        })

        if (result.error) {
            setError(result.error)
            setLoading(false)
        } else {
            onNext()
        }
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                    {error}
                </div>
            )}

            <div className="flex flex-col items-center justify-center space-y-4 py-4">
                <div className="relative group w-24 h-24 rounded-full border-4 border-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center">
                    <UserAvatar name={fullName} image={avatarUrl} className="w-full h-full rounded-none" />

                    <label htmlFor="avatar-upload" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        {uploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                    </label>
                    <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                        disabled={uploading}
                    />
                </div>
                <div className="text-center">
                    <Label className="text-sm font-medium">Profile Photo (Optional)</Label>
                    <p className="text-xs text-muted-foreground mt-1">Click to upload a new picture</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input
                        id="jobTitle"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder="Quality Assurance Lead"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="employeeId">Employee ID (Optional)</Label>
                    <Input
                        id="employeeId"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        placeholder="EMP-12345"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number (Optional)</Label>
                    <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                    />
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button onClick={handleContinue} disabled={loading || uploading} size="lg">
                    {loading ? "Saving..." : "Continue"}
                </Button>
            </div>
        </div>
    )
}
