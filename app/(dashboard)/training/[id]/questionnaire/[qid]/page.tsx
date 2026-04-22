import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import QuestionnairePageClient from './questionnaire-page-client'

export const metadata = { title: 'Assessment | SOP Manager' }

export default async function QuestionnairePage({ params }: { params: Promise<{ id: string, qid: string }> }) {
    const { id, qid } = await params;
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()

    if (!user) redirect('/login')

    const serviceClient = await createServiceClient()
    
    // Validate assignment
    const { data: assignment } = await serviceClient
        .from('training_assignments')
        .select('*')
        .eq('module_id', id)
        .eq('assignee_id', user.id)
        .maybeSingle()

    if (!assignment) redirect('/training/my-training')

    // Pick the user's most relevant attempt. Users can have multiple attempts
    // for the same questionnaire (e.g. a failed submitted attempt + a new
    // in-progress retake), so .single() here would throw on the second row.
    // Prefer an open (unsubmitted) attempt; otherwise fall back to the most
    // recent attempt so the user can see their prior submitted result.
    const { data: attempts } = await serviceClient
        .from('training_attempts')
        .select('id, submitted_at, score, passed, started_at')
        .eq('module_id', id)
        .eq('questionnaire_id', qid)
        .eq('respondent_id', user.id)
        .order('started_at', { ascending: false })

    const attempt =
        attempts?.find((a) => a.submitted_at === null) ?? attempts?.[0]

    if (!attempt) redirect('/training/my-training')

    const { data: questionnaire } = await serviceClient
        .from('training_questionnaires')
        .select(`
            *,
            training_modules(title, description, slide_deck),
            questions:training_questions(*)
        `)
        .eq('id', qid)
        .maybeSingle()

    if (!questionnaire) notFound()

    return (
        <QuestionnairePageClient 
            questionnaire={questionnaire} 
            attempt={attempt}
            moduleData={questionnaire.training_modules}
        />
    )
}
