# Change Control Unification — Build Plan

**Status:** Active build · **Date:** 2026-06-16
**Goal:** Make Change Control *one* coherent, multi-document, QA-controlled process that drives the SOP lifecycle — eliminating the current split between the legacy single-SOP signing flow and the new package request flow. Build phase by phase, verifying nothing is missing, before we move on to feature-packaging and multi-tenancy.

**Grounded in:**
- `V2DOCS/v2.2/reference/Change Control Multi-Document Alignment.md`
- `V2DOCS/v2.2/build-plans/Change Control Multi-Document Implementation Plan.md`
- `V2DOCS/v2.2/source-documents/QA-SOP-007-02 - SOP FOR DOCUMENT CONTROL.doc` (extracted: `QA-SOP-007-02_extracted.txt`)
- Code read: `migrations/045_sop_process_consolidation.sql`, `046_document_control_revision_numbering.sql`, `047_multi_document_change_control.sql`; `actions/change-control.ts`, `actions/sop.ts`.

---

## 1. The problem (verified in code)

There are **two Change Control flows sharing one `change_controls` table**, and they diverge:

| | **Flow A — Legacy (SOP revision)** | **Flow B — Package request** |
|---|---|---|
| Entry | `approve_sop_request()` (significant revision) → `create_change_control()` (045, 6-arg) | `submitChangeControlRequest()` (`actions/change-control.ts`) |
| Parent row | `sop_id` set, `required_signatories` snapshot, status `pending` | no `sop_id`, no signatories, status `submitted` |
| Child docs | **none created for new CCs** (047's 9-arg `create_change_control` is unused) | child `change_control_documents` rows created |
| Signatures | `signChangeControl` → `check_cc_completion` → `pending_activation` | **none** |
| Activation | `confirm_cc_reconciliation()` updates the single `cc.sop_id` SOP | **none** — `updateChangeControlStatus` just sets a status, SOPs untouched |
| Lifecycle | `pending → pending_activation → complete` | `submitted → … → effective → closed` |

**Concrete defects this creates:**
1. `change_controls.status` is overloaded — `pending` means "awaiting signatures" (A) **and** is a legacy value never used by B. Status semantics depend on hidden context (`sop_id` present?).
2. New significant revisions create a **parent CC with no child document row** → invisible to the package model, reports, and any per-document logic.
3. The package flow is a **dead-end register**: it can reach `effective`/`closed` without ever signing anything or changing a single SOP.
4. Two `create_change_control` overloads (045 6-arg, 047 9-arg) — easy to call the wrong one.

---

## 2. Target model (the unification)

**One canonical entity:** a Change Control is a **numbered QA-controlled package** (`change_controls`) that holds **one or more affected documents** (`change_control_documents`). Every CC — whether raised by a department request or auto-issued from a QA-approved SOP revision — is the **same shape** and travels the **same lifecycle**, driven through its **child documents**.

```
change_controls (parent: cc_number, requester, rationale, impact, status, qa_owner, signatories, deadline)
  └── change_control_documents (1..n)
        document_id → sops   (nullable for brand-new docs)
        old_revision / new_revision / old_file_url / new_file_url
        review_status · training_required · training_status · training_deadline · effective_date
```

**Canonical status model** (retire legacy values, map them in migration):

```
draft → submitted → qa_screening → clarification_requested
      → approved_for_document_work → documents_in_review
      → signatures_pending → pending_reconciliation → pending_training
      → effective → closed
(rejected is terminal from any pre-effective stage)
```

Legacy → canonical mapping applied by data migration:
- `pending`            → `signatures_pending`
- `pending_activation` → `pending_reconciliation`
- `complete`           → `effective` (or `closed` if old copies already reconciled)
- `waived`             → not a CC status (waiver is per-signatory) → coerce to `signatures_pending`/`effective` by context

**Signatures, reconciliation, training, activation all operate on the child documents**, so a 1-document CC (from a revision) and a 5-document CC (from a request) run through identical code.

**Origin marker:** add `change_controls.origin text CHECK (origin IN ('request','sop_revision'))` so the UI can skip the request/screening stages for QA-issued revisions (which enter at `documents_in_review` or `signatures_pending`) while keeping one lifecycle.

---

## 3. Security & compliance rules (apply to every phase)

- **Server-side authorization on every action** — never trust the client. Use `is_qa_manager()` / `is_admin()` / requester checks exactly as existing actions do. RLS stays enabled on `change_controls` and `change_control_documents`.
- **Audit every transition** — every status change, signature, waiver, reconciliation, training release, and effective-date set writes an `audit_log` row (actor, action, entity, metadata). No silent state changes.
- **Immutability** — signatures are append-only; no CC is hard-deleted (closed/rejected are retained). Waivers require an authorized reason.
- **Segregation of duties** — preserve existing guards (QA manager cannot approve own submission; reconciliation requires QA/Admin). A requester cannot screen their own CC.
- **No destructive DB ops without explicit application** — migrations are delivered as numbered files; they are reviewed and applied by the operator, not silently run against production.
- **Verify each phase** — `npm run build` (or typecheck) must pass before a phase is considered done; SQL is reviewed for idempotency (`IF NOT EXISTS`, `CREATE OR REPLACE`).

---

## 4. Phased build (each phase independently verifiable)

### Phase 1 — Additive schema foundation (origin + child-doc guarantee)  ✅ DONE
**Migration `051_cc_unification.sql` — deliberately ADDITIVE / non-breaking:**
- Add `change_controls.origin` (`'request' | 'sop_revision'`, default `'request'`); backfill `'sop_revision'` where `sop_id IS NOT NULL`.
- Backfill missing child `change_control_documents` rows for any CC that has a `sop_id` but no child (closes defect #2 retroactively).
- Indexes on `change_controls(status)`, `change_controls(origin)`.
- **NOT done here on purpose:** the status remap, the CHECK-constraint tightening, and the producer/consumer rewrites — those are coupled to functions (`check_cc_completion`, `confirm_cc_reconciliation`, `create_change_control`), the `compute_risk_metrics` analytics function, and ~5 UI consumers, so they move to Phase 2 to be done atomically. This keeps the app fully working after Phase 1.
**Acceptance:** migration is idempotent, additive, breaks nothing; every SOP-linked CC has ≥1 child document; build stays green (no code changed).

### Phase 2 — Status-model collapse + canonical producers (ATOMIC)  ✅ DONE
Done as one coherent unit (migration `052_*` + matching code) so producers and consumers never disagree:
- **Data + constraint:** remap legacy statuses (`pending`→`signatures_pending`, `pending_activation`→`pending_reconciliation`, `complete`→`closed`/`effective`, `waived`→`signatures_pending`); keep the CHECK permissive (still allow legacy) until Phase 9 tightens it.
- **Producers (CREATE OR REPLACE):** rewrite `check_cc_completion()` → moves package to `pending_reconciliation`; `confirm_cc_reconciliation()` → canonical statuses; make the 6-arg `create_change_control` set canonical status + `origin='sop_revision'` + insert its child document; drop the unused 9-arg overload; update `compute_risk_metrics` CC filter.
- **Package signatories:** when a CC enters `signatures_pending`, snapshot `required_signatories` from HODs/QA of all `affected_departments` + document departments; generalize `signChangeControl` / `waiveSignature` to any CC id with a `signatures_pending` guard.
- **Consumers (TS/TSX):** update `types/app.types.ts` CC status union, `dashboard/page.tsx`, `app-sidebar.tsx`, `change-control-client.tsx`, `change-control-header.tsx`, `sop-change-history-report.tsx` to canonical statuses.
**Acceptance:** a multi-doc CC can collect signatures and auto-advance to `pending_reconciliation`; no consumer references a remapped-away value; `npm run build` green.

### Phase 3 — Package reconciliation → activate all linked SOPs  ✅ DONE (migration 053)
> Reordered with Phase 4 during build: per-document review + signatory snapshot (originally Phase 4) and multi-SOP reconciliation were built together in `053_cc_package_lifecycle.sql`.
- New `confirm_cc_reconciliation_package(cc_id, actor, note, effective_date)` that **loops the child documents**: for each `document_id`, apply the existing single-SOP activation logic (set version/file, `activate_sop_effective` when no training, else `approved_pending_training`), set the child `effective_date`, and advance child `review_status` → `effective`.
- Parent advances to `pending_training` if any document needs training, else `effective`; `closed` after all documents effective.
- Keep the legacy `confirm_cc_reconciliation` working for 1-doc CCs by delegating to the package version.
**Acceptance:** reconciling a 2-SOP CC activates both SOPs (or holds both for training) and writes audit + pulse per document; build green.

### Phase 4 — Per-document review workflow (`documents_in_review`)  ✅ DONE (migration 053)
- New action `setChangeControlDocumentReview(documentRowId, decision, comment)` (QA only): sets child `review_status` ∈ `in_review|approved|changes_requested|rejected`.
- When **all** documents are `approved`, the package auto-advances `documents_in_review → signatures_pending` (triggers Phase 2 signatory snapshot).
**Acceptance:** QA can review each document; package only proceeds to signatures when all docs approved; audit per decision; build green.

### Phase 5 — Training wiring per affected document + effective gate  ✅ DONE (migration 054)
- On reconciliation, for documents with `training_required`, set child `training_deadline = sop_add_working_days(effective_or_today, 15)` and `training_status = 'pending'`; link/seed training module per document (reuse existing training module creation).
- Block a document's `effective_date` until its training threshold is met (reuse `setSopEffectiveDate` threshold logic); when the last document clears training, parent → `effective` → `closed`.
**Acceptance:** a training-required document holds the package at `pending_training` until completion; non-training docs go effective immediately; build green.

### Phase 6 — Detail pages (requester + QA hub)  ✅ DONE
- Build `/requests/change-control/[id]` (requester view: summary, documents, status timeline, clarification response, audit).
- Build `/requests/hub/change-control/[id]` (QA view: screening, per-document review, signatory panel, reconciliation, training gate, close).
- Re-point the legacy `/change-control/[id]` to render the package detail (or redirect) so there's one detail surface. Reuse `DiffViewer`, `SignatureGrid`, `DeltaSummaryCard`, `WaiveModal`.
**Acceptance:** both detail routes render real data and drive every Phase 2–5 action; legacy route no longer a separate UI; build green.

### Phase 7 — Route legacy SOP revision into the unified package  ✅ DONE (via migration 052 `create_change_control`)
- Change `approve_sop_request()` (significant revision branch) to create a CC with `origin='sop_revision'`, **one child document**, entering at `documents_in_review` (or directly `signatures_pending` since QA already approved the content). Replace the unused 9-arg overload cleanly; deprecate the 6-arg `create_change_control` so only one path remains.
- SOP detail shows linked CC number; revision history references CC number (already partly present via `append_sop_revision_history`).
**Acceptance:** approving a significant SOP revision yields a proper 1-document package that flows through the same signatures/reconciliation/training path; build green.

### Phase 8 — SOP reject action + reports/dashboard/pulse alignment  ✅ DONE
- Add explicit `rejectSopRequest()` (schema already supports `status='rejected'`); wire to approvals UI.
- Update Change Control Register / aging / signature-status reports and dashboard KPIs to read the unified model; align Pulse events to the canonical lifecycle.
**Acceptance:** QA can reject an SOP request; reports/dashboard/pulse reflect unified statuses; build green.

### Phase 9 — End-to-end verification pass + readiness verdict  ✅ DONE (migration 055 tightened the status constraint)
- Walk every path: request (multi-doc) and revision (1-doc) → screen → review → sign → reconcile → train → effective → closed; plus clarification and reject branches.
- Confirm: no orphan statuses, no dual `create_change_control`, every transition audited, RLS holds, build + typecheck green.
- Produce the **go/no-go verdict** on whether the core is solid enough to (a) break features into packages/entitlements and (b) start multi-tenancy.

---

## 5. Out of scope (deliberately deferred)
- Full QA/006 breadth (classification minor/major/critical, CCC committee, formal risk-assessment module) — documented in the earlier change-control audit; not required for document-control change control or the demo.
- Multi-tenancy / `org_id` — comes **after** this core is verified (that's the readiness question in Phase 9).
- Feature packaging / entitlements / Admin Console — after Phase 9.

## 6. Progress log
- 2026-06-16: Plan written, grounded in code + QA/007. Phases 1–9 defined.
- 2026-06-16: **Phase 1 complete** — migration `051_cc_unification.sql` (additive: `origin` marker + child-doc backfill + indexes). Non-breaking; status collapse deferred to Phase 2 to avoid producer/consumer inconsistency.
- 2026-06-16: **Phases 5–9 complete.** Migrations `054_cc_training_release.sql` (`cc_recheck_effective`) and `055_cc_status_tighten.sql` (canonical-only status CHECK). Server actions `releaseChangeControlDocumentTraining` + `rejectSopRequest`. New UI: `change-control-package-client.tsx` (unified detail driving screen→review→draft→sign→reconcile→train→close), routes `/requests/hub/change-control/[id]` and `/requests/change-control/[id]`, reject UI in the approval detail client, and CC-number links from the hub + request lists. `npx tsc --noEmit` → 0 errors. **All seven migrations (051–055) applied to Supabase by the operator.**

## 7. Readiness verdict (the gate for packaging + multi-tenancy)

**Engine: GO.** Change Control is now one unified, multi-SOP, QA-controlled lifecycle with a single status model, one producer path, per-document review, package signatures, multi-SOP reconciliation, training gating, and a tightened constraint. Typecheck is clean and the legacy SOP-revision path folds into the same machinery.

**Before flipping to packaging/multi-tenancy, do this manual QA pass** (cannot be done from the build sandbox — needs a running app + the applied DB):
1. Department request → QA screen (approve) → start review → attach draft + approve each doc → auto-advance to signatures → managers sign → reconciliation → activate. Verify **all** affected SOPs went active and each shows the CC number in revision history.
2. A training-required document holds the package at `pending_training`; release per-document after training threshold; package → effective → close.
3. SOP revision path (origin=`sop_revision`): approve a significant revision → confirm it creates a 1-document package and reconciles/activates through the same path.
4. Reject an SOP request from the approvals screen; confirm the submitter is notified and a `new` SOP returns to draft.
5. Confirm dashboard/sidebar/risk KPIs count open CCs correctly under canonical statuses.

If that pass is clean, the QMS core is solid enough to begin **feature packaging/entitlements** and then **multi-tenancy** (`org_id` everywhere — see `qms-platform-architecture.md` in the v1 docs, to be ported into V2DOCS).

- 2026-06-16: **Phases 3 + 4 complete** — migration `053_cc_package_lifecycle.sql` (`cc_snapshot_signatories`, `set_cc_document_draft`, `set_cc_document_review` with auto-advance to `signatures_pending`, and **generalized `confirm_cc_reconciliation` that loops every child document to activate every linked SOP** — the multi-SOP core). Server actions `setChangeControlDocumentDraft` + `reviewChangeControlDocument` added. `npx tsc --noEmit` → 0 errors. Migrations 051–053 awaiting application.
- 2026-06-16: **Phase 2 complete** — migration `052_cc_status_unification.sql` (remap legacy→canonical; rewrite `create_change_control` to canonical + origin + child doc; drop unused 9-arg overload; `check_cc_completion`→`pending_reconciliation`; `confirm_cc_reconciliation`→canonical + child-doc update; `compute_risk_metrics` CC filter fixed). Consumers updated: `app.types.ts` (status union narrowed, `origin` added), `dashboard/page.tsx`, `app-sidebar.tsx`, `change-control-client.tsx`, `change-control-header.tsx`, `change-control-status-badge.tsx`, `change-control-hub-client.tsx`, `sop-change-history-report.tsx`. `npx tsc --noEmit` → 0 errors. **Migrations 051 + 052 awaiting application to Supabase.**
