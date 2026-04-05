import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// @ts-ignore
import pptxgen from 'pptxgenjs'
import { TrainingModule } from '@/types/app.types'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const moduleId = searchParams.get('moduleId')

    if (!moduleId) {
        return NextResponse.json({ error: 'Missing moduleId' }, { status: 400 })
    }

    const client = await createClient()
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: mod } = await client
        .from('training_modules')
        .select('title, department, slide_deck')
        .eq('id', moduleId)
        .single()

    if (!mod || !mod.slide_deck) {
        return NextResponse.json({ error: 'Slide deck not found' }, { status: 404 })
    }

    try {
        const pres = new pptxgen()

        pres.author = 'SOP Manager'
        pres.company = mod.department
        pres.title = mod.title

        const slides = mod.slide_deck as any[]

        for (const s of slides) {
            const slide = pres.addSlide()

            // Header banner
            slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.8, fill: { color: '1A365D' } })
            slide.addText(mod.title, { x: 0.5, y: 0.1, w: '90%', h: 0.6, color: 'FFFFFF', fontSize: 18, bold: true })

            // Slide content
            slide.addText(s.title, { x: 0.5, y: 1.0, w: '90%', h: 0.8, fontSize: 28, bold: true, color: '333333' })
            
            // Format body content
            // Assuming basic paragraph breaks mapping to pptx lists/lines
            const bodyLines = s.body.split('\n').filter((l: string) => l.trim() !== '')
            
            const textOptions = {
                x: 0.5, y: 2.0, w: '90%', h: 3.0,
                fontSize: 16,
                color: '444444',
                valign: 'top',
                bullet: { type: 'bullet' } // make lines bullet points by default
            }

            slide.addText(bodyLines.map((l: string) => ({ text: l, options: { bullet: true } })), textOptions)

            if (s.notes) {
                slide.addNotes(s.notes)
            }
            
            // Footer
            slide.addText(`Confidential - ${mod.department}`, { x: 0.5, y: '92%', w: '40%', fontSize: 10, color: '888888' })
            slide.addText(`Slide ${s.order}`, { x: '85%', y: '92%', w: '10%', fontSize: 10, color: '888888', align: 'right' })
        }

        const buffer = await pres.write('nodebuffer')

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'Content-Disposition': `attachment; filename="${mod.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_training.pptx"`
            }
        })
    } catch (error: any) {
        console.error('PPTX Export error:', error)
        return NextResponse.json({ error: error.message || 'Server error exporting PPTX' }, { status: 500 })
    }
}
