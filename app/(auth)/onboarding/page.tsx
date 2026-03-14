import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard"

export default async function OnboardingPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch profile and departments
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (profile?.onboarding_complete) {
        redirect('/dashboard')
    }

    const { data: departments } = await supabase
        .from('departments')
        .select('name, colour, id')
        .order('name')

    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-muted/40 p-6 md:p-10">
            <div className="w-full max-w-xl">
                <OnboardingWizard
                    user={user}
                    profile={profile}
                    departments={departments || []}
                />
            </div>
        </div>
    )
}
