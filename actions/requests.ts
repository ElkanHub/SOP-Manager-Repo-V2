'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type RequestActionResult =
  | { success: true; referenceNumber?: string }
  | { success: false; error: string }

// ─── Helper: assert active session ──────────────────────────────────────────
async function getActiveUser() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return null

  const service = await createServiceClient()
  const { data: profile } = await service
    .from('profiles')
    .select('id, is_active, is_admin, department, role, full_name, job_title, employee_id, email:id')
    .eq('id', user.id)
    .single()

  if (!profile?.is_active) return null
  return { user, profile, service, client }
}

// ─── Helper: check QA Manager status ─────────────────────────────────────────
async function assertQaManager(userId: string, service: Awaited<ReturnType<typeof createServiceClient>>) {
  const { data: isQa } = await service.rpc('is_qa_manager', { user_id: userId })
  if (!isQa) return false
  return true
}

// ─── submitDocumentRequest ────────────────────────────────────────────────────
export async function submitDocumentRequest(requestBody: string): Promise<RequestActionResult> {
  const ctx = await getActiveUser()
  if (!ctx) return { success: false, error: 'Not authenticated' }

  const { user, service, client } = ctx

  // Validate request body
  const trimmed = requestBody.trim()
  if (trimmed.length < 10) return { success: false, error: 'Request must be at least 10 characters' }
  if (trimmed.length > 2000) return { success: false, error: 'Request must be under 2000 characters' }

  // Get full profile for metadata snapshot
  const { data: fullProfile } = await service
    .from('profiles')
    .select('full_name, department, role, job_title, employee_id')
    .eq('id', user.id)
    .single()

  if (!fullProfile) return { success: false, error: 'Could not load your profile' }

  // Get email from auth
  const { data: { user: authUser } } = await client.auth.getUser()
  const email = authUser?.email || ''

  // INSERT using regular client (RLS enforces requester_id = auth.uid())
  const { data: newRequest, error: insertError } = await client
    .from('document_requests')
    .insert({
      requester_id:         user.id,
      requester_name:       fullProfile.full_name,
      requester_email:      email,
      requester_department: fullProfile.department || '',
      requester_role:       fullProfile.role || 'employee',
      requester_job_title:  fullProfile.job_title || null,
      requester_employee_id: fullProfile.employee_id || null,
      request_body:         trimmed,
    })
    .select('id, reference_number')
    .single()

  if (insertError || !newRequest) {
    return { success: false, error: insertError?.message || 'Failed to submit request' }
  }

  const { id: newId, reference_number } = newRequest

  // Find all active QA Managers to notify
  const { data: qaManagers } = await service
    .from('profiles')
    .select('id')
    .eq('role', 'manager')
    .eq('is_active', true)

  // Filter to actual QA managers using the is_qa column on departments
  const { data: qaDept } = await service
    .from('departments')
    .select('name')
    .eq('is_qa', true)
    .single()

  const qaDeptName = qaDept?.name || null

  const qaManagerIds = qaDeptName
    ? (qaManagers || []).filter(async () => true) // All QA dept managers
    : []

  // More reliable: query by QA dept directly
  const { data: qaUsers } = await service
    .from('profiles')
    .select('id')
    .eq('role', 'manager')
    .eq('department', qaDeptName || '')
    .eq('is_active', true)

  if (qaUsers && qaUsers.length > 0) {
    const pulseInserts = qaUsers.map(qa => ({
      sender_id:   user.id,
      recipient_id: qa.id,
      type:        'request_update' as const,
      title:       'New Document Request',
      body:        `${fullProfile.full_name} from ${fullProfile.department} has submitted a document request.`,
      entity_type: 'document_request',
      entity_id:   newId,
      audience:    'self' as const,
    }))

    await service.from('pulse_items').insert(pulseInserts)
  }

  // Audit log
  await service.from('audit_log').insert({
    actor_id:    user.id,
    action:      'request_submitted',
    entity_type: 'document_request',
    entity_id:   newId,
  })

  revalidatePath('/requests')
  return { success: true, referenceNumber: reference_number }
}

