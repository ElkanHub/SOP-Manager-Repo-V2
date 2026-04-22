import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai"
// @ts-ignore
import * as mammoth from 'mammoth'
import { TrainingSlide } from '@/types/app.types'

// Initialize the Gemini SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
    const client = await createClient()
    const { data: { user }, error: authError } = await client.auth.getUser()

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()

    // 1. Authorization Check
    const { data: profile } = await serviceClient
        .from('profiles')
        .select('is_active, role')
        .eq('id', user.id)
        .single()

    if (!profile?.is_active || (profile.role !== 'manager' && profile.role !== 'admin')) {
        return NextResponse.json({ error: 'Manager permissions required' }, { status: 403 })
    }

    const body = await request.json()
    const { moduleId, sopId } = body

    if (!moduleId || !sopId) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // 2. Demo Mode Toggle (Set NEXT_PUBLIC_DEMO_MODE=true in .env for safety)
    const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

    try {
        const { data: sop } = await serviceClient
            .from('sops')
            .select('file_url, title')
            .eq('id', sopId)
            .single()

        if (!sop || !sop.file_url) {
            return NextResponse.json({ error: 'SOP file not found' }, { status: 404 })
        }

        // --- EMERGENCY DEMO FALLBACK ---
        if (IS_DEMO_MODE) {
            const mockSlides = generateMockSlides(sop.title);
            await saveSlideDeck(serviceClient, moduleId, mockSlides);
            return NextResponse.json({ success: true, slides: mockSlides, mode: 'demo' })
        }

        // --- SDK PROCESSING ---
        const { data: file, error: fileError } = await serviceClient.storage
            .from('documents')
            .download(sop.file_url)

        if (fileError || !file) throw new Error('Failed to retrieve document from storage')

        const buffer = Buffer.from(await file.arrayBuffer())
        const textResult = await mammoth.extractRawText({ buffer })
        const documentText = textResult.value

        // Setup the model with System Instructions
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            systemInstruction: `You are an expert instructional designer for Atlantic Lifesciences. 
            Your task is to convert a Standard Operating Procedure (SOP) into a training slide deck.
            You must return a valid JSON array of objects.`,
        });

        const generationConfig = {
            temperature: 0.1,
            topP: 0.95,
            topK: 64,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
        };

        const prompt = `Convert the following SOP document into a slide deck. 
        Each slide must have: id (UUID), type (title, objectives, content, summary, or edge_cases), title, body, notes, and order (number).
        
        SOP Content:
        ${documentText}`;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig,
        });

        const responseText = result.response.text();
        const slideDeck: TrainingSlide[] = JSON.parse(responseText);

        // 3. Save to Database
        await saveSlideDeck(serviceClient, moduleId, slideDeck);

        // Log the generation
        await serviceClient.from('training_log').insert({
            actor_id: user.id,
            action: 'slide_deck_generated',
            module_id: moduleId
        });

        return NextResponse.json({ success: true, slides: slideDeck })

    } catch (error: any) {
        console.error('Generation Error:', error)
        const msg = String(error?.message || '')
        let userMessage = "We couldn't generate the slide deck. Please try again in a moment."
        if (/retrieve document|not found|storage/i.test(msg)) {
            userMessage = "We couldn't read the SOP document. Please check that the file is available and try again."
        } else if (/JSON|parse/i.test(msg)) {
            userMessage = "The AI response was incomplete. Please try generating again."
        } else if (/quota|rate|429|503|overloaded/i.test(msg)) {
            userMessage = "The AI service is busy right now. Please wait a moment and try again."
        } else if (/Database update/i.test(msg)) {
            userMessage = "The slides were generated but couldn't be saved. Please try again."
        }
        return NextResponse.json({ error: userMessage }, { status: 500 })
    }
}

// Helper: Save Slide Deck
async function saveSlideDeck(supabase: any, moduleId: string, slides: TrainingSlide[]) {
    const { error } = await supabase
        .from('training_modules')
        .update({
            slide_deck: slides,
            slide_deck_generated_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', moduleId)

    if (error) throw new Error(`Database update failed: ${error.message}`);
}

// Helper: Mock Data for Demo
function generateMockSlides(title: string): TrainingSlide[] {
    return [
        {
            id: crypto.randomUUID(),
            type: "title",
            title: title || "SOP Training",
            body: "Atlantic Lifesciences Limited\nStandard Operating Procedure Review",
            notes: "Welcome to the session.",
            order: 1
        },
        {
            id: crypto.randomUUID(),
            type: "objectives",
            title: "Learning Objectives",
            body: "• Master the procedure workflow\n• Understand safety precautions\n• Ensure regulatory compliance",
            notes: "Our goal is 100% compliance.",
            order: 2
        }
    ];
}