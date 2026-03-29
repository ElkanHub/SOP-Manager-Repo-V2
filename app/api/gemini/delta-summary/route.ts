import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
// @ts-ignore
import * as mammoth from 'mammoth'

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
    const { old_file_url, new_file_url } = body

    if (!new_file_url) {
        return NextResponse.json({ error: 'Missing document parameters' }, { status: 400 })
    }

    const geminiApiKey = process.env.GEMINI_API_KEY
    if (!geminiApiKey) {
        return NextResponse.json({ error: 'Gemini API not configured' }, { status: 500 })
    }

    try {
        const { data: newFile, error: newFileError } = await serviceClient.storage
            .from('documents')
            .download(new_file_url)

        if (newFileError || !newFile) throw new Error('Failed to retrieve target document')
        const newBuffer = Buffer.from(await newFile.arrayBuffer())

        let diffContext = ""
        if (old_file_url) {
            const { data: oldFile } = await serviceClient.storage
                .from('documents')
                .download(old_file_url)
            
            if (oldFile) {
                const oldBuffer = Buffer.from(await oldFile.arrayBuffer())
                const [oldTextResult, newTextResult] = await Promise.all([
                    mammoth.extractRawText({ buffer: oldBuffer }),
                    mammoth.extractRawText({ buffer: newBuffer })
                ])
                diffContext = `OLD DOCUMENT TEXT:\n${oldTextResult.value}\n\nNEW DOCUMENT TEXT:\n${newTextResult.value}`
            }
        }

        if (!diffContext) {
            const newTextResult = await mammoth.extractRawText({ buffer: newBuffer })
            diffContext = `NEW DOCUMENT TEXT:\n${newTextResult.value}`
        }

        const prompt = `You are a strict QA Technical Writer. Based on the document text provided, give a VERY concise bulleted summary (3-5 points) of the substantive differences between the old and new versions. Only focus on actual logic/policy expansions, not minor grammatical formatting. If there is no old document provided, summarize the core operational purpose of the new document.

${diffContext}

Provide the concise summary in basic bullet points using • :`

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
