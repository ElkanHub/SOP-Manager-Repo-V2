# Domain Audit — Requests & AI SOP Builder

Scope: document requests (legacy `document_requests`), request forms + submissions (`request_forms` / `request_form_submissions`), the request hub, and the AI SOP Builder (sessions / drafts / templates / Word export / usage metering).

Method: read each flow end-to-end (UI -> server action / API route -> RPC / DB). Findings cite `file:line`.

---

## CRITICAL

### C1. Two parallel request systems; the legacy `document_requests` system is dead for input but still pollutes QA badges and has no QA action surface
- Location:
  - Legacy actions (orphaned writer): `actions/requests.ts:37` (`submitDocumentRequest`), `:139/:201/:265` (received/approved/fulfilled).
  - No UI caller: `grep submitDocumentRequest` over `components/` and `app/` returns **nothing**. The only consumer of the legacy modal is a report component (`components/reports/document-requests-report.tsx`) and the now-orphaned `components/requests/request-detail-modal.tsx`.
  - New `/requests` page renders only forms + RFS: `app/(dashboard)/requests/page.tsx:27-46` (queries `request_forms` + `request_form_submissions` only — never `document_requests`).
  - QA hub renders only RFS: `app/(dashboard)/requests/hub/page.tsx:30-51`.
  - Sidebar badge still counts legacy rows: `components/app-sidebar.tsx:168-171` (QA) and `:188-192` (non-QA) count `document_requests` with status in `submitted/received/approved`.
- What's wrong: There is no surface anywhere to **submit** a `document_requests` row (the free-text request flow was replaced by request forms), and no QA surface to **action** one. Yet the sidebar "Requests" badge and the "Document Requests" sub-badge add legacy counts. Any pre-existing `document_requests` row in `submitted/received/approved` shows a permanent, un-clearable badge number that points to a page that doesn't list it.
- Real-world impact: QA sees a pending-requests badge that never goes to zero and cannot find the item it refers to. A boss reviewing the app sees "phantom" pending work. The entire `actions/requests.ts` file and its RPCs (`mark_request_received/approved/fulfilled`) are unreachable code.
- One-line fix: Remove `document_requests` from the badge queries (`app-sidebar.tsx:168-171,188-192`) and delete the orphaned legacy submit/modal path, OR restore a QA list view for legacy rows; pick one system.

### C2. AI usage "metering"/credits are decorative — recorded but never enforced
- Location:
  - Credit costs defined: `lib/ai/credits.ts:11-29`.
  - Recorded only: `lib/ai/usage.ts:27-53` (single `INSERT` into `ai_usage_events`, fire-and-forget).
  - Ledger + read-only summary RPC: `supabase/migrations/056_ai_usage_metering.sql:9-95` (append-only table + `ai_usage_summary`; **no balance, no quota table, no deduction**).
  - Read path only: `actions/ai-usage.ts:21-45` returns a summary; nothing reads remaining balance before a call.
  - No call site checks a quota: `grep quota|credits_remaining|enforce|limit` finds no enforcement against `ai_usage_events`.
- What's wrong: Every AI call (`generateJson`/`generateText`/stream in `lib/ai/client.ts`) records credits *after* the fact. There is no pre-call balance check, no per-tenant/per-user cap, nothing that ever blocks a call when "credits" are exhausted. The pricing/credit model is purely observational.
- Real-world impact: If sold as a metered/credit feature, users can run unlimited AI generations; the "quota" cannot bill or throttle anyone. Cost exposure is unbounded (Gemini calls at `maxOutputTokens: 8192`, 120s timeouts, on every chat turn).
- One-line fix: Add a pre-call balance/quota check (sum credits over the window vs. a plan limit) in `lib/ai/client.ts` before invoking the model, returning `AI_RATE_LIMITED`/a new `AI_QUOTA_EXCEEDED` when over.

---

## HIGH

### H1. AI SOP Builder output is a dead end — drafts never enter the SOP Library or approval workflow
- Location: `components/sop-builder/sop-builder-workspace.tsx` — only actions are chat (`:111`), generate-word (`:176`, `:196`), download via `window.location.href` (`:201`). No "Submit for approval", "Push to Library", or `sops` insert anywhere in the builder.
- What's wrong: The whole feature produces a `.docx` you download manually. There is no bridge from `sop_builder_drafts` into `sops` / `sop_approval_requests`. The generated document is explicitly flagged "AI-generated draft only. Not approved…" (`lib/sop-builder/harness.ts:55`) but there is no in-app path to then take it through the real controlled-document lifecycle.
- Real-world impact: A user who builds an SOP with the AI must download the Word file and **separately** re-upload it through the normal Approvals upload flow — the AI builder is disconnected from the QMS it lives inside. Looks like an integrated authoring tool; is actually a standalone Word generator.
- One-line fix: Add a "Submit draft to Approvals" action that uploads the generated `.docx` and creates the `sop_approval_requests` record from the active draft.

