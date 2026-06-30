import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
// @ts-ignore
import * as mammoth from 'mammoth'
import { TrainingSlide } from '@/types/app.types'
import { generateJson, friendlyAiMessage } from '@/lib/ai/client'

const SLIDE_TYPES = ['title', 'objectives', 'content', 'summary', 'edge_cases', 'resources'] as const

// No `id` here — LLMs fabricate/collide UUIDs, so we assign them server-side.
const SLIDE_SCHEMA = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            type: { type: 'string', enum: [...SLIDE_TYPES] },
            title: { type: 'string' },
            body: { type: 'string' },
            notes: { type: 'string' },
            order: { type: 'number' },
        },
        required: ['type', 'title', 'body', 'order'],
    },
} as const

type RawSlide = Omit<TrainingSlide, 'id'>

function isValidSlideDeck(v: unknown): v is RawSlide[] {
    if (!Array.isArray(v) || v.length === 0) return false
    return v.every(
        (s: unknown) =>
            !!s &&
            typeof s === 'object' &&
            typeof (s as any).title === 'string' &&
            typeof (s as any).body === 'string' &&
            typeof (s as any).order === 'number' &&
            (SLIDE_TYPES as readonly string[]).includes((s as any).type),
    )
}

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

        const systemInstruction = `You are an expert instructional designer for Atlantic Lifesciences.
Your task is to convert a Standard Operating Procedure (SOP) into a training slide deck.
You must return a valid JSON array of objects.`

        const prompt = `Convert the following SOP document into a training slide deck as a JSON array.
Each slide must have:
- type: one of "title", "objectives", "content", "summary", "edge_cases", "resources"
- title: string
- body: plain text (you may use \\n for line breaks)
- notes: short presenter notes
- order: 1-based slide number
Do NOT include an "id" field — it is assigned by the system. Base all content strictly on the SOP.

SOP Content:
${documentText}`

        const { data: rawSlides } = await generateJson<RawSlide[]>({
            purpose: 'training-slides',
            tier: 'fast',
            prompt,
            systemInstruction,
            temperature: 0.1,
            maxOutputTokens: 8192,
            actorId: user.id,
            schema: SLIDE_SCHEMA,
            validate: isValidSlideDeck,
        })

        // Assign stable server-side IDs and normalise ordering (the model only
        // supplies relative order; we make it strictly sequential).
        const slideDeck: TrainingSlide[] = [...rawSlides]
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((s, i) => ({
                id: crypto.randomUUID(),
                type: s.type,
                title: s.title,
                body: s.body,
                notes: typeof s.notes === 'string' ? s.notes : undefined,
                order: i + 1,
            }))

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
        let userMessage = friendlyAiMessage(error)
        if (/retrieve document|not found|storage/i.test(msg)) {
            userMessage = "We couldn't read the SOP document. Please check that the file is available and try again."
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