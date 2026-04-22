"use server"

import { createClient, createServiceClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type {
    RequestFieldType,
    RequestFieldConfig,
    RequestFormField,
    RequestFormSubmission,
} from "@/types/app.types"

// ═══════════════════════════════════════════════════════════════════════════════
// Shared helpers
// ═══════════════════════════════════════════════════════════════════════════════

type ActionResult<T = undefined> =
    | ({ success: true } & (T extends undefined ? object : { data: T }))
    | { success: false; error: string }

const MAX_FIELDS_PER_FORM = 50
const MAX_LABEL_LEN = 200
const MAX_HELPER_LEN = 500
const MAX_OPTION_LEN = 200
const MAX_OPTIONS = 100
const MAX_LONG_TEXT_ANSWER = 5000
const MAX_SHORT_TEXT_ANSWER = 500
const MAX_QA_NOTES = 1000
const VALID_FIELD_TYPES: RequestFieldType[] = [
    "short_text",
    "long_text",
    "number",
    "date",
    "dropdown",
    "radio",
    "checkbox_single",
    "checkbox_multi",
    "note_display",
]

async function getActiveUser() {
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()
    if (!user) return null

    const service = await createServiceClient()
    const { data: profile } = await service
        .from("profiles")
        .select("id, is_active, is_admin, department, role, full_name, job_title, employee_id, onboarding_complete, signup_status")
        .eq("id", user.id)
        .single()

    if (!profile?.is_active || profile.signup_status !== "approved" || !profile.onboarding_complete) {
        return null
    }

    const { data: { user: authUser } } = await client.auth.getUser()

    return {
        user,
        email: authUser?.email || "",
        profile,
        service,
        client,
    }
}

async function isQaManager(userId: string, service: Awaited<ReturnType<typeof createServiceClient>>) {
    const { data } = await service.rpc("is_qa_manager", { user_id: userId })
    return !!data
}

function sanitiseFieldInput(raw: any, index: number): { ok: true; value: Omit<RequestFormField, "id" | "form_id" | "created_at"> } | { ok: false; error: string } {
    if (!raw || typeof raw !== "object") {
        return { ok: false, error: `Field #${index + 1} is malformed` }
    }

    const label = typeof raw.label === "string" ? raw.label.trim() : ""
    const helper = raw.helper_text != null ? String(raw.helper_text).trim() : ""
    const fieldType = raw.field_type as RequestFieldType

    if (!label || label.length > MAX_LABEL_LEN) {
        return { ok: false, error: `Field #${index + 1}: label must be 1–${MAX_LABEL_LEN} characters` }
    }
    if (helper.length > MAX_HELPER_LEN) {
        return { ok: false, error: `Field #${index + 1}: helper text too long (max ${MAX_HELPER_LEN})` }
    }
    if (!VALID_FIELD_TYPES.includes(fieldType)) {
        return { ok: false, error: `Field #${index + 1}: invalid field type` }
    }

    const config: RequestFieldConfig = {}
    if (fieldType === "dropdown" || fieldType === "radio" || fieldType === "checkbox_multi") {
        const rawOptions = Array.isArray(raw.config?.options) ? raw.config.options : []
        const opts = rawOptions
            .map((o: unknown) => (typeof o === "string" ? o.trim() : ""))
            .filter((o: string) => o.length > 0 && o.length <= MAX_OPTION_LEN)
            .slice(0, MAX_OPTIONS)
        if (opts.length < 1) {
            return { ok: false, error: `Field #${index + 1}: add at least one option` }
        }
        // Deduplicate
        config.options = Array.from(new Set(opts))
    }

    if (fieldType === "number") {
        if (raw.config?.min != null && Number.isFinite(Number(raw.config.min))) config.min = Number(raw.config.min)
        if (raw.config?.max != null && Number.isFinite(Number(raw.config.max))) config.max = Number(raw.config.max)
        if (config.min != null && config.max != null && config.min > config.max) {
            return { ok: false, error: `Field #${index + 1}: min cannot exceed max` }
        }
    }

    if (raw.config?.placeholder && typeof raw.config.placeholder === "string") {
        config.placeholder = raw.config.placeholder.slice(0, 120)
    }

    const isRequired = fieldType === "note_display" ? false : !!raw.is_required

    return {
        ok: true,
        value: {
            position: index,
            label,
            helper_text: helper || null,
            field_type: fieldType,
            is_required: isRequired,
            config,
        },
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORM CRUD (QA only)
// ═══════════════════════════════════════════════════════════════════════════════

export interface FormInput {
    title: string
    description?: string
    targetDepartment?: string | null
    fields: Array<{
        label: string
        helper_text?: string
        field_type: RequestFieldType
        is_required?: boolean
        config?: RequestFieldConfig
    }>
}

export async function createRequestForm(input: FormInput): Promise<ActionResult<{ id: string }>> {
    const ctx = await getActiveUser()
    if (!ctx) return { success: false, error: "Not authenticated" }
    if (!(await isQaManager(ctx.user.id, ctx.service))) {
        return { success: false, error: "Only QA Managers can create request forms" }
    }

    const title = (input.title || "").trim()
    const description = (input.description || "").trim()
    if (!title || title.length > 200) return { success: false, error: "Title must be 1–200 characters" }
    if (description.length > 2000) return { success: false, error: "Description too long (max 2000)" }

    if (!Array.isArray(input.fields) || input.fields.length === 0) {
        return { success: false, error: "Add at least one field" }
    }
    if (input.fields.length > MAX_FIELDS_PER_FORM) {
        return { success: false, error: `Too many fields (max ${MAX_FIELDS_PER_FORM})` }
    }

    const sanitised: Array<Omit<RequestFormField, "id" | "form_id" | "created_at">> = []
    for (let i = 0; i < input.fields.length; i++) {
        const res = sanitiseFieldInput(input.fields[i], i)
        if (!res.ok) return { success: false, error: res.error }
        sanitised.push(res.value)
    }

    const { profile, user, service } = ctx

    // Validate target department if provided
    let targetDept: string | null = null
    if (input.targetDepartment) {
        const { data: deptRow } = await service
            .from("departments")
            .select("name")
            .eq("name", input.targetDepartment)
            .maybeSingle()
        if (!deptRow) return { success: false, error: "Invalid target department" }
        targetDept = deptRow.name
    }

    const { data: form, error: formError } = await service
        .from("request_forms")
        .insert({
            title,
            description: description || null,
            target_department: targetDept,
            created_by: user.id,
            created_by_name: profile.full_name,
            created_by_department: profile.department || "",
            created_by_role: profile.role || "manager",
            created_by_job_title: profile.job_title || null,
            created_by_employee_id: profile.employee_id || null,
            last_modified_by: user.id,
            last_modified_by_name: profile.full_name,
        })
        .select("id")
        .single()

    if (formError || !form) {
        return { success: false, error: formError?.message || "Failed to create form" }
    }

    const fieldRows = sanitised.map((f) => ({ ...f, form_id: form.id }))
    const { error: fieldError } = await service.from("request_form_fields").insert(fieldRows)
    if (fieldError) {
        await service.from("request_forms").delete().eq("id", form.id)
        return { success: false, error: fieldError.message }
    }

    await service.from("audit_log").insert({
        actor_id: user.id,
        action: "request_form_created",
        entity_type: "request_form",
        entity_id: form.id,
        metadata: { title, field_count: sanitised.length, target_department: targetDept },
    })

    revalidatePath("/requests/hub")
    revalidatePath("/requests")
    return { success: true, data: { id: form.id } }
}

export async function updateRequestForm(formId: string, input: FormInput): Promise<ActionResult> {
    const ctx = await getActiveUser()
    if (!ctx) return { success: false, error: "Not authenticated" }
    if (!(await isQaManager(ctx.user.id, ctx.service))) {
        return { success: false, error: "Only QA Managers can edit request forms" }
    }

    const title = (input.title || "").trim()
    const description = (input.description || "").trim()
    if (!title || title.length > 200) return { success: false, error: "Title must be 1–200 characters" }

    if (!Array.isArray(input.fields) || input.fields.length === 0) {
        return { success: false, error: "Form must have at least one field" }
    }
    if (input.fields.length > MAX_FIELDS_PER_FORM) {
        return { success: false, error: `Too many fields (max ${MAX_FIELDS_PER_FORM})` }
    }

    const sanitised: Array<Omit<RequestFormField, "id" | "form_id" | "created_at">> = []
    for (let i = 0; i < input.fields.length; i++) {
        const res = sanitiseFieldInput(input.fields[i], i)
        if (!res.ok) return { success: false, error: res.error }
        sanitised.push(res.value)
    }

    const { service, user, profile } = ctx

    const { data: existing } = await service
        .from("request_forms")
        .select("id, is_archived, version")
        .eq("id", formId)
        .single()
    if (!existing) return { success: false, error: "Form not found" }
    if (existing.is_archived) return { success: false, error: "Cannot edit an archived form" }

    let targetDept: string | null = null
    if (input.targetDepartment) {
        const { data: deptRow } = await service
            .from("departments")
            .select("name")
            .eq("name", input.targetDepartment)
            .maybeSingle()
        if (!deptRow) return { success: false, error: "Invalid target department" }
        targetDept = deptRow.name
    }

    const { error: updErr } = await service
        .from("request_forms")
        .update({
            title,
            description: description || null,
            target_department: targetDept,
            version: (existing.version || 1) + 1,
            last_modified_by: user.id,
            last_modified_by_name: profile.full_name,
        })
        .eq("id", formId)
    if (updErr) return { success: false, error: updErr.message }

    // Replace fields atomically-ish (delete then insert)
    await service.from("request_form_fields").delete().eq("form_id", formId)
    const fieldRows = sanitised.map((f) => ({ ...f, form_id: formId }))
    const { error: fieldError } = await service.from("request_form_fields").insert(fieldRows)
    if (fieldError) return { success: false, error: fieldError.message }

    await service.from("audit_log").insert({
        actor_id: user.id,
        action: "request_form_updated",
        entity_type: "request_form",
        entity_id: formId,
        metadata: { title, field_count: sanitised.length, version: (existing.version || 1) + 1 },
    })

    revalidatePath("/requests/hub")
    revalidatePath("/requests")
    return { success: true }
}

export async function setFormPublishState(formId: string, publish: boolean): Promise<ActionResult> {
    const ctx = await getActiveUser()
    if (!ctx) return { success: false, error: "Not authenticated" }
    if (!(await isQaManager(ctx.user.id, ctx.service))) {
        return { success: false, error: "Only QA Managers can publish forms" }
    }

    const { service, user } = ctx

    const { data: form } = await service
        .from("request_forms")
        .select("id, is_archived")
        .eq("id", formId)
        .single()
    if (!form) return { success: false, error: "Form not found" }
    if (form.is_archived) return { success: false, error: "Cannot publish an archived form" }

    if (publish) {
        const { count } = await service
            .from("request_form_fields")
            .select("id", { count: "exact", head: true })
            .eq("form_id", formId)
        if (!count || count < 1) return { success: false, error: "Form has no fields" }
    }

    const { error: updErr } = await service
        .from("request_forms")
        .update({
            is_published: publish,
            published_at: publish ? new Date().toISOString() : null,
            published_by: publish ? user.id : null,
        })
        .eq("id", formId)
    if (updErr) return { success: false, error: updErr.message }

    await service.from("audit_log").insert({
        actor_id: user.id,
        action: publish ? "request_form_published" : "request_form_unpublished",
        entity_type: "request_form",
        entity_id: formId,
    })

    revalidatePath("/requests/hub")
    revalidatePath("/requests")
    return { success: true }
}

export async function archiveRequestForm(formId: string): Promise<ActionResult> {
    const ctx = await getActiveUser()
    if (!ctx) return { success: false, error: "Not authenticated" }
    if (!(await isQaManager(ctx.user.id, ctx.service))) {
        return { success: false, error: "Only QA Managers can archive forms" }
    }

    const { service, user } = ctx

    const { error } = await service
        .from("request_forms")
        .update({
            is_archived: true,
            is_published: false,
            archived_at: new Date().toISOString(),
            archived_by: user.id,
        })
        .eq("id", formId)
    if (error) return { success: false, error: error.message }

    await service.from("audit_log").insert({
        actor_id: user.id,
        action: "request_form_archived",
        entity_type: "request_form",
        entity_id: formId,
    })

    revalidatePath("/requests/hub")
    revalidatePath("/requests")
    return { success: true }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBMIT (any active user)
// ═══════════════════════════════════════════════════════════════════════════════

function validateAnswers(
    fields: Array<Pick<RequestFormField, "id" | "field_type" | "is_required" | "config" | "label">>,
    rawAnswers: Record<string, unknown>,
): { ok: true; cleaned: Record<string, unknown> } | { ok: false; error: string } {
    const cleaned: Record<string, unknown> = {}

    for (const f of fields) {
        if (f.field_type === "note_display") continue
        const val = rawAnswers?.[f.id]

        const isEmpty =
            val === undefined ||
            val === null ||
            (typeof val === "string" && val.trim() === "") ||
            (Array.isArray(val) && val.length === 0)

        if (isEmpty) {
            if (f.is_required) return { ok: false, error: `"${f.label}" is required` }
            continue
        }

        switch (f.field_type) {
            case "short_text": {
                if (typeof val !== "string") return { ok: false, error: `"${f.label}" must be text` }
                const trimmed = val.trim()
                if (trimmed.length > MAX_SHORT_TEXT_ANSWER) {
                    return { ok: false, error: `"${f.label}" too long (max ${MAX_SHORT_TEXT_ANSWER})` }
                }
                cleaned[f.id] = trimmed
                break
            }
            case "long_text": {
                if (typeof val !== "string") return { ok: false, error: `"${f.label}" must be text` }
                const trimmed = val.trim()
                if (trimmed.length > MAX_LONG_TEXT_ANSWER) {
                    return { ok: false, error: `"${f.label}" too long (max ${MAX_LONG_TEXT_ANSWER})` }
                }
                cleaned[f.id] = trimmed
                break
            }
            case "number": {
                const n = typeof val === "number" ? val : Number(val)
                if (!Number.isFinite(n)) return { ok: false, error: `"${f.label}" must be a number` }
                if (f.config?.min != null && n < f.config.min) return { ok: false, error: `"${f.label}" below minimum (${f.config.min})` }
                if (f.config?.max != null && n > f.config.max) return { ok: false, error: `"${f.label}" above maximum (${f.config.max})` }
                cleaned[f.id] = n
                break
            }
            case "date": {
                if (typeof val !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(val)) {
                    return { ok: false, error: `"${f.label}" must be a valid date` }
                }
                cleaned[f.id] = val
                break
            }
            case "dropdown":
            case "radio": {
                if (typeof val !== "string") return { ok: false, error: `"${f.label}" invalid selection` }
                if (!f.config.options?.includes(val)) {
                    return { ok: false, error: `"${f.label}": invalid choice` }
                }
                cleaned[f.id] = val
                break
            }
            case "checkbox_single": {
                cleaned[f.id] = !!val
                break
            }
            case "checkbox_multi": {
                if (!Array.isArray(val)) return { ok: false, error: `"${f.label}" invalid selection` }
                const allowed = new Set(f.config.options || [])
                const chosen = val
                    .filter((v): v is string => typeof v === "string" && allowed.has(v))
                cleaned[f.id] = Array.from(new Set(chosen))
                break
            }
        }
    }

    return { ok: true, cleaned }
}

export async function submitRequestForm(
    formId: string,
    rawAnswers: Record<string, unknown>,
): Promise<ActionResult<{ referenceNumber: string; submissionId: string }>> {
    const ctx = await getActiveUser()
    if (!ctx) return { success: false, error: "Not authenticated" }

    const { user, service, client, email, profile } = ctx

    // Load form + fields via service (need full schema to validate regardless of RLS)
    const { data: form } = await service
        .from("request_forms")
        .select("id, title, description, is_published, is_archived")
        .eq("id", formId)
        .single()
    if (!form) return { success: false, error: "Form not found" }
    if (!form.is_published || form.is_archived) {
        return { success: false, error: "This form is no longer accepting submissions" }
    }

    const { data: fields } = await service
        .from("request_form_fields")
        .select("id, position, label, helper_text, field_type, is_required, config")
        .eq("form_id", formId)
        .order("position", { ascending: true })

    if (!fields || fields.length === 0) {
        return { success: false, error: "Form has no fields" }
    }

    const validation = validateAnswers(fields as any, rawAnswers || {})
    if (!validation.ok) return { success: false, error: validation.error }

    const snapshot = {
        title: form.title,
        description: form.description,
        fields: fields.map((f) => ({
            id: f.id,
            position: f.position,
            label: f.label,
            helper_text: f.helper_text,
            field_type: f.field_type,
            is_required: f.is_required,
            config: f.config,
        })),
    }

    // INSERT via user client so RLS confirms requester_id = auth.uid()
    const { data: inserted, error: insErr } = await client
        .from("request_form_submissions")
        .insert({
            form_id: formId,
            form_snapshot: snapshot,
            answers: validation.cleaned,
            requester_id: user.id,
            requester_name: profile.full_name,
            requester_email: email,
            requester_department: profile.department || "",
            requester_role: profile.role || "employee",
            requester_job_title: profile.job_title || null,
            requester_employee_id: profile.employee_id || null,
        })
        .select("id, reference_number")
        .single()

    if (insErr || !inserted) {
        return { success: false, error: insErr?.message || "Failed to submit request" }
    }

    // Notify QA managers
    const { data: qaDept } = await service
        .from("departments")
        .select("name")
        .eq("is_qa", true)
        .single()

    if (qaDept?.name) {
        const { data: qaUsers } = await service
            .from("profiles")
            .select("id")
            .eq("role", "manager")
            .eq("department", qaDept.name)
            .eq("is_active", true)

        if (qaUsers && qaUsers.length > 0) {
            await service.from("pulse_items").insert(
                qaUsers.map((qa) => ({
                    sender_id: user.id,
                    recipient_id: qa.id,
                    type: "rfs_update" as const,
                    title: `New Request: ${form.title}`,
                    body: `${profile.full_name} (${profile.department || "—"}) submitted "${form.title}" — ${inserted.reference_number}`,
                    entity_type: "request_form_submission",
                    entity_id: inserted.id,
                    audience: "self" as const,
                })),
            )
        }
    }

    await service.from("audit_log").insert({
        actor_id: user.id,
        action: "rfs_submitted",
        entity_type: "request_form_submission",
        entity_id: inserted.id,
        metadata: {
            form_id: formId,
            form_title: form.title,
            reference_number: inserted.reference_number,
        },
    })

    revalidatePath("/requests")
    revalidatePath("/requests/hub")
    return {
        success: true,
        data: { referenceNumber: inserted.reference_number, submissionId: inserted.id },
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBMISSION STATE TRANSITIONS (QA only)
// ═══════════════════════════════════════════════════════════════════════════════

async function notifyRequesterOfStateChange(
    service: Awaited<ReturnType<typeof createServiceClient>>,
    submissionId: string,
    actorId: string,
    title: string,
    body: string,
) {
    const { data: sub } = await service
        .from("request_form_submissions")
        .select("requester_id, reference_number")
        .eq("id", submissionId)
        .single()
    if (!sub) return
    await service.from("pulse_items").insert({
        sender_id: actorId,
        recipient_id: sub.requester_id,
        type: "rfs_update",
        title,
        body: `${body} (${sub.reference_number})`,
        entity_type: "request_form_submission",
        entity_id: submissionId,
        audience: "self",
    })
}

export async function markSubmissionReceived(submissionId: string): Promise<ActionResult<RequestFormSubmission>> {
    const ctx = await getActiveUser()
    if (!ctx) return { success: false, error: "Not authenticated" }
    if (!(await isQaManager(ctx.user.id, ctx.service))) {
        return { success: false, error: "Only QA Managers can perform this action" }
    }
    const { error } = await ctx.service.rpc("mark_rfs_received", {
        p_submission_id: submissionId,
        p_qa_user_id: ctx.user.id,
    })
    if (error) return { success: false, error: error.message }

    await notifyRequesterOfStateChange(ctx.service, submissionId, ctx.user.id, "Request Received", "Your request has been received by QA")

    const updated = await fetchSubmissionDetail(ctx.service, submissionId)
    revalidatePath("/requests/hub")
    revalidatePath("/requests")
    return { success: true, data: updated as RequestFormSubmission }
}

export async function markSubmissionApproved(submissionId: string, qaNotes?: string): Promise<ActionResult<RequestFormSubmission>> {
    const ctx = await getActiveUser()
    if (!ctx) return { success: false, error: "Not authenticated" }
    if (!(await isQaManager(ctx.user.id, ctx.service))) {
        return { success: false, error: "Only QA Managers can perform this action" }
    }
    if (qaNotes && qaNotes.length > MAX_QA_NOTES) {
        return { success: false, error: `QA notes too long (max ${MAX_QA_NOTES})` }
    }
    const { error } = await ctx.service.rpc("mark_rfs_approved", {
        p_submission_id: submissionId,
        p_qa_user_id: ctx.user.id,
        p_qa_notes: qaNotes || null,
    })
    if (error) return { success: false, error: error.message }

    await notifyRequesterOfStateChange(ctx.service, submissionId, ctx.user.id, "Request Approved", "Your request has been approved")
    const updated = await fetchSubmissionDetail(ctx.service, submissionId)
    revalidatePath("/requests/hub")
    revalidatePath("/requests")
    return { success: true, data: updated as RequestFormSubmission }
}

export async function markSubmissionFulfilled(submissionId: string, qaNotes?: string): Promise<ActionResult<RequestFormSubmission>> {
    const ctx = await getActiveUser()
    if (!ctx) return { success: false, error: "Not authenticated" }
    if (!(await isQaManager(ctx.user.id, ctx.service))) {
        return { success: false, error: "Only QA Managers can perform this action" }
    }
    if (qaNotes && qaNotes.length > MAX_QA_NOTES) {
        return { success: false, error: `QA notes too long (max ${MAX_QA_NOTES})` }
    }
    const { error } = await ctx.service.rpc("mark_rfs_fulfilled", {
        p_submission_id: submissionId,
        p_qa_user_id: ctx.user.id,
        p_qa_notes: qaNotes || null,
    })
    if (error) return { success: false, error: error.message }

    await notifyRequesterOfStateChange(ctx.service, submissionId, ctx.user.id, "Request Fulfilled", "Your request has been fulfilled")
    const updated = await fetchSubmissionDetail(ctx.service, submissionId)
    revalidatePath("/requests/hub")
    revalidatePath("/requests")
    return { success: true, data: updated as RequestFormSubmission }
}

export async function markSubmissionRejected(submissionId: string, reason: string): Promise<ActionResult<RequestFormSubmission>> {
    const ctx = await getActiveUser()
    if (!ctx) return { success: false, error: "Not authenticated" }
    if (!(await isQaManager(ctx.user.id, ctx.service))) {
        return { success: false, error: "Only QA Managers can perform this action" }
    }
    const trimmed = (reason || "").trim()
    if (trimmed.length < 3 || trimmed.length > MAX_QA_NOTES) {
        return { success: false, error: `Reason required (3–${MAX_QA_NOTES} chars)` }
    }
    const { error } = await ctx.service.rpc("mark_rfs_rejected", {
        p_submission_id: submissionId,
        p_qa_user_id: ctx.user.id,
        p_qa_notes: trimmed,
    })
    if (error) return { success: false, error: error.message }

    await notifyRequesterOfStateChange(ctx.service, submissionId, ctx.user.id, "Request Rejected", `Reason: ${trimmed.slice(0, 160)}`)
    const updated = await fetchSubmissionDetail(ctx.service, submissionId)
    revalidatePath("/requests/hub")
    revalidatePath("/requests")
    return { success: true, data: updated as RequestFormSubmission }
}

async function fetchSubmissionDetail(
    service: Awaited<ReturnType<typeof createServiceClient>>,
    submissionId: string,
) {
    const { data } = await service
        .from("request_form_submissions")
        .select(`
            *,
            form:request_forms(id, title),
            received_by_profile:profiles!request_form_submissions_received_by_fkey(id, full_name, avatar_url),
            approved_by_profile:profiles!request_form_submissions_approved_by_fkey(id, full_name, avatar_url),
            fulfilled_by_profile:profiles!request_form_submissions_fulfilled_by_fkey(id, full_name, avatar_url),
            rejected_by_profile:profiles!request_form_submissions_rejected_by_fkey(id, full_name, avatar_url)
        `)
        .eq("id", submissionId)
        .single()

    if (data) {
        for (const key of [
            "received_by_profile",
            "approved_by_profile",
            "fulfilled_by_profile",
            "rejected_by_profile",
            "form",
        ] as const) {
            if (Array.isArray((data as any)[key])) (data as any)[key] = (data as any)[key][0] || null
        }
    }
    return data
}
