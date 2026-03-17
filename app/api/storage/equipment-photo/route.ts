import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    const client = await createClient()

    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServiceClient()

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_active, role')
        .eq('id', user.id)
        .single()

    if (!profile?.is_active) {
        return NextResponse.json({ error: 'User is inactive' }, { status: 403 })
    }

    if (profile.role !== 'manager') {
        return NextResponse.json({ error: 'Only managers can upload equipment photos' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Only image files are allowed' }, { status: 415 })
    }

    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
        return NextResponse.json({ error: 'File too large. Maximum 2MB.' }, { status: 413 })
    }

    const fileId = crypto.randomUUID()
    const extension = file.name.split('.').pop()
    const filePath = `equipment-photos/${fileId}.${extension}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, buffer, {
            contentType: file.type,
            upsert: false,
        })

    if (uploadError) {
        console.error('Upload error:', uploadError)
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Generate a signed URL (1 hour) for immediate display.
    // Store filePath in the DB — generate signed URLs server-side on viewing.
    const { data: signedData, error: signedError } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600)

    if (signedError || !signedData?.signedUrl) {
        console.error('Signed URL error:', signedError)
        return NextResponse.json({ error: 'Failed to generate file URL' }, { status: 500 })
    }

    return NextResponse.json({
        success: true,
        fileUrl: signedData.signedUrl,
        filePath,
    })
}
