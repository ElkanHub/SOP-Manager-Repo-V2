"use server"

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveStepOne(department: string, role: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    if (!department || !role) {
        return { error: 'Department and role are required' }
    }

    const { error } = await supabase
        .from('profiles')
        .update({
            department,
            role,
        })
        .eq('id', user.id)

    if (error) {
        return { error: error.message }
    }

    // Since we're navigating between steps client-side, we may just return success.
    // Optionally revalidate if needed by parent layouts
    revalidatePath('/onboarding')
    return { success: true }
}

export async function saveStepTwo(data: {
    full_name: string;
    job_title: string;
    employee_id?: string;
    phone?: string;
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    if (!data.full_name || !data.job_title) {
        return { error: 'Full name and Job Title are required' }
    }

    const { error } = await supabase
        .from('profiles')
        .update({
            full_name: data.full_name,
            job_title: data.job_title,
            employee_id: data.employee_id || null,
            phone: data.phone || null,
        })
        .eq('id', user.id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/onboarding')
    return { success: true }
}
