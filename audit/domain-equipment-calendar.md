# Audit — Equipment Registry + Calendar/Events + Cron/Alerts + Risk Assessment

Scope audited: `app/(dashboard)/equipment/*`, `app/e/[id]/*`, `actions/equipment.ts`, `actions/events.ts`, `actions/risk-assessment.ts`, `components/equipment/*`, `components/calendar/*`, `app/api/cron/*`, `app/api/storage/equipment-photo/route.ts`, migrations 005/009/011/034/035/041.

---

## CRITICAL

### C1. No cron jobs are scheduled — every alert system is dead in production
- **Location:** `vercel.json:1-3` (`{ "crons": [] }`)
- **What's wrong:** All four cron route handlers exist (`pm-alerts`, `overdue-check`, `training-deadline-check`, `refresh-risk-assessment`) but `vercel.json` registers **zero** cron schedules. Nothing invokes them on a timer.
- **Real-world impact:** PM "due soon" alerts never send. Overdue PM tasks are **never flipped to `overdue`** (the only place that transition happens is `overdue-check/route.ts:46-51`), so equipment silently stays "pending" forever, the dashboard/risk score never sees overdue PMs, and managers get no escalation. Training-deadline and SOP-review/retention alerts never fire. Risk assessment snapshots are never refreshed (only generated lazily on first view, then served stale for 6h with no auto-refresh). This is a GMP compliance failure dressed up as a working feature.
- **One-line fix:** Add the four routes to `vercel.json` `crons` with daily schedules and ensure each is reachable with the `CRON_SECRET` bearer header.

### C2. Cron endpoints are unauthenticated outside production
- **Location:** `pm-alerts/route.ts:14-18`, `overdue-check/route.ts:14-18`, `training-deadline-check/route.ts:13-17`, `refresh-risk-assessment/route.ts:18-22`
- **What's wrong:** The secret check is wrapped in `if (process.env.NODE_ENV === 'production')`. In any non-production deployment (preview/staging on Vercel, self-hosted with `NODE_ENV` unset, local), **anyone** can GET these URLs with no token.
- **Real-world impact:** On a Vercel **preview** deployment (NODE_ENV is `production` there, so OK) — but any staging box where NODE_ENV != 'production', an anonymous request can mass-flip PM tasks to overdue, spam every user's Pulse inbox, and trigger paid AI generation (`refresh-risk-assessment` runs Gemini per department — a cost-amplification/DoS vector). The gate should be unconditional.
- **One-line fix:** Remove the `NODE_ENV === 'production'` wrapper so the `token !== cronSecret → 401` check always runs.

---

## HIGH

### H1. Permission mismatch: Engineering staff see "Add Equipment" but the action rejects them
- **Location:** UI grant `app/(dashboard)/equipment/page.tsx:52` + `equipment-client.tsx:64-72,111-120` via `getCapabilities().canManageEquipment` (`lib/utils/permissions.ts:66` = `isAdmin || isManager || isEngDept`). Backend reject `actions/equipment.ts:45-47` (`if (profile.role !== 'manager') return error`). Same reject in storage route `app/api/storage/equipment-photo/route.ts:24-26` and RLS `migrations/011_rls.sql:98` (insert requires `role='manager'`).
- **What's wrong:** `canManageEquipment` deliberately includes all Engineering-department members regardless of role (per the comment block in permissions.ts and page.tsx:50-51). The UI shows them the "Add Equipment" button and the full multi-step modal. But `submitEquipment` hard-rejects any non-manager, and the photo-upload route rejects non-managers too.
- **Real-world impact:** An Engineering **employee** fills out the entire 3-step registration wizard, uploads a photo (fails at upload with "Only managers can upload equipment photos"), and on submit gets "Only managers can submit equipment." The headline capability advertised in permissions.ts is non-functional. Either the docs/permission model or the action is wrong — they contradict each other.
- **One-line fix:** Decide the real rule and make all three layers agree — either allow `getCapabilities(profile).canManageEquipment` in the action + storage route + RLS, or drop `isEngDept` from `canManageEquipment`.

### H2. No edit / decommission / re-activate path for equipment exists anywhere
- **Location:** `actions/equipment.ts` (only `submitEquipment`, `approveEquipment`, `rejectEquipment`, `completePmTask`, `reassignPmTask`); RLS `migrations/011_rls.sql:87-98` has **no UPDATE or DELETE policy** for `equipment`.
- **What's wrong:** Once equipment is `active`, there is no action to edit details (wrong serial/model/SOP link/frequency), to decommission it (set `inactive`), or to re-activate a rejected asset. `reject` is the only state transition out of active scope, and it only works while `pending_qa` (UI gates it on status). Active equipment is permanently frozen.
- **Real-world impact:** A typo in asset ID, a changed PM frequency, or a retired machine cannot be corrected or removed by anyone (not even admin) through the app. PM tasks keep generating forever for decommissioned equipment. This is a basic lifecycle hole a facility manager would hit on day one.
- **One-line fix:** Add `updateEquipment` / `decommissionEquipment` server actions (service-role, manager/admin-gated) plus matching audit entries.

