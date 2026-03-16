import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    const client = await createClient()
    
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()
    
    const { data: profile } = await serviceClient
        .from('profiles')
        .select('is_active, is_admin')
        .eq('id', user.id)
        .single()

    if (!profile?.is_active) {
        return NextResponse.json({ error: 'User is inactive' }, { status: 403 })
    }

    const body = await request.json()
    const { diff_json } = body

    if (!diff_json || !Array.isArray(diff_json)) {
        return NextResponse.json({ error: 'Invalid diff_json' }, { status: 400 })
    }

    const geminiApiKey = process.env.GEMINI_API_KEY
    
    if (!geminiApiKey) {
        return NextResponse.json({ error: 'Gemini API not configured' }, { status: 500 })
    }

    const changes = diff_json
        .filter((item: any) => item.op !== 'equal')
        .map((item: any) => `${item.op}: ${item.value}`)
        .join('\n')

    const prompt = `You are a quality assurance assistant. Analyze the following document changes and provide a brief summary (3-5 bullet points) of what changed. Focus on substantive changes, not minor formatting.

Changes:
${changes}

Provide a concise summary in bullet point format:`

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 500,
                    }
                })
            }
        )

        if (!response.ok) {
            const error = await response.text()
            console.error('Gemini API error:', error)
            return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
        }

        const data = await response.json()
        const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

        return NextResponse.json({ summary })
    } catch (error: any) {
        console.error('Delta summary error:', error)
        return NextResponse.json({ error: error.message || 'Failed to generate summary' }, { status: 500 })
    }
}