### H2. Per-session Word template selection is decorative — the intake collects/loads templates but never sends the choice; no template-management UI exists
- Location:
  - Intake loads templates and accepts them as a prop but renders **no selector** and never sends `selected_template_id`: `app/(dashboard)/sop-builder/new/page.tsx:24` (loads templates) -> `components/sop-builder/sop-builder-intake.tsx:24` (prop only; the only `template` references are the type and prop — no UI, no send) -> `start()` body is `{ title, purpose, department }` only (`sop-builder-intake.tsx:43`).
  - Session POST accepts `selected_template_id` (`app/api/sop-builder/sessions/route.ts:48`) but the client never provides it.
  - Word render resolves template from `session.selected_template_id` else falls back to `is_default` (`lib/sop-builder/word.ts:41-61`).
  - Template CRUD API routes exist (`app/api/sop-builder/templates/route.ts`, `templates/[id]/route.ts`) but **no component calls them** (`grep` for the route path in `components/` returns nothing).
- What's wrong: A tenant can never choose a template per SOP from the UI, and there's no screen to upload/manage templates at all. Output always uses whatever row happens to have `is_default = true` (or the in-code default).
- Real-world impact: The "bring your own controlled template" capability is unreachable; pharma customers who require their own SOP template cannot use it without direct DB edits.
- One-line fix: Render a template `<Select>` in the intake and include `selected_template_id` in the session POST; add a template-management screen wired to the existing `templates` routes.

### H3. Half the AI SOP Builder API surface is orphaned (dead endpoints)
- Location: UI only calls `sessions` (create), `sessions/[id]/chat`, and `drafts/[id]/generate-word` (`grep` across `components/sop-builder` + `app/(dashboard)/sop-builder`). Unused routes:
  - `app/api/sop-builder/sessions/[id]/outline/route.ts`
  - `app/api/sop-builder/sessions/[id]/generate/route.ts`
  - `app/api/sop-builder/sessions/[id]/revise/route.ts`
  - `app/api/sop-builder/sessions/[id]/clarify/route.ts`
  - `app/api/sop-builder/drafts/[id]/comments/route.ts`
  - `app/api/sop-builder/drafts/[id]/download/route.ts` (proper `Content-Disposition` filename — the UI instead re-POSTs `generate-word` and navigates to the raw signed URL, `workspace:196-201`)
  - `app/api/sop-builder/templates/*`
- What's wrong: A large outline->clarify->generate->revise->comment workflow (and the harness methods `generateOutline`, `generateDraft`, `reviseDraft` in `lib/sop-builder/harness.ts:37-206`) is fully built but unreachable; the live product collapsed to a single chat turn. The comment-driven revision (`reviseDraft`) and the highlight-to-comment persistence have no UI entry beyond inline chat selection.
- Real-world impact: Maintenance/security surface for code nobody can reach; behaviour drift between the "real" chat path and the dead structured path. The `download` route's nicer filename behaviour is wasted while users get a generic download.
- One-line fix: Either delete the orphaned routes/harness methods or wire the intended outline/revise/comment UI; at minimum switch downloads to the `download` route for correct filenames.

### H4. QA can only "approve" RFS but the approved item then needs a manual "fulfilled" — and reject is impossible after approval; no edit/cancel for the requester
- Location: RPC guards in `supabase/migrations/039_request_forms.sql`: `mark_rfs_received` requires `submitted` (`:236`), `mark_rfs_approved` allows `submitted` OR `received` (`:256`), `mark_rfs_fulfilled` requires `approved` (`:277`), `mark_rfs_rejected` allows only `submitted`/`received` (`:302`). Actions mirror these (`actions/request-forms.ts:623-711`). No requester-side cancel/withdraw or edit action exists in `actions/request-forms.ts`.
- What's wrong: (a) Once a submission is `approved`, QA cannot reject it (reject excludes `approved`) — the only forward move is `fulfilled`; there's no "approved was a mistake" path. (b) `approved` skips `received` silently, so the timeline can show approved without ever being received. (c) The requester has **no** way to cancel or edit a mistaken submission — there is no `cancelSubmission`/`withdraw` action at all.
- Real-world impact: QA gets stuck if an approval was wrong; requesters who fat-finger a form must contact QA out-of-band. In a regulated workflow, "no withdraw / no post-approval reject" is a real process gap.
- One-line fix: Add a requester `withdrawSubmission` (allowed while `submitted`) and broaden `mark_rfs_rejected` (or add a `revoke`) to cover `approved`.

---

## MEDIUM

