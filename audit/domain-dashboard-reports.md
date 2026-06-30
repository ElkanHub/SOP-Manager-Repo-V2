# Domain Audit — Dashboard + Reports + Pulse + Messages

Scope: `app/(dashboard)/dashboard`, `components/dashboard`, `app/(dashboard)/reports`, `components/reports`, `store/report-store.ts`, `components/pulse`, `actions/pulse.ts`, `app/(dashboard)/messages`, `components/messages`, `actions/messages.ts`, `store/messages-store.ts`, `components/app-sidebar.tsx`, pulse RLS migrations.

Overall: this domain is, refreshingly, **mostly wired end-to-end**. Dashboard KPIs are real scoped aggregates (not hardcoded), reports query real data, CSV export works, AI risk is a real RPC, messaging send/read/realtime works, pulse RLS correctly restricts visibility. The findings below are real defects, not stubs — ranked.

---

## HIGH

### H1. Reports page hard-redirects managers/employees, making "all" and "manager" report tabs unreachable dead config
- **Location:** `app/(dashboard)/reports/page.tsx:31-36` vs `components/reports/reports-client.tsx:76,80,83-90`
- **What's wrong:** The server page gate is `canAccessReports = isQa || isAdmin; if (!canAccessReports) redirect('/dashboard')`. Yet `reports-client.tsx` declares reports with `access: "all"` (Worker Acknowledgements, line 76) and `access: "manager"` (Training Log, line 80), and `canAccess()` explicitly grants `manager`/`all`. A plain department manager (non-QA, non-admin) or any employee is bounced to the dashboard and can **never** reach these tabs. The dashboard's own "View Reports" quick action is already correctly gated to `isQa || isAdmin` (`dashboard-client.tsx:441`), so the manager/all access rules in the client are pure dead code that misrepresents intended access.
- **Real-world impact:** A manager who is told "you can pull your team's training log / acknowledgement report" cannot — the page redirects them. Either the gate is too strict or the access config is a lie. Compliance/training managers lose a feature they appear to be entitled to.
- **One-line fix:** Decide the policy: either loosen the server gate to also allow `profile.role === 'manager'` (and scope those two reports' data server-side), or delete the `manager`/`all` access entries so the UI stops advertising access nobody can use.

### H2. Live Audit Trail realtime inserts bypass department scoping AND drop the actor join
- **Location:** `components/dashboard/dashboard-client.tsx:166-186`
- **What's wrong:** The server query scopes audit entries to the user's department for non-oversight users (`page.tsx:374-396`). But the client realtime subscription listens to **all** `audit_log` INSERTs with no filter and prepends `payload.new` directly. Two problems: (1) a non-oversight employee will see live audit events from **other departments** stream into their feed (the initial load was dept-scoped, but live rows are not), partially defeating the scoping in H-adjacent code; (2) `payload.new` has no `actor:profiles(...)` join, so every live entry renders as "System" with a blank avatar (`dashboard-client.tsx:752` falls back to `'System'`) until a refresh.
- **Real-world impact:** Cross-department activity leaks into a scoped dashboard feed (minor info disclosure, e.g. an employee seeing "X approved an SOP" in a dept they shouldn't see). Live entries also look broken/anonymous. Note: this card only renders for `caps.canSeeSupervisory` (managers/admins/QA), which limits but does not eliminate the leak — a non-QA manager is scoped to their dept on load yet sees all depts live.
- **One-line fix:** In the INSERT handler, re-fetch the scoped audit slice (same query as the page) or filter `payload.new` against the allowed actor set before prepending, and hydrate the actor via a follow-up `profiles` lookup.

### H3. Group-conversation "Add User" and "Settings" buttons are dead (no handlers)
- **Location:** `components/messages/conversation-thread.tsx:664-665`
- **What's wrong:** In a group conversation header, `<Button ...><UserPlus/></Button>` and `<Button ...><Settings/></Button>` have **no `onClick`**. They render, are hoverable, and do nothing.
- **Real-world impact:** Users cannot add members to a group after creation, nor open any group settings. Group conversations are effectively frozen at their creation roster (you can only *leave*, via the dropdown). Classic "looks finished, isn't."
- **One-line fix:** Wire the buttons to an add-member / settings dialog, or remove them until implemented.

---

## MEDIUM

### M1. Dashboard "Send Notice" quick action opens the panel, not the composer — label overpromises
- **Location:** `components/dashboard/dashboard-client.tsx:426-440`
- **What's wrong:** The "Send Notice / Broadcast message" button does `document.dispatchEvent(new CustomEvent('pulse-toggle'))`, which only toggles the Pulse sidebar open. The notice composer is a separate `<Sheet>` inside `the-pulse.tsx` (`NoticeComposer`) that the user must then find and click "Broadcast Notice" to open. The CustomEvent is also dispatched on `document`, while the listener in `pulse-wrapper.tsx:182` is registered on `window` — so it may not even toggle the panel reliably.
- **Real-world impact:** Clicking a prominent "Send Notice" CTA does not open a compose form; at best it slides a panel out, at worst nothing visible happens. Confusing dead-ish action.
- **One-line fix:** Dispatch on `window` and add a dedicated event (e.g. `pulse-compose-notice`) that opens the `NoticeComposer` sheet directly.

### M2. Notice character counter says "/500" but nothing enforces 500 (or any) limit
- **Location:** `components/pulse/notice-composer.tsx:126-128` and `actions/pulse.ts:9-46`
- **What's wrong:** UI shows `{content.length}/500 characters` but the `<Textarea>` has no `maxLength`, and `broadcastNotice` does no length validation before insert. A 5,000-char notice persists fine; the counter just shows "5000/500".
- **Real-world impact:** Cosmetic/lying counter; oversized notices can be broadcast to everyone and blow out the Pulse layout and the push/email body.
- **One-line fix:** Add `maxLength={500}` to the textarea and a server-side length guard in `broadcastNotice`.

### M3. Sender's notice acknowledgement progress hidden when recipient count computes to 0
- **Location:** `components/pulse/pulse-item.tsx:286` (`isSender && item.type === "notice" && item.total_recipients`)
- **What's wrong:** `total_recipients` is computed in `the-pulse.tsx:41-51` as `counts.everyone - 1` / `counts.department - 1`. For a single-person department or an org with one active user it is `0` (falsy), so the `"{ackCount} / {total} acknowledged"` chip never renders for the sender. Also `withCounts` is computed once from a profile-count query that races the item fetch; until `counts` resolves, items get `total_recipients: 0` and the chip is suppressed/incorrect on first paint.
- **Real-world impact:** Sender of a department notice can't see acknowledgement progress in small departments; in all departments the count is approximate (it uses live active-staff totals, not the audience snapshot at send time).
- **One-line fix:** Render the chip whenever `isSender && type==='notice'` (show `ackCount / max(total,1)`), and prefer a server-provided recipient snapshot over a live `profiles` count.

### M4. New-conversation modal loads the entire active user directory client-side with no pagination
- **Location:** `components/messages/new-conversation-modal.tsx:27-43`
- **What's wrong:** On open it selects **all** active profiles (`is_active=true`) and filters client-side. Fine for a small org, but unbounded — large orgs pull the whole directory into the browser on every first open.
- **Real-world impact:** Scaling/perf issue and a directory dump to the client; not a correctness bug today.
- **One-line fix:** Server-side search with a debounced query + limit instead of fetching everyone.

---

## LOW

### L1. Pulse badge "for me" includes dead `sender_id === null` clause
- **Location:** `components/pulse/pulse-wrapper.tsx:114-119`
- **What's wrong:** `isForMe` includes `|| item.sender_id === null`. RLS (`011_rls.sql:108-111`) already filters to recipient/own-dept/everyone using the browser client, so any null-sender row that reaches the client is already addressed to the user. Harmless but misleading dead logic.
- **One-line fix:** Drop the `sender_id === null` term.

### L2. `import { report } from "process"` — accidental unused Node import in a client component
- **Location:** `components/reports/reports-client.tsx:12`
- **What's wrong:** A stray `import { report } from "process"` (likely an editor auto-import collision with the local `report` map variable). Unused; ships nothing but is a smell and risks bundling a Node builtin shim into a `"use client"` file.
- **One-line fix:** Delete the import.

### L3. `pulse_items.type` CHECK constraint omits many types the app writes/reads
- **Location:** `supabase/migrations/006_pulse_items.sql:5` (CHECK list) vs types used in `components/pulse/pulse-item.tsx:106-159` and audit labels
- **What's wrong:** The original CHECK allows only `notice, approval_request, approval_update, cc_signature, cc_deadline, pm_due, pm_overdue, sop_active, system, todo, message`. The client renders many more (`sop_submission`, `sop_revision`, `sop_approved`, `cc_approval`, `cc_signature_request`, `request_update`, `new_signup`, `training_*`, `system_alert`). If no later migration widened the CHECK, inserts of those types would fail at the DB. (needs verification — later migrations 030/037/039 may extend it; grep did not surface an ALTER of this constraint.)
- **One-line fix:** Verify/extend the `type` CHECK to cover every type the producers emit, or normalize producers to the allowed set.

---

## Verified-OK (explicitly checked, not defects)
- Dashboard KPI cards (Active SOPs, Pending Approvals, PM Compliance, Due-for-Revision, status strip, Compliance Health ack rate, Department Output Matrix) are **real scoped aggregates** computed server-side in `dashboard/page.tsx`; they reconcile with their target list pages via the card links. PM compliance even computes a real previous-month comparison.
- Role scoping: org-wide oversight = admin or QA manager; supervisory cards gated by `getCapabilities().canSeeSupervisory`; Department Matrix gated to `manager || is_admin`; Add-Equipment quick action gated to `canManageEquipment`. Consistent with `lib/utils/permissions.ts`.
- Reports CSV export is real (`actions/audit.ts:380` `exportReportCsv` → `buildReportRows` → `rowsToCsv`, blob download), correctly gated to admins (`requireAdmin`), and every report's Export button is `{isAdmin && ...}`-gated so QA managers don't see a button that would fail.
- Pulse acknowledge / todo toggle / todo delete all persist via real server actions (`actions/pulse.ts`) with ownership checks; realtime updates the UI. Pulse panel visibility relies on a correct RLS SELECT policy (`011_rls.sql:108`).
- Messages: create conversation (with existing-DM dedupe), send (optimistic + offline queue), mark-read, mute, leave group, delete DM all wired with real actions; sidebar unread badge and per-conversation unread dot both derive from `last_message_at > last_read_at` consistently (`app-sidebar.tsx:107-113`, `messages-client.tsx:146-148`); realtime subscriptions present.
