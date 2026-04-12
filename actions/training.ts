"use server"

import { createServiceClient, createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { 
    TrainingSlide, 
    TrainingAttempt, 
    TrainingQuestionnaire, 
    TrainingQuestion,
    TrainingModule
} from '@/types/app.types'

// ─── UTILITIES ─────────────────────────────────────────────────────────

async function checkAuthAndProfile() {
    const supabase = await createServiceClient()
    const client = await createClient()

    const { data: { user } } = await client.auth.getUser()
    if (!user) return { error: 'Not authenticated' as const }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile || !profile.is_active) {
        return { error: 'User is not active' as const }
    }

    const { data: isQa } = await supabase.rpc('is_qa_manager', { user_id: user.id })

    return { error: undefined, user, profile, isQa: !!isQa, supabase }
}

// ─── MODULE MANAGEMENT ──────────────────────────────────────────────────

export async function createTrainingModule(data: {
    title: string;
    description?: string;
    sopId: string;
    department: string;
    isMandatory: boolean;
    deadline?: string;
}) {
    const auth = await checkAuthAndProfile()
    if (auth.error) return { success: false, error: auth.error }
    const { user, profile, isQa, supabase } = auth

    if (profile.role !== 'manager' && profile.role !== 'admin') {
        return { success: false, error: 'Only managers can create training modules' }
    }

    if (!isQa && data.department !== profile.department) {
        return { success: false, error: 'You can only create modules for your own department' }
    }

    // Verify SOP is active and get version
    const { data: sop } = await supabase
        .from('sops')
        .select('version, status')
        .eq('id', data.sopId)
        .single()

    if (!sop || sop.status !== 'active') {
        return { success: false, error: 'Training modules can only be linked to Active SOPs' }
    }

    const { data: moduleData, error: insertError } = await supabase
        .from('training_modules')
        .insert({
            title: data.title,
            description: data.description || null,
            sop_id: data.sopId,
            sop_version: sop.version,
            department: data.department,
            created_by: user.id,
            is_mandatory: data.isMandatory,
            deadline: data.deadline || null,
            status: 'draft'
        })
        .select('id')
        .single()

    if (insertError) return { success: false, error: insertError.message }

    const moduleId = moduleData.id

    // Logistics
    await supabase.from('training_log').insert({
        actor_id: user.id,
        action: 'module_created',
        module_id: moduleId
    })

    await supabase.from('audit_log').insert({
        actor_id: user.id,
        action: 'training_module_created',
        entity_type: 'training_module',
        entity_id: moduleId,
        metadata: { title: data.title, sop_id: data.sopId }
    })

    revalidatePath('/training')
    return { success: true, moduleId }
}

export async function publishTrainingModule(moduleId: string) {
    const auth = await checkAuthAndProfile()
    if (auth.error) return { success: false, error: auth.error }
    const { user, isQa, supabase } = auth

    const { data: mod } = await supabase
        .from('training_modules')
        .select('created_by, slide_deck, title')
        .eq('id', moduleId)
        .single()

    if (!mod) return { success: false, error: 'Module not found' }
    if (!isQa && mod.created_by !== user.id) {
        return { success: false, error: 'Only the creator or QA can publish this module' }
    }

    if (!mod.slide_deck) {
        return { success: false, error: 'Cannot publish without generating the slide deck first' }
    }

    const { count: questionnairesCount } = await supabase
        .from('training_questionnaires')
        .select('id', { count: 'exact', head: true })
        .eq('module_id', moduleId)
        .eq('status', 'published')

    if (!questionnairesCount || questionnairesCount === 0) {
        return { success: false, error: 'Cannot publish module without at least one published questionnaire' }
    }

    const { error: updateError } = await supabase
        .from('training_modules')
        .update({ status: 'published', updated_at: new Date().toISOString() })
        .eq('id', moduleId)

    if (updateError) return { success: false, error: updateError.message }

    // Notify non-started assignees
    const { data: assignees } = await supabase
        .from('training_assignments')
        .select('assignee_id')
        .eq('module_id', moduleId)
        .eq('status', 'not_started')

    if (assignees && assignees.length > 0) {
        const pulseItems = assignees.map(a => ({
            recipient_id: a.assignee_id,
            sender_id: user.id,
            type: 'training_assigned',
            title: 'New Training Available',
            body: `The module "${mod.title}" is now published and available for you to complete.`,
            entity_type: 'training_module',
            entity_id: moduleId,
            audience: 'self'
        }))
        await supabase.from('pulse_items').insert(pulseItems)
    }

    await supabase.from('training_log').insert({ actor_id: user.id, action: 'module_published', module_id: moduleId })
    await supabase.from('audit_log').insert({ actor_id: user.id, action: 'training_module_published', entity_type: 'training_module', entity_id: moduleId })

    revalidatePath(`/training/${moduleId}`)
    revalidatePath('/training')
    return { success: true }
}

