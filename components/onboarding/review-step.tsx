"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { completeSetup } from "@/actions/onboarding-complete"
import { CheckCircle2, Building2, Briefcase, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/user-avatar"

export function ReviewStep({ initialData }: any) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleComplete() {
        setLoading(true)
        setError(null)

        const result = await completeSetup()

        if (result && result.error) {
            setError(result.error)
            setLoading(false)
        }
        // If successful, the server action redirects to dashboard
    }

    return (
        <div className="space-y-6 ">
            <div className="text-center">
                <p className="text-sm text-muted-foreground my-2">
                    Please review your profile details before completing the setup process.
                </p>
            </div>

            {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                    {error}
                </div>
            )}

            <div className="border rounded-xl p-6 bg-background space-y-6">
                <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-sm overflow-hidden flex items-center justify-center">
                        <UserAvatar name={initialData?.full_name} image={initialData?.avatar_url} size="lg" className="w-full h-full rounded-none" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-xl font-bold">{initialData?.full_name || "Full Name"}</h3>
                        <p className="text-foreground font-medium">{initialData?.job_title || "Job Title"}</p>
                    </div>

                    <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="bg-white px-3 py-1 flex items-center gap-1 text-sm border-slate-200">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            {initialData?.department || "Department"}
                        </Badge>
                        <Badge variant="outline" className="bg-brand-navy text-white px-3 py-1 flex items-center gap-1 text-sm border-brand-navy">
                            <Briefcase className="w-4 h-4 opacity-80" />
                            <span className="capitalize">{initialData?.role || "Role"}</span>
                        </Badge>
                    </div>
                </div>

                <div className="border-t border-slate-200 pt-6 mt-6 grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-foreground block mb-1">Employee ID</span>
                        <span className="font-medium text-foreground">{initialData?.employee_id || "Not provided"}</span>
                    </div>
                    <div>
                        <span className="text-foreground block mb-1">Phone Number</span>
                        <span className="font-medium text-foreground">{initialData?.phone || "Not provided"}</span>
                    </div>
                </div>

                <div className="mt-4 bg-green-50 border border-green-100 rounded-lg p-3 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold text-green-800 text-sm">Digital Signature Captured</h4>
                        <p className="text-xs text-green-700 mt-0.5">Your signature is securely stored and ready to use.</p>
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t mt-6 flex flex-col items-center">
                <Button onClick={handleComplete} disabled={loading} size="lg" className="w-full max-w-sm">
                    {loading ? "Completing Setup..." : "Complete Setup"}
                </Button>
            </div>
        </div>
    )
}
