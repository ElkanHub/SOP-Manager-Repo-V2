# SOP-Guard Pro — RequestFlowBuild.md
> **Feature Build Plan** | Document Request Flow
> Complete agent instruction file for building the Document Request feature from scratch.
> Read this entire file before writing a single line of code.
> Build in the order specified. Do not skip steps. Do not defer checklist items.

---

## FEATURE OVERVIEW

The Document Request feature allows any authenticated user in the organisation to submit a formal request to the QA department for a document, procedure, or record. The request goes through a four-stage lifecycle managed by QA. All stages are tracked, timestamped, and visible to the requester in real time.

### The Four Stages

```
SUBMITTED → RECEIVED → APPROVED → FULFILLED
```

| Stage | Who triggers it | What the requester sees |
|-------|----------------|------------------------|
| Submitted | The requester (any user) | "Waiting for QA" |
| Received | QA Manager clicks Received | "Received by QA" |
| Approved | QA Manager clicks Approved | "Approved — Pending Fulfilment" |
| Fulfilled | QA Manager clicks Fulfil | "Fulfilled" with timestamp |

### Design Principles

- Every user can make a request — no role restriction on submission.
- All requests go to QA. No routing logic, no department filters on the submission side.
- The form auto-fills all metadata — the requester only writes what they are requesting.
- The confirmation modal shows a full review before sending.
- Every state change creates a Pulse notification for the relevant party.
- Every state change is written to the audit log.
- QA sees all requests from all departments on their dedicated Requests page.
- Non-QA users see only their own requests.
- The request record is immutable after submission — the requester cannot edit or delete it.

---

## INFORMATION GATHERING (Do This First)

Before writing any code, verify the following from the existing codebase:

1. Confirm the exact `pulse_items` type CHECK constraint — you will add `'request_update'` to it.
2. Confirm the `audit_log` table structure — specifically the `action text` column.
3. Confirm `is_qa_manager()` DB function exists and its exact signature.
4. Confirm `is_active_user()` DB function exists.
5. Confirm how `fan_out_pulse_item` or equivalent notification dispatch works in the codebase — match the existing pattern exactly.
6. Check the sidebar component file path and how nav items and badges are added.
7. Check how other server actions in `/actions/` handle session validation — match that pattern exactly.
8. Check how other modals in the app (e.g. `AddEquipmentModal`) are structured — match the component pattern.
9. Confirm the `organisation_id` column situation — if it exists on profiles, include it on the requests table.
10. Confirm Tailwind CSS v4 semantic token usage — use `bg-card`, `text-foreground`, `border-border` etc. Never hardcode colours.

---

## DATABASE MIGRATION

### File: `supabase/migrations/029_document_requests.sql`

Create this file and run it in the Supabase SQL editor. Use `IF NOT EXISTS` on everything — safe to re-run.