// ─── markRequestReceived ──────────────────────────────────────────────────────
export async function markRequestReceived(requestId: string): Promise<RequestActionResult> {
  const ctx = await getActiveUser()
  if (!ctx) return { success: false, error: 'Not authenticated' }

  const { user, service } = ctx

  const isQa = await assertQaManager(user.id, service)
  if (!isQa) return { success: false, error: 'Only QA Managers can perform this action' }

  const { error } = await service.rpc('mark_request_received', {
    p_request_id:  requestId,
    p_qa_user_id:  user.id,
  })

  if (error) return { success: false, error: error.message }

  // Notify requester
  const { data: req } = await service
    .from('document_requests')
    .select('requester_id, reference_number')
    .eq('id', requestId)
    .single()

  if (req) {
    await service.from('pulse_items').insert({
      sender_id:    user.id,
      recipient_id: req.requester_id,
      type:         'request_update',
      title:        'Request Received',
      body:         `Your document request ${req.reference_number} has been received by QA.`,
      entity_type:  'document_request',
      entity_id:    requestId,
      audience:     'self',
    })
  }

  revalidatePath('/requests')
  return { success: true }
}

// ─── markRequestApproved ──────────────────────────────────────────────────────
export async function markRequestApproved(requestId: string, qaNotes?: string): Promise<RequestActionResult> {
  const ctx = await getActiveUser()
  if (!ctx) return { success: false, error: 'Not authenticated' }

  const { user, service } = ctx

  const isQa = await assertQaManager(user.id, service)
  if (!isQa) return { success: false, error: 'Only QA Managers can perform this action' }

  if (qaNotes && qaNotes.length > 500) return { success: false, error: 'QA notes must be under 500 characters' }

  const { error } = await service.rpc('mark_request_approved', {
    p_request_id:  requestId,
    p_qa_user_id:  user.id,
    p_qa_notes:    qaNotes || null,
  })

  if (error) return { success: false, error: error.message }

  const { data: req } = await service
    .from('document_requests')
    .select('requester_id, reference_number')
    .eq('id', requestId)
    .single()

  if (req) {
    await service.from('pulse_items').insert({
      sender_id:    user.id,
      recipient_id: req.requester_id,
      type:         'request_update',
      title:        'Request Approved',
      body:         `Your document request ${req.reference_number} has been approved. QA will fulfil it shortly.`,
      entity_type:  'document_request',
      entity_id:    requestId,
      audience:     'self',
    })
  }

  revalidatePath('/requests')
  return { success: true }
}

// ─── markRequestFulfilled ─────────────────────────────────────────────────────
export async function markRequestFulfilled(requestId: string, qaNotes?: string): Promise<RequestActionResult> {
  const ctx = await getActiveUser()
  if (!ctx) return { success: false, error: 'Not authenticated' }

  const { user, service } = ctx

  const isQa = await assertQaManager(user.id, service)
  if (!isQa) return { success: false, error: 'Only QA Managers can perform this action' }

  if (qaNotes && qaNotes.length > 500) return { success: false, error: 'QA notes must be under 500 characters' }

  const { error } = await service.rpc('mark_request_fulfilled', {
    p_request_id:  requestId,
    p_qa_user_id:  user.id,
    p_qa_notes:    qaNotes || null,
  })

  if (error) return { success: false, error: error.message }

  const { data: req } = await service
    .from('document_requests')
    .select('requester_id, reference_number')
    .eq('id', requestId)
    .single()

  if (req) {
    await service.from('pulse_items').insert({
      sender_id:    user.id,
      recipient_id: req.requester_id,
      type:         'request_update',
      title:        'Request Fulfilled',
      body:         `Your document request ${req.reference_number} has been fulfilled by QA.`,
      entity_type:  'document_request',
      entity_id:    requestId,
      audience:     'self',
    })
  }

  revalidatePath('/requests')
  return { success: true }
}
