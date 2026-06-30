# Role Access Appropriateness Audit

Scope: `lib/utils/permissions.ts`, `components/app-sidebar.tsx`, `actions/*.ts`, gated pages, and RLS/RPC enforcement in `supabase/migrations/*`.

Roles are 3 attributes on `profiles`: `is_admin` (bool), `role` (`'manager' | 'employee'`), `department` (QA dept = sole approval authority; Engineering dept = equipment rights). There is **no `'admin'` value in the `role` column** — admin is a separate boolean. This single fact drives two of the findings below.

Overall posture is good: every mutating workflow re-checks the caller server-side, and the high-value RPCs (`approve_sop_request`, `approve_equipment`, `confirm_cc_reconciliation`, `mark_sop_pending_destruction`, `destroy_sop_record`, `set_cc_document_*`, `mark_rfs_*`) re-assert `is_qa_manager`/`is_admin` inside `SECURITY DEFINER` bodies — so the service-role actions calling them are defense-in-depth, not the only gate. Self-approval is blocked in `approve_sop_request` and `endorseSopToQa`/`rejectSopRequest`. The findings are mostly **under-privilege / silent-failure** mismatches plus a couple of genuine logic bugs, not mass privilege escalation.

---

## CRITICAL

_None._ No path was found where a low-privilege user can invoke a high-privilege mutation. The approval/destruction/CC RPCs all re-check role inside the `SECURITY DEFINER` function, so even though the server actions run under the service role, the DB function rejects non-QA/non-admin callers.

---

## HIGH

### H1. `role !== 'admin'` checks are dead code — admins (is_admin) are silently blocked from training management
**Location:** `actions/training.ts:51`, `:121`, `:188`, `:213`, `:304`, `:350`, `:568`, `:782`; and the page gate `app/(dashboard)/training/page.tsx:21` (`profile.role !== 'manager' && profile.role !== 'admin'`).
**What's wrong:** Every training authorization check is of the form `profile.role !== 'manager' && profile.role !== 'admin'` or `!isQa && profile.role !== 'admin' && mod.created_by !== user.id`. The `role` column only ever holds `'manager'` or `'employee'`; `'admin'` is impossible. So `profile.role === 'admin'` is always false. A pure admin (`is_admin = true`, `role = 'employee'`) is therefore **redirected off `/training`** and **cannot create, publish, assign, archive, or edit any training module** unless they also happen to be a QA manager or the module creator. Compare `actions/events.ts:32` which does it correctly: `profile.role !== 'manager' && !profile.is_admin`.
**Real-world impact:** The highest privilege account cannot perform training administration — a real capability gap for the super-admin. Under-privilege, not escalation. (The training **RLS** policies use `is_admin(auth.uid())` correctly for SELECT, but the **writes go through the service client**, so the broken TS check is the only gate that actually runs on mutations.)
**One-line fix:** Replace every `profile.role !== 'admin'` with `!profile.is_admin`, and the page gate with `profile.role !== 'manager' && !profile.is_admin`.

### H2. Engineering employees see "Add / Manage Equipment" UI but the action rejects them (UI > backend mismatch → silent failure)
**Location:** UI grant `lib/utils/permissions.ts:66` (`canManageEquipment = isAdmin || isManager || isEngDept`) consumed at `app/(dashboard)/equipment/page.tsx:52` and rendered at `app/(dashboard)/equipment/equipment-client.tsx:43,64,86,111`. Backend gate `actions/equipment.ts:45` (`if (profile.role !== 'manager') return 'Only managers can submit equipment'`); also `reassignPmTask` `actions/equipment.ts:366`.
**What's wrong:** The capability model and equipment page deliberately expose equipment management to **all Engineering-department members regardless of role** (the comment at `equipment/page.tsx:50-51` says so). But `submitEquipment` hard-requires `role === 'manager'`. An Engineering **employee** sees the "Add Equipment" button and the pending-QA/inactive management controls, fills the form, and the submit fails with "Only managers can submit equipment." The equipment INSERT RLS (`011_rls.sql:98`) also requires `role='manager'`, but since the action uses the service client RLS is bypassed — the TS check is authoritative and contradicts the UI.
**Real-world impact:** Either Engineering employees are meant to add equipment (then the backend is under-privileged and the feature is broken for them) or they are not (then the UI over-exposes controls that always error). Confusing at best; a broken core workflow for the Engineering persona at worst.
**One-line fix:** Decide intent and make both sides agree — either gate `submitEquipment`/`reassignPmTask` with `getCapabilities(profile).canManageEquipment` (and loosen RLS), or stop passing `canManage=true` for Engineering employees on the page.

