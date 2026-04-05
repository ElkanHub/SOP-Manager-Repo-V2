import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import QuestionnairePageClient from './questionnaire-page-client'

export const metadata = { title: 'Assessment | SOP Manager' }

export default async function QuestionnairePage({ params }: { params: { id: string, qid: string } }) {
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()

    if (!user) redirect('/login')

    const serviceClient = await createServiceClient()
    
    // Validate assignment
    const { data: assignment } = await serviceClient
        .from('training_assignments')
        .select('*')
        .eq('module_id', params.id)
        .eq('assignee_id', user.id)
        .single()

    if (!assignment) redirect('/training/my-training')

    const { data: attempt } = await serviceClient
        .from('training_attempts')
        .select('id, submitted_at, score, passed')
        .eq('module_id', params.id)
        .eq('questionnaire_id', params.qid)
        .eq('respondent_id', user.id)
        .single()

    if (!attempt) redirect('/training/my-training')

    const { data: questionnaire } = await serviceClient
        .from('training_questionnaires')
        .select(`
            *,
            training_modules(title, description, slide_deck),
            questions:training_questions(*)
        `)
        .eq('id', params.qid)
        .single()

    if (!questionnaire) notFound()

    return (
        <QuestionnairePageClient 
            questionnaire={questionnaire} 
            attempt={attempt}
            moduleData={questionnaire.training_modules}
        />
    )
}
