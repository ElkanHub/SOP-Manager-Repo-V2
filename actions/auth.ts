"use server"

import { createServiceClient, createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createFirstAdmin(formData: FormData) {
    const supabase = await createServiceClient()

    // 1. Check has_any_admin again
    const { data: hasAdmin } = await supabase.rpc('has_any_admin')
    if (hasAdmin) {
        return { error: 'An administrator account already exists.' }
    }

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirm-password') as string
    const fullName = formData.get('name') as string

    if (!email || !password || !fullName) {
        return { error: 'All fields are required.' }
    }

    if (password.length < 12) {
        return { error: 'Password must be at least 12 characters.' }
    }

    if (password !== confirmPassword) {
        return { error: 'Passwords do not match.' }
    }

    // 2. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    })

    if (authError || !authData.user) {
        return { error: authError?.message || 'Failed to create user.' }
    }

    const userId = authData.user.id

    // 3. Upsert profile
    const { error: profileError } = await supabase
        .from('profiles')
        .update({
            full_name: fullName,
            department: 'QA',
            role: 'manager',
            is_admin: true,
            is_active: true,
            onboarding_complete: false
        })
        .eq('id', userId)

    if (profileError) {
        // Rollback? Admin createUser will trigger the handle_new_user which inserts the profile. So we UPDATE it.
        return { error: 'Failed to update user profile.' }
    }

    // 4. Write audit log
    const { error: auditError } = await supabase
        .from('audit_log')
        .insert({
            actor_id: userId,
            action: 'first_admin_created',
            entity_type: 'profile',
            entity_id: userId,
        })

    if (auditError) {
        console.error('Failed to write audit log:', auditError)
    }

    // Redirect to login so they can log in and start onboarding.
    // Wait, the spec says "5. Redirect to /onboarding" but we are using `admin.createUser` which does not sign them in automatically.
    // We should redirect to /login with a success message, OR we can sign them in here using the browser client, but this is a server action using service_role.
    // Let's redirect to login for them to sign in.
    redirect('/login?setup=success')
}

export async function loginUser(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'Email and password are required.' }
    }

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: error.message }
    }

    // Proxy handles redirection
    redirect('/dashboard')
}

export async function signupUser(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('name') as string

    if (!email || !password || !fullName) {
        return { error: 'Full name, email, and password are required.' }
    }

    const { headers: getHeaders } = await import('next/headers')
    const headerList = await getHeaders()
    const host = headerList.get('host')
    const protocol = headerList.get('x-forwarded-proto') || 'http'
    const appUrl = `${protocol}://${host}`

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${appUrl}/auth/callback?next=/onboarding`,
            data: {
                full_name: fullName,
            }
        }
    })

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}

export async function logoutUser() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}

export async function forgotPassword(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get('email') as string

    if (!email) {
        return { error: 'Email is required.' }
    }

    // Use headers for better port and origin handling across all environments
    const { headers: getHeaders } = await import('next/headers')
    const headerList = await getHeaders()
    const host = headerList.get('host')
    const protocol = headerList.get('x-forwarded-proto') || 'http'
    const appUrl = `${protocol}://${host}`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
    })

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}

export async function updatePassword(formData: FormData) {
    const supabase = await createClient()
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirm-password') as string

    if (!password || !confirmPassword) {
        return { error: 'Both password fields are required.' }
    }

    if (password.length < 12) {
        return { error: 'Password must be at least 12 characters.' }
    }

    if (password !== confirmPassword) {
        return { error: 'Passwords do not match.' }
    }

    const { error } = await supabase.auth.updateUser({
        password: password
    })

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}