### H3. Any active user can create a Change Control *package* — no manager/QA gate, originating department is caller-supplied
**Location:** `actions/change-control.ts:145` `submitChangeControlRequest` (only `getActiveUser()`, no role/dept check); reachable by any active onboarded user via `app/(dashboard)/requests/change-control/page.tsx` (gate stops at `is_active`/`onboarding_complete`). The new CC is inserted via the **service client** (`change-control.ts:183`) with `originating_department`, `affected_departments`, and up to 25 documents all taken from the request body.
**What's wrong:** Unlike SOP submission (`actions/sop.ts:83` restricts to employee/manager and routes employees through HOD review) and unlike legacy CC creation via `approve_sop_request` (QA-gated), the unified CC package intake has **no role or department validation at all**. A regular employee can open a multi-document Change Control "originating" from any department they type in (e.g. QA), naming any affected departments. There is no check that the caller belongs to `originatingDepartment`.
**Real-world impact:** A QMS Change Control is a regulated artifact. Letting any employee originate one on behalf of an arbitrary department pollutes the QA work queue and the audit trail with spoofable provenance (`originating_department` is attacker-chosen, not derived from the profile). This is a separation-of-duties / data-integrity gap rather than a data-exfiltration one — QA still must screen it before anything activates.
**One-line fix:** In `submitChangeControlRequest`, force `originatingDepartment = profile.department` (ignore the client value) and, if originators must be supervisory, require `role === 'manager' || is_admin`.

---

## MEDIUM

### M1. `change_controls` has no INSERT RLS policy — service-action is the *only* gate
**Location:** `supabase/migrations/011_rls.sql:71-77` defines only SELECT policies for `change_controls`; no INSERT/UPDATE policy exists, and writes go through service-role actions (`change-control.ts`, `sop.ts`). 
**What's wrong:** With RLS enabled and no INSERT policy, direct client inserts are blocked (good), but it also means there is **zero DB-level authorization** on CC creation/status — the entire gate is the TypeScript in H3, which is currently empty. Combined with H3, the result is "any active user creates CCs." Defense-in-depth is absent here specifically.
**Real-world impact:** Amplifies H3 — there is no backstop if the action check is wrong or removed.
**One-line fix:** Add an INSERT policy `WITH CHECK (requester_id = auth.uid() AND is_active_user(auth.uid()))` and route CC creation through the user client, or accept service-only writes but fix H3.

### M2. `screenChangeControlRequest` / `updateChangeControlStatus` allow plain admins to drive CC workflow that QA-only RPCs would reject — inconsistent authority model
**Location:** `actions/change-control.ts:247,333,369,398,426` all use `isQaOrAdmin(... is_admin ...)`. But `approve_sop_request` (`009_functions.sql:110`) and `approve_equipment` (`009_functions.sql:259`) are **QA-manager-only** — admins cannot approve SOPs/equipment.
**What's wrong:** Authority for "advance/approve a Change Control" includes any admin, while authority for "approve an SOP" or "approve equipment" excludes admins. Both are quality decisions. The model is internally inconsistent: an admin can screen/approve/close a CC package (which ultimately activates new SOP revisions via `releaseChangeControlDocumentTraining` → `activate_sop_effective`) but cannot approve the equivalent single-SOP request.
**Real-world impact:** A non-QA admin can effectively push document changes live through the CC path, bypassing the "QA is the sole approval authority" invariant that the SOP path enforces. Whether this is intended depends on policy, but it is an unflagged separation-of-duties divergence. (needs verification of intended admin authority over CC.)
**One-line fix:** Decide whether admins are a QA-equivalent approval authority and apply the same rule to SOP/equipment approval and CC screening consistently.

