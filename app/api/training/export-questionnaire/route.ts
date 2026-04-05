import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { jsPDF } from 'jspdf'

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

    const { data: q } = await client
        .from('training_questionnaires')
        .select('title, description, training_modules(title, department)')
        .eq('id', questionnaireId)
        .single()

    if (!q) {
        return NextResponse.json({ error: 'Questionnaire not found' }, { status: 404 })
    }

    const { data: questions } = await client
        .from('training_questions')
        .select('*')
        .eq('questionnaire_id', questionnaireId)
        .order('display_order', { ascending: true })

    if (!questions || questions.length === 0) {
        return NextResponse.json({ error: 'No questions available' }, { status: 400 })
    }

    try {
        const doc = new jsPDF()
        let y = 20

        const modTitle = (q.training_modules as any).title
        const dept = (q.training_modules as any).department

        // Helper for page breaks
        const checkPageBreak = (needed: number) => {
            if (y + needed > 280) {
                doc.addPage()
                y = 20
            }
        }

        doc.setFontSize(20)
        doc.text(q.title, 10, y)
        y += 10
        
        doc.setFontSize(12)
        doc.text(`Training Module: ${modTitle}`, 10, y)
        y += 8
        doc.text(`Department: ${dept}`, 10, y)
        y += 10

        // Trainee info block
        doc.rect(10, y, 190, 25)
        doc.text("Trainee Name: _________________________________", 15, y + 8)
        doc.text("Date: _________________________", 140, y + 8)
        doc.text("Signature: ___________________________________", 15, y + 20)
        y += 35

        if (q.description) {
            doc.setFontSize(10)
            const splitDesc = doc.splitTextToSize(q.description, 190)
            doc.text(splitDesc, 10, y)
            y += (splitDesc.length * 6) + 5
        }

        doc.setFontSize(12)
        
        questions.forEach((question, index) => {
            checkPageBreak(30)
            
            const qText = `${index + 1}. ${question.question_text}`
            const textLines = doc.splitTextToSize(qText, 190)
            doc.text(textLines, 10, y)
            y += (textLines.length * 6) + 4

            if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
                const options = (question.options as any[]) || []
                options.forEach(opt => {
                    checkPageBreak(10)
                    doc.text(`[   ] ${opt.id.toUpperCase()}) ${opt.text}`, 15, y)
                    y += 8
                })
            } else if (question.question_type === 'short_answer' || question.question_type === 'fill_blank') {
                checkPageBreak(25)
                doc.setDrawColor(200)
                doc.line(15, y + 10, 195, y + 10)
                doc.line(15, y + 20, 195, y + 20)
                y += 25
            }
            y += 5
        })

        const arrayBuffer = doc.output('arraybuffer')

        return new NextResponse(arrayBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${q.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf"`
            }
        })

    } catch (error: any) {
        console.error('PDF Export error:', error)
        return NextResponse.json({ error: error.message || 'Server error exporting PDF' }, { status: 500 })
    }
}