### M1. Sidebar "Document Requests" sub-badge math can show a count the page can't explain
- Location: `components/app-sidebar.tsx:338` — `badge: Math.max(0, pendingRequests - pendingChangeControls)`.
- What's wrong: `pendingRequests` (QA) = RFS(submitted+received) + legacy `document_requests`(submitted+received+approved) + open change-controls (`:177`). Subtracting only `pendingChangeControls` leaves RFS **+ legacy** on the "Document Requests" sub-item, but `/requests` for QA shows neither the RFS QA queue (that's the hub) nor legacy rows. The number references items not listed on that page.
- Real-world impact: Badge count never reconciles with what the page shows; classic "badge says 3, list says 0."
- One-line fix: Base the "Document Requests" sub-badge on the exact rows that page lists (or route QA's actionable RFS count to the hub item only).

### M2. `getActiveUser` in `actions/requests.ts` selects a non-existent email and contains dead filter code
- Location: `actions/requests.ts:21` selects `email:id` (aliases `id` as `email` — wrong), and `:99-101` `qaManagerIds = (qaManagers||[]).filter(async () => true)` is a no-op using an async predicate (always truthy) that is then discarded.
- What's wrong: Latent bugs in the legacy path: `profile.email` would equal the user id; the `.filter(async …)` is meaningless. (Only matters if C1 is resolved by keeping the legacy path.)
- Real-world impact: Low while the path is dead; would surface as wrong notification targeting if revived.
- One-line fix: Remove the dead filter and the bogus `email:id` alias; pull email from `auth.getUser()` (as the function already does at `:58`).

### M3. RFS submission detail exposes QA action controls on the requester's own page based on `isQa`
- Location: `app/(dashboard)/requests/page.tsx:24-25,61` computes `isQaOrAdmin` and passes it to `NewRequestsClient` -> `SubmissionDetailSheet isQa=...` (`components/requests/new-requests-client.tsx:207`).
- What's wrong (needs verification): On the personal `/requests` "My Submissions" detail, a QA user sees QA action buttons for their **own** submissions. The RFS RPCs don't appear to block self-action (unlike the SOP approval RPC which forbids self-approve). A QA manager could approve/fulfil their own request from their personal page.
- Real-world impact: Segregation-of-duties gap — QA self-servicing their own document request, contrary to the app's stated "QA cannot self-approve" principle for SOPs.
- One-line fix: In the RFS state-change RPCs/actions, reject when `requester_id = p_qa_user_id` (mirror `approve_sop_request`).

### M4. `updateRequestForm` replaces fields with delete-then-insert (not transactional) and bumps version, but live submissions snapshot fields — edit during traffic can briefly leave a fieldless form
- Location: `actions/request-forms.ts:291-294` (`delete` then `insert`, no transaction).
- What's wrong: Between the delete and insert, a concurrent `submitRequestForm` load (`:494`) could read zero fields and fail "Form has no fields." Low probability, but it's a real race on a published form.
- Real-world impact: Rare spurious submission failure while QA edits a busy form.
- One-line fix: Wrap field replacement in an RPC/transaction, or insert-then-delete-old by position.

---

## LOW

### L1. `markSubmissionApproved` allows `submitted -> approved`, skipping `received`
- Location: `supabase/migrations/039_request_forms.sql:256` (`status IN ('submitted','received')`). Timeline UI implies a received step that may never occur. Cosmetic/process nuance. Fix: require `received` before `approved` if the timeline is meant to be linear.

### L2. Builder intake collects rich fields the create flow never sends
- Location: `app/api/sop-builder/sessions/route.ts:41-47` accepts `objective/scope_text/intended_users/equipment/risks/records_forms/regulatory_refs`, but both entry points (`sop-builder-home.tsx:61`, `sop-builder-intake.tsx:43`) send only `title/purpose[/department]`. Those columns are always null; `ensureSections` fallback then emits `[CONFIRM VALUE]` placeholders (`harness.ts:569-577`). Fix: either drop the unused fields or surface them in intake.

### L3. AI not-configured failure is graceful but silent to admins
- Location: `lib/ai/client.ts:41-53,158-160` — if `GEMINI_API_KEY` is unset, every builder chat throws `AI_NOT_CONFIGURED` -> toast "AI features are not configured" (`harness`/`friendlyAiMessage`). No admin-facing surfacing that the key is missing. Low. Fix: surface configuration status in an admin/system-health view.

---

## What works (verified, not broken)
- RFS submit flow is fully wired end-to-end: filler dialog -> `submitRequestForm` (validates against live fields, snapshots form, inserts via user client for RLS, notifies QA, audit) -> success screen with real `RFS-YYYY-NNNN` reference (`form-filler.tsx:44-58`, `actions/request-forms.ts:474-592`, migration `039:127-142`).
- RFS QA lifecycle (received/approved/fulfilled/rejected) is wired in the hub via real RPCs with status guards and requester notifications (`actions/request-forms.ts:623-711`).
- Word generation + download are real: renders docx (tenant template or default fallback), uploads to storage, signs URL, records export + audit (`generate-word/route.ts`, `download/route.ts`, `lib/sop-builder/word.ts`).
- AI chat turn genuinely streams, persists user + agent messages, creates versioned drafts, and meters once per resolved action (`chat/route.ts`, `harness.ts:326-410`).
- Builder access is gated to admin/manager/QA at both page and route level (`access.ts:5-30`, `new/page.tsx:18`).
