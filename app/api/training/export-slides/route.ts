import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// @ts-ignore
import pptxgen from 'pptxgenjs'
import { TrainingModule } from '@/types/app.types'

// ─── Color Palette ──────────────────────────────────────────────────────
const COLORS = {
    navy:       '0D2B55',
    darkBlue:   '1A365D',
    blue:       '1A5EA8',
    teal:       '00897B',
    white:      'FFFFFF',
    offWhite:   'F8FAFC',
    lightGray:  'E2E8F0',
    gray:       '64748B',
    darkGray:   '334155',
    text:       '1E293B',
    textLight:  '475569',
    red:        'C94C4C',
    purple:     '6750A4',
    green:      '2D6A4F',
}

// Slide type → header color mapping
const TYPE_COLORS: Record<string, string> = {
    title:      COLORS.navy,
    objectives: COLORS.teal,
    content:    COLORS.darkBlue,
    summary:    COLORS.purple,
    edge_cases: COLORS.red,
    resources:  COLORS.green,
}

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
        .select('title, department, sop_version, slide_deck, sop:sops(sop_number)')
        .eq('id', moduleId)
        .single()

    if (!mod || !mod.slide_deck) {
        return NextResponse.json({ error: 'Slide deck not found' }, { status: 404 })
    }

    const sopNumber = (mod.sop as any)?.sop_number || ''

    try {
        const pres = new pptxgen()

        pres.author = 'SOP Manager'
        pres.company = mod.department
        pres.title = mod.title
        pres.layout = 'LAYOUT_16x9'

        // Define reusable master slides
        pres.defineSlideMaster({
            title: 'STANDARD',
            background: { color: COLORS.white },
            objects: [
                // Bottom border line
                { rect: { x: 0, y: '94%', w: '100%', h: '6%', fill: { color: COLORS.offWhite } } },
            ]
        })

        const slides = mod.slide_deck as any[]
        const totalSlides = slides.length

        for (let idx = 0; idx < totalSlides; idx++) {
            const s = slides[idx]
            const slideNum = idx + 1
            const typeColor = TYPE_COLORS[s.type] || COLORS.darkBlue

            if (s.type === 'title') {
                // ═══════════════════════════════════════════════════════════════
                // TITLE SLIDE — full gradient background, centered text
                // ═══════════════════════════════════════════════════════════════
                const slide = pres.addSlide()

                // Full navy background
                slide.addShape(pres.ShapeType.rect, {
                    x: 0, y: 0, w: '100%', h: '100%',
                    fill: { color: COLORS.navy }
                })

                // Decorative accent bar
                slide.addShape(pres.ShapeType.rect, {
                    x: 0, y: '85%', w: '100%', h: '15%',
                    fill: { color: COLORS.blue }
                })

                // Module title
                slide.addText(s.title, {
                    x: 0.8, y: 1.5, w: 8.4, h: 2.0,
                    fontSize: 36, bold: true, color: COLORS.white,
                    align: 'center', valign: 'middle',
                    fontFace: 'Calibri'
                })

                // Body text (subtitle)
                const bodyText = s.body.replace(/\\n/g, '\n')
                slide.addText(bodyText, {
                    x: 1.5, y: 3.5, w: 7.0, h: 1.5,
                    fontSize: 18, color: 'B0C4DE',
                    align: 'center', valign: 'top',
                    fontFace: 'Calibri'
                })

                // SOP reference + department
                slide.addText([
                    { text: sopNumber ? `${sopNumber}  •  ` : '', options: { fontSize: 12, color: 'B0C4DE' } },
                    { text: `${mod.department}`, options: { fontSize: 12, color: 'B0C4DE' } },
                    { text: mod.sop_version ? `  •  v${mod.sop_version}` : '', options: { fontSize: 12, color: 'B0C4DE' } },
                ], {
                    x: 1.5, y: 4.8, w: 7.0, h: 0.5,
                    align: 'center', fontFace: 'Calibri'
                })

                if (s.notes) slide.addNotes(s.notes)
            } else {
                // ═══════════════════════════════════════════════════════════════
                // ALL OTHER SLIDES — header bar + structured body
                // ═══════════════════════════════════════════════════════════════
                const slide = pres.addSlide({ masterName: 'STANDARD' })

                // Colored header banner
                slide.addShape(pres.ShapeType.rect, {
                    x: 0, y: 0, w: '100%', h: 1.0,
                    fill: { color: typeColor }
                })

                // Module name in header (small)
                slide.addText(mod.title, {
                    x: 0.5, y: 0.1, w: 7.5, h: 0.35,
                    fontSize: 11, color: 'B0C4DE', fontFace: 'Calibri'
                })

                // Slide type badge in header
                const typeLabel = s.type.replace('_', ' ').toUpperCase()
                slide.addText(typeLabel, {
                    x: 8.0, y: 0.15, w: 1.6, h: 0.3,
                    fontSize: 8, color: COLORS.white, fontFace: 'Calibri',
                    align: 'right', bold: true
                })

                // Slide title
                slide.addText(s.title, {
                    x: 0.5, y: 0.5, w: 9.0, h: 0.5,
                    fontSize: 22, bold: true, color: COLORS.white,
                    fontFace: 'Calibri', valign: 'middle'
                })

                // Body content — parse lines and handle bullets properly
                const bodyLines = s.body.split('\n').filter((l: string) => l.trim() !== '')
                const textItems: any[] = []

                for (const line of bodyLines) {
                    const trimmed = line.trim()
                    const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')
                    const cleanText = isBullet ? trimmed.replace(/^[•\-*]\s*/, '') : trimmed

                    textItems.push({
                        text: cleanText,
                        options: {
                            fontSize: 16,
                            color: COLORS.text,
                            bullet: isBullet ? { type: 'bullet', color: typeColor } : false,
                            paraSpaceAfter: 8,
                            breakType: 'break' as const,
                            fontFace: 'Calibri',
                            lineSpacingMultiple: 1.3,
                        }
                    })
                }

                slide.addText(textItems, {
                    x: 0.6, y: 1.3, w: 8.8, h: 3.8,
                    valign: 'top',
                })

                // Footer
                slide.addText(`Confidential — ${mod.department}`, {
                    x: 0.5, y: 5.15, w: 5.0, h: 0.3,
                    fontSize: 9, color: COLORS.gray, fontFace: 'Calibri'
                })

                slide.addText(`${slideNum} / ${totalSlides}`, {
                    x: 8.0, y: 5.15, w: 1.5, h: 0.3,
                    fontSize: 9, color: COLORS.gray, fontFace: 'Calibri', align: 'right'
                })

                // Presenter notes
                if (s.notes) {
                    slide.addNotes(s.notes)
                }
            }
        }

        const buffer = await pres.write({ outputType: 'nodebuffer' })

        // Sanitize filename
        const safeTitle = mod.title.replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '_').toLowerCase()

        return new NextResponse(buffer as any, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'Content-Disposition': `attachment; filename="${safeTitle}_training.pptx"`
            }
        })
    } catch (error: any) {
        console.error('PPTX Export error:', error)
        return NextResponse.json({ error: error.message || 'Server error exporting PPTX' }, { status: 500 })
    }
}
