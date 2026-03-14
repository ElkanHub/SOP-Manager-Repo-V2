"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { saveStepOne } from "@/actions/onboarding"
import { Building2, UserCircle, Briefcase } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export function DeptRoleStep({ departments, initialData, onNext }: any) {
    const [department, setDepartment] = useState(initialData?.department || "")
    const [role, setRole] = useState(initialData?.role || "")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleContinue() {
        if (!department || !role) {
            setError("Please select both a department and a role.")
            return
        }

        setLoading(true)
        setError(null)

        const result = await saveStepOne(department, role)

        if (result.error) {
            setError(result.error)
            setLoading(false)
        } else {
            onNext()
        }
    }

    return (
        <div className="space-y-8">
            {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                    {error}
                </div>
            )}

            <div className="space-y-3">
                <Label htmlFor="department">What is your primary department?</Label>
                <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                        {departments.map((d: any) => (
                            <SelectItem key={d.id} value={d.name}>
                                {d.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-3">
                <Label>What is your role?</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => setRole('employee')}
                        className={cn(
                            "flex flex-col items-center justify-center p-6 border-2 rounded-xl transition-all text-left w-full gap-3",
                            role === 'employee'
                                ? "border-brand-teal bg-brand-teal/5 ring-2 ring-brand-teal ring-offset-2"
                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        )}
                    >
                        <UserCircle className={cn("w-10 h-10", role === 'employee' ? "text-brand-teal" : "text-slate-400")} />
                        <div className="text-center">
                            <h3 className="font-semibold text-lg text-slate-900">Employee</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Standard access to view and acknowledge SOPs.
                            </p>
                        </div>
                    </button>
                    <button
                        type="button"
                        onClick={() => setRole('manager')}
                        className={cn(
                            "flex flex-col items-center justify-center p-6 border-2 rounded-xl transition-all text-left w-full gap-3",
                            role === 'manager'
                                ? "border-brand-navy bg-brand-navy/5 ring-2 ring-brand-navy ring-offset-2"
                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        )}
                    >
                        <Briefcase className={cn("w-10 h-10", role === 'manager' ? "text-brand-navy" : "text-slate-400")} />
                        <div className="text-center">
                            <h3 className="font-semibold text-lg text-slate-900">Manager</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Submit edits and sign Change Controls.
                            </p>
                        </div>
                    </button>
                </div>
                {role === 'manager' && (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-md mt-2">
                        Managers can submit SOPs and are required to sign Change Controls.
                    </p>
                )}
            </div>

            <div className="flex justify-end pt-4">
                <Button onClick={handleContinue} disabled={loading} size="lg">
                    {loading ? "Saving..." : "Continue"}
                </Button>
            </div>
        </div>
    )
}