### M3. Cross-department SOP draft visibility for any manager is broad; relies on query-layer, not RLS
**Location:** RLS `supabase/migrations/011_rls.sql:32-37`. Draft/pending SOPs are visible to a manager only for their own department (good), and to QA managers for all. Active SOPs are visible org-wide by design (documented exception). 
**What's wrong:** This is mostly correct, but note `endorseSopToQa` and `requestChangesSop` (`actions/sop.ts:592,822`) correctly scope HOD review to `profile.department === sop.department` and block self-endorsement — so the dangerous case (a manager endorsing another department's SOP) is closed. No action needed; recorded for completeness that the all-or-nothing risk here is mitigated.
**Real-world impact:** Low. 
**One-line fix:** None required; keep the explicit dept checks in the HOD actions.

### M4. `complete_pm_task` RPC does no caller authorization; relies entirely on the action's check
**Location:** RPC `supabase/migrations/009_functions.sql:215` `complete_pm_task` (no `is_active_user`/dept check); action gate `actions/equipment.ts:325` (`!isOwnDept && !isSecondaryDept && profile.role !== 'manager'`).
**What's wrong:** The action permits completion if the user is in the equipment's primary/secondary department **OR** is any manager (`profile.role === 'manager'`) — so a manager from an unrelated department can complete another department's PM task. The RPC itself is `SECURITY DEFINER` with no guard, so the action is the sole gate.
**Real-world impact:** A manager in Dept A can close out Dept B's preventive-maintenance task (and its photo/notes audit record). Cross-department write on a GMP record. Low-to-medium because it still writes an actor_id to the audit log.
**One-line fix:** Drop the blanket `profile.role !== 'manager'` escape; require own/secondary department (or QA) to complete a task.

---

## LOW

### L1. `endorseSopToQa` requires `role === 'manager'` but not own-dept for the *block* path consistency
**Location:** `actions/sop.ts:608,622`. Correctly checks `sop.department === profile.department` and self-endorsement. Fine. Recorded as verified-good.

### L2. `waiveSignature` is admin-only in the action but the RPC `waive_cc_signature` has no internal guard
**Location:** action `actions/sop.ts:1081` (`if (!profile.is_admin) ...`), RPC `009_functions.sql:191` (no `is_admin` check inside).
**What's wrong:** The signature-waiver RPC is `SECURITY DEFINER` and trusts `p_admin_id` without verifying it is actually an admin. Today the only caller checks `is_admin`, so it is safe, but unlike `approve_sop_request` it has no defense-in-depth. If another caller is ever added, an arbitrary `p_admin_id` could waive a required signatory and force CC completion.
**Real-world impact:** Latent. A waiver bypasses a required e-signature on a regulated Change Control.
**One-line fix:** Add `IF NOT is_admin(p_admin_id) THEN RAISE EXCEPTION ...` at the top of `waive_cc_signature`.

### L3. Sidebar exposes "AI SOP Builder" and "Training Hub" to managers of *any* department
**Location:** `components/app-sidebar.tsx:297-302,310-316`.
**What's wrong:** Both are gated on `role==='manager' || is_admin || isQa`. That is consistent with `createTrainingModule` (any manager may create modules for their own department). Not a leak; the create action enforces `data.department === profile.department` for non-QA (`actions/training.ts:55`). Recorded as verified-consistent.
**Real-world impact:** None.
**One-line fix:** None.