### H3. Equipment table dropdown has two dead menu items
- **Location:** `components/equipment/equipment-table.tsx:177-184`
- **What's wrong:** The row action menu renders **"Log PM Completion"** (line 178-180, shown for managers on active equipment) and **"View Service History"** (line 182-184) as `DropdownMenuItem`s with **no `onClick` handler**. Clicking them does nothing.
- **Real-world impact:** Managers click "Log PM Completion" from the list and nothing happens — the feature looks present but is non-functional. (The real PM-completion flow only exists on the detail page.) Classic dead button.
- **One-line fix:** Wire both to `router.push(\`/equipment/${item.id}\`)` (where the working actions live) or remove them.

### H4. Public QR page leaks assignee PII to anonymous scanners
- **Location:** `app/e/[id]/page.tsx:76-86` (selects `profiles:assigned_to(full_name, department, avatar_url)`) rendered at `equipment-public-view.tsx:164-173` (`Assigned to <full_name> · <department>`)
- **What's wrong:** `/e/[id]` is unauthenticated (proxy.ts short-circuits `/e/*` is not the case here — note `/e/` is NOT in the documented public `/m/*` carve-out; verify it is actually reachable unauthenticated, but the code path explicitly handles `!user`). For an anonymous viewer it renders the assigned technician's **full name and department** plus all equipment metadata (serial number, model, SOP number/title, PM schedule, status). A QR sticker on a machine is physically scannable by any visitor/contractor.
- **Real-world impact:** Anyone walking the floor and scanning a label learns staff names + who maintains what + internal asset/serial/SOP identifiers, with no login. That is an information-disclosure issue for a pharma facility. Serial numbers and SOP numbers are arguably sensitive too.
- **One-line fix:** For unauthenticated viewers, drop `full_name`/`department`/`serial_number` from the public payload (show only generic status / "assigned: yes/no" / next-due), or require auth for the assignee block.

### H5. `pm-alerts` reminder never re-fires once a task goes overdue (and depends on dead cron)
- **Location:** `pm-alerts/route.ts:37-39` filters `status = 'pending'` AND `due_date >= today`; `overdue-check/route.ts:46-51` permanently sets `status = 'overdue'`.
- **What's wrong:** Even if crons were scheduled (see C1), the "due soon" reminder only matches `pending` tasks with a future due date. Once `overdue-check` flips a task to `overdue`, it is excluded from `pm-alerts` forever, and `overdue-check` itself re-filters on `status='pending'` (line 35) so it will **not** re-notify an already-overdue task on subsequent runs. Net: a single overdue Pulse, then silence.
- **Real-world impact:** Assignees and managers get one overdue notice ever; a long-overdue safety-critical PM produces no repeat nudges. (needs verification that this single-shot behavior is intended vs. a bug.)
- **One-line fix:** Either include `overdue` status in the daily reminder, or add a "still overdue after N days" re-escalation pass.

---

## MEDIUM

### M1. Events can be created and deleted but never edited
- **Location:** `actions/events.ts` (only `createEvent`, `deleteEvent`); `day-detail-sheet.tsx:272-283` exposes only delete.
- **What's wrong:** No `updateEvent` action exists. Calendar events are immutable once created — to fix a title/date you must delete and recreate.
- **Real-world impact:** Minor UX gap; a manager who typos an event date has to delete and re-add. Not broken, just incomplete.
- **One-line fix:** Add an `updateEvent` action + edit affordance in the day sheet.

### M2. Delete-event permission is owner-only, inconsistent with create-permission
- **Location:** `actions/events.ts:96-98` (`event.created_by !== user.id → error`); UI mirrors at `day-detail-sheet.tsx:144,170`.
- **What's wrong:** Only the original creator can delete an event. An admin cannot delete another manager's stray/incorrect public event.
- **Real-world impact:** A wrong company-wide event posted by a manager who has since left/offboarded can never be removed (soft-delete keeps the profile, but no other admin can clear the event). (needs verification this is intended.)
- **One-line fix:** Allow `is_admin` (and/or QA) to delete any event in addition to the owner.

