import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
// @ts-ignore
import * as mammoth from 'mammoth'
// @ts-ignore
import HtmlDiff from 'htmldiff-js'
import { sanitizeHtml } from '@/lib/utils/sanitize-html'

export async function POST(request: NextRequest) {
    const client = await createClient()

    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { old_file_url, new_file_url } = body

    if (!old_file_url || !new_file_url) {
        return NextResponse.json({ error: 'Missing file URLs' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    // Caller must be an active user.
    const { data: profile } = await serviceClient
        .from('profiles')
        .select('is_active')
        .eq('id', user.id)
        .single()

    if (!profile?.is_active) {
        return NextResponse.json({ error: 'User is inactive' }, { status: 403 })
    }

    // The two URLs must belong to a real change control — this endpoint downloads
    // with the service role, so without this binding any authenticated user could
    // diff arbitrary storage paths. Access to the change control page itself is
    // already gated server-side; here we just refuse off-record file pairs.
    const { data: ccRows } = await serviceClient
        .from('change_controls')
        .select('id')
        .eq('old_file_url', old_file_url)
        .eq('new_file_url', new_file_url)
        .limit(1)

    if (!ccRows || ccRows.length === 0) {
        return NextResponse.json({ error: 'Documents are not part of a known change control' }, { status: 403 })
    }

    try {
        // Fetch files directly from the secure storage bucket
        const [oldFile, newFile] = await Promise.all([
            serviceClient.storage.from('documents').download(old_file_url),
            serviceClient.storage.from('documents').download(new_file_url)
        ])

        if (oldFile.error) throw new Error(`Could not access old file: ${oldFile.error.message}`)
        if (newFile.error) throw new Error(`Could not access new file: ${newFile.error.message}`)

        // Convert Blobs to Node Buffers
        const oldBuffer = Buffer.from(await oldFile.data.arrayBuffer())
        const newBuffer = Buffer.from(await newFile.data.arrayBuffer())

        // Extract clean HTML structure instead of flat text, keeping empty paragraphs for visual spacing
        const mammothOptions = { ignoreEmptyParagraphs: false }
        const [oldHtmlResult, newHtmlResult] = await Promise.all([
            mammoth.convertToHtml({ buffer: oldBuffer }, mammothOptions),
            mammoth.convertToHtml({ buffer: newBuffer }, mammothOptions)
        ])

        // Sanitize each side BEFORE diffing so the rendered diff (injected via
        // dangerouslySetInnerHTML on the client) can never carry script/handlers
        // from a crafted .docx.
        const oldHtml = sanitizeHtml(oldHtmlResult.value)
        const newHtml = sanitizeHtml(newHtmlResult.value)

        // Use precise HTML diffing to protect tables, links, and bold/italic elements
        const diffHtml = HtmlDiff.execute(oldHtml, newHtml)

        return NextResponse.json({ diffHtml })
    } catch (error: any) {
        console.error('Text extraction diff error:', error)
        return NextResponse.json({ error: error.message || 'Failed to compare documents' }, { status: 500 })
    }
}
