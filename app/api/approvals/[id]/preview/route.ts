import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
// @ts-ignore
import * as mammoth from 'mammoth'

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    const client = await createClient()
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = await createServiceClient()

    const { data: request } = await service
        .from('sop_approval_requests')
        .select('id, submitted_by, file_url')
        .eq('id', id)
        .single()

    if (!request) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: isQa } = await service.rpc('is_qa_manager', { user_id: user.id })
    const isSubmitter = request.submitted_by === user.id
    if (!isQa && !isSubmitter) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const dl = await service.storage.from('documents').download(request.file_url)
    if (dl.error || !dl.data) {
        return NextResponse.json({ error: dl.error?.message || 'Could not fetch document' }, { status: 500 })
    }

    try {
        const buffer = Buffer.from(await dl.data.arrayBuffer())
        const result = await mammoth.convertToHtml({ buffer }, { ignoreEmptyParagraphs: false })
        return NextResponse.json({ html: sanitize(result.value) })
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to convert document' }, { status: 500 })
    }
}

function sanitize(html: string): string {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
        .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
        .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
        .replace(/javascript:/gi, '')
}
