# Document Control Spec v2.2 — Gap Analysis & Alignment Plan

> **What this is.** A rigorous, code-faithful reconciliation of `V2DOCS/v2.2/specs/DOCUMENT_CONTROL_SYSTEM_SPEC.md` against the system as it actually exists in this repo (verified by reading the migrations and server actions, not the prose). For every spec requirement it answers three questions the brief asked: **what changes, what we keep (so we don't rebuild what already works), and how to align without lowering the standards already in the code.**
>
> **Scope.** Document control flow only. The spec's "editing screen" is explicitly **out of scope** per your instruction — there is no in-app SOP editor and we are not building one; everywhere the spec assumes an editor, read "upload a new .docx revision" instead.
>
> **Verification basis.** Findings traced through `supabase/migrations/003,004,008,009,026,037,040,045,046,047,051,052,053,054,055` and `actions/sop.ts`, `actions/change-control.ts`, `actions/requests.ts`. File:line refs are given so each claim is checkable.

---

## 0. The verdict in one paragraph

The engine is **further along than the spec assumes** — roughly 60% of the target is already built to a standard the GxP market would respect, and most of it should be **kept, not rebuilt**. The state-machine skeleton, the two-stage HOD→QA approval, server-side segregation-of-duties, the signature snapshot, the audit-log lockdown, two-digit GMP revision numbering, and the reject-preserves-history behaviour are all correct and load-bearing. The gaps are real but they **cluster into three themes**, and only one of them is architectural:

1. **The version/lifecycle model is the root cause of most gaps.** The system keeps *one row per document and overwrites it in place* on every revision. Because nothing ever marks a prior revision `superseded`, the entire retention→destruction→retirement lifecycle is dead code, and version history is only partially retained. **This is the one change that must come first** — almost every other gap (retirement, retention, "which version was effective in March", supersession atomicity) hangs off it.
2. **The change pipe lacks depth.** It runs every change through one uniform path. The missing pieces — mandatory impact assessment, risk classification, classification-driven signatures, concurrency/lock-conflict guarding, and effectiveness review before closure — are **additive**; they bolt onto the existing CC state machine rather than replacing it.
3. **Several controls are data-without-enforcement.** Retention dates, training thresholds, effective dates, and reconciliation all *exist as fields/clicks* but don't actually *block* anything. These are the cheapest, highest-credibility fixes: turn an advisory field into a hard gate.

**Cost-control headline:** the spec proposes a new `document_versions` table. We do **not** need a greenfield table — `sop_versions` already exists (`003_sops.sql:21-30`) and can be **promoted** into the version-state carrier. That single decision is the difference between a re-platforming and an extension. Details in §3.

---

## 1. KEEP — already correct, do not rebuild

These map to the spec's own "Keep" rows (§13 #20–24) plus several the spec marked "to verify" that we have now **confirmed compliant**. Touching these would be wasted spend and a regression risk.

| Capability | Evidence | Spec ref |
|---|---|---|
| **No self-approval (QA ≠ submitter)** — enforced in the RPC, not just UI | `046:181-183` raises if `req.submitted_by = p_qa_user_id` | §1.4, #20 |
| **Mandatory HOD endorsement for employee submissions** | `sop.ts:104` stage routing; `046:177-179` blocks QA approve before `qa_review` | §6, #21 |
| **HOD ≠ submitter, same-department endorsement** | `sop.ts:622-627` | §6.3 |
| **Every revision routes through Change Control** (no "minor skips process" at the document level) | `approve_sop_request` significant branch issues a CC `026:99-118` | §1.5, #22 |
| **Two-digit GMP revision numbering 00→01→02** | `increment_sop_version` `046:41-59`, mirrored in `lib/utils/version.ts` | #23 |
| **Lock during open CC (single-doc)** | `create_change_control` sets `sops.locked=true, status='pending_cc'` `052:75` | #24 |
| **Reject preserves draft + reason; reason mandatory** | `sop.ts:1240` (≥5 chars), `:1259` mark rejected, `:1273` revert new SOP to draft, never deletes | #14 |
| **Changes-requested preserves full history** | `resubmitSop` inserts a *new* request row per cycle `sop.ts:316`, prior comments/annotations retained | §6.3 |
| **Signatory snapshot at creation time** (transfers/new-hires mid-CC don't move the goalposts) | `required_signatories` jsonb snapshotted by `cc_snapshot_signatories` `053:16-52` / `create_change_control` `052:36-47` | §7 (correct existing behaviour) |
| **Audit log is genuinely append-only at the DB layer** | RESTRICTIVE RLS policies block INSERT/UPDATE/DELETE except via SECURITY DEFINER / service role `040:21-41` | §12.3 |
| **Atomic reconciliation** (each RPC is one transaction) | `confirm_cc_reconciliation` `053:132-223` runs in a single plpgsql txn | §7.11 (partially satisfied — see §2) |

> **Spec correction (saves money):** §13 lists items #14 (reject preserves history) and #18 (audit append-only) as "Verify/Adjust". Verified: **reject is already compliant** and **the main `audit_log` is already write-locked**. Don't budget rebuild work here — only the targeted extensions in §2 (old/new-value column, broaden coverage) remain.

---

## 2. ADJUST — existing scaffolding, finish the job

These already have a column, a state, or an RPC in the code. The work is to make the control *bite*, not to build from zero. Cheapest credibility-per-dollar in the whole plan.

### 2.1 Turn `retention_expires_at` from a stored date into a gate (#4)
`retention_period_years` (default 3) and `retention_expires_at` already exist and are stamped on activation (`045:29-31, 76-82, 131`). **What's missing:** nothing reads them. The destruction RPCs (`mark_sop_pending_destruction`, `destroy_sop_record`, `045:443-491`) exist and are even wired to the UI (`actions/sop.ts:780,811`) but are **unreachable** because their entry guard is `WHERE status='superseded'` and nothing ever sets `superseded` (see §3). **Adjust:** once the version model (§3) sets `superseded`/`retained`, add the time-gate `retention_expires_at <= now()` to `destroy_sop_record`. The destruction event already logs actor + justification. → near-complete once §3 lands.

### 2.2 Make the effective date actually schedule (#13)
`activate_sop_effective` unconditionally sets `status='active'` regardless of whether `p_effective_date` is in the future (`045:133-140`). A future date is currently cosmetic. **Adjust:** add a `scheduled` status; if `effective_date > CURRENT_DATE`, set `scheduled` and let the existing cron pattern (we already run `app/api/cron/*`) flip it to `active` on the date. Small, isolated, no ripple into the CC engine.

### 2.3 Make training a per-user execution block, not just a release threshold (#12)
Today there are **two** half-measures: a group-completion threshold gate before a doc goes effective (`sop.ts:700-726`, default 80%), and… nothing after. `acknowledgeSop` (`sop.ts:1149-1197`) checks auth + active + department but **does not check training completion** — an untrained user can acknowledge a live SOP. **Adjust:** add a `trained` guard to `acknowledgeSop` (and any "execute/view-for-work" path) so untrained users in the department are blocked, not just flagged. This is the difference between "threshold met" and an inspector finding. Record the trained-% at go-live in the audit entry.

### 2.4 Capture signature *meaning* (#18 / §12.5)
`signature_certificates` captures signer, timestamp, IP (`004:19-27`) but **no `meaning`** column (what the signature attests: reviewed / approved / released). Part 11 expects the meaning to be recorded. **Adjust:** add `meaning text NOT NULL` to `signature_certificates`, set it at signing. Also add an immutability RLS policy (the table has RLS on but no UPDATE/DELETE block — unlike `audit_log`). Two-line migration, high compliance value.

### 2.5 Add old/new-value to the audit entry (#18)
`audit_log` has `action, entity_type, entity_id, actor_id, metadata` (`008:1-9`) but **no structured old→new value pair and no first-class reason** — reason lives opportunistically inside `metadata`. **Adjust:** add `old_value`, `new_value`, `reason` columns; populate them in the SECURITY DEFINER RPCs that already log. Don't rip out `metadata`; extend. Also fix the `actor_id = NULL` on system transitions (e.g. `check_cc_completion` `045:361`) — attribute to a system principal so ALCOA "attributable" holds.

### 2.6 Remove / repurpose dead CC states (#16)
`draft` and `qa_screening` are in the CHECK enum (`055:18-23`) and TS type but **never produced**; `documents_in_review` is read-but-never-written. **Adjust:** when the impact/classification states land (§2.8), repurpose `qa_screening`→`impact_pending`/`classified` and drop `draft`. Tighten the CHECK so no documented state is unreachable. Trivial, clears inspector confusion.

### 2.7 Define an HOD-is-submitter / no-eligible-HOD fallback (#11)
Confirmed gap: if an author's department has no active non-submitter manager, an employee submission **stalls at `pending_hod` forever** — there is no delegation to QA, admin, or a peer HOD, and no escalation (`endorseSopToQa` requires same-dept active manager, `sop.ts:608,622`). **Adjust:** add a defined fallback endorser (peer HOD → designated deputy → QA-as-endorser) with the choice logged. Also add the **employee resubmit path** — `resubmitSop` is currently manager-only (`sop.ts:300`), so an employee whose submission got changes-requested is stuck. Both are small action-layer fixes.

### 2.8 Impact assessment + classification (#6, #7, #8) — partially scaffolded
`change_controls.impact_assessment` **exists as free text** (`047:24`, min 20 chars at submit `change-control.ts:174`). What's missing is the **hard gate** and the **classification**. **Adjust/Build hybrid:** keep the column, add structured required fields + an `impact_pending → classified` gate enforced in the RPC (no "submit anyway"), add a `classification` column (minor/major/critical), and a data-driven `classification_matrix` table so QA edits thresholds without a code change. The signature snapshot logic (`cc_snapshot_signatories` `053:16-52`) already centralises "who must sign" — extend it to read the matrix by class instead of the current uniform "active managers of affected depts + QA". This reuses the snapshot machinery rather than replacing it.

---

## 3. The one architectural change that gates everything — version/lifecycle model (#1, #2, #3)

**Current reality:** one `sops` row per document, mutated in place. On revision, `confirm_cc_reconciliation` does `UPDATE sops SET version=…, file_url=… WHERE id=…` (`053:185-191`) — the prior revision's live pointer is overwritten. `sop_versions` exists (`003:21-30`) but is a **thin append-only history log with no `status`, no `revision_number`, no effective dates, no is-current flag**, and the modern multi-doc CC path (`053`) doesn't even write to it. Nothing ever sets `sops.status='superseded'` (grep-confirmed — the only `superseded` writers target the unrelated `sop_builder_drafts` table).

**Consequences (all one root cause):**
- Retirement/retention/destruction lifecycle is **dead** — the entry transition never fires (§2.1).
- "Which version was effective in March?" is **not reliably answerable** — CC-driven revisions write no `sop_versions` row, so history has gaps.
- Supersession atomicity (§7.11) is *accidentally* satisfied (single txn) but **not enforced** — no constraint guarantees one-effective-version.

**The spec's fix** (§1.3) is to split document identity from version state: a `documents` row that *points*, and a `document_versions` row that *carries* `effective/superseded/retained/destroyed`.

### Recommended path — promote `sop_versions`, don't greenfield (cost decision)

We already have the table. Rather than introduce a parallel `documents`/`document_versions` pair and migrate everything onto it (expensive, touches every query, every RLS policy, the whole UI), **promote the existing pair**:

- Keep `sops` as the **document identity + lifecycle pointer** (it already has `sop_number` UNIQUE for stable identity, and a `status`). Reduce its `status` to the thin pointer set (`draft/in_review/pending_training/scheduled/active/locked_in_cc/retired`).
- Extend **`sop_versions`** with `status` (the §4.2 state set), `revision_number`, `effective_from`, `superseded_at`, `retention_until`, `reason_for_change`. Add a partial unique index `WHERE status='effective'` per `sop_id` → enforces *exactly one effective version* (the spec's hard invariant) at the DB layer.
- Make `confirm_cc_reconciliation` do the **atomic supersession** in its existing single transaction: new version → `effective`, prior → `superseded`, in the same RPC it already runs (`053`). This is an *edit* to a function we own, not a new subsystem.
- Backfill: one migration to seed a `sop_versions` row (status `effective`) for every current `sops` row, and reconstruct prior rows from `revision_history` jsonb where present.

> **Why this is the lazy-correct call:** the spec describes the *target shape*, not a mandate to use its exact table names. `sops`+`sop_versions` already model document-vs-version; they're just under-specified. Promoting them preserves every existing query, RLS policy, and screen that reads `sops`, and confines the change to the version table + the reconciliation RPC. A greenfield `documents`/`document_versions` would force a rewrite of `lib/queries/sops.ts`, the library view, the viewer, acknowledgements (FK on `sop_id`), and training — for no functional gain.

**Revision-number burn (#15, §7.10):** the spec recommends allocating the *displayed* revision only at effective time to avoid gaps. We currently bump inconsistently — `046` leaves `sops.version` old until reconciliation, but inserts a `sop_versions` history row at approval, and there are two coexisting `approve_sop_request` definitions that disagree (`045:317` vs `046` revision branch). **Adjust:** allocate the display revision number in the atomic `effective` transition only; hold a provisional internal id in flight. Reconcile the two `approve_sop_request` definitions so only one is authoritative.

---

## 4. BUILD — net-new, but additive (no rebuild)

These don't exist at all, but each attaches to the now-corrected engine without disturbing what's kept.

| # | Build | Why it's additive | Spec |
|---|---|---|---|
| 9 | **Concurrency / lock-conflict guard + `queued` state** | `submitChangeControlRequest` does no open-CC check and the only unique constraint is `(change_control_id, document_id)` *within* one CC (`047:122`) — two CCs can target the same SOP, last-writer-wins. Add a pre-dispatch check against open CCs per affected doc; enter `queued` if locked. New state + one guard. | §7.4 |
| 10 | **Effectiveness review before closure** | Today `effective → closed` is a manual, from-state-unguarded `updateChangeControlStatus` call by the same QA who reconciled (`change-control.ts:336`). Add an `effectiveness_review` state and an independent-approver guard (reviewer ≠ requester). One state, one guard. | §7.12 |
| 3 | **Retirement workflow + `retirements` table** | No retirement table exists. Build the request→approve→retire path with pre-checks (no active references / open training / active filing). Independent track — doesn't touch the change pipe. | §8 |
| 5 | **Controlled-copy register (`controlled_copies`)** | Reconciliation is currently a QA click + optional free-text note with **no backing data** (`053` reconciliation columns only). Build the register so reconciliation reads real issued/returned counts; force-override path (reason-logged) for fire/closed-site cases. **Gated by §14 #3** — if the client is fully paperless, this is near-trivial; confirm before building. | §10.6, §7.9 |
| 7/10.10 | **`classification_matrix` (data-driven)** | New table mapping impact→class and class→required signatories, QA-editable, itself version-controlled. Feeds the snapshot logic we already have. | §3.3, §10.10 |
| 17 | **Unified intake + type inference** | Intake is **split today**: a manual `new`/`update` radio in `sop-upload-modal.tsx:42,383` (no inference) plus a separate `document_requests` ticketing system (`actions/requests.ts:37`). Build the one-door intake that infers NEW vs CHANGE from whether an *effective* target exists, with confirm/dispute + abandoned-draft fork. **Do this LAST** — it's a routing layer over the corrected pipes; building it before the pipes are right just routes into broken pipes. | §5 |
| 19 | **Periodic-review sign-off** | `due_for_revision` date + dashboard counter already exist (`045:130`, fixed 3-yr), but there's **no review workflow that records a completed review**. Add the review-completion record (and make the cadence configurable, not hardcoded 3 yr). | §11 note |

---

## 5. Spec corrections — where the spec misreads the current system (read before budgeting)

The spec's §13 register makes assumptions about "current state" that are partly wrong. Flagging these so you don't pay to build what exists or mis-scope what doesn't:

1. **`type` (CHANGE_SINGLE / CHANGE_MULTI) does not exist** as the spec's §10.3 assumes. The only discriminator is `origin` ('request' | 'sop_revision', `051:19`). Multi-document is implicit (a CC can carry 1..N `change_control_documents`). If you want the explicit single/multi typing, that's a small add — but the data model section reads as if it's already a named column; it isn't.
2. **Reconciliation columns and retention data already exist** (`045:29-53`). #4 and #5 are not pure greenfield on the data side — the *enforcement* is what's missing.
3. **Periodic review (#19) is "Build/Adjust", leaning Adjust** — the date + dashboard exist; only the sign-off workflow is new.
4. **Audit append-only (#18) is largely done** for the main log — see §1. The build is the old/new-value extension + coverage, not the lockdown.
5. **"Exactly one effective version" is currently *structurally* true** (one row per document via `sop_number UNIQUE`), so there's no live bug today — but it's true by accident, not by constraint. The §3 split is what makes it *enforced* rather than incidental, and it's required for history anyway.
6. **Branch scoping (§2.2, `branch_id`) does not exist anywhere in code** — single-department-string model only (`profiles.department`). The spec's multi-branch assumption is a forward-looking design choice, not a gap in an existing capability. Decide whether multi-branch is actually in scope before modelling for it (§14 #5) — building branch scoping speculatively is exactly the kind of cost the brief warns against.
7. **QA is identified by `departments.is_qa = true`, not `department = 'QA'`** (`009:8-15`). Any new guard must use `is_qa_manager`, not a literal name match.
8. **Roles are `manager`/`employee` + `is_admin` only** — there is no Viewer role. The spec's 7-role table (§2.1) is a *conceptual* permission map; in practice Author/Signatory/Trainer/Viewer are behaviours gated by manager/employee/QA/admin, not distinct DB roles. Don't build a role table unless the client genuinely needs it — the action-level SoD checks already deliver the separation the spec cares about.

---

## 6. Sequencing — lowest-risk order that never half-breaks the system

Refines the spec's §13.1 with our keep/adjust findings. Each phase is shippable and leaves the system consistent.

1. **Foundations (cheap, isolated):** dead-state cleanup (#16, §2.6); signature `meaning` + immutability RLS (§2.4); audit old/new + reason + system-actor (§2.5). No behaviour change, pure compliance hardening.
2. **The architectural change (#1, #2, #3-enabling):** promote `sop_versions` to the version-state carrier; atomic supersession in `confirm_cc_reconciliation`; one-effective-version partial unique index; reconcile the two `approve_sop_request` definitions; revision-number-at-effective. **Everything downstream assumes this.** Backfill migration included.
3. **Retention + retirement (#4, #3):** now reachable — wire the time-gate into destruction, build the `retirements` table + pre-checks. Independent track, can run parallel to phase 4.
4. **Change-pipe depth (#6, #7, #8):** structured impact + hard gate, `classification` + `classification_matrix`, classification-driven signature set (extend the existing snapshot).
5. **Concurrency (#9):** lock-conflict check + `queued` — depends on the locking model being settled in phase 2.
6. **Enforcement gaps (#10, #11, #12, #13):** effectiveness review, HOD fallback + employee resubmit, training execution-block, scheduled effective date.
7. **Controlled copies (#5):** only if §14 #3 says physical copies are issued.
8. **Unified intake (#17):** the routing layer, last — over now-correct pipes.
9. **Periodic-review sign-off (#19)** + final audit-coverage sweep (#18).

---

## 7. Decisions that block go-live — must come from the client's QA (spec §14)

These are **not engineering choices**; building before they're answered risks exactly the rework the brief wants to avoid. Get them ratified before phases 4–7:

1. **Classification matrix** — the minor/major/critical rules and the required signatory set per class. (Blocks #7/#8.)
2. **Retention periods** by document type/regime. (Blocks #4 enforcement; we currently hardcode 3 yr.)
3. **Physical controlled copies — yes/no.** Determines whether #5 is load-bearing or near-trivial. (Blocks #5 — don't build the register speculatively.)
4. **Periodic-review cadence** per class (we hardcode 3 yr today). (Blocks #19.)
5. **QA scoping — global or branch-scoped**, and whether multi-branch is in scope at all. (Blocks any `branch_id` work — see §5.6.)
6. **Training threshold policy** — may a doc go effective below 100% trained, at what %, and confirm untrained users are blocked from execution. (Blocks #12.)
7. **Effectiveness-review window** and which classes require it. (Blocks #10.)
8. **Regulatory regime** (FDA / EMA / device-specific) — validates the whole control set.

---

## 8. Bottom line for the brief

- **We are not rebuilding the system.** The engine's spine, the SoD model, the signature snapshot, the audit lockdown, the approval flow, and GMP revisioning are kept as-is.
- **One architectural change leads** — split document identity from version state, done by *promoting `sop_versions`* (not a greenfield table). This unblocks retirement, retention, and reliable version history in a single, contained move.
- **Most remaining gaps are "make the existing control bite"** — turn stored dates and QA clicks into enforced gates. Cheapest credibility we can buy.
- **The genuinely new builds** (impact/classification, concurrency, effectiveness review, retirement, copy register, unified intake) are **additive** to the corrected engine and sequenced so the system is never left half-broken.
- **Seven client-QA decisions gate the back half** — ratify them before building phases 4–7 to avoid paying twice.

*Sources: see header. Every "EXISTS/ABSENT" claim above is traced to a migration or action file:line.*