```sql
-- ─── TABLE ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS document_requests (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Requester identity (auto-filled, never editable after submission)
  requester_id        uuid        NOT NULL REFERENCES profiles(id),
  requester_name      text        NOT NULL,
  requester_email     text        NOT NULL,
  requester_department text       NOT NULL,
  requester_role      text        NOT NULL,
  requester_job_title text,
  requester_employee_id text,

  -- Request content (the only thing the user writes)
  request_body        text        NOT NULL,

  -- Lifecycle status
  status              text        NOT NULL DEFAULT 'submitted'
                      CHECK (status IN ('submitted','received','approved','fulfilled')),

  -- Stage timestamps — each set exactly once when that stage is reached
  submitted_at        timestamptz NOT NULL DEFAULT now(),
  received_at         timestamptz,
  approved_at         timestamptz,
  fulfilled_at        timestamptz,

  -- QA actor tracking — who performed each action
  received_by         uuid        REFERENCES profiles(id),
  approved_by         uuid        REFERENCES profiles(id),
  fulfilled_by        uuid        REFERENCES profiles(id),

  -- QA notes (optional — QA can add a note when approving or fulfilling)
  qa_notes            text,

  -- Reference number for traceability (auto-generated: REQ-YYYY-NNNN)
  reference_number    text        UNIQUE,

  -- Immutability guard — set to true after insert, blocks all UPDATE from app roles
  -- (updates only allowed via server functions using service role)
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ─── REFERENCE NUMBER GENERATOR ───────────────────────────────────────────────
-- Generates REQ-2026-0001, REQ-2026-0002, etc.
-- Resets sequence per year.

CREATE SEQUENCE IF NOT EXISTS document_request_seq START 1;

CREATE OR REPLACE FUNCTION generate_request_reference()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  year_str  text := to_char(now(), 'YYYY');
  seq_num   int;
BEGIN
  SELECT nextval('document_request_seq') INTO seq_num;
  NEW.reference_number := 'REQ-' || year_str || '-' || lpad(seq_num::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_request_reference
BEFORE INSERT ON document_requests
FOR EACH ROW
WHEN (NEW.reference_number IS NULL)
EXECUTE FUNCTION generate_request_reference();

-- ─── UPDATED_AT TRIGGER ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_request_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_request_updated_at
BEFORE UPDATE ON document_requests
FOR EACH ROW EXECUTE FUNCTION update_request_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;

-- Any active user can INSERT their own request
CREATE POLICY "active users can submit requests"
ON document_requests FOR INSERT
WITH CHECK (
  requester_id = auth.uid()
  AND is_active_user(auth.uid())
);

-- Requesters can see their own requests only
CREATE POLICY "requesters see own requests"
ON document_requests FOR SELECT
USING (
  requester_id = auth.uid()
  AND is_active_user(auth.uid())
);

-- QA Managers see ALL requests
CREATE POLICY "qa managers see all requests"
ON document_requests FOR SELECT
USING (
  is_qa_manager(auth.uid())
);

-- No direct UPDATE from any app role — all updates go through server functions
-- using the service role key. This is the immutability guarantee.
-- (No UPDATE policy created here intentionally)

-- No DELETE for any role
-- (No DELETE policy created here intentionally)

-- ─── SERVER FUNCTIONS (called by server actions via service role) ──────────────

-- mark_request_received: QA only
CREATE OR REPLACE FUNCTION mark_request_received(
  p_request_id  uuid,
  p_qa_user_id  uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_qa_manager(p_qa_user_id) THEN
    RAISE EXCEPTION 'Only QA Managers can mark requests as received';
  END IF;

  UPDATE document_requests
  SET
    status      = 'received',
    received_at = now(),
    received_by = p_qa_user_id
  WHERE id = p_request_id
    AND status = 'submitted';  -- idempotency guard

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id)
  VALUES (p_qa_user_id, 'request_received', 'document_request', p_request_id);
END;
$$;

-- mark_request_approved: QA only
CREATE OR REPLACE FUNCTION mark_request_approved(
  p_request_id  uuid,
  p_qa_user_id  uuid,
  p_qa_notes    text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_qa_manager(p_qa_user_id) THEN
    RAISE EXCEPTION 'Only QA Managers can approve requests';
  END IF;

  UPDATE document_requests
  SET
    status      = 'approved',
    approved_at = now(),
    approved_by = p_qa_user_id,
    qa_notes    = p_qa_notes
  WHERE id = p_request_id
    AND status IN ('submitted', 'received');  -- can approve from either state

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id,
    metadata)
  VALUES (p_qa_user_id, 'request_approved', 'document_request', p_request_id,
    jsonb_build_object('qa_notes', p_qa_notes));
END;
$$;

-- mark_request_fulfilled: QA only
CREATE OR REPLACE FUNCTION mark_request_fulfilled(
  p_request_id  uuid,
  p_qa_user_id  uuid,
  p_qa_notes    text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_qa_manager(p_qa_user_id) THEN
    RAISE EXCEPTION 'Only QA Managers can fulfil requests';
  END IF;

  UPDATE document_requests
  SET
    status       = 'fulfilled',
    fulfilled_at = now(),
    fulfilled_by = p_qa_user_id,
    qa_notes     = COALESCE(p_qa_notes, qa_notes)  -- keep existing notes if no new ones
  WHERE id = p_request_id
    AND status = 'approved';  -- can only fulfil an approved request

  INSERT INTO audit_log (actor_id, action, entity_type, entity_id)
  VALUES (p_qa_user_id, 'request_fulfilled', 'document_request', p_request_id);
END;
$$;

-- ─── PULSE ITEM TYPE UPDATE ────────────────────────────────────────────────────
-- Add 'request_update' to the pulse_items type CHECK constraint.
-- Check the existing constraint name first, then drop and recreate.
-- Run this only if 'request_update' is not already in the CHECK constraint.

-- Step 1: Find the constraint name
-- SELECT conname FROM pg_constraint WHERE conrelid = 'pulse_items'::regclass AND contype = 'c';

-- Step 2: Drop old constraint (replace constraint_name with actual name found above)
-- ALTER TABLE pulse_items DROP CONSTRAINT <constraint_name>;

-- Step 3: Add new constraint including 'request_update'
-- ALTER TABLE pulse_items ADD CONSTRAINT pulse_items_type_check CHECK (type IN (
--   'notice', 'approval_request', 'approval_update', 'cc_signature', 'cc_deadline',
--   'pm_due', 'pm_overdue', 'sop_active', 'system', 'todo', 'message',
--   'request_update'   ← NEW
-- ));

-- NOTE: The agent must read the actual current CHECK constraint from the DB
-- before executing the above. Do not guess the constraint name.
-- Use: SELECT pg_get_constraintdef(oid) FROM pg_constraint
--      WHERE conrelid = 'pulse_items'::regclass AND contype = 'c';
```

