import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { RequestsClient } from '@/components/requests/requests-client'
import { DocumentRequest } from '@/types/app.types'

export const dynamic = 'force-dynamic'

export default async function RequestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const service = await createServiceClient()

  const { data: profile } = await service
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.onboarding_complete) redirect('/onboarding')
  if (!profile.is_active) redirect('/login?reason=inactive')

  // Determine if QA Manager
  const { data: isQaManager } = await service.rpc('is_qa_manager', { user_id: user.id })
  const isAdmin = profile.is_admin

  // Build select with joined profiles
  const selectQuery = `
    *,
    received_by_profile:profiles!document_requests_received_by_fkey(id, full_name, avatar_url),
    approved_by_profile:profiles!document_requests_approved_by_fkey(id, full_name, avatar_url),
    fulfilled_by_profile:profiles!document_requests_fulfilled_by_fkey(id, full_name, avatar_url)
  `

  let requestsQuery = service
    .from('document_requests')
    .select(selectQuery)
    .order('submitted_at', { ascending: false })

  // If not QA Manager and not admin, scope to own requests only
  if (!isQaManager && !isAdmin) {
    requestsQuery = requestsQuery.eq('requester_id', user.id)
  }

  const { data: requests } = await requestsQuery

  return (
    <RequestsClient
      profile={profile}
      user={user}
      isQaManager={!!(isQaManager || isAdmin)}
      initialRequests={(requests as DocumentRequest[]) || []}
    />
  )
}
