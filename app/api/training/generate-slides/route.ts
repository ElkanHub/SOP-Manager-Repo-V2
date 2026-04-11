import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
// @ts-ignore
import * as mammoth from 'mammoth'
import { TrainingSlide } from '@/types/app.types'

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
    const { moduleId, sopId } = body

    if (!moduleId || !sopId) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const geminiApiKey = process.env.GEMINI_API_KEY
    if (!geminiApiKey) {
        return NextResponse.json({ error: 'Gemini API not configured' }, { status: 500 })
    }

    try {
        // Grab the SOP file URL
        const { data: sop } = await serviceClient
            .from('sops')
            .select('file_url')
            .eq('id', sopId)
            .single()

        if (!sop || !sop.file_url) {
            return NextResponse.json({ error: 'SOP file not found' }, { status: 404 })
        }

        const { data: file, error: fileError } = await serviceClient.storage
            .from('documents')
            .download(sop.file_url)

        if (fileError || !file) throw new Error('Failed to retrieve target document')
        const buffer = Buffer.from(await file.arrayBuffer())

        const textResult = await mammoth.extractRawText({ buffer })
        const documentText = textResult.value

        const systemInstruction = `You are an expert instructional designer. Your task is to process a standard operating procedure (SOP) document and convert it into a well-structured training slide deck.
You MUST reply with ONLY a raw JSON array of slide objects. Do not include markdown codeblocks (like \`\`\`json).

Each slide object must have exactly this shape:
{
  "id": "generate-a-unique-uuid-here",
  "type": "title" | "objectives" | "content" | "summary" | "edge_cases" | "resources",
  "title": "Slide Title",
  "body": "Slide content text. Use \\n for line breaks.",
  "notes": "Speaker notes for the trainer",
  "order": number
}

Rules for the Slide Deck:
1. Slide 1 must be a "title" slide with the SOP Title and objective.
2. Slide 2 must be an "objectives" slide listing what the trainee will learn.
3. The following slides should be "content" slides breaking down the procedure step-by-step. Group related steps together logically.
4. Include at least one "edge_cases" slide detailing warnings, precautions, or exceptions found in the SOP.
5. Provide a "summary" slide at the end.
6. Ensure 'order' starts at 1 and increments.
`

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
            return NextResponse.json({ error: 'Failed to generate slide deck' }, { status: 500 })
        }

        const data = await response.json()
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
        
        let slideDeck: TrainingSlide[] = []
        try {
            slideDeck = JSON.parse(textResponse)
        } catch (e) {
            console.error('Failed to parse Gemini JSON:', textResponse)
            return NextResponse.json({ error: 'Model returned invalid JSON' }, { status: 500 })
        }

        // Save generated slide deck to module
        const { error: updateError } = await serviceClient
            .from('training_modules')
            .update({ 
                slide_deck: slideDeck, 
                slide_deck_generated_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', moduleId)

        if (updateError) throw new Error(updateError.message)

        await serviceClient.from('training_log').insert({
            actor_id: user.id, action: 'slide_deck_generated', module_id: moduleId
        })

        return NextResponse.json({ success: true, slides: slideDeck })
    } catch (error: any) {
        console.error('Generate slides error:', error)
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
    }
}
