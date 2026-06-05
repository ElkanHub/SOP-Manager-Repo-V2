import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { startOfDay } from 'date-fns'

// Daily cron. Finds training assignments whose module deadline has passed and
// the trainee has not yet completed, then sends a single Pulse to the trainee
// and one department-scoped manager alert per assignment.
export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
    }
    if (process.env.NODE_ENV === 'production') {
        if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    const serviceClient = await createServiceClient()
    const todayStr = startOfDay(new Date()).toISOString().split('T')[0]

    const { data: assignments, error } = await serviceClient
        .from('training_assignments')
        .select(`
            id,
            assignee_id,
            assignee:profiles!training_assignments_assignee_id_fkey(full_name),
            module:training_modules!inner(id, title, deadline, department)
        `)
        .neq('status', 'completed')
        .not('training_modules.deadline', 'is', null)
        .lte('training_modules.deadline', todayStr)

    if (error) {
        console.error('Error fetching overdue assignments:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let alertsSent = 0
    for (const a of assignments) {
        const mod = Array.isArray(a.module) ? a.module[0] : a.module
        const assignee = Array.isArray(a.assignee) ? a.assignee[0] : a.assignee
        const assigneeName = assignee?.full_name || 'A trainee'

        // Dedup: use entity_id to check if we already sent a training_due pulse
        // for this assignment.
        const { data: existingPulse } = await serviceClient
            .from('pulse_items')
            .select('id')
            .eq('type', 'training_due')
            .eq('recipient_id', a.assignee_id)
            .eq('entity_id', a.id)
            .maybeSingle()

        if (existingPulse) continue

        // Trainee alert (self)
        await serviceClient.from('pulse_items').insert({
            sender_id: null,
            recipient_id: a.assignee_id,
            audience: 'self',
            type: 'training_due',
            title: `Training overdue — ${mod.title}`,
            body: `Your training "${mod.title}" was due on ${mod.deadline} and is now overdue. Please complete it as soon as possible.`,
            link_url: `/training/my-training`,
            entity_type: 'training_assignment',
            entity_id: a.id,
        })

        // Manager alert (department-wide)
        if (mod.department) {
            await serviceClient.from('pulse_items').insert({
                sender_id: null,
                audience: 'department',
                target_department: mod.department,
                type: 'training_due',
                title: `Overdue training in ${mod.department}`,
                body: `${assigneeName} has not completed "${mod.title}" — deadline was ${mod.deadline}.`,
                link_url: `/training/${mod.id}`,
                entity_type: 'training_assignment',
                entity_id: a.id,
            })
        }

        alertsSent++
    }

    const reviewWindow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data: reviewDueSops, error: reviewError } = await serviceClient
        .from('sops')
        .select('id, sop_number, title, department, submitted_by, due_for_revision')
        .eq('status', 'active')
        .not('due_for_revision', 'is', null)
        .gte('due_for_revision', todayStr)
        .lte('due_for_revision', reviewWindow)

    if (reviewError) {
        console.error('Error fetching SOP review reminders:', reviewError)
    }

    let reviewAlertsSent = 0
    for (const sop of reviewDueSops || []) {
        const { data: existingPulse } = await serviceClient
            .from('pulse_items')
            .select('id')
            .eq('type', 'system')
            .eq('entity_type', 'sop')
            .eq('entity_id', sop.id)
            .ilike('title', 'SOP review due%')
            .maybeSingle()

        if (existingPulse) continue

        await serviceClient.from('pulse_items').insert({
            sender_id: null,
            recipient_id: sop.submitted_by,
            audience: sop.submitted_by ? 'self' : 'department',
            target_department: sop.submitted_by ? null : sop.department,
            type: 'system',
            title: `SOP review due — ${sop.sop_number}`,
            body: `${sop.title} is due for GMP periodic review on ${sop.due_for_revision}.`,
            entity_type: 'sop',
            entity_id: sop.id,
        })
        reviewAlertsSent++
    }

    const { data: retentionExpiredSops } = await serviceClient
        .from('sops')
        .select('id, sop_number, title, department, retention_expires_at')
        .eq('status', 'superseded')
        .not('retention_expires_at', 'is', null)
        .lt('retention_expires_at', todayStr)

    for (const sop of retentionExpiredSops || []) {
        await serviceClient.from('pulse_items').insert({
            sender_id: null,
            audience: 'department',
            target_department: sop.department,
            type: 'system',
            title: `Retention review required — ${sop.sop_number}`,
            body: `${sop.title} passed its retention date (${sop.retention_expires_at}) and needs QA/Admin review.`,
            entity_type: 'sop',
            entity_id: sop.id,
        })
    }

    return NextResponse.json({
        success: true,
        alertsSent,
        overdueTotal: assignments.length,
        reviewAlertsSent,
        retentionReviewTotal: retentionExpiredSops?.length || 0,
    })
}
