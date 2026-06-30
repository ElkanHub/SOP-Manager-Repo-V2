import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
// @ts-ignore
import * as mammoth from 'mammoth'
import { TrainingQuestion } from '@/types/app.types'
import { generateJson, friendlyAiMessage } from '@/lib/ai/client'

// Constrain the model to emit conforming JSON. Gemini honours type/enum/required.
const QUESTIONNAIRE_SCHEMA = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            question_text: { type: 'string' },
            question_type: { type: 'string', enum: ['multiple_choice', 'true_false'] },
            options: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        text: { type: 'string' },
                        is_correct: { type: 'boolean' },
                    },
                    required: ['id', 'text', 'is_correct'],
                },
            },
            sop_section_ref: { type: 'string' },
        },
        required: ['question_text', 'question_type', 'options'],
    },
} as const

/**
 * Defence in depth on top of the schema: refuse a set unless every question is
 * answerable — has text, a known type, ≥2 fully-formed options, and EXACTLY one
 * correct answer. A plausible-but-broken quiz must never reach the DB.
 */
function isValidQuestionSet(v: unknown): v is any[] {
    if (!Array.isArray(v) || v.length === 0) return false
    return v.every((q) => {
        if (!q || typeof q !== 'object') return false
        const qq = q as Record<string, unknown>
        if (typeof qq.question_text !== 'string' || !qq.question_text.trim()) return false
        if (qq.question_type !== 'multiple_choice' && qq.question_type !== 'true_false') return false
        if (!Array.isArray(qq.options) || qq.options.length < 2) return false
        const wellFormed = qq.options.every(
            (o: unknown) =>
                !!o &&
                typeof o === 'object' &&
                typeof (o as any).id === 'string' &&
                typeof (o as any).text === 'string' &&
                typeof (o as any).is_correct === 'boolean',
        )
        if (!wellFormed) return false
        const correctCount = (qq.options as any[]).filter((o) => o.is_correct === true).length
        return correctCount === 1
    })
}

export async function POST(request: NextRequest) {
    const client = await createClient()
    const { data: { user }, error: authError } = await client.auth.getUser()
    
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()

    // 1. Role Authorization
    const { data: profile } = await serviceClient
        .from('profiles')
        .select('is_active, role')
        .eq('id', user.id)
        .single()

    if (!profile?.is_active || (profile.role !== 'manager' && profile.role !== 'admin')) {
        return NextResponse.json({ error: 'Only managers can generate training modules' }, { status: 403 })
    }

    const body = await request.json()
    const { moduleId, questionnaireId, sopId, questionCount = 5 } = body

    if (!moduleId || !questionnaireId || !sopId) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // 2. Demo Mode Safety Toggle
    const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

    try {
        const { data: sop } = await serviceClient
            .from('sops')
            .select('file_url')
            .eq('id', sopId)
            .single()

        if (!sop || !sop.file_url) return NextResponse.json({ error: 'SOP file not found' }, { status: 404 })

        // --- EMERGENCY DEMO MOCK ---
        if (IS_DEMO_MODE) {
            const mockQuestions = generateMockQuestions(questionnaireId, questionCount);
            await saveQuestionsToDb(serviceClient, questionnaireId, mockQuestions, moduleId, user.id);
            return NextResponse.json({ success: true, count: mockQuestions.length, mode: 'demo' })
        }

        // --- SDK REAL PROCESSING ---
        const { data: file, error: fileError } = await serviceClient.storage
            .from('documents')
            .download(sop.file_url)

        if (fileError || !file) throw new Error('Failed to retrieve target document')
        const buffer = Buffer.from(await file.arrayBuffer())

        const textResult = await mammoth.extractRawText({ buffer })
        const documentText = textResult.value

        const systemInstruction = `You are an expert instructional designer and technical assessor for Atlantic Lifesciences Limited.
Generate a questionnaire based ON THE PROVIDED SOP.
Output ONLY a raw JSON array of objects.`

        const prompt = `Generate EXACTLY ${questionCount} questions from this SOP. Return a JSON array. Each question object must have:
- question_text: string
- question_type: "multiple_choice" or "true_false"
- options: array of objects { id, text, is_correct }. For multiple_choice use ids "a","b","c","d" (4 options); for true_false use ids "true","false" (2 options). EXACTLY ONE option must have is_correct = true.
- sop_section_ref: a short reference to the SOP section the question is drawn from

Base every question strictly on the SOP content below. Do not invent facts or test material that is not present.

SOP Content:
${documentText}`

        const { data: questions } = await generateJson<any[]>({
            purpose: 'training-questionnaire',
            tier: 'fast',
            prompt,
            systemInstruction,
            temperature: 0.2,
            maxOutputTokens: 4096,
            actorId: user.id,
            schema: QUESTIONNAIRE_SCHEMA,
            validate: isValidQuestionSet,
        })

        // 3. Database Operations
        await saveQuestionsToDb(serviceClient, questionnaireId, questions, moduleId, user.id);

        return NextResponse.json({ success: true, count: questions.length })

    } catch (error: any) {
        console.error('Generate questionnaire error:', error)
        const msg = String(error?.message || '')
        let userMessage = friendlyAiMessage(error)
        if (/retrieve target document|not found|storage/i.test(msg)) {
            userMessage = "We couldn't read the SOP document. Please check that the file is available and try again."
        } else if (/insert|database/i.test(msg)) {
            userMessage = "The questions were generated but couldn't be saved. Please try again."
        }
        return NextResponse.json({ error: userMessage }, { status: 500 })
    }
}

// Helper: Save Questions to Supabase
async function saveQuestionsToDb(supabase: any, questionnaireId: string, questions: any[], moduleId: string, userId: string) {
    const dbInserts = questions.map((q: any, index: number) => ({
        questionnaire_id: questionnaireId,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        sop_section_ref: q.sop_section_ref || null,
        display_order: index + 1
    }));

    // Clean up old version
    await supabase.from('training_questions').delete().eq('questionnaire_id', questionnaireId);

    // Insert new questions
    const { error: insertError } = await supabase.from('training_questions').insert(dbInserts);
    if (insertError) throw new Error(insertError.message);

    // Log action
    await supabase.from('training_log').insert({
        actor_id: userId, 
        action: 'questionnaire_generated', 
        module_id: moduleId, 
        questionnaire_id: questionnaireId
    });
}

// Helper: Mock Questions for Demo Day
function generateMockQuestions(questionnaireId: string, count: number) {
    return Array.from({ length: count }).map((_, i) => ({
        question_text: `Demo Question ${i + 1}: What is the primary safety protocol for this procedure?`,
        question_type: "multiple_choice",
        options: [
            { id: "a", text: "Wear PPE", is_correct: true },
            { id: "b", text: "Ignore labels", is_correct: false },
            { id: "c", text: "Work alone", is_correct: false },
            { id: "d", text: "Skip testing", is_correct: false }
        ],
        sop_section_ref: "Safety & Compliance Section"
    }));
}