export async function archiveTrainingModule(moduleId: string) {
    const auth = await checkAuthAndProfile()
    if (auth.error) return { success: false, error: auth.error }
    const { user, isQa, supabase } = auth

    const { data: mod } = await supabase.from('training_modules').select('created_by').eq('id', moduleId).single()
    if (!mod) return { success: false, error: 'Module not found' }
    if (!isQa && mod.created_by !== user.id) return { success: false, error: 'Only the creator or QA can archive this module' }

    await supabase.from('training_modules').update({ status: 'archived', updated_at: new Date().toISOString() }).eq('id', moduleId)
    await supabase.from('training_log').insert({ actor_id: user.id, action: 'module_archived', module_id: moduleId })
    await supabase.from('audit_log').insert({ actor_id: user.id, action: 'training_module_archived', entity_type: 'training_module', entity_id: moduleId })

    revalidatePath(`/training/${moduleId}`)
    revalidatePath('/training')
    return { success: true }
}

export async function assignTrainees(moduleId: string, assigneeIds: string[]) {
    const auth = await checkAuthAndProfile()
    if (auth.error) return { success: false, error: auth.error }
    const { user, profile, isQa, supabase } = auth

    const { data: mod } = await supabase.from('training_modules').select('created_by, status, title, is_mandatory, deadline').eq('id', moduleId).single()
    if (!mod) return { success: false, error: 'Module not found' }
    
    // NOTE: Allowed to assign even if module is draft to setup future assignments. 
    // Spec says "Module must be in 'published' status to assign"
    if (mod.status !== 'published') {
        return { success: false, error: 'Module must be published to assign trainees' }
    }

    if (!isQa && mod.created_by !== user.id) return { success: false, error: 'Only the creator or QA can assign trainees' }

    // Department scope enforcement
    const { data: targets } = await supabase.from('profiles').select('id, department').in('id', assigneeIds).eq('is_active', true)
    if (!targets || targets.length === 0) return { success: false, error: 'No valid active users found' }

    const validAssigneeIds = isQa 
        ? targets.map(t => t.id) 
        : targets.filter(t => t.department === profile.department).map(t => t.id)

    if (validAssigneeIds.length === 0) {
        return { success: false, error: 'No assignees passed department scope validation' }
    }

    // Insert ON CONFLICT DO NOTHING implies we just try catch or insert then ignore duplicates.
    const assignmentsToInsert = validAssigneeIds.map(id => ({
        module_id: moduleId,
        assignee_id: id,
        assigned_by: user.id
    }))

    const { error: insertError } = await supabase
        .from('training_assignments')
        // Supabase-js lacks a true ON CONFLICT DO NOTHING for arbitrary keys in single insert standard, but because we have unique constraints, we can use `ON CONFLICT (module_id, assignee_id) DO NOTHING` via RPC or handle it by checking existance.
        .upsert(assignmentsToInsert, { onConflict: 'module_id,assignee_id', ignoreDuplicates: true })
        // Returning to see how many were actually inserted can be tricky, we'll just proceed

    if (insertError) return { success: false, error: insertError.message }

    const mdDeadline = mod.deadline ? new Date(mod.deadline).toLocaleDateString() : ''
    const bodyText = `You have been assigned: "${mod.title}". ${mod.is_mandatory ? "This is mandatory. " : ""}${mod.deadline ? `Complete by ${mdDeadline}.` : ""}`

    const pulseItems = validAssigneeIds.map(id => ({
        recipient_id: id,
        sender_id: user.id,
        type: 'training_assigned',
        title: 'New Training Assigned',
        body: bodyText,
        entity_type: 'training_module',
        entity_id: moduleId,
        audience: 'self'
    }))

    await supabase.from('pulse_items').insert(pulseItems)

    const logItems = validAssigneeIds.map(id => ({
        actor_id: user.id,
        action: 'trainee_assigned',
        module_id: moduleId,
        target_user_id: id
    }))
    await supabase.from('training_log').insert(logItems)

    await supabase.from('audit_log').insert({
        actor_id: user.id, action: 'trainees_assigned', entity_type: 'training_module', entity_id: moduleId, metadata: { count: validAssigneeIds.length }
    })

    // Notify ALL QA Managers
    const { data: qaDept } = await supabase.from('departments').select('name').eq('is_qa', true).single()
    if (qaDept) {
        const { data: qaUsers } = await supabase.from('profiles').select('id').eq('department', qaDept.name).eq('role', 'manager').eq('is_active', true)
        if (qaUsers) {
            const qaPulseItems = qaUsers.map(qa => ({
                recipient_id: qa.id,
                sender_id: user.id,
                type: 'training_assigned',
                title: 'Trainees Assigned to Module',
                body: `${profile.full_name} assigned ${validAssigneeIds.length} trainees to "${mod.title}"`,
                entity_type: 'training_module',
                entity_id: moduleId,
                audience: 'self'
            }))
            await supabase.from('pulse_items').insert(qaPulseItems)
        }
    }

    revalidatePath(`/training/${moduleId}`)
    return { success: true, assigned: validAssigneeIds.length }
}

