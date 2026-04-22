import { createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 })
  }

  if (process.env.NODE_ENV === 'production') {
    if (token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const supabase = await createServiceClient()

  try {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const weekFromNowStr = weekFromNow.toISOString().split('T')[0]

    const { data: pmDueTasks, error: pmDueError } = await supabase
      .from('pm_tasks')
      .select(`
        id,
        assigned_to,
        due_date,
        status,
        equipment:equipment_id(name, asset_id, department)
      `)
      .eq('status', 'pending')
      .gte('due_date', todayStr)
      .lte('due_date', weekFromNowStr)

    if (pmDueError) {
      console.error('Error fetching PM due tasks:', pmDueError)
    }

    if (pmDueTasks && pmDueTasks.length > 0) {
      const pulseItems = pmDueTasks.map((task: any) => {
        const equipmentName = task.equipment?.name || 'equipment'
        const assetId = task.equipment?.asset_id
        const assetLabel = assetId ? `${equipmentName} (${assetId})` : equipmentName
        return {
          recipient_id: task.assigned_to,
          sender_id: null,
          type: 'pm_due',
          title: `PM due soon — ${equipmentName}`,
          body: `Your PM task for ${assetLabel} is due on ${task.due_date}. Complete it before the deadline to keep the asset in compliance.`,
          entity_type: 'pm_task',
          entity_id: task.id,
          audience: 'self' as const,
        }
      })

      await supabase.from('pulse_items').insert(pulseItems)
    }

    return NextResponse.json({ 
      success: true, 
      message: `Sent ${pmDueTasks?.length || 0} PM due alerts` 
    })
  } catch (error) {
    console.error('PM alerts cron error:', error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
