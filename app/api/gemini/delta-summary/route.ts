import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
// @ts-ignore
import * as mammoth from 'mammoth'
import { generateText, friendlyAiMessage, isAiConfigured } from '@/lib/ai/client'

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

    if (!isAiConfigured()) {
        return NextResponse.json({ error: 'AI features are not configured' }, { status: 500 })
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

        const { data: summary } = await generateText({
            purpose: 'delta-summary',
            tier: 'fast',
            prompt,
            temperature: 0.7,
            maxOutputTokens: 500,
            actorId: user.id,
        })

        return NextResponse.json({ summary })
    } catch (error: any) {
        console.error('Delta summary error:', error)
        return NextResponse.json({ error: friendlyAiMessage(error) }, { status: 500 })
    }
}