// ─── QUESTIONNAIRES ──────────────────────────────────────────────────────

export async function createQuestionnaire(data: { moduleId: string; title: string; description?: string; passingScore: number }) {
    const auth = await checkAuthAndProfile()
    if (auth.error) return { success: false, error: auth.error }
    const { user, isQa, supabase } = auth

    const { data: mod } = await supabase.from('training_modules').select('created_by').eq('id', data.moduleId).single()
    if (!mod) return { success: false, error: 'Module not found' }
    if (!isQa && mod.created_by !== user.id) return { success: false, error: 'Only the creator or QA can manage questionnaires' }

    // Get the latest version for this module to properly increment
    const { data: latestQ } = await supabase
        .from('training_questionnaires')
        .select('version')
        .eq('module_id', data.moduleId)
        .order('version', { ascending: false })
        .limit(1)
        .single()

    const nextVersion = latestQ ? latestQ.version + 1 : 1

    const { data: qData, error } = await supabase.from('training_questionnaires').insert({
        module_id: data.moduleId,
        title: data.title,
        description: data.description || null,
        passing_score: data.passingScore,
        status: 'draft',
        version: nextVersion
    }).select('id').single()

    if (error) return { success: false, error: error.message }

    await supabase.from('training_log').insert({ actor_id: user.id, action: 'questionnaire_created', module_id: data.moduleId, questionnaire_id: qData.id })
    revalidatePath(`/training/${data.moduleId}`)
    return { success: true, questionnaireId: qData.id }
}

export async function publishQuestionnaire(questionnaireId: string) {
    const auth = await checkAuthAndProfile()
    if (auth.error) return { success: false, error: auth.error }
    const { user, isQa, supabase } = auth

    const { data: q } = await supabase.from('training_questionnaires')
        .select('module_id, status, training_modules(created_by)')
        .eq('id', questionnaireId)
        .single()

    if (!q) return { success: false, error: 'Questionnaire not found' }
    if (q.status !== 'draft') return { success: false, error: 'Once published, questionnaires cannot be edited' }
    
    // cast via any because training_modules relationship is singular but TS might type differently
    const creatorId = (q.training_modules as any).created_by
    if (!isQa && creatorId !== user.id) return { success: false, error: 'Only the module creator or QA can publish' }

    const { count } = await supabase.from('training_questions').select('id', { count: 'exact', head: true }).eq('questionnaire_id', questionnaireId)
    if (!count || count < 3) return { success: false, error: 'Questionnaire must have at least 3 questions to publish' }

    const { error } = await supabase.from('training_questionnaires').update({ status: 'published', updated_at: new Date().toISOString() }).eq('id', questionnaireId)
    if (error) return { success: false, error: error.message }

    await supabase.from('training_log').insert({ actor_id: user.id, action: 'questionnaire_published', module_id: q.module_id, questionnaire_id: questionnaireId })
    revalidatePath(`/training/${q.module_id}`)
    return { success: true }
}

