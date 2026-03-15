"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { DeptRoleStep } from "./dept-role-step"
import { ProfileStep } from "./profile-step"
import { SignatureStep } from "./signature-step"
import { ReviewStep } from "./review-step"
import { createClient } from "@/lib/supabase/client"

export function OnboardingWizard({ user, profile: initialProfile, departments }: any) {
    const [step, setStep] = useState(1)
    const [profile, setProfile] = useState(initialProfile)
    const supabase = createClient()

    // Fetch fresh profile data each time we change step (except step 1) to ensure we have the latest
    // avatar_url, signature_url, etc.
    useEffect(() => {
        async function fetchProfile() {
            if (step > 1) {
                const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
                if (data) setProfile(data)
            }
        }
        fetchProfile()
    }, [step, user.id, supabase])

    // Compute progress: 4 segments = 25% each
    const progress = (step / 4) * 100

    const nextStep = () => setStep(step + 1)
    const prevStep = () => setStep(step - 1)

    return (
        <Card className="w-full shadow-lg border-border">
            <CardHeader className="bg-muted border-b border-border rounded-t-xl pb-6">
                <div className="flex items-center justify-between mb-4">
                    <CardTitle className="text-2xl font-bold text-foreground">Set up your profile</CardTitle>
                    <span className="text-sm text-brand-teal font-semibold bg-brand-teal/10 px-3 py-1 rounded-full">Step {step} of 4</span>
                </div>
                <Progress value={progress} className="h-2 w-full bg-muted-foreground/20" />
                <CardDescription className="pt-4 text-base text-muted-foreground">
                    {step === 1 && "Start by selecting your department and your role within the organisation."}
                    {step === 2 && "Tell us a bit more about yourself."}
                    {step === 3 && "Provide a digital signature for signing Change Controls and SOPs."}
                    {step === 4 && "Review your profile details before finishing."}
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-8 px-8 pb-8">
                {step === 1 && <DeptRoleStep departments={departments} initialData={profile} onNext={nextStep} />}
                {step === 2 && <ProfileStep initialData={profile} onNext={nextStep} />}
                {step === 3 && <SignatureStep initialData={profile} onNext={nextStep} />}
                {step === 4 && <ReviewStep initialData={profile} />}
            </CardContent>
        </Card>
    )
}