### L4. `grantAdmin` requires password re-auth and blocks self-modify; good. But no guard against removing the last admin in `revokeAdmin`/`deactivateUser`.
**Location:** `actions/settings.ts:404` (`revokeAdmin`), `:455` (`deactivateUser`). `has_any_admin`/last-admin protection is not invoked.
**What's wrong:** An admin can revoke the only other admin or deactivate down to zero admins (they cannot self-modify, but two admins can ping-pong to lock everyone out, or deactivate every *other* admin then themselves remain — actually self-deactivate is blocked, so total lockout is hard, but a single remaining admin could revoke the second-to-last leaving exactly one; the real risk is deactivating all admins except a now-inactive-by-accident account).
**Real-world impact:** Low/operational — possible admin lockout requiring DB intervention. No `setup`-style re-bootstrap guard is wired into revoke/deactivate.
**One-line fix:** Before revoke/deactivate of an admin, assert at least one other active admin remains.

---

## Per-Role Verdict Table

| Role | Core capabilities (as actually enforced) | Over-privileged? | Under-privileged? | Verdict |
|---|---|---|---|---|
| **Admin** (`is_admin`, any role/dept) | User mgmt, departments, numbering, grant/revoke admin (pw-gated), waive signatures, reports + CSV export, audit trail, screen/advance/close Change Controls, create events | Mild: can drive CC workflow + waive signatures but **cannot** approve SOPs/equipment (M2 inconsistency); CC authority bypasses "QA is sole approver" | **Yes** — broken `role!=='admin'` checks lock pure admins out of Training Hub and all training management (H1) | **Needs fix.** Fix H1 (capability gap) and decide M2 (authority consistency). |
| **QA Manager** (`role=manager`, QA dept) | Approve/reject/request-changes on SOPs, approve/reject equipment, all request-form + document-request + CC screening, set effective dates, destruction review, full reports/audit, cross-dept oversight, training over all depts | No — self-approval blocked at RPC; appropriate org-wide scope | No | **Appropriate.** Strongest sound role. |
| **QA Employee** (`role=employee`, QA dept) | `canSeeSupervisory` (read supervisory cards) via dept; submits SOPs/requests like any employee; **cannot** approve (all approval gates require `is_qa_manager` = manager+QA) | No — gets QA *read* visibility only, no manager actions (verified: `is_qa_manager` requires `role='manager'`) | No | **Appropriate.** Read elevation only, correctly bounded. |
| **Regular Manager** (`role=manager`, non-QA dept) | Submit/endorse own-dept SOPs (HOD review, self-endorse blocked), create/assign training for own dept, create events, submit equipment, view own-dept drafts; can complete **any** dept's PM task (M4) | Mild: M4 lets them close other departments' PM tasks; can originate CC for arbitrary dept (H3) | No | **Minor fixes** (M4, H3). |
| **Regular Employee** (`role=employee`, non-QA dept) | Submit SOPs (→HOD), acknowledge own-dept SOPs, submit document/CC requests, do assigned training, complete own/secondary-dept PM tasks | **Yes**: can originate a full Change Control package for any department (H3) | Minor: sees "AI SOP Builder"/Training Hub hidden correctly; fine | **Fix H3.** |
| **Engineering Manager** (`role=manager`, Eng dept) | Same as regular manager + equipment is their domain | No | No | **Appropriate.** |
| **Engineering Employee** (`role=employee`, Eng dept) | Capability model + UI say they manage equipment; backend `submitEquipment` rejects them | No (UI shows more than backend allows) | **Yes**: shown Add/Manage Equipment controls that always error (H2) | **Fix H2** — broken core workflow / contradictory UI. |

---

## Summary of fixes by priority
1. **H1** — `actions/training.ts` + `training/page.tsx`: replace `role !== 'admin'` with `!is_admin`. Admins are locked out of training admin today.
2. **H2** — Equipment: align `submitEquipment`/`reassignPmTask` backend with `canManageEquipment` UI (or vice-versa).
3. **H3 / M1** — `submitChangeControlRequest`: derive `originating_department` from the profile and add a role gate; add an INSERT RLS backstop on `change_controls`.
4. **M2** — Reconcile admin authority over CC vs SOP/equipment approval.
5. **M4** — Scope `completePmTask` to the equipment's department.
6. **L2 / L4** — Add internal `is_admin` guard to `waive_cc_signature`; add last-admin protection to revoke/deactivate.