// ─── ATTEMPTS & SUBMISSIONS ──────────────────────────────────────────────

export async function startAttempt(questionnaireId: string, moduleId: string) {
    const auth = await checkAuthAndProfile()
    if (auth.error) return { success: false, error: auth.error }
    const { user, supabase } = auth

    // Validation
    const { data: assignment } = await supabase.from('training_assignments').select('id').eq('module_id', moduleId).eq('assignee_id', user.id).single()
    if (!assignment) return { success: false, error: 'You are not assigned to this training module' }

    const { data: mod } = await supabase.from('training_modules').select('status, sop_id, sop_version').eq('id', moduleId).single()
    if (mod?.status !== 'published') return { success: false, error: 'Module is not published' }

    const { data: q } = await supabase.from('training_questionnaires').select('status, version').eq('id', questionnaireId).single()
    if (q?.status !== 'published') return { success: false, error: 'Questionnaire is not published' }

    // Check existing attempts
    const { data: existing } = await supabase.from('training_attempts')
        .select('id, submitted_at, passed')
        .eq('questionnaire_id', questionnaireId)
        .eq('respondent_id', user.id)
        .eq('questionnaire_version', q.version)
    
    if (existing && existing.length > 0) {
        // Find any in-progress (unsubmitted) attempt
        const inProgress = existing.find(e => e.submitted_at === null)
        if (inProgress) {
            return { success: true, attemptId: inProgress.id }
        }
        
        // If a passed attempt exists, block retry
        const passedAttempt = existing.find(e => e.passed === true)
        if (passedAttempt) {
            return { success: false, error: 'You have already passed this assessment' }
        }
        // If all prior attempts failed, allow new attempt (fall through)
    }

    const { data: attempt, error } = await supabase.from('training_attempts').insert({
        questionnaire_id: questionnaireId,
        questionnaire_version: q.version,
        respondent_id: user.id,
        module_id: moduleId,
        sop_id: mod.sop_id,
        sop_version: mod.sop_version,
        started_at: new Date().toISOString()
    }).select('id').single()

    if (error) return { success: false, error: error.message }

    await supabase.from('training_assignments').update({ status: 'in_progress' }).eq('module_id', moduleId).eq('assignee_id', user.id)
    await supabase.from('training_log').insert({ actor_id: user.id, action: 'training_started', module_id: moduleId, attempt_id: attempt.id })

    revalidatePath('/training/my-training')
    return { success: true, attemptId: attempt.id }
}