### Verification after migration

Run these in the Supabase SQL editor to confirm everything is correct:

```sql
-- Confirm table exists with all columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'document_requests'
ORDER BY ordinal_position;

-- Confirm RLS is enabled
SELECT relrowsecurity FROM pg_class WHERE relname = 'document_requests';

-- Confirm triggers exist
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'document_requests';

-- Confirm reference number generates correctly
INSERT INTO document_requests (
  requester_id, requester_name, requester_email,
  requester_department, requester_role, request_body
) VALUES (
  auth.uid(), 'Test User', 'test@test.com',
  'Engineering', 'employee', 'Test request body'
);
SELECT reference_number FROM document_requests ORDER BY created_at DESC LIMIT 1;
-- Should return: REQ-2026-0001
```

---

## TYPESCRIPT TYPES

### Add to `/types/app.types.ts`

```typescript
export type RequestStatus = 'submitted' | 'received' | 'approved' | 'fulfilled'

export interface DocumentRequest {
  id:                    string
  requester_id:          string
  requester_name:        string
  requester_email:       string
  requester_department:  string
  requester_role:        string
  requester_job_title:   string | null
  requester_employee_id: string | null
  request_body:          string
  status:                RequestStatus
  reference_number:      string
  submitted_at:          string
  received_at:           string | null
  approved_at:           string | null
  fulfilled_at:          string | null
  received_by:           string | null
  approved_by:           string | null
  fulfilled_by:          string | null
  qa_notes:              string | null
  created_at:            string
  updated_at:            string
  // Joined fields (populated in queries)
  received_by_profile?:  Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  approved_by_profile?:  Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  fulfilled_by_profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}
```

---

## SERVER ACTIONS

### File: `/actions/requests.ts`

Build all four server actions in this file. Match the session validation and error handling pattern used in other action files in the codebase.

---

#### `submitDocumentRequest`

```typescript
'use server'

export async function submitDocumentRequest(requestBody: string) {
  // 1. Validate session — getUser() not getSession()
  // 2. Validate is_active_user
  // 3. Validate requestBody: trim, minimum 10 characters, maximum 2000 characters
  //    Return { success: false, error: 'Request must be at least 10 characters' } if too short
  //    Return { success: false, error: 'Request must be under 2000 characters' } if too long
  // 4. Fetch the current user's full profile (need: full_name, email, department,
  //    role, job_title, employee_id)
  // 5. INSERT into document_requests with all metadata from profile
  //    The DB trigger auto-generates reference_number
  // 6. After INSERT, get the new request id and reference_number
  // 7. Send Pulse notification to ALL QA Managers:
  //    - Find all active users where is_qa_manager() — or query profiles
  //      WHERE department = QA dept name AND role = 'manager' AND is_active = true
  //    - INSERT one pulse_items row PER QA Manager (recipient_id = each QA manager's id)
  //      type: 'request_update'
  //      title: 'New Document Request'
  //      body: '[requester_name] from [department] has submitted a document request.'
  //      entity_type: 'document_request'
  //      entity_id: new request id
  //      audience: 'self'
  // 8. Insert audit_log entry:
  //    action: 'request_submitted', entity_type: 'document_request', entity_id: new id
  // 9. Return { success: true, referenceNumber: string }

  // IMPORTANT: Use the Supabase service role client for the pulse notification
  // INSERT and audit_log INSERT. Use the regular server client for the
  // document_requests INSERT (so RLS applies and confirms the user is who they say).
}
```

---

#### `markRequestReceived`

