'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DocumentRequest, Profile } from '@/types/app.types'
import { RequestStatusPill } from './request-status-pill'
import { RequestTimeline } from './request-timeline'
import { RequestFormModal } from './request-form-modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  ClipboardList,
  Plus,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { markRequestReceived, markRequestApproved, markRequestFulfilled } from '@/actions/requests'
import { cn } from '@/lib/utils'

interface RequestsClientProps {
  profile: Profile
  user: { id: string }
  isQaManager: boolean
  initialRequests: DocumentRequest[]
}

// ─── QA Action Row ────────────────────────────────────────────────────────────
function QaActionRow({
  request,
  onUpdate,
}: {
  request: DocumentRequest
  onUpdate: (updated: DocumentRequest) => void
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [qaNote, setQaNote] = useState(request.qa_notes || '')

  const run = async (action: () => Promise<{ success: boolean; error?: string }>, label: string) => {
    setLoading(label)
    setError(null)
    const result = await action()
    setLoading(null)
    if (!result.success) {
      setError(result.error || 'Something went wrong')
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-border/60 space-y-3">
      {request.status === 'approved' && (
        <div className="space-y-1">
          <label className="text-[13px] text-muted-foreground">Add a fulfilment note (optional)</label>
          <Textarea
            value={qaNote}
            onChange={(e) => setQaNote(e.target.value)}
            maxLength={500}
            placeholder="e.g. Document issued via email on 2 April 2026"
            className="h-20 resize-none text-sm"
          />
          <div className="text-right text-[11px] text-muted-foreground">{qaNote.length} / 500</div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        {/* Received */}
        {request.status === 'submitted' && (
          <Button
            size="sm"
            onClick={() => run(() => markRequestReceived(request.id), 'received')}
            disabled={!!loading}
          >
            {loading === 'received' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
            Mark Received
          </Button>
        )}
        {(request.status === 'received' || request.status === 'approved' || request.status === 'fulfilled') && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-semibold dark:bg-green-900/30 dark:text-green-300">
            <CheckCircle2 className="w-3 h-3" /> Received
          </span>
        )}

        {/* Approved */}
        {(request.status === 'submitted' || request.status === 'received') && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => run(() => markRequestApproved(request.id, qaNote || undefined), 'approved')}
            disabled={!!loading}
          >
            {loading === 'approved' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
            Mark Approved
          </Button>
        )}
        {(request.status === 'approved' || request.status === 'fulfilled') && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-semibold dark:bg-green-900/30 dark:text-green-300">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        )}

        {/* Fulfil */}
        {request.status === 'approved' && (
          <Button
            size="sm"
            className="bg-brand-teal hover:bg-teal-600 text-white"
            onClick={() => run(() => markRequestFulfilled(request.id, qaNote || undefined), 'fulfilled')}
            disabled={!!loading}
          >
            {loading === 'fulfilled' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
            Fulfil Request
          </Button>
        )}
        {request.status === 'fulfilled' && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-semibold dark:bg-green-900/30 dark:text-green-300">
            <CheckCircle2 className="w-3 h-3" /> Fulfilled
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md px-3 py-2 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

// ─── Request Card ─────────────────────────────────────────────────────────────
function RequestCard({
  request,
  isQaManager,
  onUpdate,
}: {
  request: DocumentRequest
  isQaManager: boolean
  onUpdate: (updated: DocumentRequest) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isLongBody = request.request_body.length > 200

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3 hover:shadow-md transition-shadow">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <RequestStatusPill status={request.status} size="sm" />
          <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            {request.reference_number}
          </span>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {formatDistanceToNow(new Date(request.submitted_at), { addSuffix: true })}
        </span>
      </div>

      {/* QA view: requester info */}
      {isQaManager && (
        <div className="text-sm">
          <p className="font-medium text-foreground">{request.requester_name}</p>
          <p className="text-xs text-muted-foreground">
            {request.requester_department} · {request.requester_role}
            {request.requester_employee_id && ` · ${request.requester_employee_id}`}
            {request.requester_email && ` · ${request.requester_email}`}
          </p>
        </div>
      )}

      {/* Request body */}
      <div>
        <p
          className={cn(
            'text-sm text-foreground',
            !isQaManager && !expanded && isLongBody && 'line-clamp-3'
          )}
        >
          {request.request_body}
        </p>
        {!isQaManager && isLongBody && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-brand-teal hover:underline mt-1 flex items-center gap-0.5"
          >
            {expanded ? <><ChevronUp className="w-3 h-3" />Show less</> : <><ChevronDown className="w-3 h-3" />Show more</>}
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="border-t border-border/50 pt-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Timeline</p>
        <RequestTimeline request={request} compact />
      </div>

      {/* QA Actions */}
      {isQaManager && request.status !== 'fulfilled' && (
        <QaActionRow request={request} onUpdate={onUpdate} />
      )}
    </div>
  )
}

// ─── Main Client ──────────────────────────────────────────────────────────────
export function RequestsClient({ profile, user, isQaManager, initialRequests }: RequestsClientProps) {
  const [requests, setRequests] = useState<DocumentRequest[]>(initialRequests)
  const [modalOpen, setModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('all')
  const supabase = createClient()

  const updateRequest = useCallback((updated: Partial<DocumentRequest> & { id: string }) => {
    setRequests(prev =>
      prev.map(r => r.id === updated.id ? { ...r, ...updated } : r)
    )
  }, [])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(isQaManager ? 'all-requests-qa' : 'my-requests')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'document_requests' },
        (payload) => {
          if (isQaManager) {
            setRequests(prev => [payload.new as DocumentRequest, ...prev])
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'document_requests' },
        (payload) => {
          updateRequest(payload.new as DocumentRequest)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [isQaManager, supabase, updateRequest])

  const handleSuccess = () => {
    // Realtime will update the list; modal shows success state
  }

  // ─── Tab filtering ────────────────────────────────────────────────────────
  const TABS = isQaManager
    ? [
        { id: 'pending', label: 'Pending', filter: (r: DocumentRequest) => r.status !== 'fulfilled' },
        { id: 'fulfilled', label: 'Fulfilled', filter: (r: DocumentRequest) => r.status === 'fulfilled' },
      ]
    : [
        { id: 'all', label: 'All', filter: () => true },
        { id: 'submitted', label: 'Waiting for QA', filter: (r: DocumentRequest) => r.status === 'submitted' },
        { id: 'received', label: 'Received', filter: (r: DocumentRequest) => r.status === 'received' },
        { id: 'approved', label: 'Approved', filter: (r: DocumentRequest) => r.status === 'approved' },
        { id: 'fulfilled', label: 'Fulfilled', filter: (r: DocumentRequest) => r.status === 'fulfilled' },
      ]

  const currentTab = TABS.find(t => t.id === activeTab) || TABS[0]
  const filtered = requests.filter(currentTab.filter)

  const pendingCount = isQaManager
    ? requests.filter(r => r.status !== 'fulfilled').length
    : requests.filter(r => r.status === 'submitted' || r.status === 'received').length

  return (
    <div className="flex flex-col min-h-full">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {isQaManager ? 'Document Requests' : 'My Requests'}
            </h1>
            {isQaManager && pendingCount > 0 && (
              <p className="text-xs text-muted-foreground">{pendingCount} pending action</p>
            )}
          </div>
          {isQaManager && pendingCount > 0 && (
            <Badge className="bg-red-500 text-white border-0 text-xs">{pendingCount}</Badge>
          )}
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Request
        </Button>
      </div>

      {/* Tab strip */}
      <div className="px-6 pt-4 pb-0">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {TABS.map(tab => {
            const count = requests.filter(tab.filter).length
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                    activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4 space-y-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <ClipboardList className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-base font-medium text-foreground">
              {activeTab === 'all' ? 'No requests yet' : 'No requests in this category'}
            </p>
            <p className="text-sm text-muted-foreground">
              {activeTab === 'all' && !isQaManager
                ? 'Submit a request to QA using the button above.'
                : 'Nothing to show here at the moment.'}
            </p>
            {activeTab === 'all' && !isQaManager && (
              <Button onClick={() => setModalOpen(true)} variant="outline" className="mt-1">
                <Plus className="w-4 h-4 mr-2" /> New Request
              </Button>
            )}
          </div>
        ) : (
          filtered.map(req => (
            <RequestCard
              key={req.id}
              request={req}
              isQaManager={isQaManager}
              onUpdate={updateRequest}
            />
          ))
        )}
      </div>

      <RequestFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        profile={profile}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