export async function submitAttempt(attemptId: string, answers: { questionId: string, answerValue: string | null }[]) {
    const auth = await checkAuthAndProfile()
    if (auth.error) return { success: false, error: auth.error }
    const { user, profile, supabase } = auth

    const { data: attempt } = await supabase.from('training_attempts')
        .select('respondent_id, submitted_at, questionnaire_id, module_id, training_questionnaires(passing_score), training_modules(title, created_by)')
        .eq('id', attemptId)
        .single()
        
    if (!attempt) return { success: false, error: 'Attempt not found' }
    if (attempt.respondent_id !== user.id) return { success: false, error: 'Attempt belongs to another user' }
    if (attempt.submitted_at) return { success: false, error: 'Attempt already submitted' }

    // Fetch questions to grade
    const { data: questions } = await supabase.from('training_questions').select('id, question_type, options, correct_answer').eq('questionnaire_id', attempt.questionnaire_id)
    if (!questions) return { success: false, error: 'Questions not found' }

    const passingScore = (attempt.training_questionnaires as any).passing_score
    const modTitle = (attempt.training_modules as any).title
    const creatorId = (attempt.training_modules as any).created_by

    let mcTfTotal = 0
    let mcTfCorrect = 0

    const dbAnswers = answers.map(ans => {
        const q = questions.find(qu => qu.id === ans.questionId)
        let isCorrect: boolean | null = null

        if (q && (q.question_type === 'multiple_choice' || q.question_type === 'true_false')) {
            mcTfTotal++
            // check option correct
            const opts = (q.options as any[]) || []
            const selectedOpt = opts.find(o => o.id === ans.answerValue)
            isCorrect = selectedOpt ? !!selectedOpt.is_correct : false
            if (isCorrect) mcTfCorrect++
        }

        return {
            attempt_id: attemptId,
            question_id: ans.questionId,
            answer_value: ans.answerValue,
            is_correct: isCorrect
        }
    })

    const score = mcTfTotal > 0 ? (mcTfCorrect / mcTfTotal) * 100 : 100
    const passed = score >= passingScore

    // Insert answers
    if (dbAnswers.length > 0) {
        await supabase.from('training_answers').insert(dbAnswers)
    }

    const now = new Date().toISOString()
    await supabase.from('training_attempts').update({ submitted_at: now, score: score, passed: passed }).eq('id', attemptId)
    
    if (passed) {
        await supabase.from('training_assignments').update({ status: 'completed', completed_at: now }).eq('module_id', attempt.module_id).eq('assignee_id', user.id)
    } else {
        // Allow retry — reset to not_started so they can attempt again
        await supabase.from('training_assignments').update({ status: 'not_started' }).eq('module_id', attempt.module_id).eq('assignee_id', user.id)
    }

    await supabase.from('training_log').insert({ actor_id: user.id, action: 'attempt_submitted', module_id: attempt.module_id, attempt_id: attemptId, metadata: { score, passed } })
    await supabase.from('audit_log').insert({ actor_id: user.id, action: 'training_completed', entity_type: 'training_attempt', entity_id: attemptId })

    // Pulse notification for creator
    const pulses = []
    pulses.push({
        recipient_id: creatorId,
        sender_id: user.id,
        type: 'training_completed',
        title: 'Training Completed',
        body: `${profile.full_name} completed "${modTitle}". Score: ${score.toFixed(1)}%. ${passed ? "PASSED" : "DID NOT PASS"}`,
        entity_type: 'training_module',
        entity_id: attempt.module_id,
        audience: 'self'
    })

    // Also notify QA
    const { data: qaDept } = await supabase.from('departments').select('name').eq('is_qa', true).single()
    if (qaDept) {
        const { data: qaUsers } = await supabase.from('profiles').select('id').eq('department', qaDept.name).eq('role', 'manager').eq('is_active', true)
        if (qaUsers) {
            qaUsers.forEach(qa => {
                pulses.push({
                    recipient_id: qa.id,
                    sender_id: user.id,
                    type: 'training_completed',
                    title: 'Training Completed',
                    body: `${profile.full_name} completed "${modTitle}". Score: ${score.toFixed(1)}%. ${passed ? "PASSED" : "DID NOT PASS"}`,
                    entity_type: 'training_module',
                    entity_id: attempt.module_id,
                    audience: 'self'
                })
            })
        }
    }

    await supabase.from('pulse_items').insert(pulses)

    revalidatePath('/training/my-training')
    revalidatePath(`/training/${attempt.module_id}`)
    return { success: true, score, passed }
}

