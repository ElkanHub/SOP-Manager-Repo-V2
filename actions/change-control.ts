'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export type ChangeControlActionResult =
  | { success: true; id?: string; ccNumber?: string; data?: unknown }
  | { success: false; error: string }

// Benign manual transitions QA can drive directly. Terminal transitions
// (effective / closed) are NOT here — they go through guarded RPCs
// (confirm reconciliation, close_change_control) so their preconditions hold.
export type ChangeControlLifecycleStatus =
  | 'documents_in_review'
  | 'signatures_pending'
  | 'pending_reconciliation'
  | 'pending_training'

export type ChangeControlDocumentInput = {
  documentId?: string | null
  documentNumber: string
  documentTitle: string
  documentLevel?: string | null
  documentType?: string | null
  department?: string | null
  oldRevision?: string | null
  newRevision?: string | null
  reasonForChange?: string | null
  trainingRequired?: boolean
}

export type ChangeControlRequestInput = {
  title: string
  originatingDepartment: string
  rationale: string
  impactAssessment: string
  affectedDepartments: string[]
  requestedDueDate?: string | null
  documents: ChangeControlDocumentInput[]
}

const OPEN_PACKAGE_PATHS = [
  '/requests/change-control',
  '/requests/hub/change-control',
  '/dashboard',
  '/reports',
]

async function getActiveUser() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return null

  const service = await createServiceClient()
  const { data: profile } = await service
    .from('profiles')
    .select('id, full_name, department, role, is_active, is_admin, onboarding_complete')
    .eq('id', user.id)
    .single()

  if (!profile?.is_active) return null
  return { user, profile, service }
}

