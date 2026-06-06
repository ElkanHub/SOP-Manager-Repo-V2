"use server"

import { createServiceClient, createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendApprovalEmail } from './email'

// ─── Shared result type ──────────────────────────────────────────────────────
export type SettingsResult =
    | { success: true }
    | { success: false; error: string }

const DEPARTMENT_CODE_PATTERN = /^[A-Z0-9]{2,10}$/
const NUMBERING_TOKEN_PATTERN = /\{(DEPT|TYPE|SEQ|YYYY|YY)\}/g

function normalizeDepartmentCode(code: string) {
    return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function validateDepartmentCode(code: string) {
    const normalized = normalizeDepartmentCode(code)
    if (!DEPARTMENT_CODE_PATTERN.test(normalized)) {
        return { ok: false as const, error: 'Department code must be 2-10 uppercase letters/numbers with no spaces or slashes.' }
    }
    return { ok: true as const, code: normalized }
}

function validateNumberingTemplate(formatTemplate: string, sequencePadding: number) {
    const template = formatTemplate.trim().toUpperCase()
    if (!template.includes('{DEPT}') || !template.includes('{SEQ}')) {
        return { ok: false as const, error: 'Format must include {DEPT} and {SEQ} tokens.' }
    }
    const stripped = template.replace(NUMBERING_TOKEN_PATTERN, '')
    if (/[{}]/.test(stripped)) {
        return { ok: false as const, error: 'Format contains unsupported tokens.' }
    }
    if (!template.includes('SOP') && !template.includes('{TYPE}')) {
        return { ok: false as const, error: 'SOP format must include SOP or {TYPE}.' }
    }
    if (sequencePadding < 2 || sequencePadding > 8) {
        return { ok: false as const, error: 'Sequence padding must be between 2 and 8.' }
    }
    return { ok: true as const, template }
}

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

export async function addDepartment(name: string, colour: string, code: string): Promise<SettingsResult> {
    const ctx = await assertAdmin()
    if ('error' in ctx) return { success: false, error: ctx.error }

    const validated = validateDepartmentCode(code)
    if (!validated.ok) return { success: false, error: validated.error }

    const { error } = await ctx.service.from('departments').insert({ name, colour, code: validated.code })
    if (error) {
        if (error.code === '23505') return { success: false, error: 'A department with that name or code already exists.' }
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

export async function updateDepartmentDetails(id: string, data: { colour: string; code: string }): Promise<SettingsResult> {
    const ctx = await assertAdmin()
    if ('error' in ctx) return { success: false, error: ctx.error }

    const validated = validateDepartmentCode(data.code)
    if (!validated.ok) return { success: false, error: validated.error }

    const { error } = await ctx.service
        .from('departments')
        .update({ colour: data.colour, code: validated.code })
        .eq('id', id)

    if (error) {
        if (error.code === '23505') return { success: false, error: 'A department with that code already exists.' }
        return { success: false, error: error.message }
    }

    await ctx.service.from('audit_log').insert({
        actor_id: ctx.userId,
        action: 'department_document_code_updated',
        entity_type: 'department',
        entity_id: id,
        metadata: { code: validated.code, colour: data.colour },
    })

    revalidatePath('/settings')
    return { success: true }
}

export async function updateDocumentNumberingSettings(data: {
    formatTemplate: string
    sequencePadding: number
}): Promise<SettingsResult> {
    const ctx = await assertAdmin()
    if ('error' in ctx) return { success: false, error: ctx.error }

    const validated = validateNumberingTemplate(data.formatTemplate, data.sequencePadding)
    if (!validated.ok) return { success: false, error: validated.error }

    const { data: existing } = await ctx.service
        .from('document_numbering_settings')
        .select('id')
        .eq('document_type', 'SOP')
        .eq('is_active', true)
        .single()

    const payload = {
        format_template: validated.template,
        sequence_padding: data.sequencePadding,
        sequence_scope: 'department_document_type',
        document_type: 'SOP',
        is_active: true,
        updated_at: new Date().toISOString(),
    }

    const { error } = existing?.id
        ? await ctx.service.from('document_numbering_settings').update(payload).eq('id', existing.id)
        : await ctx.service.from('document_numbering_settings').insert(payload)

    if (error) return { success: false, error: error.message }

    await ctx.service.from('audit_log').insert({
        actor_id: ctx.userId,
        action: 'document_numbering_settings_updated',
        entity_type: 'document_numbering_settings',
        entity_id: existing?.id || null,
        metadata: { format_template: validated.template, sequence_padding: data.sequencePadding },
    })

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

    // Check if this is the "Test Pending User"
    const { data: targetProfile } = await ctx.service
        .from('profiles')
        .select('full_name')
        .eq('id', targetUserId)
        .single()

    const isTestUser = targetProfile?.full_name === 'Test Pending User'

    if (isTestUser) {
        // Reset to pending instead of deactivating
        const { error } = await ctx.service
            .from('profiles')
            .update({ 
                signup_status: 'pending',
                onboarding_complete: false,
                department: null,
                role: 'employee',
                is_active: true,
                updated_at: new Date().toISOString() 
            })
            .eq('id', targetUserId)

        if (error) return { success: false, error: error.message }
        
        await ctx.service.from('audit_log').insert({
            actor_id: ctx.userId,
            action: 'user_reset_to_pending',
            entity_type: 'profile',
            entity_id: targetUserId,
            metadata: { note: 'Test user reset' },
        })
    } else {
        // Normal deactivation
        const { error } = await ctx.service
            .from('profiles')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', targetUserId)

        if (error) return { success: false, error: error.message }
        
        await ctx.service.from('audit_log').insert({
            actor_id: ctx.userId,
            action: 'user_deactivated',
            entity_type: 'profile',
            entity_id: targetUserId,
            metadata: {},
        })
    }

    // Invalidate user session immediately
    await ctx.service.auth.admin.signOut(targetUserId)

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

    // Fetch the target user's email address securely from Auth admin panel
    const { data: authData } = await ctx.service.auth.admin.getUserById(targetUserId)
    const { data: profileData } = await ctx.service.from('profiles').select('full_name').eq('id', targetUserId).single()

    if (authData?.user?.email && profileData?.full_name) {
        await sendApprovalEmail(authData.user.email, profileData.full_name)
    }

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

