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
    const today = new Date().toISOString().split('T')[0]

    const { data: overduePmTasks, error: overdueError } = await supabase
      .from('pm_tasks')
      .select(`
        id,
        assigned_to,
        due_date,
        equipment:equipment_id(id, name, department)
      `)
      .eq('status', 'pending')
      .lt('due_date', today)

    if (overdueError) {
      console.error('Error fetching overdue PM tasks:', overdueError)
    }

    let overdueCount = 0

    if (overduePmTasks && overduePmTasks.length > 0) {
      overdueCount = overduePmTasks.length

      for (const task of overduePmTasks as any[]) {
        await supabase
          .from('pm_tasks')
          .update({ status: 'overdue' })
          .eq('id', task.id)

        const taskAny = task as any
        const deptName = taskAny.equipment?.department

        await supabase.from('pulse_items').insert({
          recipient_id: task.assigned_to,
          sender_id: null,
          type: 'pm_overdue',
          title: `PM Overdue: ${taskAny.equipment?.name || 'Equipment'}`,
          body: `Was due on ${task.due_date}`,
          entity_type: 'pm_task',
          entity_id: task.id,
          audience: 'self',
        })

        if (deptName) {
          const { data: managers } = await supabase
            .from('profiles')
            .select('id')
            .eq('department', deptName)
            .eq('role', 'manager')
            .eq('is_active', true)

          if (managers && managers.length > 0) {
            const managerPulseItems = managers.map(m => ({
              recipient_id: m.id,
              sender_id: null,
              type: 'pm_overdue',
              title: `PM Overdue in ${deptName}: ${task.equipment?.name || 'Equipment'}`,
              body: `Assigned to user, due date was ${task.due_date}`,
              entity_type: 'pm_task',
              entity_id: task.id,
              audience: 'self',
            }))
            await supabase.from('pulse_items').insert(managerPulseItems)
          }
        }

        await supabase.from('audit_log').insert({
          actor_id: null,
          action: 'pm_task_marked_overdue',
          entity_type: 'pm_task',
          entity_id: task.id,
          metadata: {
            due_date: task.due_date,
            assigned_to: task.assigned_to,
          },
        })
      }
    }

    const { data: overdueCCs, error: ccError } = await supabase
      .from('change_controls')
      .select(`
        id,
        sop_id,
        deadline,
        sops:sop_id(id, title, department)
      `)
      .eq('status', 'pending')
      .lt('deadline', today)

    if (ccError) {
      console.error('Error fetching overdue CCs:', ccError)
    }

    let ccOverdueCount = 0

    if (overdueCCs && overdueCCs.length > 0) {
      ccOverdueCount = overdueCCs.length

      for (const cc of overdueCCs as any[]) {
        const ccAny = cc as any
        const deptName = ccAny.sops?.department

        if (deptName) {
          const { data: managers } = await supabase
            .from('profiles')
            .select('id')
            .eq('department', deptName)
            .eq('role', 'manager')
            .eq('is_active', true)

          if (managers && managers.length > 0) {
            const ccAny = cc as any
            const managerPulseItems = managers.map(m => ({
              recipient_id: m.id,
              sender_id: null,
              type: 'cc_deadline',
              title: `Change Control Deadline Passed: ${ccAny.sops?.title || 'SOP'}`,
              body: `Deadline was ${cc.deadline}. Signatures are overdue.`,
              entity_type: 'change_control',
              entity_id: cc.id,
              audience: 'self',
            }))
            await supabase.from('pulse_items').insert(managerPulseItems)
          }

          // 3-Day Escalation specifically to QA Managers
          const deadlineDate = new Date(cc.deadline)
          const currDate = new Date(today)
          const daysOverdue = Math.floor((currDate.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60 * 24))

          if (daysOverdue >= 3) {
            // Find QA departments
            const { data: qaDepts } = await supabase.from('departments').select('name').eq('is_qa', true)
            if (qaDepts && qaDepts.length > 0) {
              const qaDeptNames = qaDepts.map(d => d.name)
              const { data: qaManagers } = await supabase
                .from('profiles')
                .select('id')
                .in('department', qaDeptNames)
                .eq('role', 'manager')
                .eq('is_active', true)

              if (qaManagers && qaManagers.length > 0) {
                const ccAny = cc as any
                const escalationItems = qaManagers.map(qm => ({
                  recipient_id: qm.id,
                  sender_id: null,
                  type: 'cc_deadline',
                  title: `ESCALATION: CC Overdue > 3 Days (${ccAny.sops?.title || 'SOP'})`,
                  body: `This Change Control is ${daysOverdue} days past deadline.`,
                  entity_type: 'change_control',
                  entity_id: cc.id,
                  audience: 'self',
                }))
                await supabase.from('pulse_items').insert(escalationItems)
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Marked ${overdueCount} PM tasks overdue, sent ${ccOverdueCount} CC deadline alerts`
    })
  } catch (error) {
    console.error('Overdue check cron error:', error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
