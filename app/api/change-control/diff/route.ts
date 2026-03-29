import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
// @ts-ignore
import * as mammoth from 'mammoth'
// @ts-ignore
import HtmlDiff from 'htmldiff-js'

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

        // Extract clean HTML structure instead of flat text
        const [oldHtmlResult, newHtmlResult] = await Promise.all([
            mammoth.convertToHtml({ buffer: oldBuffer }),
            mammoth.convertToHtml({ buffer: newBuffer })
        ])

        const oldHtml = oldHtmlResult.value
        const newHtml = newHtmlResult.value

        // Use precise HTML diffing to protect tables, links, and bold/italic elements
        const diffHtml = HtmlDiff.execute(oldHtml, newHtml)

        return NextResponse.json({ diffHtml })
    } catch (error: any) {
        console.error('Text extraction diff error:', error)
        return NextResponse.json({ error: error.message || 'Failed to compare documents' }, { status: 500 })
    }
}
