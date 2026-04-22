import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// @ts-ignore
import pptxgen from 'pptxgenjs'

// ─── Brand palette (matches app/globals.css) ────────────────────────────
const BRAND = {
    navy:      '0F172A',
    blue:      '0284C7',
    teal:      '0D9488',
    white:     'FFFFFF',
    offWhite:  'F8FAFC',
    lightGray: 'E2E8F0',
    gray:      '64748B',
    darkGray:  '334155',
    text:      '1E293B',
    textMuted: '475569',
    subtle:    '94A3B8',
}

// ─── Slide-type colors (match in-app slide-presenter gradients) ─────────
// Each type has a deep header color and a lighter accent.
const TYPE_HEADER: Record<string, string> = {
    title:      '0D2B55',
    objectives: '0D3B4E',
    content:    '1A365D',
    summary:    '2D1B69',
    edge_cases: '7B2D26',
    resources:  '1A472A',
}

const TYPE_ACCENT: Record<string, string> = {
    title:      '1A5EA8',
    objectives: '00897B',
    content:    '3B6CB4',
    summary:    '6750A4',
    edge_cases: 'C94C4C',
    resources:  '40916C',
}

const TYPE_LABEL: Record<string, string> = {
    title:      'TITLE',
    objectives: 'OBJECTIVES',
    content:    'CONTENT',
    summary:    'SUMMARY',
    edge_cases: 'EDGE CASES',
    resources:  'RESOURCES',
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
        pres.company = mod.department || 'Atlantic Lifesciences'
        pres.title = mod.title
        pres.layout = 'LAYOUT_16x9' // 10" x 5.625"

        const SLIDE_W = 10
        const SLIDE_H = 5.625

        // ─── Master: CONTENT ─────────────────────────────────────────────
        pres.defineSlideMaster({
            title: 'CONTENT_MASTER',
            background: { color: BRAND.white },
            objects: [
                // Footer band
                { rect: { x: 0, y: SLIDE_H - 0.35, w: SLIDE_W, h: 0.35, fill: { color: BRAND.offWhite } } },
                // Brand teal accent stripe above footer
                { rect: { x: 0, y: SLIDE_H - 0.37, w: SLIDE_W, h: 0.02, fill: { color: BRAND.teal } } },
            ],
        })

        const slides = (mod.slide_deck as any[])
            .slice()
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        const totalSlides = slides.length

        for (let idx = 0; idx < totalSlides; idx++) {
            const s = slides[idx]
            const slideNum = idx + 1
            const headerColor = TYPE_HEADER[s.type] || TYPE_HEADER.content
            const accentColor = TYPE_ACCENT[s.type] || TYPE_ACCENT.content
            const typeLabel = TYPE_LABEL[s.type] || String(s.type || '').replace(/_/g, ' ').toUpperCase()

            if (s.type === 'title') {
                // ═══════════════════════════════════════════════════════════
                // TITLE SLIDE
                // ═══════════════════════════════════════════════════════════
                const slide = pres.addSlide()

                // Full navy background
                slide.addShape(pres.ShapeType.rect, {
                    x: 0, y: 0, w: SLIDE_W, h: SLIDE_H,
                    fill: { color: TYPE_HEADER.title },
                    line: { color: TYPE_HEADER.title, width: 0 },
                })

                // Accent blue band lower-third
                slide.addShape(pres.ShapeType.rect, {
                    x: 0, y: SLIDE_H * 0.78, w: SLIDE_W, h: SLIDE_H * 0.22,
                    fill: { color: TYPE_ACCENT.title },
                    line: { color: TYPE_ACCENT.title, width: 0 },
                })

                // Brand teal thin stripe (top of blue band)
                slide.addShape(pres.ShapeType.rect, {
                    x: 0, y: SLIDE_H * 0.78, w: SLIDE_W, h: 0.06,
                    fill: { color: BRAND.teal },
                    line: { color: BRAND.teal, width: 0 },
                })

                // Small eyebrow (SOP / department)
                const eyebrow = [sopNumber, mod.department, mod.sop_version ? `v${mod.sop_version}` : null]
                    .filter(Boolean)
                    .join('   •   ')
                if (eyebrow) {
                    slide.addText(eyebrow, {
                        x: 0.8, y: 1.25, w: SLIDE_W - 1.6, h: 0.4,
                        fontSize: 12, color: '94B8DC', fontFace: 'Calibri',
                        align: 'center', bold: true, charSpacing: 4,
                    })
                }

                // Module title
                slide.addText(s.title || mod.title, {
                    x: 0.6, y: 1.8, w: SLIDE_W - 1.2, h: 1.6,
                    fontSize: 40, bold: true, color: BRAND.white,
                    align: 'center', valign: 'middle', fontFace: 'Calibri',
                })

                // Subtitle / body
                const bodyText = String(s.body || '').replace(/\\n/g, '\n').trim()
                if (bodyText) {
                    slide.addText(bodyText, {
                        x: 1.2, y: 3.5, w: SLIDE_W - 2.4, h: 0.8,
                        fontSize: 16, color: 'CBD5E1',
                        align: 'center', valign: 'top', fontFace: 'Calibri',
                    })
                }

                // Training footer line
                slide.addText('SOP TRAINING MODULE', {
                    x: 0.8, y: SLIDE_H - 0.65, w: SLIDE_W - 1.6, h: 0.35,
                    fontSize: 10, bold: true, color: BRAND.white, fontFace: 'Calibri',
                    align: 'center', charSpacing: 8,
                })

                if (s.notes) slide.addNotes(String(s.notes))
            } else {
                // ═══════════════════════════════════════════════════════════
                // CONTENT SLIDE
                // ═══════════════════════════════════════════════════════════
                const slide = pres.addSlide({ masterName: 'CONTENT_MASTER' })

                // Colored header band
                slide.addShape(pres.ShapeType.rect, {
                    x: 0, y: 0, w: SLIDE_W, h: 1.0,
                    fill: { color: headerColor },
                    line: { color: headerColor, width: 0 },
                })

                // Thin accent stripe below header
                slide.addShape(pres.ShapeType.rect, {
                    x: 0, y: 1.0, w: SLIDE_W, h: 0.05,
                    fill: { color: accentColor },
                    line: { color: accentColor, width: 0 },
                })

                // Type label badge (top-right)
                slide.addText(typeLabel, {
                    x: SLIDE_W - 2.2, y: 0.18, w: 2.0, h: 0.3,
                    fontSize: 9, bold: true, color: BRAND.white, fontFace: 'Calibri',
                    align: 'right', charSpacing: 6,
                })

                // Module title (top-left eyebrow)
                slide.addText(mod.title, {
                    x: 0.4, y: 0.18, w: SLIDE_W - 4.5, h: 0.3,
                    fontSize: 10, color: 'CBD5E1', fontFace: 'Calibri',
                    align: 'left',
                })

                // Slide title
                slide.addText(s.title || '', {
                    x: 0.4, y: 0.45, w: SLIDE_W - 0.8, h: 0.5,
                    fontSize: 24, bold: true, color: BRAND.white, fontFace: 'Calibri',
                    align: 'left', valign: 'middle',
                })

                // Body: parse bullets + paragraphs
                const rawLines = String(s.body || '').split('\n').map((l: string) => l.replace(/\r/g, ''))
                const textItems: any[] = []
                let hasContent = false

                for (const line of rawLines) {
                    const trimmed = line.trim()
                    if (trimmed === '') {
                        if (hasContent) {
                            // Paragraph break via empty line
                            textItems.push({
                                text: ' ',
                                options: { fontSize: 6, breakLine: true, fontFace: 'Calibri' },
                            })
                        }
                        continue
                    }

                    const isBullet =
                        trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+[\.\)]\s/.test(trimmed)
                    const cleanText = isBullet
                        ? trimmed.replace(/^[•\-*]\s*/, '').replace(/^\d+[\.\)]\s*/, '')
                        : trimmed

                    textItems.push({
                        text: cleanText,
                        options: {
                            fontSize: 15,
                            color: BRAND.text,
                            fontFace: 'Calibri',
                            bullet: isBullet ? { code: '25CF', color: accentColor } : false,
                            paraSpaceAfter: 6,
                            breakLine: true,
                            lineSpacingMultiple: 1.35,
                        },
                    })
                    hasContent = true
                }

                if (textItems.length === 0) {
                    textItems.push({
                        text: '(No content)',
                        options: { fontSize: 14, color: BRAND.subtle, italic: true, fontFace: 'Calibri' },
                    })
                }

                slide.addText(textItems, {
                    x: 0.6, y: 1.35, w: SLIDE_W - 1.2, h: SLIDE_H - 1.85,
                    valign: 'top',
                    autoFit: true,
                } as any)

                // Footer: department + confidentiality
                slide.addText(`${mod.department || ''} • CONFIDENTIAL`, {
                    x: 0.4, y: SLIDE_H - 0.3, w: 5.0, h: 0.25,
                    fontSize: 8, color: BRAND.gray, fontFace: 'Calibri',
                    bold: true, charSpacing: 3,
                })

                // Footer: page number
                slide.addText(`${slideNum} / ${totalSlides}`, {
                    x: SLIDE_W - 1.4, y: SLIDE_H - 0.3, w: 1.0, h: 0.25,
                    fontSize: 8, color: BRAND.gray, fontFace: 'Calibri',
                    align: 'right', bold: true,
                })

                if (s.notes) slide.addNotes(String(s.notes))
            }
        }

        const buffer = await pres.write({ outputType: 'nodebuffer' })
        const safeTitle = String(mod.title || 'training')
            .replace(/[^a-z0-9\s]/gi, '')
            .replace(/\s+/g, '_')
            .toLowerCase()

        return new NextResponse(buffer as any, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'Content-Disposition': `attachment; filename="${safeTitle}_training.pptx"`,
            },
        })
    } catch (error: any) {
        console.error('PPTX Export error:', error)
        return NextResponse.json(
            { error: "We couldn't generate the PowerPoint. Please try again." },
            { status: 500 },
        )
    }
}
