"use server"

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function completeSetup() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    // Verify signature URL exists
    const { data: profile } = await supabase
        .from('profiles')
        .select('signature_url, onboarding_complete')
        .eq('id', user.id)
        .single()

    if (!profile?.signature_url) {
        return { error: 'Please provide a digital signature before completing setup.' }
    }

    if (profile?.onboarding_complete) {
        redirect('/dashboard') // Already complete
    }

    // Update profile to mark onboarding complete
    const { error } = await supabase
        .from('profiles')
        .update({ onboarding_complete: true })
        .eq('id', user.id)

    if (error) {
        return { error: error.message }
    }

    // Write audit log
    const { error: auditError } = await supabase
        .from('audit_log')
        .insert({
            actor_id: user.id,
            action: 'onboarding_completed',
            entity_type: 'profile',
            entity_id: user.id,
        })

    if (auditError) console.error("Error creating audit log:", auditError)

    // Redirect to dashboard
    redirect('/dashboard')
}
