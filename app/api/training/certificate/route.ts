import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { jsPDF } from 'jspdf'

// ─── Brand palette (RGB for jsPDF) ──────────────────────────────────────
const RGB = {
    navy:     [15, 23, 42] as [number, number, number],     // #0F172A
    blue:     [2, 132, 199] as [number, number, number],    // #0284C7
    teal:     [13, 148, 136] as [number, number, number],   // #0D9488
    emerald:  [5, 150, 105] as [number, number, number],    // #059669
    emeralDk: [4, 120, 87] as [number, number, number],     // #047857
    slate800: [30, 41, 59] as [number, number, number],
    slate600: [71, 85, 105] as [number, number, number],
    slate500: [100, 116, 139] as [number, number, number],
    slate300: [203, 213, 225] as [number, number, number],
    white:    [255, 255, 255] as [number, number, number],
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const attemptId = searchParams.get('attemptId')

    if (!attemptId) {
        return NextResponse.json({ error: 'Missing attemptId' }, { status: 400 })
    }

    const client = await createClient()
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()

    // Fetch attempt + related data with service role (so RLS doesn't silently
    // filter rows; we authorize below).
    const { data: attempt, error: attemptError } = await serviceClient
        .from('training_attempts')
        .select(`
            id, respondent_id, submitted_at, score, passed, sop_version,
            training_modules(title, sop:sops(sop_number)),
            profiles:respondent_id(full_name)
        `)
        .eq('id', attemptId)
        .maybeSingle()

    if (attemptError) {
        console.error('Certificate fetch error:', attemptError)
        return NextResponse.json({ error: "We couldn't load your certificate. Please try again." }, { status: 500 })
    }
    if (!attempt) {
        return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }
    // Only the attempt owner (or admins/QA) may download. For simplicity here,
    // restrict to the owner — admins can still download their own certificates.
    if (attempt.respondent_id !== user.id) {
        return NextResponse.json({ error: 'You are not authorized to download this certificate.' }, { status: 403 })
    }
    if (!attempt.submitted_at || attempt.passed !== true) {
        return NextResponse.json({ error: 'Certificate is only available for passed attempts.' }, { status: 400 })
    }

    const fullName = (attempt.profiles as any)?.full_name || 'Trainee'
    const moduleTitle = (attempt.training_modules as any)?.title || ''
    const sopNumber = ((attempt.training_modules as any)?.sop as any)?.sop_number || ''
    const sopVersion = attempt.sop_version || ''
    const completedAt = attempt.submitted_at
    const score = Number(attempt.score || 0)

    try {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
        const PAGE_W = 297
        const PAGE_H = 210

        const setFill = (rgb: [number, number, number]) => doc.setFillColor(rgb[0], rgb[1], rgb[2])
        const setText = (rgb: [number, number, number]) => doc.setTextColor(rgb[0], rgb[1], rgb[2])
        const setDraw = (rgb: [number, number, number]) => doc.setDrawColor(rgb[0], rgb[1], rgb[2])

        // ─── Background ──────────────────────────────────────────────────
        setFill(RGB.white)
        doc.rect(0, 0, PAGE_W, PAGE_H, 'F')

        // Outer double-line border (frame)
        setDraw(RGB.slate800)
        doc.setLineWidth(1.2)
        doc.rect(10, 10, PAGE_W - 20, PAGE_H - 20)
        doc.setLineWidth(0.3)
        doc.rect(12.5, 12.5, PAGE_W - 25, PAGE_H - 25)

        // Top brand accent bar (teal)
        setFill(RGB.teal)
        doc.rect(10, 10, PAGE_W - 20, 2.5, 'F')

        // Bottom brand accent bar (teal)
        setFill(RGB.teal)
        doc.rect(10, PAGE_H - 12.5, PAGE_W - 20, 2.5, 'F')

        // ─── Eyebrow ─────────────────────────────────────────────────────
        setText(RGB.slate500)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.text('SOP TRAINING', PAGE_W / 2, 32, { align: 'center', charSpace: 3 })

        // ─── Title ───────────────────────────────────────────────────────
        setText(RGB.slate800)
        doc.setFont('times', 'bold')
        doc.setFontSize(34)
        doc.text('CERTIFICATE OF COMPLETION', PAGE_W / 2, 48, { align: 'center' })

        // Underline under title
        setDraw(RGB.slate800)
        doc.setLineWidth(0.6)
        doc.line(PAGE_W / 2 - 70, 54, PAGE_W / 2 + 70, 54)

        // ─── Body: "This is to certify that" ──────────────────────────────
        setText(RGB.slate500)
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(14)
        doc.text('This is to certify that', PAGE_W / 2, 72, { align: 'center' })

        // ─── Recipient name ──────────────────────────────────────────────
        setText(RGB.emeralDk)
        doc.setFont('times', 'bold')
        doc.setFontSize(36)
        // Auto-shrink very long names to fit the page
        let nameFont = 36
        while (doc.getTextWidth(fullName) > PAGE_W - 60 && nameFont > 20) {
            nameFont -= 2
            doc.setFontSize(nameFont)
        }
        doc.text(fullName, PAGE_W / 2, 92, { align: 'center' })

        // ─── Description ─────────────────────────────────────────────────
        setText(RGB.slate600)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(12)
        const descLines = [
            'has successfully completed the training and assessment requirements',
            'for the standard operating procedure:',
        ]
        descLines.forEach((line, i) => {
            doc.text(line, PAGE_W / 2, 108 + i * 6, { align: 'center' })
        })

        // ─── Module title ────────────────────────────────────────────────
        setText(RGB.slate800)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(18)
        // Wrap long titles
        const titleLines = doc.splitTextToSize(moduleTitle || 'Training Module', PAGE_W - 80)
        let titleY = 128
        ;(titleLines as string[]).forEach((line, i) => {
            doc.text(line, PAGE_W / 2, titleY + i * 8, { align: 'center' })
        })
        titleY += (titleLines as string[]).length * 8

        // SOP number + version
        if (sopNumber) {
            setText(RGB.slate500)
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(11)
            const sopLine = `${sopNumber}${sopVersion ? `   |   Version ${sopVersion}` : ''}`
            doc.text(sopLine, PAGE_W / 2, titleY + 2, { align: 'center' })
        }

        // ─── Footer columns: date | score | authority ────────────────────
        const footerY = PAGE_H - 45
        const colW = (PAGE_W - 40) / 3
        const col1X = 20 + colW * 0.5
        const col2X = 20 + colW * 1.5
        const col3X = 20 + colW * 2.5

        // Date
        const dateStr = new Date(completedAt as string).toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric',
        })
        setText(RGB.slate800)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(13)
        doc.text(dateStr, col1X, footerY, { align: 'center' })
        setDraw(RGB.slate800)
        doc.setLineWidth(0.4)
        doc.line(col1X - 30, footerY + 2, col1X + 30, footerY + 2)
        setText(RGB.slate500)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.text('DATE OF COMPLETION', col1X, footerY + 8, { align: 'center', charSpace: 2 })

        // Score
        setText(RGB.emeralDk)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(18)
        doc.text(`${score.toFixed(1)}%`, col2X, footerY, { align: 'center' })
        setDraw(RGB.slate800)
        doc.line(col2X - 30, footerY + 2, col2X + 30, footerY + 2)
        setText(RGB.slate500)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.text('ASSESSMENT SCORE', col2X, footerY + 8, { align: 'center', charSpace: 2 })

        // Authority
        setText(RGB.slate800)
        doc.setFont('times', 'italic')
        doc.setFontSize(14)
        doc.text('SOP Manager', col3X, footerY, { align: 'center' })
        setDraw(RGB.slate800)
        doc.line(col3X - 30, footerY + 2, col3X + 30, footerY + 2)
        setText(RGB.slate500)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.text('AUTHORIZED SYSTEM', col3X, footerY + 8, { align: 'center', charSpace: 2 })

        // Certificate ID (small, bottom left)
        setText(RGB.slate500)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.text(`Certificate ID: ${attempt.id}`, 16, PAGE_H - 17)

        const arrayBuffer = doc.output('arraybuffer')
        const safe = String(moduleTitle || 'training')
            .replace(/[^a-z0-9\s]/gi, '')
            .replace(/\s+/g, '_')
            .toLowerCase()

        return new NextResponse(arrayBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${safe}_certificate.pdf"`,
            },
        })
    } catch (error: any) {
        console.error('Certificate export error:', error)
        return NextResponse.json(
            { error: "We couldn't generate the certificate. Please try again." },
            { status: 500 },
        )
    }
}