async function isQaOrAdmin(userId: string, isAdmin: boolean, service: Awaited<ReturnType<typeof createServiceClient>>) {
  if (isAdmin) return true
  const { data: isQa } = await service.rpc('is_qa_manager', { user_id: userId })
  return !!isQa
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function revalidateChangeControlPaths(id?: string) {
  OPEN_PACKAGE_PATHS.forEach((path) => revalidatePath(path))
  if (id) {
    revalidatePath(`/requests/change-control/${id}`)
    revalidatePath(`/requests/hub/change-control/${id}`)
    revalidatePath(`/change-control/${id}`)
  }
}

async function notifyQaManagers(args: {
  service: Awaited<ReturnType<typeof createServiceClient>>
  senderId: string
  ccId: string
  title: string
  body: string
}) {
  const { service, senderId, ccId, title, body } = args
  const { data: qaDept } = await service
    .from('departments')
    .select('name')
    .eq('is_qa', true)
    .single()

  if (!qaDept?.name) return

  const { data: qaUsers } = await service
    .from('profiles')
    .select('id')
    .eq('department', qaDept.name)
    .eq('role', 'manager')
    .eq('is_active', true)

  const inserts = (qaUsers || []).map((qa) => ({
    sender_id: senderId,
    recipient_id: qa.id,
    type: 'request_update' as const,
    title,
    body,
    entity_type: 'change_control',
    entity_id: ccId,
    audience: 'self' as const,
  }))

  if (inserts.length > 0) {
    await service.from('pulse_items').insert(inserts)
  }
}

async function notifyRequester(args: {
  service: Awaited<ReturnType<typeof createServiceClient>>
  senderId: string
  requesterId: string | null
  ccId: string
  title: string
  body: string
}) {
  if (!args.requesterId) return

  await args.service.from('pulse_items').insert({
    sender_id: args.senderId,
    recipient_id: args.requesterId,
    type: 'request_update',
    title: args.title,
    body: args.body,
    entity_type: 'change_control',
    entity_id: args.ccId,
    audience: 'self',
  })
}

export async function submitChangeControlRequest(input: ChangeControlRequestInput): Promise<ChangeControlActionResult> {
  const ctx = await getActiveUser()
  if (!ctx) return { success: false, error: 'Not authenticated' }

  const { user, profile, service } = ctx

  const title = cleanText(input.title, 160)
  const originatingDepartment = cleanText(input.originatingDepartment, 120)
  const rationale = cleanText(input.rationale, 4000)
  const impactAssessment = cleanText(input.impactAssessment, 4000)
  const affectedDepartments = Array.from(new Set((input.affectedDepartments || []).map((d) => cleanText(d, 120)).filter(Boolean)))
  const documents = (input.documents || [])
    .map((doc) => ({
      document_id: doc.documentId || null,
      document_number: cleanText(doc.documentNumber, 120),
      document_title: cleanText(doc.documentTitle, 220),
      document_level: cleanText(doc.documentLevel || 'level_2', 40) || 'level_2',
      document_type: cleanText(doc.documentType || 'sop', 80) || 'sop',
      department: cleanText(doc.department || originatingDepartment, 120) || originatingDepartment,
      old_revision: cleanText(doc.oldRevision || '', 40) || null,
      new_revision: cleanText(doc.newRevision || '', 40) || null,
      reason_for_change: cleanText(doc.reasonForChange || rationale, 1500) || rationale,
      training_required: !!doc.trainingRequired,
    }))
    .filter((doc) => doc.document_number && doc.document_title)

  if (title.length < 5) return { success: false, error: 'Title must be at least 5 characters' }
  if (!originatingDepartment) return { success: false, error: 'Originating department is required' }
  if (rationale.length < 20) return { success: false, error: 'Rationale must be at least 20 characters' }
  if (impactAssessment.length < 20) return { success: false, error: 'Impact assessment must be at least 20 characters' }
  if (documents.length === 0) return { success: false, error: 'Add at least one affected document' }
  if (documents.length > 25) return { success: false, error: 'A Change Control package can include up to 25 documents' }

  const dueDate = input.requestedDueDate ? new Date(input.requestedDueDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  if (dueDate && Number.isNaN(dueDate.getTime())) {
    return { success: false, error: 'Requested due date is invalid' }
  }

  const { data: changeControl, error: ccError } = await service
    .from('change_controls')
    .insert({
      title,
      requester_id: user.id,
      originating_department: originatingDepartment,
      rationale,
      impact_assessment: impactAssessment,
      affected_departments: affectedDepartments.length > 0 ? affectedDepartments : [originatingDepartment],
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      deadline: dueDate ? dueDate.toISOString() : null,
      issued_by: user.id,
      required_signatories: [],
    })
    .select('id, cc_number')
    .single()

  if (ccError || !changeControl) {
    return { success: false, error: ccError?.message || 'Failed to submit Change Control' }
  }

  const documentRows = documents.map((doc) => ({
    ...doc,
    change_control_id: changeControl.id,
  }))

  const { error: docError } = await service
    .from('change_control_documents')
    .insert(documentRows)

  if (docError) {
    await service.from('change_controls').delete().eq('id', changeControl.id)
    return { success: false, error: docError.message }
  }

  await notifyQaManagers({
    service,
    senderId: user.id,
    ccId: changeControl.id,
    title: `Change Control submitted: ${changeControl.cc_number}`,
    body: `${profile.full_name || 'A department user'} submitted ${changeControl.cc_number} for QA screening.`,
  })

  await service.from('audit_log').insert({
    actor_id: user.id,
    action: 'change_control_submitted',
    entity_type: 'change_control',
    entity_id: changeControl.id,
  })

  revalidateChangeControlPaths(changeControl.id)
  return { success: true, id: changeControl.id, ccNumber: changeControl.cc_number }
}

export async function screenChangeControlRequest(
  changeControlId: string,
  decision: 'approve' | 'clarification' | 'reject',
  note?: string,
): Promise<ChangeControlActionResult> {
  const ctx = await getActiveUser()
  if (!ctx) return { success: false, error: 'Not authenticated' }

  const { user, profile, service } = ctx
  const canScreen = await isQaOrAdmin(user.id, !!profile.is_admin, service)
  if (!canScreen) return { success: false, error: 'Only QA can screen Change Controls' }

  const qaNote = cleanText(note || '', 1500)

  const { data: current, error: fetchError } = await service
    .from('change_controls')
    .select('id, cc_number, title, requester_id, status')
    .eq('id', changeControlId)
    .single()

  if (fetchError || !current) {
    return { success: false, error: fetchError?.message || 'Change Control not found' }
  }

  const update: Record<string, unknown> = {
    qa_owner_id: user.id,
    screened_at: new Date().toISOString(),
  }

  let auditAction = 'change_control_screened'
  let requesterTitle = `Change Control screened: ${current.cc_number}`
  let requesterBody = `${current.cc_number} has been screened by QA.`

  if (decision === 'approve') {
    // Begin screening. The change must complete its impact assessment and be
    // classified (classifyChangeControl) before it can be approved for document
    // work — there is no "submit anyway" (§7.2).
    update.status = 'impact_pending'
    update.clarification_request = null
    update.rejection_reason = null
    auditAction = 'change_control_screening_started'
    requesterTitle = `Change Control in screening: ${current.cc_number}`
    requesterBody = `${current.cc_number} is being screened by QA (impact assessment + classification).`
  } else if (decision === 'clarification') {
    if (qaNote.length < 5) return { success: false, error: 'Clarification note is required' }
    update.status = 'clarification_requested'
    update.clarification_request = qaNote
    update.clarification_requested_at = new Date().toISOString()
    auditAction = 'change_control_clarification_requested'
    requesterTitle = `Clarification requested: ${current.cc_number}`
    requesterBody = qaNote
  } else {
    if (qaNote.length < 5) return { success: false, error: 'Rejection reason is required' }
    update.status = 'rejected'
    update.rejection_reason = qaNote
    update.rejected_at = new Date().toISOString()
    auditAction = 'change_control_rejected'
    requesterTitle = `Change Control rejected: ${current.cc_number}`
    requesterBody = qaNote
  }

  const { data: updated, error: updateError } = await service
    .from('change_controls')
    .update(update)
    .eq('id', changeControlId)
    .select('*')
    .single()

  if (updateError) return { success: false, error: updateError.message }

  await notifyRequester({
    service,
    senderId: user.id,
    requesterId: current.requester_id,
    ccId: changeControlId,
    title: requesterTitle,
    body: requesterBody,
  })

  await service.from('audit_log').insert({
    actor_id: user.id,
    action: auditAction,
    entity_type: 'change_control',
    entity_id: changeControlId,
  })

  revalidateChangeControlPaths(changeControlId)
  return { success: true, data: updated }
}

export async function updateChangeControlStatus(
  changeControlId: string,
  status: ChangeControlLifecycleStatus,
): Promise<ChangeControlActionResult> {
  const ctx = await getActiveUser()
  if (!ctx) return { success: false, error: 'Not authenticated' }

  const { user, profile, service } = ctx
  const canUpdate = await isQaOrAdmin(user.id, !!profile.is_admin, service)
  if (!canUpdate) return { success: false, error: 'Only QA can update Change Control status' }

  const { data, error } = await service
    .from('change_controls')
    .update({ status })
    .eq('id', changeControlId)
    .select('*')
    .single()

  if (error) return { success: false, error: error.message }

  await service.from('audit_log').insert({
    actor_id: user.id,
    action: `change_control_status_${status}`,
    entity_type: 'change_control',
    entity_id: changeControlId,
  })

  revalidateChangeControlPaths(changeControlId)
  return { success: true, data }
}

// ─── Impact + classification gate (§7.2 / §7.3) ──────────────────────────────
// Completes the impact assessment and assigns a risk class. Server-side the RPC
// refuses to advance until every required impact field is present (no submit-anyway),
// and the chosen class drives the signature matrix.
export async function classifyChangeControl(
  changeControlId: string,
  classification: 'minor' | 'major' | 'critical',
  impact: import('@/types/app.types').ChangeControlImpact,
  reason?: string,
): Promise<ChangeControlActionResult> {
  const ctx = await getActiveUser()
  if (!ctx) return { success: false, error: 'Not authenticated' }
  const { user, profile, service } = ctx
  if (!(await isQaOrAdmin(user.id, !!profile.is_admin, service))) {
    return { success: false, error: 'Only QA can classify a Change Control' }
  }

  const { error } = await service.rpc('classify_change_control', {
    p_cc_id: changeControlId,
    p_actor_id: user.id,
    p_classification: classification,
    p_impact: impact,
    p_reason: cleanText(reason || '', 1500) || null,
  })
  if (error) return { success: false, error: error.message }
  revalidateChangeControlPaths(changeControlId)
  return { success: true }
}

// Approve a classified change for document work. The RPC runs the concurrency
// check: if an affected document is locked under another open CC it returns
// 'queued' (waits); otherwise 'approved_for_document_work' and locks the docs.
export async function approveChangeControlForWork(
  changeControlId: string,
): Promise<ChangeControlActionResult> {
  const ctx = await getActiveUser()
  if (!ctx) return { success: false, error: 'Not authenticated' }
  const { user, profile, service } = ctx
  if (!(await isQaOrAdmin(user.id, !!profile.is_admin, service))) {
    return { success: false, error: 'Only QA can approve a Change Control for work' }
  }

  const { data, error } = await service.rpc('approve_cc_for_work', {
    p_cc_id: changeControlId,
    p_actor_id: user.id,
  })
  if (error) return { success: false, error: error.message }
  revalidateChangeControlPaths(changeControlId)
  return { success: true, data }
}

// ─── Effectiveness review before closure (§7.12) ─────────────────────────────
export async function openEffectivenessReview(
  changeControlId: string,
  dueDate?: string,
): Promise<ChangeControlActionResult> {
  const ctx = await getActiveUser()
  if (!ctx) return { success: false, error: 'Not authenticated' }
  const { user, profile, service } = ctx
  if (!(await isQaOrAdmin(user.id, !!profile.is_admin, service))) {
    return { success: false, error: 'Only QA can open an effectiveness review' }
  }
  const { error } = await service.rpc('enter_effectiveness_review', {
    p_cc_id: changeControlId,
    p_actor_id: user.id,
    p_due: dueDate || null,
  })
  if (error) return { success: false, error: error.message }
  revalidateChangeControlPaths(changeControlId)
  return { success: true }
}

// Close a change. The RPC enforces reviewer ≠ requester (independent approver).
export async function closeChangeControl(
  changeControlId: string,
  outcome: string,
): Promise<ChangeControlActionResult> {
  const ctx = await getActiveUser()
  if (!ctx) return { success: false, error: 'Not authenticated' }
  const { user, profile, service } = ctx
  if (!(await isQaOrAdmin(user.id, !!profile.is_admin, service))) {
    return { success: false, error: 'Only QA can close a Change Control' }
  }
  const cleanOutcome = cleanText(outcome, 2000)
  if (cleanOutcome.length < 5) return { success: false, error: 'An effectiveness outcome statement is required' }

  const { error } = await service.rpc('close_change_control', {
    p_cc_id: changeControlId,
    p_actor_id: user.id,
    p_outcome: cleanOutcome,
  })
  if (error) return { success: false, error: error.message }
  revalidateChangeControlPaths(changeControlId)
  return { success: true }
}

// Set the draft (proposed new revision + uploaded file) for one affected document.
export async function setChangeControlDocumentDraft(
  documentRowId: string,
  input: { newRevision?: string | null; newFileUrl?: string | null; trainingRequired?: boolean },
  changeControlId?: string,
): Promise<ChangeControlActionResult> {
  const ctx = await getActiveUser()
  if (!ctx) return { success: false, error: 'Not authenticated' }

  const { user, profile, service } = ctx
  if (!(await isQaOrAdmin(user.id, !!profile.is_admin, service))) {
    return { success: false, error: 'Only QA can set document drafts' }
  }

  const { error } = await service.rpc('set_cc_document_draft', {
    p_doc_id: documentRowId,
    p_actor: user.id,
    p_new_revision: cleanText(input.newRevision || '', 40) || null,
    p_new_file_url: cleanText(input.newFileUrl || '', 1000) || null,
    p_training_required: typeof input.trainingRequired === 'boolean' ? input.trainingRequired : null,
  })

  if (error) return { success: false, error: error.message }
  revalidateChangeControlPaths(changeControlId)
  return { success: true }
}

// QA review decision on one affected document. When every document is approved,
// the package auto-advances to signatures_pending (see set_cc_document_review).
export async function reviewChangeControlDocument(
  documentRowId: string,
  decision: 'in_review' | 'approved' | 'changes_requested' | 'rejected',
  comment?: string,
  changeControlId?: string,
): Promise<ChangeControlActionResult> {
  const ctx = await getActiveUser()
  if (!ctx) return { success: false, error: 'Not authenticated' }

  const { user, profile, service } = ctx
  if (!(await isQaOrAdmin(user.id, !!profile.is_admin, service))) {
    return { success: false, error: 'Only QA can review documents' }
  }

  const { error } = await service.rpc('set_cc_document_review', {
    p_doc_id: documentRowId,
    p_actor: user.id,
    p_decision: decision,
    p_comment: cleanText(comment || '', 1500) || null,
  })

  if (error) return { success: false, error: error.message }
  revalidateChangeControlPaths(changeControlId)
  return { success: true }
}

// Release a training-required affected document to effective once its SOP's
// training-completion threshold is met. When every document is effective the
// package auto-advances to effective (cc_recheck_effective).
export async function releaseChangeControlDocumentTraining(
  documentRowId: string,
  effectiveDate: string,
  changeControlId?: string,
): Promise<ChangeControlActionResult> {
  const ctx = await getActiveUser()
  if (!ctx) return { success: false, error: 'Not authenticated' }

  const { user, profile, service } = ctx
  if (!(await isQaOrAdmin(user.id, !!profile.is_admin, service))) {
    return { success: false, error: 'Only QA can release training gates' }
  }
  // Training release puts the document in force now; a future date would desync the
  // CC from the SOP (which would go `scheduled`). Block future dates here.
  if (effectiveDate && effectiveDate > new Date().toISOString().slice(0, 10)) {
    return { success: false, error: 'Releasing a trained document makes it effective now — the effective date cannot be in the future.' }
  }

  const { data: doc } = await service
    .from('change_control_documents')
    .select('id, document_id, change_control_id')
    .eq('id', documentRowId)
    .single()

  if (!doc?.document_id) return { success: false, error: 'Document is not linked to an SOP' }

  const { data: sop } = await service
    .from('sops')
    .select('training_required, training_completion_threshold')
    .eq('id', doc.document_id)
    .single()

  if (sop?.training_required) {
    const { data: modules } = await service
      .from('training_modules')
      .select('id')
      .eq('sop_id', doc.document_id)
      .neq('status', 'archived')
    const moduleIds = (modules || []).map((m) => m.id)
    if (moduleIds.length === 0) {
      return { success: false, error: 'Training is required, but no linked training module exists for this SOP.' }
    }
    const { data: assignments } = await service
      .from('training_assignments')
      .select('status')
      .in('module_id', moduleIds)
    const total = assignments?.length || 0
    const completed = assignments?.filter((a) => a.status === 'completed').length || 0
    const rate = total === 0 ? 0 : Math.round((completed / total) * 100)
    const threshold = sop.training_completion_threshold ?? 80
    if (total === 0 || rate < threshold) {
      return { success: false, error: `Training completion is ${rate}%. Required threshold is ${threshold}%.` }
    }
  }

  const { error: actErr } = await service.rpc('activate_sop_effective', {
    p_sop_id: doc.document_id,
    p_effective_date: effectiveDate,
    p_actor_id: user.id,
    p_audit_action: 'cc_training_gate_released',
  })
  if (actErr) return { success: false, error: actErr.message }

  await service
    .from('change_control_documents')
    .update({ review_status: 'effective', effective_date: effectiveDate, training_status: 'complete' })
    .eq('id', documentRowId)

  await service.rpc('cc_recheck_effective', { p_cc_id: doc.change_control_id })

  revalidateChangeControlPaths(changeControlId)
  return { success: true }
}
