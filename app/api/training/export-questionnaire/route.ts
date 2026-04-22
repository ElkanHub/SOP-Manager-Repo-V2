import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { jsPDF } from 'jspdf'

// ─── Brand palette (RGB for jsPDF) ──────────────────────────────────────
const RGB = {
    navy:     [15, 23, 42] as [number, number, number],     // #0F172A
    blue:     [2, 132, 199] as [number, number, number],    // #0284C7
    teal:     [13, 148, 136] as [number, number, number],   // #0D9488
    white:    [255, 255, 255] as [number, number, number],
    offWhite: [248, 250, 252] as [number, number, number],  // #F8FAFC
    lightGray:[226, 232, 240] as [number, number, number],  // #E2E8F0
    gray:     [100, 116, 139] as [number, number, number],  // #64748B
    text:     [30, 41, 59] as [number, number, number],     // #1E293B
    textMute: [71, 85, 105] as [number, number, number],    // #475569
    border:   [203, 213, 225] as [number, number, number],  // #CBD5E1
    green:    [5, 150, 105] as [number, number, number],    // #059669
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const questionnaireId = searchParams.get('questionnaireId')

    if (!questionnaireId) {
        return NextResponse.json({ error: 'Missing questionnaireId' }, { status: 400 })
    }

    const client = await createClient()
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()

    const { data: profile } = await serviceClient
        .from('profiles')
        .select('is_active, role')
        .eq('id', user.id)
        .single()
    if (!profile?.is_active) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { data: q, error: qError } = await serviceClient
        .from('training_questionnaires')
        .select('title, description, passing_score, version, training_modules(title, department, sop:sops(sop_number, version))')
        .eq('id', questionnaireId)
        .maybeSingle()

    if (qError) {
        console.error('Questionnaire fetch error:', qError)
        return NextResponse.json({ error: 'Failed to load questionnaire' }, { status: 500 })
    }
    if (!q) {
        return NextResponse.json({ error: 'Questionnaire not found' }, { status: 404 })
    }

    const { data: questions, error: questionsError } = await serviceClient
        .from('training_questions')
        .select('*')
        .eq('questionnaire_id', questionnaireId)
        .order('display_order', { ascending: true })

    if (questionsError) {
        console.error('Questions fetch error:', questionsError)
        return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 })
    }
    if (!questions || questions.length === 0) {
        return NextResponse.json({ error: 'This questionnaire has no questions yet.' }, { status: 400 })
    }

    try {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' })
        const PAGE_W = doc.internal.pageSize.getWidth()  // 210
        const PAGE_H = doc.internal.pageSize.getHeight() // 297
        const MARGIN = 15
        const CONTENT_W = PAGE_W - MARGIN * 2

        const mod: any = q.training_modules
        const modTitle = mod?.title || ''
        const dept = mod?.department || ''
        const sopNumber = mod?.sop?.sop_number || ''
        const sopVersion = mod?.sop?.version || ''

        // ─── Helpers ─────────────────────────────────────────────────────
        const setFill = (rgb: [number, number, number]) => doc.setFillColor(rgb[0], rgb[1], rgb[2])
        const setText = (rgb: [number, number, number]) => doc.setTextColor(rgb[0], rgb[1], rgb[2])
        const setDraw = (rgb: [number, number, number]) => doc.setDrawColor(rgb[0], rgb[1], rgb[2])

        let pageNum = 0

        const drawHeader = () => {
            pageNum++
            // Top brand band
            setFill(RGB.navy)
            doc.rect(0, 0, PAGE_W, 18, 'F')
            // Teal accent stripe
            setFill(RGB.teal)
            doc.rect(0, 18, PAGE_W, 1.2, 'F')

            // Left: module title eyebrow
            setText(RGB.white)
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.text('SOP TRAINING ASSESSMENT', MARGIN, 7.5)

            setText([200, 215, 235])
            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            const headerMeta = [sopNumber && `${sopNumber}${sopVersion ? ' v' + sopVersion : ''}`, dept]
                .filter(Boolean)
                .join('   •   ')
            if (headerMeta) doc.text(headerMeta, MARGIN, 13)

            // Right: questionnaire version
            if (q.version) {
                setText(RGB.white)
                doc.setFontSize(9)
                doc.setFont('helvetica', 'bold')
                doc.text(`v${q.version}`, PAGE_W - MARGIN, 7.5, { align: 'right' })
            }
        }

        const drawFooter = () => {
            const footerY = PAGE_H - 10
            setDraw(RGB.border)
            doc.setLineWidth(0.2)
            doc.line(MARGIN, footerY - 3, PAGE_W - MARGIN, footerY - 3)

            setText(RGB.gray)
            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            doc.text(`${dept ? dept + ' • ' : ''}CONFIDENTIAL`, MARGIN, footerY)
            doc.text(`Page ${pageNum}`, PAGE_W - MARGIN, footerY, { align: 'right' })
        }

        let y = 0

        const newPage = () => {
            drawFooter()
            doc.addPage()
            drawHeader()
            y = 28
        }

        const checkPageBreak = (needed: number) => {
            if (y + needed > PAGE_H - 18) newPage()
        }

        // ─── Page 1: header ──────────────────────────────────────────────
        drawHeader()
        y = 28

        // Title
        setText(RGB.text)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(18)
        const titleLines = doc.splitTextToSize(q.title || 'Assessment', CONTENT_W)
        doc.text(titleLines, MARGIN, y)
        y += titleLines.length * 7 + 2

        // Module subtitle
        setText(RGB.textMute)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(11)
        doc.text(modTitle, MARGIN, y)
        y += 7

        // Meta row (passing score + question count)
        setText(RGB.gray)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        const metaParts: string[] = []
        if (q.passing_score != null) metaParts.push(`PASSING SCORE: ${q.passing_score}%`)
        metaParts.push(`${questions.length} QUESTIONS`)
        doc.text(metaParts.join('    •    '), MARGIN, y)
        y += 7

        // ─── Trainee info block ──────────────────────────────────────────
        const infoY = y
        const infoH = 26
        setFill(RGB.offWhite)
        doc.rect(MARGIN, infoY, CONTENT_W, infoH, 'F')
        setDraw(RGB.border)
        doc.setLineWidth(0.3)
        doc.rect(MARGIN, infoY, CONTENT_W, infoH)
        // Left teal stripe
        setFill(RGB.teal)
        doc.rect(MARGIN, infoY, 1.2, infoH, 'F')

        setText(RGB.textMute)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text('TRAINEE INFORMATION', MARGIN + 5, infoY + 6)

        setText(RGB.text)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        const colLeft = MARGIN + 5
        const colRight = MARGIN + CONTENT_W / 2 + 5
        const labelY1 = infoY + 14
        const labelY2 = infoY + 22

        doc.text('Name:', colLeft, labelY1)
        setDraw(RGB.border)
        doc.line(colLeft + 14, labelY1 + 1, colLeft + CONTENT_W / 2 - 12, labelY1 + 1)

        doc.text('Date:', colRight, labelY1)
        doc.line(colRight + 12, labelY1 + 1, PAGE_W - MARGIN - 5, labelY1 + 1)

        doc.text('Signature:', colLeft, labelY2)
        doc.line(colLeft + 20, labelY2 + 1, colLeft + CONTENT_W / 2 - 12, labelY2 + 1)

        doc.text('Score:', colRight, labelY2)
        doc.line(colRight + 14, labelY2 + 1, PAGE_W - MARGIN - 5, labelY2 + 1)

        y = infoY + infoH + 8

        // ─── Instructions / description ──────────────────────────────────
        if (q.description) {
            setText(RGB.textMute)
            doc.setFont('helvetica', 'italic')
            doc.setFontSize(10)
            const splitDesc = doc.splitTextToSize(String(q.description), CONTENT_W)
            checkPageBreak(splitDesc.length * 5 + 5)
            doc.text(splitDesc, MARGIN, y)
            y += splitDesc.length * 5 + 6
        }

        // ─── Questions ───────────────────────────────────────────────────
        questions.forEach((question: any, index: number) => {
            const qNum = index + 1
            const qText = String(question.question_text || '')
            const qLines = doc.splitTextToSize(qText, CONTENT_W - 12)

            // Estimate needed height for the question + answer area
            let needed = 8 + qLines.length * 5 + 4
            if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
                const opts = (question.options as any[]) || []
                needed += opts.length * 7 + 4
            } else {
                needed += 24
            }
            checkPageBreak(needed)

            // Question number badge
            const badgeSize = 7
            setFill(RGB.blue)
            doc.circle(MARGIN + 3.5, y + 2.5, badgeSize / 2, 'F')
            setText(RGB.white)
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(8)
            doc.text(String(qNum), MARGIN + 3.5, y + 4, { align: 'center' })

            // Question text
            setText(RGB.text)
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(11)
            doc.text(qLines, MARGIN + 10, y + 4)
            y += qLines.length * 5 + 4

            y += 2

            // Answer area
            if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
                const options = (question.options as any[]) || []
                options.forEach((opt: any) => {
                    checkPageBreak(8)
                    // Checkbox
                    setDraw(RGB.border)
                    doc.setLineWidth(0.4)
                    doc.rect(MARGIN + 12, y - 2.5, 3.5, 3.5)

                    setText(RGB.text)
                    doc.setFont('helvetica', 'normal')
                    doc.setFontSize(10)
                    const label = String(opt.id || '').toUpperCase()
                    const optText = `${label ? label + ') ' : ''}${opt.text || ''}`
                    const optLines = doc.splitTextToSize(optText, CONTENT_W - 22)
                    doc.text(optLines, MARGIN + 18, y)
                    y += Math.max(6, optLines.length * 5)
                })
                y += 3
            } else {
                checkPageBreak(24)
                setDraw(RGB.border)
                doc.setLineWidth(0.2)
                doc.line(MARGIN + 10, y + 6, PAGE_W - MARGIN, y + 6)
                doc.line(MARGIN + 10, y + 14, PAGE_W - MARGIN, y + 14)
                doc.line(MARGIN + 10, y + 22, PAGE_W - MARGIN, y + 22)
                y += 26
            }

            // Separator
            if (index < questions.length - 1) {
                setDraw(RGB.lightGray)
                doc.setLineWidth(0.2)
                doc.line(MARGIN, y + 2, PAGE_W - MARGIN, y + 2)
                y += 6
            }
        })

        // ─── Footer on last page ─────────────────────────────────────────
        drawFooter()

        const arrayBuffer = doc.output('arraybuffer')
        const safeTitle = String(q.title || 'assessment')
            .replace(/[^a-z0-9\s]/gi, '')
            .replace(/\s+/g, '_')
            .toLowerCase()

        return new NextResponse(arrayBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${safeTitle}.pdf"`,
            },
        })
    } catch (error: any) {
        console.error('PDF Export error:', error)
        return NextResponse.json(
            { error: "We couldn't generate the assessment PDF. Please try again." },
            { status: 500 },
        )
    }
}
