# Document Request Feature — Implementation Plan

Any user can submit a formal document request to QA. QA manages a 4-stage lifecycle: `submitted → received → approved → fulfilled`. Every stage triggers a Pulse notification and audit log entry. All updates are immutable after submission (no UPDATE/DELETE RLS policy for app roles).

## Key Design Decisions (Spec + Codebase Consolidation)

| Decision | Choice |
|---|---|
| Migration number | `031` (030 is already `signup_pulse`) |
| pulse_items constraint | Alter existing CHECK to add `'request_update'` |
| QA Manager detection | `is_qa_manager(auth.uid())` DB function (already exists) |
| Server action pattern | Mirrors [getActiveUser()](file:///e:/Projects/sop-manager-v2/actions/settings.ts#12-28) in [actions/settings.ts](file:///e:/Projects/sop-manager-v2/actions/settings.ts) |
| Reports pattern | TanStack Query + `DataTable` + CSV export (mirrors [pm-completion-report.tsx](file:///e:/Projects/sop-manager-v2/components/reports/pm-completion-report.tsx)) |
| Sidebar badge | Added into existing [fetchCounts()](file:///e:/Projects/sop-manager-v2/components/pulse/the-pulse.tsx#20-37) + realtime `sidebar-badges` channel |

---

## Proposed Changes

### Database

#### [NEW] [031_document_requests.sql](file:///e:/Projects/sop-manager-v2/supabase/migrations/031_document_requests.sql)
- `document_requests` table with all lifecycle columns
- `generate_request_reference()` trigger — `REQ-YYYY-NNNN` format
- `update_request_updated_at()` trigger
- RLS: INSERT (own row only), SELECT (own rows OR `is_qa_manager()`), no UPDATE/DELETE
- 3 SECURITY DEFINER functions: `mark_request_received`, `mark_request_approved`, `mark_request_fulfilled`
- ALTER pulse_items CHECK constraint to add `'request_update'`

> [!IMPORTANT]
> Must be applied manually in Supabase SQL editor after file is created.

---

### TypeScript Types

#### [MODIFY] [app.types.ts](file:///e:/Projects/sop-manager-v2/types/app.types.ts)
- Add `RequestStatus` union type
- Add `DocumentRequest` interface

---

### Server Actions

#### [NEW] [requests.ts](file:///e:/Projects/sop-manager-v2/actions/requests.ts)
- `submitDocumentRequest(requestBody)` — validates, inserts, notifies all QA managers via Pulse, writes audit log using service client
- `markRequestReceived(requestId)` — QA only, calls `mark_request_received()`, notifies requester
- `markRequestApproved(requestId, qaNotes?)` — QA only, calls `mark_request_approved()`, notifies requester
- `markRequestFulfilled(requestId, qaNotes?)` — QA only, calls `mark_request_fulfilled()`, notifies requester

---

### Pages

#### [NEW] `app/(dashboard)/requests/page.tsx`
- Server component: fetches profile, is_qa_manager, all/own requests
#### [NEW] `app/(dashboard)/requests/loading.tsx`
#### [NEW] `app/(dashboard)/requests/error.tsx`

---

### Components

#### [NEW] `components/requests/request-status-pill.tsx`
#### [NEW] `components/requests/request-timeline.tsx`
#### [NEW] `components/requests/request-form-modal.tsx`
- 3-step: form → confirm → success
#### [NEW] `components/requests/requests-client.tsx`
- Non-QA: own requests, tab filter, realtime
- QA: all requests, Pending/Fulfilled tabs, action buttons, realtime

---

### Pulse

#### [NEW] `components/pulse/request-update-item.tsx`

---

### Sidebar

#### [MODIFY] [app-sidebar.tsx](file:///e:/Projects/sop-manager-v2/components/app-sidebar.tsx)
- Add `Requests` nav item with `ClipboardList` icon
- Add live badge count to [fetchCounts()](file:///e:/Projects/sop-manager-v2/components/pulse/the-pulse.tsx#20-37) and `sidebar-badges` realtime channel

---

### Reports

#### [NEW] `components/reports/document-requests-report.tsx`
#### [MODIFY] [reports-client.tsx](file:///e:/Projects/sop-manager-v2/components/reports/reports-client.tsx)
- Add Report 6: "Document Requests" (access: `qa+admin`)
#### [MODIFY] [reports.ts](file:///e:/Projects/sop-manager-v2/lib/queries/reports.ts)
- Add `fetchDocumentRequests()` query function

## Verification Plan
- `npm run build` passes with zero TypeScript errors
- Manual test: Employee submits request → QA receives Pulse → QA marks stages → Requester sees Pulse for each
- Verify RLS: direct `SELECT * FROM document_requests` as non-QA returns only own rows
- Verify sidebar badge updates live