export async function recordPaperCompletion(data: { moduleId: string; respondentId: string; questionnaireId: string; paperScanUrl?: string }) {
    const auth = await checkAuthAndProfile()
    if (auth.error) return { success: false, error: auth.error }
    const { user, isQa, supabase } = auth

    const { data: mod } = await supabase.from('training_modules').select('created_by, sop_id, sop_version').eq('id', data.moduleId).single()
    if (!mod) return { success: false, error: 'Module not found' }
    if (!isQa && mod.created_by !== user.id) return { success: false, error: 'Only the creator or QA can record paper completions' }

    const { data: q } = await supabase.from('training_questionnaires').select('version').eq('id', data.questionnaireId).single()
    if (!q) return { success: false, error: 'Questionnaire not found' }

    // Ensure user is assigned
    const { data: assignment } = await supabase.from('training_assignments').select('id').eq('module_id', data.moduleId).eq('assignee_id', data.respondentId).single()
    if (!assignment) return { success: false, error: 'User is not assigned to this module' }

    const now = new Date().toISOString()
    const { data: attempt, error } = await supabase.from('training_attempts').insert({
        questionnaire_id: data.questionnaireId,
        questionnaire_version: q.version,
        respondent_id: data.respondentId,
        module_id: data.moduleId,
        sop_id: mod.sop_id,
        sop_version: mod.sop_version,
        started_at: now,
        submitted_at: now,
        score: 100, // Pass by default for recorded completions
        passed: true,
        completion_method: 'paper_recorded',
        paper_scan_url: data.paperScanUrl || null
    }).select('id').single()

    if (error) return { success: false, error: error.message }

    await supabase.from('training_assignments').update({ status: 'completed', completed_at: now }).eq('module_id', data.moduleId).eq('assignee_id', data.respondentId)
    await supabase.from('training_log').insert({ actor_id: user.id, action: 'paper_completion_recorded', module_id: data.moduleId, attempt_id: attempt.id, target_user_id: data.respondentId })

    const { data: qaDept } = await supabase.from('departments').select('name').eq('is_qa', true).single()
    if (qaDept) {
        const { data: qaUsers } = await supabase.from('profiles').select('id').eq('department', qaDept.name).eq('role', 'manager').eq('is_active', true)
        if (qaUsers) {
            const pulses = qaUsers.map(qa => ({
                recipient_id: qa.id, sender_id: user.id, type: 'training_completed',
                title: 'Paper Training Recorded', body: `A paper completion was recorded for module ${data.moduleId}`,
                entity_type: 'training_module', entity_id: data.moduleId, audience: 'self'
            }))
            await supabase.from('pulse_items').insert(pulses)
        }
    }

    revalidatePath(`/training/${data.moduleId}`)
    return { success: true }
}

export async function updateSlide(moduleId: string, slideId: string, updates: { title?: string; body?: string; notes?: string }) {
    const auth = await checkAuthAndProfile()
    if (auth.error) return { success: false, error: auth.error }
    const { user, isQa, supabase } = auth

    const { data: mod } = await supabase.from('training_modules').select('created_by, status, slide_deck').eq('id', moduleId).single()
    if (!mod) return { success: false, error: 'Module not found' }
    if (mod.status === 'archived') return { success: false, error: 'Archived modules cannot be edited' }
    if (!isQa && mod.created_by !== user.id) return { success: false, error: 'Only creator or QA can edit slides' }

    if (!mod.slide_deck) return { success: false, error: 'Slide deck not generated yet' }

    const deck = (mod.slide_deck as any[]) || []
    const slideIndex = deck.findIndex(s => s.id === slideId)
    if (slideIndex === -1) return { success: false, error: 'Slide not found' }

    deck[slideIndex] = { ...deck[slideIndex], ...updates }

    const { error } = await supabase.from('training_modules').update({ slide_deck: deck, updated_at: new Date().toISOString() }).eq('id', moduleId)
    if (error) return { success: false, error: error.message }

    revalidatePath(`/training/${moduleId}`)
    return { success: true }
}

export async function reorderSlides(moduleId: string, orderedSlideIds: string[]) {
    const auth = await checkAuthAndProfile()
    if (auth.error) return { success: false, error: auth.error }
    const { user, isQa, supabase } = auth

    const { data: mod } = await supabase.from('training_modules').select('created_by, status, slide_deck').eq('id', moduleId).single()
    if (!mod) return { success: false, error: 'Module not found' }
    if (mod.status === 'archived') return { success: false, error: 'Archived modules cannot be edited' }
    if (!isQa && mod.created_by !== user.id) return { success: false, error: 'Only creator or QA can reorder slides' }
    if (!mod.slide_deck) return { success: false, error: 'Slide deck not generated yet' }

    const deck = (mod.slide_deck as any[]) || []

    // Build a new ordered deck from the given IDs, renumbering automatically
    const reordered: any[] = []
    for (let i = 0; i < orderedSlideIds.length; i++) {
        const slide = deck.find(s => s.id === orderedSlideIds[i])
        if (slide) {
            reordered.push({ ...slide, order: i + 1 })
        }
    }

    if (reordered.length !== deck.length) {
        return { success: false, error: 'Slide ID mismatch — some slides could not be found' }
    }

    const { error } = await supabase.from('training_modules').update({ slide_deck: reordered, updated_at: new Date().toISOString() }).eq('id', moduleId)
    if (error) return { success: false, error: error.message }

    revalidatePath(`/training/${moduleId}`)
    return { success: true }
}