### M3. PM-completion dialog completes the "first non-complete task", not the displayed one
- **Location:** `equipment-detail-client.tsx:499-502` — the "Log PM Completion" sidebar button always resolves `pmTasks.find(t => t.status !== 'complete')`.
- **What's wrong:** It blindly completes the earliest open task regardless of which task the user intended. With overdue + upcoming tasks both open, the "Next Service" card's button could complete a different (older) task than the one shown.
- **Real-world impact:** Edge case but possible mis-logging — a tech logs maintenance against the wrong scheduled date. Usually only one open task exists (next-task is created on completion), so impact is low in practice.
- **One-line fix:** Pass the specific task id the card is displaying rather than `find()`-ing the first open one.

### M4. Calendar projected PM dates can show machines an employee can act on, but list/RLS scoping differs from detail page
- **Location:** Calendar uses **service client** with manual `.or(department / secondary_departments)` scoping (`calendar/page.tsx:75-103`); equipment list uses **browser client** under RLS (`lib/queries/equipment.ts`); QA managers in the list are special-cased (`equipment.ts:30` skips dept filter for `department === "QA"`) but the calendar has no such QA carve-out.
- **What's wrong:** Three different scoping mechanisms (RLS, manual service-client filter, hardcoded `"QA"` string) for the same equipment data. The list's `department !== "QA"` literal won't match a "Quality Assurance" dept name (permissions.ts:25 matches leniently, this doesn't), so a QA manager whose dept isn't literally "QA" gets dept-filtered in the list but RLS policy `equipment viewable by QA Manager` (011_rls.sql:97) would still show all — inconsistent counts vs. what's rendered.
- **Real-world impact:** Count/visibility drift for QA users; the "All" tab total (from `count: exact`) may not reconcile with rows actually returned across pages. (needs verification with a non-literal QA dept name.)
- **One-line fix:** Centralize equipment visibility in one helper and use the lenient `isQaDepartment()` check instead of the `"QA"` string literal.

### M5. Equipment photo signed URLs expire in 1 hour but are stored/displayed as the persistent value
- **Location:** `app/api/storage/equipment-photo/route.ts:65-78` returns a 1-hour signed URL as `fileUrl`; `add-equipment-modal.tsx:106` sets it as `photoUrl` and `submitEquipment` persists it to `equipment.photo_url` (`actions/equipment.ts:68`).
- **What's wrong:** The route comment says "Store filePath in the DB — generate signed URLs server-side on viewing," but the modal stores the **signed URL** (with a 1h expiry) into the DB, not the `filePath`. The public view (`equipment-public-view.tsx:70`) and table render `photo_url` directly.
- **Real-world impact:** Equipment photos break (403/expired) ~1 hour after registration and stay broken forever. The QR public page and detail page show a dead image.
- **One-line fix:** Persist `filePath` (returned by the route) and resolve a fresh signed URL at render time, per the route's own comment.

---

## LOW

### L1. `add-equipment-modal` success state is a fixed 2s timeout, not tied to revalidation
- **Location:** `add-equipment-modal.tsx:147-150` — `setSubmitSuccess(true); setTimeout(close, 2000)`.
- **What's wrong:** Success is shown immediately; the list isn't re-queried in-component (relies on `revalidatePath('/equipment')` server-side + modal close). Mostly fine, but the new pending_qa item may not appear without a manual refresh since the table uses TanStack Query with a 30s staleTime and isn't invalidated on submit.
- **Real-world impact:** Manager adds equipment, modal closes, but the new row doesn't show in the (client-cached) table until staleTime elapses or a navigation. Confusing but not data loss.
- **One-line fix:** Invalidate the `["equipment", ...]` query key on successful submit.

### L2. `secondary_departments` access in public page cast is unsafe
- **Location:** `app/e/[id]/page.tsx:67` reads `(equipment as any).secondary_departments` but the select at line 22-28 **does not include** `secondary_departments`.
- **What's wrong:** `isSecondaryDeptManager` always evaluates against `undefined` → secondary-dept managers scanning the QR never get redirected into the authed detail view.
- **Real-world impact:** A secondary-department manager always lands on the public read-only page instead of `/equipment/[id]`. Minor routing nuisance.
- **One-line fix:** Add `secondary_departments` to the select list.

---

## Verified-OK (not findings)
- Risk assessment is **real**: deterministic SQL scoring in `compute_risk_metrics` (041) + AI only narrates; score reproducible; AI failure is non-fatal with sensible fallback (`risk-assessment.ts:263-276`). Not hardcoded.
- QA cannot self-approve equipment is enforced in the RPC (`approve_equipment` requires `is_qa_manager`); approval creates the first PM task off `last_serviced` (034) — correct, no drift.
- PM completion correctly chains the next task and syncs `equipment.next_due` via trigger (034:30-64).
- `refresh-risk-assessment` IS wired to `refreshAllRiskAssessments` (real work, per-dept + org) — its only problem is it's never scheduled (C1).
