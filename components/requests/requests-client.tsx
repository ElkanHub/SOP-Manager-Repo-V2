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
import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { RequestDetailModal } from './request-detail-modal'

interface RequestsClientProps {
  profile: Profile
  user: { id: string }
  isQaManager: boolean
  initialRequests: DocumentRequest[]
}

export function RequestsClient({ profile, user, isQaManager, initialRequests }: RequestsClientProps) {
  const [requests, setRequests] = useState<DocumentRequest[]>(initialRequests)
  const [modalOpen, setModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('all')
  const supabase = createClient()
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const selectedRequest = useMemo(() => 
    requests.find(r => r.id === selectedRequestId) || null,
  [requests, selectedRequestId])

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


  // ─── Table Columns ────────────────────────────────────────────────────────
  const columns: ColumnDef<DocumentRequest>[] = useMemo(() => [
    {
        accessorKey: 'reference_number',
        header: 'Ref No.',
        cell: ({ row }) => (
            <button 
                onClick={() => {
                    setSelectedRequestId(row.original.id)
                    setDetailModalOpen(true)
                }}
                className="font-mono text-[11px] font-bold text-amber-600 bg-amber-500/5 px-2 py-1 rounded hover:bg-amber-500/10 transition-colors"
            >
                {row.getValue('reference_number')}
            </button>
        )
    },
    ...(isQaManager ? [
        {
            accessorKey: 'requester_name',
            header: 'Requester',
            cell: ({ row }: { row: any }) => (
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground tracking-tight">{row.getValue('requester_name')}</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[150px]" title={row.original.requester_email}>
                        {row.original.requester_email}
                    </span>
                </div>
            )
        },
        {
            accessorKey: 'requester_department',
            header: 'Dept',
            cell: ({ row }: { row: any }) => (
                <span className="text-xs font-medium text-muted-foreground/80">{row.getValue('requester_department')}</span>
            )
        }
    ] : []),
    {
        accessorKey: 'request_body',
        header: 'Request',
        cell: ({ row }) => (
            <p className="text-xs text-foreground/80 line-clamp-1 italic max-w-[300px]">
                &quot;{row.getValue('request_body')}&quot;
            </p>
        )
    },
    {
        accessorKey: 'submitted_at',
        header: 'Submitted',
        cell: ({ row }) => (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(row.getValue('submitted_at')), { addSuffix: true })}
            </span>
        )
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <RequestStatusPill status={row.getValue('status')} size="sm" />
    },
    {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
            const req = row.original
            if (!isQaManager || req.status === 'fulfilled') return null

            return (
                <div className="flex items-center gap-2">
                    {req.status === 'submitted' && (
                        <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-7 text-[9px] font-bold uppercase tracking-widest text-brand-teal hover:bg-brand-teal/5 border border-brand-teal/20"
                            onClick={() => markRequestReceived(req.id)}
                        >
                            Mark Received
                        </Button>
                    )}
                    <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-7 text-[9px] font-bold uppercase tracking-widest text-foreground/70 hover:bg-muted border border-border/60"
                        onClick={() => {
                            setSelectedRequestId(req.id)
                            setDetailModalOpen(true)
                        }}
                    >
                        Process
                    </Button>
                </div>
            )
        }
    }
  ], [isQaManager])


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
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-6 py-4 shrink-0 shadow-sm relative z-10">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {isQaManager ? 'Document Requests Dashboard' : 'My Requests'}
            </h1>
            {isQaManager && pendingCount > 0 && (
              <p className="text-[10px] uppercase font-bold tracking-widest text-amber-600">{pendingCount} pending action{pendingCount > 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2 shadow-md bg-brand-teal hover:bg-brand-teal/90 rounded-lg">
          <Plus className="w-4 h-4" />
          New Request
        </Button>
      </div>

      {/* Tab strip */}
      <div className="px-6 pt-4 pb-0 bg-muted/5">
        <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
          {TABS.map(tab => {
            const count = requests.filter(tab.filter).length
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-t-xl text-[11px] font-bold uppercase tracking-widest transition-all',
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-[0_-2px_10px_-3px_rgba(0,0,0,0.1)] border-x border-t border-border/60'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span className={cn(
                    'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
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
      <div className="flex-1 px-6 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4 bg-background border border-dashed border-border/60 rounded-2xl">
            <div className="p-4 bg-muted/10 rounded-full">
                <ClipboardList className="w-10 h-10 text-muted-foreground/30" />
            </div>
            <div className="space-y-1">
                <p className="text-base font-bold text-foreground">
                {activeTab === 'all' ? 'No requests logged' : 'No matches found'}
                </p>
                <p className="text-xs text-muted-foreground">
                {activeTab === 'all' && !isQaManager
                    ? 'Submit a document request to QA to get started.'
                    : 'Try checking another category.'}
                </p>
            </div>
            {activeTab === 'all' && !isQaManager && (
              <Button onClick={() => setModalOpen(true)} variant="outline" className="mt-2 text-[10px] font-bold uppercase tracking-widest rounded-xl">
                <Plus className="w-4 h-4 mr-2" /> New Request
              </Button>
            )}
          </div>
        ) : (
          <DataTable 
             columns={columns}
             data={filtered}
             pageSize={20}
             onRowClick={(row) => {
                setSelectedRequestId(row.id)
                setDetailModalOpen(true)
             }}
          />
        )}
      </div>

      <RequestFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        profile={profile}
        onSuccess={() => {}}
      />

      <RequestDetailModal 
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        request={selectedRequest}
        isQaManager={isQaManager}
        onUpdate={updateRequest}
      />
    </div>
  )
}