export async function addSlide(moduleId: string, slide: { type: string; title: string; body: string; notes?: string }, insertAfterOrder?: number) {
    const auth = await checkAuthAndProfile()
    if (auth.error) return { success: false, error: auth.error }
    const { user, isQa, supabase } = auth

    const { data: mod } = await supabase.from('training_modules').select('created_by, status, slide_deck').eq('id', moduleId).single()
    if (!mod) return { success: false, error: 'Module not found' }
    if (mod.status === 'archived') return { success: false, error: 'Archived modules cannot be edited' }
    if (!isQa && mod.created_by !== user.id) return { success: false, error: 'Only creator or QA can add slides' }

    const deck = (mod.slide_deck as any[]) || []

    const newSlide = {
        id: crypto.randomUUID(),
        type: slide.type,
        title: slide.title,
        body: slide.body,
        notes: slide.notes || '',
        order: 0 // will be set below
    }

    // Insert at the right position
    if (insertAfterOrder !== undefined && insertAfterOrder >= 0) {
        // Find the index of the slide with the given order
        const sortedDeck = [...deck].sort((a, b) => a.order - b.order)
        const insertIndex = sortedDeck.findIndex(s => s.order === insertAfterOrder)
        if (insertIndex !== -1) {
            sortedDeck.splice(insertIndex + 1, 0, newSlide)
        } else {
            sortedDeck.push(newSlide)
        }
        // Renumber all slides
        sortedDeck.forEach((s, i) => { s.order = i + 1 })
        const { error } = await supabase.from('training_modules').update({ slide_deck: sortedDeck, updated_at: new Date().toISOString() }).eq('id', moduleId)
        if (error) return { success: false, error: error.message }
    } else {
        // Append at the end
        newSlide.order = deck.length + 1
        deck.push(newSlide)
        const { error } = await supabase.from('training_modules').update({ slide_deck: deck, updated_at: new Date().toISOString() }).eq('id', moduleId)
        if (error) return { success: false, error: error.message }
    }

    revalidatePath(`/training/${moduleId}`)
    return { success: true, slideId: newSlide.id }
}

export async function deleteSlide(moduleId: string, slideId: string) {
    const auth = await checkAuthAndProfile()
    if (auth.error) return { success: false, error: auth.error }
    const { user, isQa, supabase } = auth

    const { data: mod } = await supabase.from('training_modules').select('created_by, status, slide_deck').eq('id', moduleId).single()
    if (!mod) return { success: false, error: 'Module not found' }
    if (mod.status === 'archived') return { success: false, error: 'Archived modules cannot be edited' }
    if (!isQa && mod.created_by !== user.id) return { success: false, error: 'Only creator or QA can delete slides' }
    if (!mod.slide_deck) return { success: false, error: 'Slide deck not generated yet' }

    let deck = (mod.slide_deck as any[]) || []
    if (deck.length <= 1) return { success: false, error: 'Cannot delete the last remaining slide' }

    deck = deck.filter(s => s.id !== slideId)
    // Renumber
    deck.sort((a, b) => a.order - b.order)
    deck.forEach((s, i) => { s.order = i + 1 })

    const { error } = await supabase.from('training_modules').update({ slide_deck: deck, updated_at: new Date().toISOString() }).eq('id', moduleId)
    if (error) return { success: false, error: error.message }

    revalidatePath(`/training/${moduleId}`)
    return { success: true }
}

