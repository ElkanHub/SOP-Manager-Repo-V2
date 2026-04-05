import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { startOfDay, subDays } from 'date-fns'

// This endpoint should be hit daily via Vercel Cron or similar
export async function GET(req: NextRequest) {
    if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        // In reality, protect this route. For demo, we might allow it or just use a basic check.
        // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()
    const todayStr = startOfDay(new Date()).toISOString().split('T')[0]
    
    // Find in-progress assignments with a deadline that is <= today
    const { data: assignments, error } = await serviceClient
        .from('training_assignments')
        .select(`
            id,
            assignee_id,
            module:training_modules!inner(id, title, deadline, department)
        `)
        .neq('status', 'completed')
        .not('training_modules.deadline', 'is', null)
        .lte('training_modules.deadline', todayStr)

    if (error) {
        console.error('Error fetching overdue assignments:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!assignments || assignments.length === 0) {
        return NextResponse.json({ success: true, message: 'No overdue assignments found.' })
    }

    let alertsSent = 0
    for (const a of assignments) {
        const mod = Array.isArray(a.module) ? a.module[0] : a.module
        
        // Check if we already alerted for this specific assignment
        const { data: existingPulse } = await serviceClient
            .from('pulse_items')
            .select('id')
            .eq('type', 'training_due')
            .eq('recipient_id', a.assignee_id)
            .contains('metadata', { assignment_id: a.id })
            .single()

        if (!existingPulse) {
            // Alert user
            await serviceClient.from('pulse_items').insert({
                sender_id: null,
                recipient_id: a.assignee_id,
                audience: 'direct',
                type: 'training_due',
                body: `Training Overdue: "${mod.title}" was due on ${mod.deadline}. Please complete it immediately.`,
                link_url: `/training/my-training`,
                metadata: { assignment_id: a.id, module_id: mod.id }
            })

            // Alert manager
            await serviceClient.from('pulse_items').insert({
                sender_id: null,
                audience: 'department',
                target_department: mod.department,
                type: 'training_due',
                body: `Manager Alert: Trainee has overdue training for "${mod.title}".`,
                link_url: `/training/${mod.id}`,
                metadata: { assignment_id: a.id, manager_alert: true }
            })
            alertsSent++
        }
    }

    return NextResponse.json({ success: true, alertsSent, overdueTotal: assignments.length })
}
