import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
// @ts-ignore
import * as mammoth from 'mammoth'
import { diff_match_patch } from 'diff-match-patch'

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

        // Extract clean text
        const [oldTextResult, newTextResult] = await Promise.all([
            mammoth.extractRawText({ buffer: oldBuffer }),
            mammoth.extractRawText({ buffer: newBuffer })
        ])

        const oldText = oldTextResult.value
        const newText = newTextResult.value

        // Run structured Diff
        const dmp = new diff_match_patch()
        const diffs = dmp.diff_main(oldText, newText)
        dmp.diff_cleanupSemantic(diffs)

        // Map to standard layout
        const formattedDiff = diffs.map(([op, text]) => {
            let opStr = 'equal'
            if (op === -1) opStr = 'delete'
            if (op === 1) opStr = 'insert'
            return { op: opStr, value: text }
        })

        return NextResponse.json({ diff: formattedDiff })
    } catch (error: any) {
        console.error('Text extraction diff error:', error)
        return NextResponse.json({ error: error.message || 'Failed to compare documents' }, { status: 500 })
    }
}