```typescript
export async function markRequestReceived(requestId: string) {
  // 1. Validate session
  // 2. Validate is_qa_manager — return 403 error if not
  // 3. Call DB function: mark_request_received(requestId, user.id)
  //    This handles the UPDATE and audit_log in one atomic operation
  // 4. After DB function succeeds, fetch the request to get requester_id
  // 5. Send Pulse notification to the REQUESTER:
  //    type: 'request_update'
  //    title: 'Request Received'
  //    body: 'Your document request [REF] has been received by QA.'
  //    recipient_id: requester_id
  //    entity_type: 'document_request'
  //    entity_id: requestId
  // 6. Return { success: true }
}
```

---

#### `markRequestApproved`

```typescript
export async function markRequestApproved(requestId: string, qaNotes?: string) {
  // 1. Validate session
  // 2. Validate is_qa_manager
  // 3. Validate qaNotes if provided: max 500 characters
  // 4. Call DB function: mark_request_approved(requestId, user.id, qaNotes)
  // 5. Send Pulse notification to the REQUESTER:
  //    type: 'request_update'
  //    title: 'Request Approved'
  //    body: 'Your document request [REF] has been approved. QA will fulfil it shortly.'
  //    recipient_id: requester_id
  //    entity_type: 'document_request'
  //    entity_id: requestId
  // 6. Return { success: true }
}
```

---

#### `markRequestFulfilled`

```typescript
export async function markRequestFulfilled(requestId: string, qaNotes?: string) {
  // 1. Validate session
  // 2. Validate is_qa_manager
  // 3. Validate qaNotes if provided: max 500 characters
  // 4. Call DB function: mark_request_fulfilled(requestId, user.id, qaNotes)
  // 5. Send Pulse notification to the REQUESTER:
  //    type: 'request_update'
  //    title: 'Request Fulfilled'
  //    body: 'Your document request [REF] has been fulfilled by QA.'
  //    recipient_id: requester_id
  //    entity_type: 'document_request'
  //    entity_id: requestId
  // 6. Return { success: true }
}
```

---

## PAGES AND ROUTING

### New files to create

```
app/(dashboard)/requests/
├── page.tsx                     ← Server component
└── requests-client.tsx          ← Client component
```

### `page.tsx` — Server component

```typescript
// 1. Get user session — redirect to /login if no session
// 2. Fetch profile (need: is_qa_manager status, full profile for form auto-fill)
// 3. If QA Manager: fetch ALL requests ordered by created_at DESC
//    with joined profiles for received_by, approved_by, fulfilled_by
// 4. If non-QA: fetch only requests WHERE requester_id = user.id
//    ordered by created_at DESC
// 5. Pass data + isQaManager boolean to RequestsClient
// 6. This page must have a loading.tsx skeleton
```

---

## COMPONENTS

### File: `components/requests/request-form-modal.tsx`

The form modal that opens when any user clicks "New Request".

**Trigger:** A prominent "New Request" button on the Requests page. Primary button, full-width on mobile, fixed width on desktop.

**Modal behaviour:** Shadcn Dialog, max-w-lg, non-dismissable during submission (disable backdrop click while submitting).

**Step 1 — The Form:**

Auto-filled metadata section (read-only, visually distinct from the input):
```
┌─────────────────────────────────────────────┐
│ Request Details                             │
│ ─────────────────────────────────────────── │
│ Name:        James Paul                     │
│ Department:  QA                             │
│ Role:        Manager                        │
│ Job Title:   QA Manager                     │
│ Employee ID: EMP-001                        │
│ Date:        2 April 2026, 10:43 AM         │
└─────────────────────────────────────────────┘
```
Style: `bg-muted rounded-lg p-4 mb-6`. Each row is a flex pair: label in `text-muted-foreground text-13` and value in `text-foreground text-13 font-500`. Date is generated client-side at the moment the modal opens — `new Date().toLocaleString()`.

Request textarea:
- Label: "What are you requesting?" — `text-14 font-500 text-foreground mb-2`
- Textarea: full-width, `min-h-[120px] max-h-[280px]` auto-resize
- Placeholder: "Describe the document or record you need. Be as specific as possible — include document names, reference numbers, date ranges, or any other details that will help QA locate and prepare it."
- Character counter: right-aligned below textarea, `text-12 text-muted-foreground`
  - Normal: `[n] / 2000`
  - At 80%: amber
  - At 100%: red, textarea border turns red
- Min 10 characters. Show inline error if user tries to proceed with less.

