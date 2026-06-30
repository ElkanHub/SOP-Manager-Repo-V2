'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ChangeControlImpact } from '@/types/app.types'

export type LifecycleResult =
  | { success: true; id?: string; data?: unknown }
  | { success: false; error: string }

async function getActiveCtx() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return null
  const service = await createServiceClient()
  const { data: profile } = await service
    .from('profiles')
    .select('id, full_name, department, role, is_active, is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_active) return null
  return { user, profile, service }
}

async function isQaOrAdmin(userId: string, isAdmin: boolean, service: Awaited<ReturnType<typeof createServiceClient>>) {
  if (isAdmin) return true
  const { data } = await service.rpc('is_qa_manager', { user_id: userId })
  return !!data
}

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function revalidateLifecycle(documentId?: string) {
  ;['/library', '/dashboard', '/requests', '/requests/retirements', '/reports'].forEach((p) => revalidatePath(p))
  if (documentId) revalidatePath(`/library/${documentId}`)
}

// ─── Retirement pipe (§8) ─────────────────────────────────────────────────────
export async function requestSopRetirement(documentId: string, justification: string): Promise<LifecycleResult> {
  const ctx = await getActiveCtx()
  if (!ctx) return { success: false, error: 'Not authenticated' }
  const reason = clean(justification, 2000)
  if (reason.length < 10) return { success: false, error: 'Please provide a retirement justification (at least 10 characters).' }

  const { data, error } = await ctx.service.rpc('request_sop_retirement', {
    p_document_id: documentId,
    p_actor_id: ctx.user.id,
    p_justification: reason,
  })
  if (error) return { success: false, error: error.message }
  revalidateLifecycle(documentId)
  return { success: true, id: data as string }
}

export async function approveSopRetirement(retirementId: string): Promise<LifecycleResult> {
  const ctx = await getActiveCtx()
  if (!ctx) return { success: false, error: 'Not authenticated' }
  if (!(await isQaOrAdmin(ctx.user.id, !!ctx.profile.is_admin, ctx.service))) {
    return { success: false, error: 'Only QA can approve retirement' }
  }
  const { error } = await ctx.service.rpc('approve_sop_retirement', { p_retirement_id: retirementId, p_actor_id: ctx.user.id })
  if (error) return { success: false, error: error.message }
  revalidateLifecycle()
  return { success: true }
}

export async function rejectSopRetirement(retirementId: string, reason: string): Promise<LifecycleResult> {
  const ctx = await getActiveCtx()
  if (!ctx) return { success: false, error: 'Not authenticated' }
  if (!(await isQaOrAdmin(ctx.user.id, !!ctx.profile.is_admin, ctx.service))) {
    return { success: false, error: 'Only QA can reject retirement' }
  }
  const r = clean(reason, 1500)
  if (r.length < 5) return { success: false, error: 'A rejection reason is required.' }
  const { error } = await ctx.service.rpc('reject_sop_retirement', { p_retirement_id: retirementId, p_actor_id: ctx.user.id, p_reason: r })
  if (error) return { success: false, error: error.message }
  revalidateLifecycle()
  return { success: true }
}

export async function destroyRetiredDocument(retirementId: string, method = 'secure_deletion'): Promise<LifecycleResult> {
  const ctx = await getActiveCtx()
  if (!ctx) return { success: false, error: 'Not authenticated' }
  if (!(await isQaOrAdmin(ctx.user.id, !!ctx.profile.is_admin, ctx.service))) {
    return { success: false, error: 'Only QA can authorize destruction' }
  }
  const { error } = await ctx.service.rpc('destroy_retired_document', {
    p_retirement_id: retirementId,
    p_actor_id: ctx.user.id,
    p_method: clean(method, 80) || 'secure_deletion',
  })
  if (error) return { success: false, error: error.message }
  revalidateLifecycle()
  return { success: true }
}

