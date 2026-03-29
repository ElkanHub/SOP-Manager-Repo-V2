"use server"

import { createServiceClient, createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Shared result type ──────────────────────────────────────────────────────
export type SettingsResult =
    | { success: true }
    | { success: false; error: string }

// ─── Helper: assert active session ──────────────────────────────────────────
async function getActiveUser() {
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) return null

    const service = await createServiceClient()
    const { data: profile } = await service
        .from('profiles')
        .select('id, is_active, is_admin, department, role, email:id')
        .eq('id', user.id)
        .single()

    if (!profile?.is_active) return null
    return { user, profile, service }
}

// ─── Tab 1 — Profile ─────────────────────────────────────────────────────────

export async function updateProfile(data: {
    full_name: string
    job_title: string
    employee_id?: string
    phone?: string
}): Promise<SettingsResult> {
    const ctx = await getActiveUser()
    if (!ctx) return { success: false, error: 'Not authenticated' }

    const { data: { user } } = await (await createClient()).auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const service = await createServiceClient()
    const { error } = await service
        .from('profiles')
        .update({
            full_name: data.full_name,
            job_title: data.job_title,
            employee_id: data.employee_id || null,
            phone: data.phone || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/settings')
    return { success: true }
}

export async function redrawSignature(signatureUrl: string): Promise<SettingsResult> {
    const ctx = await getActiveUser()
    if (!ctx) return { success: false, error: 'Not authenticated' }

    const { data: { user } } = await (await createClient()).auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const service = await createServiceClient()

    const { error } = await service
        .from('profiles')
        .update({ signature_url: signatureUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id)

    if (error) return { success: false, error: error.message }

    await service.from('audit_log').insert({
        actor_id: user.id,
        action: 'signature_updated',
        entity_type: 'profile',
        entity_id: user.id,
        metadata: {},
    })

    revalidatePath('/settings')
    return { success: true }
}

// ─── Tab 2 — Notifications ────────────────────────────────────────────────────

export async function updateNotificationPrefs(prefs: {
    email: boolean
    pulse: boolean
    notice_sound: boolean
    message_sound: boolean
}): Promise<SettingsResult> {
    const ctx = await getActiveUser()
    if (!ctx) return { success: false, error: 'Not authenticated' }

    const { data: { user } } = await (await createClient()).auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const service = await createServiceClient()
    const { error } = await service
        .from('profiles')
        .update({ notification_prefs: prefs, updated_at: new Date().toISOString() })
        .eq('id', user.id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/settings')
    return { success: true }
}

// ─── Tab 3 — Departments (Admin only) ────────────────────────────────────────

async function assertAdmin(): Promise<{ userId: string; service: Awaited<ReturnType<typeof createServiceClient>> } | { error: string }> {
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const service = await createServiceClient()
    const { data: profile } = await service
        .from('profiles')
        .select('is_admin, is_active')
        .eq('id', user.id)
        .single()

    if (!profile?.is_active) return { error: 'Account is inactive' }
    if (!profile?.is_admin) return { error: 'Admin access required' }

    return { userId: user.id, service }
}

export async function addDepartment(name: string, colour: string): Promise<SettingsResult> {
    const ctx = await assertAdmin()
    if ('error' in ctx) return { success: false, error: ctx.error }

    const { error } = await ctx.service.from('departments').insert({ name, colour })
    if (error) {
        if (error.code === '23505') return { success: false, error: 'A department with that name already exists.' }
        return { success: false, error: error.message }
    }

    revalidatePath('/settings')
    return { success: true }
}

export async function updateDepartmentColour(id: string, colour: string): Promise<SettingsResult> {
    const ctx = await assertAdmin()
    if ('error' in ctx) return { success: false, error: ctx.error }

    const { error } = await ctx.service.from('departments').update({ colour }).eq('id', id)
    if (error) return { success: false, error: error.message }

    revalidatePath('/settings')
    return { success: true }
}

export async function deleteDepartment(id: string): Promise<SettingsResult> {
    const ctx = await assertAdmin()
    if ('error' in ctx) return { success: false, error: ctx.error }

    // Guard: never delete QA department
    const { data: dept } = await ctx.service
        .from('departments')
        .select('name, is_qa')
        .eq('id', id)
        .single()

    if (!dept) return { success: false, error: 'Department not found' }
    if (dept.is_qa) return { success: false, error: 'The QA department cannot be deleted.' }

    // Check usage
    const [{ count: userCount }, { count: sopCount }] = await Promise.all([
        ctx.service.from('profiles').select('id', { count: 'exact', head: true }).eq('department', dept.name),
        ctx.service.from('sops').select('id', { count: 'exact', head: true })
            .or(`department.eq.${dept.name},secondary_departments.cs.{${dept.name}}`),
    ])

    if ((userCount ?? 0) > 0 || (sopCount ?? 0) > 0) {
        return {
            success: false,
            error: `This department has ${userCount ?? 0} user(s) and ${sopCount ?? 0} SOP(s). Reassign them before deleting.`,
        }
    }

    const { error } = await ctx.service.from('departments').delete().eq('id', id)
    if (error) return { success: false, error: error.message }

    revalidatePath('/settings')
    return { success: true }
}

// ─── Tab 4 — Users (Admin only) ──────────────────────────────────────────────

export async function changeUserRole(userId: string, newRole: 'manager' | 'employee'): Promise<SettingsResult> {
    const ctx = await assertAdmin()
    if ('error' in ctx) return { success: false, error: ctx.error }

    const { error } = await ctx.service
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId)

    if (error) return { success: false, error: error.message }

    await ctx.service.from('audit_log').insert({
        actor_id: ctx.userId,
        action: 'user_role_changed',
        entity_type: 'profile',
        entity_id: userId,
        metadata: { new_role: newRole },
    })

    revalidatePath('/settings')
    return { success: true }
}

export async function changeUserDepartment(userId: string, newDept: string): Promise<SettingsResult> {
    const ctx = await assertAdmin()
    if ('error' in ctx) return { success: false, error: ctx.error }

    const { error } = await ctx.service
        .from('profiles')
        .update({ department: newDept, updated_at: new Date().toISOString() })
        .eq('id', userId)

    if (error) return { success: false, error: error.message }

    await ctx.service.from('audit_log').insert({
        actor_id: ctx.userId,
        action: 'user_dept_changed',
        entity_type: 'profile',
        entity_id: userId,
        metadata: { new_department: newDept },
    })

    revalidatePath('/settings')
    return { success: true }
}

export async function grantAdmin(targetUserId: string, adminPassword: string): Promise<SettingsResult> {
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const service = await createServiceClient()
    const { data: adminProfile } = await service
        .from('profiles')
        .select('is_admin, is_active, full_name')
        .eq('id', user.id)
        .single()

    if (!adminProfile?.is_active) return { success: false, error: 'Account inactive' }
    if (!adminProfile?.is_admin) return { success: false, error: 'Admin access required' }
    if (targetUserId === user.id) return { success: false, error: 'Cannot modify your own admin status' }

    // Verify password
    const { data: authData } = await service.auth.admin.getUserById(user.id)
    if (!authData?.user?.email) return { success: false, error: 'Could not verify identity' }

    const { error: signInError } = await client.auth.signInWithPassword({
        email: authData.user.email,
        password: adminPassword,
    })
    if (signInError) return { success: false, error: 'Incorrect password. Please try again.' }

    // Get target user info for audit
    const { data: targetProfile } = await service
        .from('profiles')
        .select('full_name')
        .eq('id', targetUserId)
        .single()

    const { error } = await service
        .from('profiles')
        .update({ is_admin: true, updated_at: new Date().toISOString() })
        .eq('id', targetUserId)

    if (error) return { success: false, error: error.message }

    await service.from('audit_log').insert({
        actor_id: user.id,
        action: 'admin_granted',
        entity_type: 'profile',
        entity_id: targetUserId,
        metadata: { actor_id: user.id, target_user_id: targetUserId, target_name: targetProfile?.full_name },
    })

    revalidatePath('/settings')
    return { success: true }
}

export async function revokeAdmin(targetUserId: string, adminPassword: string): Promise<SettingsResult> {
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const service = await createServiceClient()
    const { data: adminProfile } = await service
        .from('profiles')
        .select('is_admin, is_active, full_name')
        .eq('id', user.id)
        .single()

    if (!adminProfile?.is_active) return { success: false, error: 'Account inactive' }
    if (!adminProfile?.is_admin) return { success: false, error: 'Admin access required' }
    if (targetUserId === user.id) return { success: false, error: 'Cannot modify your own admin status' }

    // Verify password
    const { data: authData } = await service.auth.admin.getUserById(user.id)
    if (!authData?.user?.email) return { success: false, error: 'Could not verify identity' }

    const { error: signInError } = await client.auth.signInWithPassword({
        email: authData.user.email,
        password: adminPassword,
    })
    if (signInError) return { success: false, error: 'Incorrect password. Please try again.' }

    const { data: targetProfile } = await service
        .from('profiles')
        .select('full_name')
        .eq('id', targetUserId)
        .single()

    const { error } = await service
        .from('profiles')
        .update({ is_admin: false, updated_at: new Date().toISOString() })
        .eq('id', targetUserId)

    if (error) return { success: false, error: error.message }

    await service.from('audit_log').insert({
        actor_id: user.id,
        action: 'admin_revoked',
        entity_type: 'profile',
        entity_id: targetUserId,
        metadata: { actor_id: user.id, target_user_id: targetUserId, target_name: targetProfile?.full_name },
    })

    revalidatePath('/settings')
    return { success: true }
}

export async function deactivateUser(targetUserId: string): Promise<SettingsResult> {
    const ctx = await assertAdmin()
    if ('error' in ctx) return { success: false, error: ctx.error }

    if (targetUserId === ctx.userId) {
        return { success: false, error: 'You cannot deactivate your own account.' }
    }

    const { error } = await ctx.service
        .from('profiles')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', targetUserId)

    if (error) return { success: false, error: error.message }

    // Invalidate user session immediately
    await ctx.service.auth.admin.signOut(targetUserId)

    await ctx.service.from('audit_log').insert({
        actor_id: ctx.userId,
        action: 'user_deactivated',
        entity_type: 'profile',
        entity_id: targetUserId,
        metadata: {},
    })

    revalidatePath('/settings')
    return { success: true }
}

export async function reactivateUser(targetUserId: string): Promise<SettingsResult> {
    const ctx = await assertAdmin()
    if ('error' in ctx) return { success: false, error: ctx.error }

    const { error } = await ctx.service
        .from('profiles')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', targetUserId)

    if (error) return { success: false, error: error.message }

    await ctx.service.from('audit_log').insert({
        actor_id: ctx.userId,
        action: 'user_reactivated',
        entity_type: 'profile',
        entity_id: targetUserId,
        metadata: {},
    })

    revalidatePath('/settings')
    return { success: true }
}

export async function approveUser(targetUserId: string): Promise<SettingsResult> {
    const ctx = await assertAdmin()
    if ('error' in ctx) return { success: false, error: ctx.error }

    const { error } = await ctx.service
        .from('profiles')
        .update({ signup_status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', targetUserId)

    if (error) return { success: false, error: error.message }

    await ctx.service.from('audit_log').insert({
        actor_id: ctx.userId,
        action: 'user_approved',
        entity_type: 'profile',
        entity_id: targetUserId,
        metadata: {},
    })

    // TODO: Trigger Email Delivery API Here

    revalidatePath('/settings')
    return { success: true }
}

export async function rejectUser(targetUserId: string): Promise<SettingsResult> {
    const ctx = await assertAdmin()
    if ('error' in ctx) return { success: false, error: ctx.error }

    const { error } = await ctx.service
        .from('profiles')
        .update({ signup_status: 'rejected', is_active: false, updated_at: new Date().toISOString() })
        .eq('id', targetUserId)

    if (error) return { success: false, error: error.message }

    await ctx.service.from('audit_log').insert({
        actor_id: ctx.userId,
        action: 'user_rejected',
        entity_type: 'profile',
        entity_id: targetUserId,
        metadata: {},
    })

    revalidatePath('/settings')
    return { success: true }
}