Footer: Cancel (ghost) + "Review Request" primary button.
"Review Request" is disabled until textarea has ≥ 10 characters.

**Step 2 — Confirmation Modal:**

Opens in place of the form (same Dialog, content swaps).

Header: "Review your request"
Subtitle: "This request will be sent to QA. You cannot edit it after sending."

Full review card:
```
┌─────────────────────────────────────────────┐
│ [REQ-PENDING]  •  Waiting for QA            │
│ ─────────────────────────────────────────── │
│ From:  James Paul · QA · Manager            │
│ Date:  2 April 2026, 10:43 AM               │
│                                             │
│ Request:                                    │
│ "[the user's text here, full display,       │
│  no truncation]"                            │
└─────────────────────────────────────────────┘
```
The reference number shows as "REQ-PENDING" in grey italics — it will be assigned after submission.

`<Callout type="info">` Once submitted, this request cannot be edited or withdrawn. If you need to change something, contact QA directly.

Footer: "Back" ghost button (returns to Step 1 with text preserved) + "Submit Request" ShimmerButton.

**Submitting state:** ShimmerButton shows spinner + "Submitting..." text. Both buttons disabled. Backdrop click disabled.

**Step 3 — Success state (replaces modal content):**

```
CheckCircle2 icon 48px text-green-500 — animated scale-in

"Request Submitted"
14px/500 text-foreground mt-4

"Your request has been submitted to QA."
13px text-muted-foreground mt-1

Reference number: [REQ-2026-0001]
DM Mono 14px text-brand-teal font-600 mt-3
bg-muted px-3 py-1.5 rounded-md inline-block

"QA has been notified and will action your request."
12px text-muted-foreground mt-2
```

"Close" secondary button mt-6. On close: modal closes and the requests table refreshes to show the new submission.

---

### File: `components/requests/requests-client.tsx`

The main page content. Renders differently depending on whether the user is a QA Manager or not.

**Non-QA view — "My Requests":**

Page header: "My Requests" + "New Request" primary button (right-aligned).

Tab strip:
- All | Waiting for QA | Received | Approved | Fulfilled
- Shows count badge on each tab (number of requests in that status).
- Same pill tab style used elsewhere in the app.

Request cards (one per request, ordered newest first):

```
┌──────────────────────────────────────────────────────┐
│ [StatusPill]              [REF-2026-0001]  [time-ago] │
│                                                      │
│ "[Request body — truncated to 3 lines with          │
│  'Show more' toggle if longer]"                     │
│                                                      │
│ ── Timeline ──────────────────────────────────────── │
│ ✓ Submitted   2 Apr 2026, 10:43 AM                  │
│ ✓ Received    2 Apr 2026, 11:15 AM  by Sarah QA     │
│ ○ Approved    —                                      │
│ ○ Fulfilled   —                                      │
└──────────────────────────────────────────────────────┘
```

Timeline rendering:
- Completed stages: teal checkmark circle + timestamp + "by [QA name]"
- Pending stages: grey empty circle + em-dash
- Current stage (the latest completed one): pulsing dot animation

