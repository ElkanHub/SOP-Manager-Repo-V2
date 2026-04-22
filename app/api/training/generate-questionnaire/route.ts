import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from "@google/generative-ai"
// @ts-ignore
import * as mammoth from 'mammoth'
import { TrainingQuestion } from '@/types/app.types'

// Initialize the SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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

        // Setup Model with System Instructions
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            systemInstruction: `You are an expert instructional designer and technical assessor for Atlantic Lifesciences Limited.
            Generate a questionnaire based ON THE PROVIDED SOP.
            Output ONLY a raw JSON array of objects.`,
        });

        const generationConfig = {
            temperature: 0.2,
            responseMimeType: "application/json",
        };

        const prompt = `Generate EXACTLY ${questionCount} questions from this SOP. 
        Each object must have: question_text, question_type (multiple_choice or true_false), 
        options (array with ids 'a' to 'd' and is_correct boolean), and sop_section_ref.
        
        SOP Content:
        ${documentText}`;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig,
        });

        const textResponse = result.response.text();
        const questions = JSON.parse(textResponse);

        // 3. Database Operations
        await saveQuestionsToDb(serviceClient, questionnaireId, questions, moduleId, user.id);

        return NextResponse.json({ success: true, count: questions.length })

    } catch (error: any) {
        console.error('Generate questionnaire error:', error)
        const msg = String(error?.message || '')
        let userMessage = "We couldn't generate the questionnaire. Please try again in a moment."
        if (/retrieve target document|not found|storage/i.test(msg)) {
            userMessage = "We couldn't read the SOP document. Please check that the file is available and try again."
        } else if (/JSON|parse/i.test(msg)) {
            userMessage = "The AI response was incomplete. Please try generating again."
        } else if (/quota|rate|429|503|overloaded/i.test(msg)) {
            userMessage = "The AI service is busy right now. Please wait a moment and try again."
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