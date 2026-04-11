import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
// @ts-ignore
import * as mammoth from 'mammoth'
import { TrainingQuestion, QuestionOption } from '@/types/app.types'

export async function POST(request: NextRequest) {
    const client = await createClient()
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()

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

    const geminiApiKey = process.env.GEMINI_API_KEY
    if (!geminiApiKey) {
        return NextResponse.json({ error: 'Gemini API not configured' }, { status: 500 })
    }

    try {
        const { data: sop } = await serviceClient
            .from('sops')
            .select('file_url')
            .eq('id', sopId)
            .single()

        if (!sop || !sop.file_url) return NextResponse.json({ error: 'SOP file not found' }, { status: 404 })

        const { data: file, error: fileError } = await serviceClient.storage
            .from('documents')
            .download(sop.file_url)

        if (fileError || !file) throw new Error('Failed to retrieve target document')
        const buffer = Buffer.from(await file.arrayBuffer())

        const textResult = await mammoth.extractRawText({ buffer })
        const documentText = textResult.value

        const systemInstruction = `You are an expert instructional designer and technical assessor. 
Your task is to generate a comprehensive testing questionnaire based ON THE PROVIDED SOP DOCUMENT.
You MUST reply with ONLY a raw JSON array of question objects. Do not include markdown codeblocks.

Generate EXACTLY ${questionCount} questions. Make sure questions strictly test the critical logic, thresholds, or policies in the document.

Each question object must have exactly this shape:
{
  "question_text": "Text of the actual question",
  "question_type": "multiple_choice" | "true_false",
  "options": [{ "id": "a", "text": "Option 1", "is_correct": boolean }, ...],
  "sop_section_ref": "Short description of which section this pertains to"
}

Rules:
1. For 'multiple_choice', provide exactly 4 options. Use 'a', 'b', 'c', 'd' as ids. Only ONE option should be is_correct=true.
2. For 'true_false', provide exactly 2 options. Use 'true', 'false' as ids. Only ONE option should be is_correct=true.
3. Randomly distribute the position of the correct answer for multiple-choice questions.
4. Ensure the question and the correct answer are strictly verifiable in the SOP text.`

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemInstruction }] },
                    contents: [{ parts: [{ text: `Here is the SOP document:\n\n${documentText}` }] }],
                    generationConfig: {
                        temperature: 0.2,
                        responseMimeType: "application/json",
                    }
                })
            }
        )

        if (!response.ok) {
            const error = await response.text()
            console.error('Gemini API error:', error)
            return NextResponse.json({ error: 'Failed to generate questionnaire' }, { status: 500 })
        }

        const data = await response.json()
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
        
        let questions: any[] = []
        try {
            questions = JSON.parse(textResponse)
        } catch (e) {
            console.error('Failed to parse Gemini JSON:', textResponse)
            return NextResponse.json({ error: 'Model returned invalid JSON' }, { status: 500 })
        }

        // Prepare inserts
        const dbInserts = questions.map((q, index) => ({
            questionnaire_id: questionnaireId,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options,
            sop_section_ref: q.sop_section_ref || null,
            display_order: index + 1
        }))

        // Clear existing questions for this questionnaire to prevent double up if regenerated
        await serviceClient.from('training_questions').delete().eq('questionnaire_id', questionnaireId)

        const { error: insertError } = await serviceClient
            .from('training_questions')
            .insert(dbInserts)

        if (insertError) throw new Error(insertError.message)

        await serviceClient.from('training_log').insert({
            actor_id: user.id, action: 'questionnaire_generated', module_id: moduleId, questionnaire_id: questionnaireId
        })

        return NextResponse.json({ success: true, count: questions.length })
    } catch (error: any) {
        console.error('Generate questionnaire error:', error)
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
    }
}