// ─── Controlled-copy register (§7.9 / §10.6) ──────────────────────────────────
export async function issueControlledCopy(input: {
  documentId: string
  documentVersion: string
  copyNumber: number
  holder: string
}): Promise<LifecycleResult> {
  const ctx = await getActiveCtx()
  if (!ctx) return { success: false, error: 'Not authenticated' }
  if (!(await isQaOrAdmin(ctx.user.id, !!ctx.profile.is_admin, ctx.service))) {
    return { success: false, error: 'Only QA can issue controlled copies' }
  }
  const holder = clean(input.holder, 200)
  if (!holder) return { success: false, error: 'A copy holder/location is required.' }

  const { error } = await ctx.service.from('controlled_copies').insert({
    document_id: input.documentId,
    document_version: clean(input.documentVersion, 40),
    copy_number: input.copyNumber,
    holder,
    issued_by: ctx.user.id,
  })
  if (error) return { success: false, error: error.message }
  revalidateLifecycle(input.documentId)
  return { success: true }
}

export async function reconcileControlledCopy(
  copyId: string,
  method: 'returned' | 'destroyed' | 'force_overridden',
  reason?: string,
): Promise<LifecycleResult> {
  const ctx = await getActiveCtx()
  if (!ctx) return { success: false, error: 'Not authenticated' }
  if (!(await isQaOrAdmin(ctx.user.id, !!ctx.profile.is_admin, ctx.service))) {
    return { success: false, error: 'Only QA can reconcile controlled copies' }
  }
  if (method === 'force_overridden' && clean(reason || '', 1500).length < 5) {
    return { success: false, error: 'A reason is required to force-reconcile a copy.' }
  }
  const { error } = await ctx.service.rpc('reconcile_controlled_copy', {
    p_copy_id: copyId,
    p_actor_id: ctx.user.id,
    p_method: method,
    p_reason: clean(reason || '', 1500) || null,
  })
  if (error) return { success: false, error: error.message }
  revalidateLifecycle()
  return { success: true }
}

// ─── Classification matrix (data-driven, QA-editable, §10.10) ─────────────────
export async function updateClassificationMatrixRow(
  classification: 'minor' | 'major' | 'critical',
  fields: {
    require_qa: boolean
    require_owning_managers: boolean
    require_site_quality_head: boolean
    require_revalidation: boolean
    require_regulatory_notification: boolean
    description?: string
  },
): Promise<LifecycleResult> {
  const ctx = await getActiveCtx()
  if (!ctx) return { success: false, error: 'Not authenticated' }
  if (!(await isQaOrAdmin(ctx.user.id, !!ctx.profile.is_admin, ctx.service))) {
    return { success: false, error: 'Only QA can edit the classification matrix' }
  }
  const { error } = await ctx.service
    .from('classification_matrix')
    .update({
      require_qa: fields.require_qa,
      require_owning_managers: fields.require_owning_managers,
      require_site_quality_head: fields.require_site_quality_head,
      require_revalidation: fields.require_revalidation,
      require_regulatory_notification: fields.require_regulatory_notification,
      description: clean(fields.description || '', 500) || null,
      updated_by: ctx.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('classification', classification)
  if (error) return { success: false, error: error.message }
  revalidatePath('/settings/classification-matrix')
  return { success: true }
}

// ─── Periodic review sign-off (§11, gap #19) ──────────────────────────────────
export async function recordPeriodicReview(
  documentId: string,
  outcome: 'no_change' | 'revision_needed' | 'retire',
  notes?: string,
): Promise<LifecycleResult> {
  const ctx = await getActiveCtx()
  if (!ctx) return { success: false, error: 'Not authenticated' }
  const { data, error } = await ctx.service.rpc('record_periodic_review', {
    p_document_id: documentId,
    p_actor_id: ctx.user.id,
    p_outcome: outcome,
    p_notes: clean(notes || '', 2000) || null,
  })
  if (error) return { success: false, error: error.message }
  revalidateLifecycle(documentId)
  return { success: true, id: data as string }
}

// Re-export the impact type so client forms import from one place.
export type { ChangeControlImpact }
