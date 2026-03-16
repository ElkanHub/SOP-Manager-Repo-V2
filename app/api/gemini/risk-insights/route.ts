import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { subDays, format } from "date-fns"

export async function POST(request: Request) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: isQa } = await serviceClient.rpc('is_qa_manager', { user_id: user.id })
  const { data: isAdmin } = await serviceClient.rpc('is_admin', { user_id: user.id })

  if (!isQa && !isAdmin) {
    return NextResponse.json({ error: "Forbidden - QA or Admin access required" }, { status: 403 })
  }

  const thirtyDaysAgo = subDays(new Date(), 30).toISOString()

  const { data: auditLog } = await serviceClient
    .from('audit_log')
    .select('*')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: pendingCCs } = await serviceClient
    .from('change_controls')
    .select('id, status, deadline, required_signatories')
    .eq('status', 'pending')

  const { data: overduePMs } = await serviceClient
    .from('pm_tasks')
    .select('id, due_date, status, equipment:equipment_id(name, department)')
    .eq('status', 'overdue')

  const prompt = `Analyze the following organizational data and provide risk insights for an industrial SOP management system. 

Recent Audit Log (last 30 days):
${auditLog?.map(entry => `- ${entry.action} on ${entry.entity_type} at ${entry.created_at}`).join('\n') || 'No recent entries'}

Pending Change Controls:
${pendingCCs?.map(cc => `- CC ID: ${cc.id}, Status: ${cc.status}, Deadline: ${cc.deadline}`).join('\n') || 'None'}

Overdue PM Tasks:
${(overduePMs as any[])?.map((task: any) => `- ${task.equipment?.name} (${task.equipment?.department}) - Due: ${task.due_date}`).join('\n') || 'None'}

Based on this data, provide:
1. A risk level assessment (low, medium, or high)
2. 3-5 specific insights about potential risks or areas needing attention

Respond in JSON format:
{
  "risk_level": "low|medium|high",
  "insights": ["insight 1", "insight 2", "insight 3", "insight 4", "insight 5"]
}`

  try {
    const geminiKey = process.env.GEMINI_API_KEY

    if (!geminiKey) {
      return NextResponse.json({
        risk_level: 'medium',
        insights: [
          'GEMINI_API_KEY not configured - using default insights',
          'Pending change controls should be prioritized for signature collection',
          'Regular review of overdue PM tasks is recommended',
          'Consider scheduling quarterly SOP reviews',
        ],
        generated_at: new Date().toISOString(),
      })
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          },
        }),
      }
    )

    if (!response.ok) {
      throw new Error('Gemini API error')
    }

    const result = await response.json()
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    let parsedResult = {
      risk_level: 'medium',
      insights: [
        'Analysis completed but response format unexpected',
        'Manual review recommended for accuracy',
      ],
    }

    if (jsonMatch) {
      try {
        parsedResult = JSON.parse(jsonMatch[0])
      } catch {
        parsedResult = {
          risk_level: 'medium',
          insights: text.split('\n').filter((line: string) => line.trim() && !line.includes('{')).slice(0, 5),
        }
      }
    }

    return NextResponse.json({
      ...parsedResult,
      generated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Risk insights error:', error)
    return NextResponse.json({
      risk_level: 'medium',
      insights: [
        'Unable to generate AI insights at this time',
        'Please review pending change controls manually',
        'Check overdue PM tasks in the equipment section',
      ],
      generated_at: new Date().toISOString(),
    })
  }
}