Status pill colours:
```
submitted:  bg-amber-100  text-amber-800  "Waiting for QA"
received:   bg-blue-100   text-blue-800   "Received by QA"
approved:   bg-indigo-100 text-indigo-800 "Approved"
fulfilled:  bg-green-100  text-green-800  "Fulfilled"
```
(Dark mode: use appropriate dark variants matching the app's dark mode token system)

Realtime subscription:
```typescript
// Subscribe to own requests — status changes arrive in real time
supabase
  .channel('my-requests')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'document_requests',
    filter: `requester_id=eq.${user.id}`
  }, (payload) => {
    // Update the request card in state — status and timestamps update live
    updateRequestInList(payload.new as DocumentRequest)
  })
  .subscribe()
```

Empty state:
```
ClipboardList icon 40px text-muted-foreground
"No requests yet"  16px/500 text-foreground mt-3
"Submit a request to QA using the button above."  13px text-muted-foreground mt-1
"New Request" action button  mt-4
```

---

**QA Manager view — "Document Requests":**

Page header: "Document Requests" + total pending count badge (submitted + received + approved).

Two-tab layout:
- **Pending** — all requests with status `submitted`, `received`, or `approved`
- **Fulfilled** — all requests with status `fulfilled`

**Pending tab — request cards for QA:**

```
┌──────────────────────────────────────────────────────────┐
│ [StatusPill]  [REF-2026-0001]           [submitted time] │
│                                                          │
│ From: James Paul · Engineering · Manager                 │
│       EMP-001 · james@company.com                        │
│                                                          │
│ "[Full request body — no truncation in QA view]"         │
│                                                          │
│ ── QA Actions ─────────────────────────────────────────  │
│                                                          │
│ [Received ✓]  [Approved ✓]  [Fulfil →]                  │
│                                                          │
│ QA Notes: [optional text input — visible to QA only      │
│            on the Approved and Fulfil actions]           │
└──────────────────────────────────────────────────────────┘
```

QA action buttons — conditional rendering based on current status:

```
status = 'submitted':
  [Mark Received]  primary sm button   calls markRequestReceived()
  [Mark Approved]  secondary sm button calls markRequestApproved()
  — Fulfil button not shown yet

status = 'received':
  [Received ✓]     disabled green badge (already done)
  [Mark Approved]  primary sm button   calls markRequestApproved()
  — Fulfil button not shown yet

status = 'approved':
  [Received ✓]     disabled green badge
  [Approved ✓]     disabled green badge
  [Fulfil Request] ShimmerButton       calls markRequestFulfilled()
  QA Notes input appears above the Fulfil button (optional, 500 chars max)
```

**The QA Notes input** (shown above the Fulfil button on approved requests):
```
Label: "Add a fulfilment note (optional)" text-13 text-muted-foreground mb-1
Input: h-32 full-width rounded-md border bg-background text-13
Placeholder: "e.g. Document issued via email on 2 April 2026"
Character counter: right-aligned text-11 text-muted-foreground
```
The note is saved when Fulfil is clicked. It is visible to the requester in their timeline (shown under the Fulfilled step).

**Loading state for QA action buttons:** Each button shows a spinner and disables all three buttons while the server action is running. Re-enables on completion or error.

**Error state for QA actions:** If the server action fails, show an inline error below the action row: `<ErrorCard message="..." onRetry={() => ...} />`. Never show a toast-only error for a compliance action.

**Fulfilled tab:**

Same card layout but condensed — shows the reference number, requester name, department, request body (truncated to 2 lines), and the fulfilment timestamp. A "View Details" toggle expands the full timeline.

Sorted by `fulfilled_at DESC` — most recently fulfilled at the top.

**Realtime subscription for QA view:**
```typescript
// QA sees all new submissions and all status updates in real time
supabase
  .channel('all-requests-qa')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'document_requests',
  }, (payload) => {
    prependRequestToList(payload.new as DocumentRequest)
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'document_requests',
  }, (payload) => {
    updateRequestInList(payload.new as DocumentRequest)
  })
  .subscribe()
```

---

### File: `components/requests/request-status-pill.tsx`

Reusable status pill component matching the app's StatusBadge style.

```typescript
interface RequestStatusPillProps {
  status: RequestStatus
  size?: 'sm' | 'md'
}

// Renders:
// submitted → amber  "Waiting for QA"
// received  → blue   "Received by QA"
// approved  → indigo "Approved"
// fulfilled → green  "Fulfilled"
```

---

### File: `components/requests/request-timeline.tsx`

Reusable timeline component showing the four stages.

```typescript
interface RequestTimelineProps {
  request: DocumentRequest
  compact?: boolean  // compact = true for non-QA view, false for QA view
}
```

Renders a vertical step list:
- Stage label + timestamp (formatted as "2 Apr 2026, 10:43 AM") + "by [name]" (if applicable)
- Completed: teal circle with CheckCircle2 icon
- Current (in-progress): amber circle with Clock icon + subtle pulse animation
- Pending: grey empty circle
- Connector line between stages: 1px vertical line, teal for completed segments, grey for pending

---

## SIDEBAR INTEGRATION

### Update: `components/app-sidebar.tsx`

Add "Requests" nav item between Messages and Calendar in the sidebar navigation list.

```typescript
// Nav item
{
  icon: ClipboardList,  // Lucide icon
  label: 'Requests',
  href: '/requests',
}
```

**Badge:** Show a count badge on the Requests nav item for:
- Non-QA users: count of their own requests with `status = 'submitted'` or `status = 'received'` — i.e. requests that are "in flight" and waiting for QA action. This keeps the badge meaningful — it clears when QA acts.
- QA Managers: count of ALL requests with `status IN ('submitted', 'received', 'approved')` — the full pending workload.

Badge style: `bg-red-500 text-white` — matches the existing sidebar badge pattern.

Realtime: Subscribe to `document_requests` table changes to keep the badge count live without page refresh.

---

## PULSE ITEM RENDERER

### Update: `components/pulse/the-pulse.tsx` or wherever the Pulse item type → renderer map lives

Add `request_update` to the renderer map:

```typescript
request_update: RequestUpdateItem,
```

### New file: `components/pulse/request-update-item.tsx`

```typescript
// Icon circle: bg-amber-100 icon=ClipboardList text-amber-600

// Title: varies by the pulse item's title field
//   "New Document Request" (sent to QA when a user submits)
//   "Request Received" (sent to requester)
//   "Request Approved" (sent to requester)
//   "Request Fulfilled" (sent to requester)

// Body: the body text from the pulse item
// Footer: time-ago + "View Request →" deep link to /requests
//   Clicking navigates to /requests and highlights the specific request
//   (pass reference_number or entity_id as a query param: /requests?highlight=REQ-2026-0001)
```

---

## REPORTS INTEGRATION

### Update: `components/reports/reports-client.tsx`

Add "Document Requests" as Report 6 in the report selector list.

Icon: `ClipboardList`
Label: "Document Requests"
Access: QA Manager + Admin only (same pattern as Report 5)

### New file: `components/reports/document-requests-report.tsx`

```typescript
// Columns: Reference No. | Requester Name | Department | Role | Submitted At |
//          Received At | Approved At | Fulfilled At | Status | QA Notes
//
// Data source: document_requests table, all records, ordered by submitted_at DESC
// Date range filter: applies to submitted_at
// CSV export: all columns included
// Access: QA + Admin only — server action returns 403 for others
//
// Use the same paginated TanStack Table pattern (50 rows/page) used by other reports
// Row click: no action (reports are read-only views)
```

---

## LOADING AND ERROR STATES

### New file: `app/(dashboard)/requests/loading.tsx`

```typescript
// Skeleton:
// Page header: 200px × 32px skeleton block + 120px button block
// Tab strip: 5 tab pill skeletons
// 4 request card skeletons:
//   Each: full-width, 160px height, rounded-xl, animate-pulse bg-muted
//   Inside: 2 lines of text skeleton + 3 button skeletons at bottom
```

### New file: `app/(dashboard)/requests/error.tsx`

Use the existing `ErrorPage` component from `components/ui/error-page.tsx`.

---

## NAVIGATION GUARD

The `/requests` route is accessible to all authenticated active users. Add it to the middleware configuration to ensure:

1. Unauthenticated users → `/login`
2. Inactive users → `/login?reason=inactive`
3. Users with `signup_status = 'pending'` → `/waiting-room`
4. All other authenticated users → allow through

No role restriction on accessing the page. The page renders different content based on role — not a redirect.

---

## COMPLETION CHECKLIST

Run every item before committing. Do not mark this feature complete until all items pass.

**Database:**
- [ ] `029_document_requests.sql` runs without errors
- [ ] `document_requests` table exists with all columns
- [ ] RLS is enabled on the table
- [ ] Insert policy: active users can only insert their own requests
- [ ] Select policy: users see only their own rows; QA Managers see all rows
- [ ] No UPDATE or DELETE policy exists for any app role
- [ ] All three DB functions exist: `mark_request_received`, `mark_request_approved`, `mark_request_fulfilled`
- [ ] Each DB function validates `is_qa_manager` before executing
- [ ] Each DB function has an idempotency guard (cannot move backwards in status)
- [ ] Reference number auto-generates on INSERT (test: REQ-2026-0001 format)
- [ ] `updated_at` trigger fires on every UPDATE
- [ ] `audit_log` entries written by each DB function
- [ ] `pulse_items` type CHECK constraint updated to include `'request_update'`
- [ ] TypeScript types added to `app.types.ts`

**Server Actions:**
- [ ] `submitDocumentRequest`: validates session, validates is_active, validates body length (10–2000 chars), inserts request, notifies ALL QA Managers via pulse, writes audit log
- [ ] `markRequestReceived`: validates session, validates is_qa_manager (returns 403 if not), calls DB function, notifies requester
- [ ] `markRequestApproved`: same validation pattern, calls DB function, notifies requester
- [ ] `markRequestFulfilled`: same validation pattern, calls DB function, notifies requester
- [ ] All four actions use service role client for pulse and audit log writes
- [ ] All four actions use regular server client for `document_requests` reads

**Security verification (manual tests):**
- [ ] Test as Employee: can submit a request. Cannot mark received/approved/fulfilled (action returns 403).
- [ ] Test as Manager: same as Employee.
- [ ] Test as QA Manager: can perform all four actions. Can see all requests from all departments.
- [ ] Test direct Supabase API query as non-QA user: `SELECT * FROM document_requests` returns only own rows.
- [ ] Test direct Supabase API query as QA Manager: returns all rows.
- [ ] Test UPDATE via Supabase API directly: should fail with RLS error (no UPDATE policy).
- [ ] Test DELETE via Supabase API directly: should fail with RLS error (no DELETE policy).

**Components:**
- [ ] `RequestFormModal` renders with auto-filled metadata on open
- [ ] Metadata is read-only (no input fields, no edit capability)
- [ ] Textarea validates min 10 chars before enabling "Review Request"
- [ ] Character counter shows amber at 80%, red at 100%
- [ ] Confirmation step shows full review including auto-filled metadata
- [ ] "Back" button returns to Step 1 with text preserved
- [ ] Submitting state disables both buttons and shows spinner
- [ ] Success state shows reference number in DM Mono
- [ ] Modal closes cleanly and table refreshes on success

**Non-QA user view:**
- [ ] Only own requests visible
- [ ] Tab counts are accurate
- [ ] Status pills show correct label for each status
- [ ] Timeline shows completed stages with timestamps and QA names
- [ ] Timeline shows pending stages with grey empty circles
- [ ] Realtime subscription updates card status without page refresh
- [ ] Empty state renders when no requests exist

**QA Manager view:**
- [ ] All requests from all departments visible
- [ ] Pending tab shows submitted + received + approved requests
- [ ] Fulfilled tab shows only fulfilled requests
- [ ] "Mark Received" button only shown on submitted requests
- [ ] "Mark Approved" button shown on submitted and received requests
- [ ] "Fulfil Request" button only shown on approved requests
- [ ] QA Notes input shown above Fulfil button
- [ ] All buttons show loading state while server action runs
- [ ] All buttons show error card (not just toast) if action fails
- [ ] New submissions appear in real time without page refresh
- [ ] Status updates appear in real time without page refresh

**Sidebar:**
- [ ] "Requests" nav item appears with ClipboardList icon
- [ ] Badge shows correct count for non-QA users (own in-flight requests)
- [ ] Badge shows correct count for QA Managers (all pending requests)
- [ ] Badge updates in real time via Realtime subscription
- [ ] Badge clears correctly when requests are fulfilled

**Pulse:**
- [ ] `request_update` type renders the `RequestUpdateItem` component
- [ ] New submission: all QA Managers receive a Pulse notification
- [ ] Mark Received: requester receives a Pulse notification
- [ ] Mark Approved: requester receives a Pulse notification
- [ ] Mark Fulfilled: requester receives a Pulse notification
- [ ] Deep link from Pulse item navigates to /requests correctly

**Reports:**
- [ ] Report 6 "Document Requests" appears in the selector for QA + Admin
- [ ] Report 6 is not visible to non-QA non-Admin users
- [ ] All columns render with correct data
- [ ] Date range filter applies to `submitted_at`
- [ ] CSV export includes all columns with proper escaping
- [ ] Pagination works (50 rows/page)

**Loading and error:**
- [ ] `loading.tsx` renders skeleton with correct layout
- [ ] `error.tsx` renders ErrorPage component
- [ ] No console errors on page load
- [ ] No TypeScript errors (`npx tsc --noEmit` passes)
- [ ] `npm run build` passes with zero errors

**Commit:** `feat: document request flow — submission, QA lifecycle, pulse integration, reports`

---

## WHAT THIS FEATURE DOES NOT DO

Be clear with the agent about what is out of scope to prevent over-engineering:

- No file attachments on requests (future feature)
- No request editing after submission (by design — immutable record)
- No request withdrawal or cancellation by the requester
- No request routing to departments other than QA
- No request categories or types (the free-text approach is deliberate)
- No SLA tracking or deadline on requests (future feature)
- No email notification for request updates (Pulse only — email can be added later)
- No request search or global filtering beyond the tab strip (future feature)

---

*End of RequestFlowBuild.md*
*Build in the order written. Database first. Server actions second. Components third. Integration last.*
*Every checklist item must pass before committing.*
