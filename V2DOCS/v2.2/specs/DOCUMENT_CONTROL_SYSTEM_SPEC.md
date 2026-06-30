# Document Control System — GxP/GMP Compliance Specification

> **Purpose of this document.** This is the build specification for the corrected document control system. It is written to be handed to an implementation agent. It describes the target state: every workflow, every state, every transition, every guard, every role, every screen, and the data model that supports them. Where the current system already does something correctly, that is noted so it can be kept rather than rebuilt. Where the current system has a gap, the gap and its fix are described in full.
>
> **How to read it.** Sections 1–3 are orientation (principles, roles, the regulatory "why"). Sections 4–9 are the workflows and states — the core of what to build. Section 10 is the data model. Section 11 is the screen inventory. Section 12 is the audit-trail and data-integrity layer that sits under everything. Section 13 is the gap register mapped to work items. Section 14 lists the decisions your client's QA must ratify before this is final.
>
> **Scope.** Single-tenant assumption per client; multi-branch within a tenant. The system controls SOPs and equivalent controlled documents (work instructions, forms, specifications, templates). It does not cover executed records (batch records, logbooks) except where they reference controlled documents.

---

## 1. Design principles

These principles govern every decision in the rest of the document. When the agent faces an ambiguity not covered explicitly, resolve it in favour of these.

**1.1 Robust but easy.** The two goals are not in tension if the rigor is placed correctly. Rigor belongs in the *engine* — the state machine, the guards, the audit trail — where it is invisible to a well-behaved user and absolute against a misbehaving one. Ease belongs in the *surface* — one intake door, inferred request types, clear screens, no asking the user to classify things the system can determine. A user doing the right thing should feel almost no friction; the system should make the wrong thing impossible rather than warning against it.

**1.2 The engine is a state machine, not a status field.** Every controlled document and every change package is a finite state machine. A document is never in an ad-hoc condition; it is always in exactly one defined state, and it moves between states only through defined transitions, each of which has a named trigger, an actor with a required role, and a set of preconditions (guards). Illegal transitions are not merely discouraged — they are unrepresentable.

**1.3 Separate the document from its versions.** This is the single most important architectural correction. A *document* (the logical SOP — "SOP-042, Calibration of Torque Wrenches") has one identity for its whole life. A *version* (revision 00, 01, 02…) is a concrete artifact that gets drafted, approved, made effective, superseded, and retained. States like `effective`, `superseded`, and `retained` are properties of a **version**, not of the document. The document's state is a thin pointer ("active", "retired") to whichever version is currently in force. Modelling supersession on the document row — as the current system does by overwriting in place — is the root cause of the orphaned-retirement gap.

**1.4 Segregation of duties is enforced in the engine.** The author of a document cannot approve it. The approver cannot be the requester. These checks live in the transition guards (server-side), never only in the UI. Where a guard has no valid actor (e.g. the department head is themselves the author and would otherwise be the endorser), there is always a defined fallback, and the fallback is logged.

**1.5 Risk-based depth.** Every change goes through change control — there is no "minor edit skips the process" shortcut. But the *depth* of the path (who must sign, whether revalidation is triggered, whether regulatory notification is needed) is set by a risk classification performed at intake. Treating a typo and a validated-parameter change identically is itself a compliance failure: it either over-burdens trivial changes or under-controls serious ones.

**1.6 Everything is attributable, timestamped, and immutable.** Every state transition, signature, field edit, waiver, and override writes an audit-trail entry capturing who, what, when, the old value, the new value, and (where the action is discretionary) why. Audit entries are append-only. This is the ALCOA+ backbone and is non-negotiable.

**1.7 Decouple approval from effectiveness.** A document being approved (signed) and a document being effective (in force) are two different events separated by time. The gap is the training window and/or a scheduled future effective date. The system must represent "approved but not yet live" as a real state, never collapse it into "active".

**1.8 Block by default, override by exception, log always.** Where a real-world situation can legitimately require bypassing a control (a controlled copy destroyed in a fire, a required signatory who left the company), the control blocks by default, an authorized role can override, and the override is always logged with a reason. This pattern appears in reconciliation, signature waiver, and classification dispute.

---

## 2. Roles and permissions

Roles are the basis of every guard. The system defines the following roles. A real user may hold more than one role, but **the engine evaluates segregation-of-duties checks against the specific action**, so holding two roles never lets a user satisfy both sides of a separation requirement on the same record (e.g. being both author and approver of the same document).

### 2.1 Role definitions

| Role | Who they are | Core authority |
|------|-------------|----------------|
| **Author / Originator** | Any employee who creates or revises a document | Creates drafts, uploads content, supplies reason-for-change, responds to requested changes. Cannot approve or endorse their own submission. |
| **Department Head (HOD)** | The head of the department that owns the document | Endorses employee submissions before QA sees them. Confirms technical/operational correctness within their department. Cannot endorse a submission they themselves authored. |
| **QA Reviewer / Approver** | Quality Assurance staff | The sole release authority. Reviews, requests changes, approves, rejects, sets effective dates, screens change controls, confirms reconciliation, releases training. Cannot approve a document they authored or requested. |
| **Signatory** | Any manager or role designated in a change's signing matrix | Applies an electronic signature on a change package where their sign-off is required. The required set is determined by the change's classification. |
| **Trainer / Training Coordinator** | Owns the training/LMS coupling | Assigns training on effective documents, records completion, reports threshold status. (May be the same person as QA in a small org, subject to SoD on any single record.) |
| **Admin** | System administrator | Manages users and roles, may waive a signature or force a reconciliation **only** through logged, reason-required exception transitions. Admin power is constrained by the engine, not unlimited. |
| **Viewer / Read-only** | Any user who needs to read effective documents | Reads the current effective version from the repository. No workflow authority. The largest population of users. |

### 2.2 Permission principles

- **Least privilege.** A user sees and can act only on what their role permits. A Viewer never sees draft content; an Author sees their own drafts and effective documents but not others' in-flight work unless assigned.
- **Branch scoping.** In a multi-branch tenant, roles are scoped to branches where relevant. A HOD endorses for their department/branch, not globally. QA authority may be global or branch-scoped per the client's org design (see §14).
- **Action-level SoD.** The check is never "is this user a QA?" alone — it is "is this user a QA *and* not the author/requester of *this* record?" Implement SoD as a comparison of user identity against the record's author/requester fields at the moment of the transition.
- **Admin is auditable, not exempt.** Admin overrides are themselves controlled transitions that write audit entries and require reasons. There is no "admin does anything silently" path.

---

## 3. Regulatory grounding (the "why" behind the rigor)

This section exists so the agent understands *why* a control exists and does not optimize it away as friction. It is deliberately brief; the client's quality manual and the regulation text are the authoritative sources.

- **Lifecycle states and controlled change** derive from FDA 21 CFR Part 211 (cGMP), EU GMP Chapter 4 (Documentation), and ICH Q10 (Pharmaceutical Quality System). Every controlled document must have a defined lifecycle and every change must be governed.
- **Electronic signatures and audit trails** derive from FDA 21 CFR Part 11 and EU GMP Annex 11. Signatures must be attributable and permanently linked to the record; audit trails must be secure, computer-generated, timestamped, and capture old and new values.
- **Data integrity** is governed by ALCOA+: data must be Attributable, Legible, Contemporaneous, Original, and Accurate, plus Complete, Consistent, Enduring, and Available.
- **Risk-based change classification** derives from ICH Q9 (Quality Risk Management) and is expected by inspectors; minor/major/critical classification drives approval depth and validation effort.
- **Retention before destruction** is a records-management requirement: controlled records are held for a defined retention period and only then destroyed through an approved, logged event.

> **Important caveat for the agent and the client.** This specification reflects standard GxP patterns. It is **not** a regulatory certification. The specific retention periods, the classification matrix thresholds, and whether certain controls apply depend on the client's regulatory regime, product class, and their own ratified quality manual. Items requiring client ratification are collected in §14.

---

## 4. State reference (the complete state machine)

This section is the authoritative list of every state in the system. Sections 5–9 describe how documents move between them.

### 4.1 Document states (`documents.status`)

The document is the logical SOP. Its state is a thin lifecycle pointer.

| State | Meaning | Terminal? |
|-------|---------|-----------|
| `draft` | Being authored; no version has ever been effective | No |
| `in_review` | A version is moving through approval (covers HOD and QA review) | No |
| `pending_training` | Approved, waiting for training threshold before it can go effective | No |
| `scheduled` | Approved with a future effective date; not yet live | No |
| `active` | Has a current effective version; this is the normal live state | No |
| `locked_in_cc` | An effective document whose change is in progress (was `pending_cc`) | No |
| `retired` | Deliberately discontinued; no longer in use, retention hold may apply | Near-terminal |

> Note: `superseded`, `retained`, and `destroyed` are **removed from the document state set** and moved to the version state set (§4.2). This is the core architectural correction. The document does not become "superseded" — its *old version* does.

### 4.2 Version states (`document_versions.status`) — NEW state set

Each revision is a row in `document_versions`. This state set is **new**; the current system lacks it.

| State | Meaning |
|-------|---------|
| `draft` | This revision is being authored |
| `in_approval` | This revision is in the approval/signing flow |
| `approved` | Signed off, not yet effective (training/scheduling pending) |
| `effective` | The currently-in-force revision. **Exactly one** effective version per document at any time — enforced. |
| `superseded` | Was effective; a newer revision took over. Set **atomically** when the successor becomes effective. |
| `retained` | A superseded or retired version inside its retention period; preserved and retrievable, withdrawn from use |
| `destroyed` | Retention expired and destruction approved; content removed, metadata/audit retained |

### 4.3 Change package states (`change_controls.status`)

The change package governs one change, which may affect one or many documents.

| State | Meaning |
|-------|---------|
| `submitted` | Request raised; awaiting QA screening |
| `clarification_requested` | QA asked the requester for more information |
| `impact_pending` | Impact assessment incomplete — **cannot advance** until complete |
| `classified` | Impact complete, risk class assigned (minor/major/critical) |
| `queued` | Blocked because an affected document is locked under another open change |
| `approved_for_document_work` | Screening passed; document editing may begin |
| `documents_in_review` | Affected documents being reviewed/approved individually |
| `signatures_pending` | All documents approved; awaiting the required signature set |
| `pending_reconciliation` | Signed; awaiting controlled-copy reconciliation |
| `pending_training` | Reconciled; awaiting training threshold on affected documents |
| `effective` | Change is live; documents unlocked at new revisions |
| `effectiveness_review` | Live but not closed; awaiting independent confirmation it met its objective |
| `closed` | Effectiveness confirmed; package complete |
| `rejected` | Terminal; screening or review rejected the change |

> Removed dead states: `draft` and `qa_screening` from the current enum are eliminated unless `impact_pending`/`classified` replace their intent (they do). The CHECK constraint must match this list exactly so no documented state is unreachable.

### 4.4 Approval request states (`approval_requests.status`)

Tracks an individual review/approval cycle within either a new-SOP flow or a document-in-CC flow.

| State | Meaning |
|-------|---------|
| `pending` | Awaiting the current stage's actor |
| `changes_requested` | Sent back to author to revise |
| `approved` | This stage approved |
| `rejected` | This stage rejected |

With `approval_stage`: `hod_review` or `qa_review`.

### 4.5 Retirement states

Retirement of a whole document is tracked on the document plus a retirement record:

| State | Meaning |
|-------|---------|
| `retirement_requested` | Discontinuation proposed with justification |
| `retirement_approved` | QA approved; document withdrawn from use |
| `pending_destruction` | In retention hold; destruction not yet permitted |
| `destroyed` | Retention expired, destruction approved and logged |

---

## 5. The unified intake (one door, inferred routing)

### 5.1 Goal

A single entry point — one "Start a request" screen — that determines what kind of request this is and routes it into the correct pipe, without asking the user to self-classify. This is the "easy" surface over the "robust" engine.

### 5.2 Inference logic

At intake the system captures: an optional target document, optional additional documents (scope), the uploaded content where applicable, and a mandatory reason. From these it infers the request **type**:

- **No target document selected** → `NEW_SOP`. There is no predecessor to supersede, no impact on existing effective states.
- **One effective target document** → `CHANGE_SINGLE`. A change against one existing document.
- **More than one target document** → `CHANGE_MULTI`. A change control spanning several documents.
- **Target document + intent flag "discontinue"** → `RETIRE`. The process the document describes no longer exists.

> **Guard — inference keys off `effective`, not any row.** The new-vs-change decision must check whether an *effective* version exists for the target, not merely whether any document row exists. An abandoned draft must not cause a brand-new document to be misrouted as a change against nothing.

### 5.3 Confirm with visible rationale

The system shows the user its inference *and the reason for it* ("You selected SOP-042, which is effective, so this will be handled as a change"). The user confirms. The user **cannot freely relabel** the type — but they **can dispute** it (§5.4). Confirmation with a visible rationale is what makes "cannot relabel" defensible rather than a black box.

### 5.4 Dispute path

If the user believes the inference is wrong (e.g. a document is technically effective but functionally dead), they dispute. A dispute routes to QA to re-evaluate the type. If QA overrides the inferred type, the override is **logged with a reason**. This is the pressure-relief valve that keeps the rigid inference from becoming a trap.

### 5.5 Abandoned-draft fork

If the user starts a new SOP and a prior unfinished draft of an apparently-matching document exists, the system surfaces the existing draft and asks the user to **resume or start fresh**. The choice is logged. This prevents both ghost-draft accumulation and accidental attachment of new work to a stale request.

### 5.6 Lock the type at dispatch, not at capture

The inferred type can still shift while the user adds or removes documents from scope during intake. The type is **locked only at dispatch** — the moment the request is handed to a pipe. After dispatch the type is immutable for that request.

### 5.7 Intake decision summary

| Signal | Inferred type | Routes to |
|--------|--------------|-----------|
| No effective target | `NEW_SOP` | New SOP pipe (§6) |
| One effective target | `CHANGE_SINGLE` | Change pipe (§7), single-doc front |
| Many targets | `CHANGE_MULTI` | Change pipe (§7), multi-doc front |
| Target + discontinue intent | `RETIRE` | Retirement pipe (§8) |

---

## 6. Pipe 1 — New SOP (creation → active)

### 6.1 Narrative

An author uploads content and supplies a reason. Employee submissions are endorsed by their department head before QA; manager submissions go straight to QA. QA is the sole approver and can never approve their own submission. On approval, the document either goes effective immediately, waits for a training threshold, or waits for a scheduled future effective date. The first effective version is revision 00.

### 6.2 States traversed

`draft → in_review (hod) → in_review (qa) → [approved] → {pending_training | scheduled | active}`
with the version moving `draft → in_approval → approved → effective`.

### 6.3 Transitions, triggers, actors, guards

| From | To | Trigger | Actor | Guards |
|------|----|---------|-------|--------|
| ∅ | `pending_hod` | submit (employee) | Author (employee) | Reason-for-change present; content attached |
| ∅ | `pending_qa` | submit (manager) | Author (manager) | Reason present; content attached |
| `pending_hod` | `pending_qa` | endorse | HOD | **HOD ≠ submitter** (else fallback §6.4) |
| `pending_qa` | `changes_requested` | request changes | QA or HOD | — |
| `changes_requested` | `pending_qa` | resubmit | Author | Revision history preserved |
| `pending_qa` | `draft` (rejected) | reject | QA or Admin | **Reason required; draft + reason retained, not deleted** |
| `pending_qa` | `approved` | approve | QA | **QA ≠ submitter and QA ≠ author** |
| `approved` | `pending_training` | approve-with-training | QA | Training flagged required |
| `approved` | `scheduled` | set future effective date | QA | Effective date > today |
| `approved` | `active` | activate (no training, today) | QA | Effective date = today, no training |
| `pending_training` | `active` / `scheduled` | training threshold met | QA / system | Threshold % reached; **untrained users blocked from execution** |
| `scheduled` | `active` | effective date arrives | system (scheduled job) | Date check |

### 6.4 Guard detail — HOD is the submitter

If the department head is the author of the document, the normal endorser is invalid (would violate SoD). The system must route endorsement to a **defined fallback**: a peer HOD, a designated deputy, or QA acting as endorser. The fallback choice and actor are logged. Without this, an HOD-authored document either stalls forever or someone disables the SoD check — both unacceptable.

### 6.5 Guard detail — training threshold and stragglers

If the document goes effective at a threshold below 100% trained (a legitimate practice), the untrained population must be **actively blocked from executing** the SOP, not merely flagged. The audit trail records the trained percentage at go-live and tracks stragglers to completion. The system must be able to show an inspector: who was trained, when, and that nobody executed before training. Without enforced blocking, the threshold is a finding.

### 6.6 Guard detail — future effective date

Setting an effective date in the future puts the document in `scheduled`, **not** `active`. A scheduled job (or a date check on read) flips it to `active` when the date arrives. The previous reality holds until then. This is the same approval-vs-effectiveness decoupling as training, applied to scheduling.

### 6.7 Guard detail — reject preserves history

A rejected request returns the document to `draft` with the rejection reason recorded. The rejection is part of the document's audit history (an inspector may ask "was this ever rejected and why?"). Reject must never delete the row.


---

## 7. Pipe 2 — Change (request → change control → effective)

This is the densest pipe and carries the most compliance weight. It has two fronts (single-document and multi-document) that converge on one shared tail. The shared tail is where most rigor lives.

### 7.1 Narrative

A change request is raised against one or more existing effective documents. Before anything routes, a **mandatory impact assessment** is completed (incomplete fields block submission) and the change is **classified** minor/major/critical. The affected document(s) are checked for **lock conflicts** with other open changes. The document(s) lock and their revision bumps to NN+1. The change moves through document review, then a **classification-driven signature set**, then **reconciliation** against the controlled-copy register, then training, then effective. After going live it is **not closed** until an independent **effectiveness review** confirms it met its objective.

### 7.2 Mandatory impact assessment (NEW — hard gate)

Before a change can be submitted, the requester completes an impact assessment covering at minimum: which documents are affected, whether training is required and for whom, whether executed-record templates are affected, which systems/equipment are touched, and whether revalidation or regulatory notification may be needed.

> **Guard — incomplete impact blocks submission.** The `impact_pending` state cannot advance to `classified` until required fields are complete. There is **no "submit anyway"**. This is enforced server-side in the RPC, not just by UI validation.

### 7.3 Risk classification (NEW)

Based on the impact assessment, the change is classified:

| Class | Typical examples | Drives |
|-------|-----------------|--------|
| **Minor** | Typo, formatting, clarification with no procedural effect | Short approval path; no revalidation |
| **Major** | Procedural step change, role change, new form field | Full review, training-on-change, fuller signature set |
| **Critical** | Change to a validated parameter, safety-relevant change, regulatory-filing-relevant change | Impact assessment + possible revalidation + regulatory notification + heaviest signature set |

> The **classification matrix** (the exact rules for what lands where) must be ratified by the client's QA (§14). The system stores the matrix as data, not hardcoded, so QA can adjust thresholds without a code change. Classification can be proposed by the system from the impact answers but must be **confirmable/overridable by QA with a logged reason**.

### 7.4 Concurrency guard (NEW)

When a change targets a document, the system checks whether that document is already locked under another open change control.

> **Guard — lock conflict.** If an affected document is already in `locked_in_cc` under a different open change, the new change enters `queued` and waits for the lock to clear, or is blocked with a clear message. This prevents two changes silently clobbering each other's revisions. Critical for multi-document changes where overlap is invisible until two people edit the same document in the same window.

### 7.5 States traversed (shared tail)

```
submitted
  → clarification_requested (loop) 
  → impact_pending → classified
  → [concurrency check] → queued (if locked) → 
  → approved_for_document_work → documents_in_review
  → signatures_pending
  → pending_reconciliation
  → pending_training (if any doc needs training)
  → effective
  → effectiveness_review
  → closed
(rejected = terminal from screening or review)
```

The single-doc front (`CHANGE_SINGLE`) goes HOD→QA approval, then `create_change_control` locks the document and joins directly at `signatures_pending` (it has already been document-reviewed via the approval path). The multi-doc front (`CHANGE_MULTI`) goes through QA screening and per-document review, then joins at `signatures_pending`. From `signatures_pending` onward the tail is identical.

### 7.6 Transitions, triggers, actors, guards (shared tail)

| From | To | Trigger | Actor | Guards |
|------|----|---------|-------|--------|
| `submitted` | `clarification_requested` | request clarification | QA | — |
| `clarification_requested` | `submitted` | resubmit | Requester | — |
| `submitted` | `rejected` | reject | QA | Reason required; terminal |
| `submitted` | `impact_pending` | begin screening | QA | — |
| `impact_pending` | `classified` | complete impact + classify | QA | **All required impact fields present** |
| `classified` | `queued` | lock conflict detected | system | An affected doc is locked elsewhere |
| `queued` | `approved_for_document_work` | lock clears | system | No remaining conflicts |
| `classified` | `approved_for_document_work` | approve for work | QA | No lock conflict |
| document(s) | `locked_in_cc` + revision NN+1 | create_change_control | QA | **Document locked; revision bumped** |
| `approved_for_document_work` | `documents_in_review` | open document work | QA | — |
| `documents_in_review` | `signatures_pending` | all docs approved | QA | Every affected document approved |
| `signatures_pending` | `signatures_pending` | apply signature | Signatory | Signature linked to record + user |
| `signatures_pending` | (waiver applied) | waive signature | **Admin only** | **Reason required; logged immutably** |
| `signatures_pending` | `pending_reconciliation` | completion check | system trigger | **All required signed or waived** |
| `pending_reconciliation` | `pending_reconciliation` | reconcile copies | QA | Checks controlled-copy register |
| `pending_reconciliation` | (forced) | force-reconcile | Authorized role | **Reason required; logged** (fire/closed-site case) |
| `pending_reconciliation` | `pending_training` | confirm (training needed) | QA | At least one affected doc needs training |
| `pending_reconciliation` | `effective` | confirm (no training) | QA | **Every issued copy accounted for** |
| `pending_training` | `effective` | release after threshold | QA | Per-doc threshold met; stragglers blocked |
| `effective` | `effectiveness_review` | enter review window | system | After defined period |
| `effectiveness_review` | `closed` | confirm objective met | **Independent approver** | Reviewer ≠ change requester |
| any open | `closed` | close | QA/Admin | — |

### 7.7 Guard detail — signature matrix from classification

The set of required signatories is determined by the change's class. Minor: a reduced set (e.g. QA only or QA + owning HOD). Major: owning managers + QA. Critical: extended set possibly including site quality head and affected-system owners. The matrix is stored as data keyed by class (and possibly by affected document type), ratifiable by QA. The completion check (`check_cc_completion`) passes only when every member of the required set has signed or been waived.

### 7.8 Guard detail — waiver

A signature waiver is the most abusable transition in the system (it makes a document effective without a required approval). Therefore:
- **Admin-only**, enforced in the RPC.
- **Reason required.**
- **Logged immutably** in the audit trail.
- Surfaced in the change record so it is visible at effectiveness review.

### 7.9 Guard detail — reconciliation and the copy register

`pending_reconciliation` checks the controlled-copy register (§10.6). It cannot advance to effective until **every issued controlled copy of the outgoing version is accounted for** (returned or destroyed). The forced-override path exists for genuine exceptions (a copy destroyed in a fire, a contract site closed) and is logged with a reason. If the client is fully paperless (no physical copies issued), this step is near-trivial but the state still exists for completeness.

### 7.10 Guard detail — revision-number burn policy

When a change locks a document, the revision bumps to NN+1. **Decision required (§14):** if that change is later rejected or abandoned, is NN+1 burned (leaving a visible gap: 00, 01, 03) or reclaimed (number allocated only at effective time)? Either is defensible but the system must do one consistently, because an inspector seeing a revision gap will ask. Recommendation: allocate the displayed revision number only at the `effective` transition, holding a provisional internal id while in flight — this avoids gaps entirely.

### 7.11 Guard detail — supersession atomicity

When a change goes `effective`, two writes must happen in **one transaction**: the new version becomes `effective`, and the previously-effective version becomes `superseded`. If these are two steps and the process dies between them, the system has either two effective versions (catastrophic — two "current" SOPs) or zero. Implement as a single atomic RPC.

### 7.12 Guard detail — effectiveness review

A change is **not closed when it goes effective**. After a defined period it enters `effectiveness_review`: did the change achieve its objective, were there unintended effects? Closure is a separate controlled step performed by an **independent approver** (not the change requester), especially for major/critical changes. This step is currently missing entirely and must be added.

---

## 8. Pipe 3 — Retirement (discontinuation → destruction)

### 8.1 Narrative

Retirement is for when a whole document is discontinued — the process it describes no longer exists. This is distinct from revision (which supersedes an old *version*). Retirement is lighter than change control (nothing is authored) but still needs a request, QA approval, pre-checks, and — critically — a **retention hold** before destruction.

### 8.2 States traversed

`retirement_requested → retirement_approved → pending_destruction → destroyed`
(document moves `active → retired`; its current version moves `effective → retained → destroyed`)

### 8.3 Transitions, triggers, actors, guards

| From | To | Trigger | Actor | Guards |
|------|----|---------|-------|--------|
| `active` | `retirement_requested` | request retirement | Any active user | Justification required |
| `retirement_requested` | (blocked) | pre-check fails | system | See §8.4 |
| `retirement_requested` | `retirement_approved` | approve | QA | **Pre-checks pass**; QA ≠ requester |
| `retirement_approved` | `pending_destruction` | withdraw from use | QA | Document marked `retired`, version `retained` |
| `pending_destruction` | (held) | retention not expired | system | **Time-gate: retention period not elapsed** |
| `pending_destruction` | `destroyed` | destroy | Authorized role | **Retention expired**; reason + approval logged |

### 8.4 Guard detail — retirement pre-checks

Before QA can approve retirement, three checks must pass:
1. **No active document references this one** (no effective SOP points to it).
2. **All open training assignments for it are closed.**
3. **It is not cited in an active regulatory submission/filing.**

Any failure blocks approval with a clear reason. These prevent retiring a document that something still depends on.

### 8.5 Guard detail — retention time-gate

This is the single most important new control in the retirement pipe. Destruction **cannot** fire until the retention clock has elapsed, regardless of who requests it. The retention period is set per document type/regime (§14). `pending_destruction → destroyed` is guarded by a date check; the destruction itself is an approved, logged event capturing who authorized it, when, and the method. `destroyed` removes content but **retains metadata and audit trail** (you must still be able to prove the document existed and was destroyed properly).

### 8.6 Two paths into `retained`

A version reaches `retained` by either route:
- **Supersession** — its successor became effective (automatic, frequent). Happens on every revision.
- **Retirement** — the whole document was deliberately discontinued (rare).

Both converge on the same retention-then-destruction tail.


---

## 9. Supersession and version lifecycle (cross-cutting)

This section consolidates how versions live and die, because it spans pipes 2 and 3.

- **One effective version per document, always.** Enforced by a constraint or by the atomic supersession RPC. The system must never permit two `effective` versions of the same document.
- **The document row points; the version row carries state.** `documents.current_version_id` references the effective version. Document status (`active`/`retired`) is a lifecycle pointer; the rich states (`effective`/`superseded`/`retained`/`destroyed`) live on the version.
- **Supersession is atomic** (§7.11): on `effective`, successor→`effective` and predecessor→`superseded` in one transaction.
- **Retention applies to superseded and retired versions alike.** Both sit in `retained` for the retention period, then move to `destroyed` via the time-gated, approved event.
- **History is always retrievable.** For any past date, the system can answer "which version was effective then?" from the version rows and their effective/superseded timestamps. This is what lets an inspector pull "the SOP effective in March".

---

## 10. Data model

This describes the tables and key columns the system needs. Existing tables that already exist are noted; new ones are flagged **NEW**.

### 10.1 `documents`

The logical SOP. One row per document for its whole life.

| Column | Notes |
|--------|-------|
| `id` | PK |
| `document_number` | Human ID, e.g. SOP-042; stable for life |
| `title` | |
| `department_id` / `branch_id` | Ownership + scoping |
| `status` | One of §4.1 |
| `current_version_id` | FK to the effective version (nullable while never-yet-effective) |
| `owner_id` | Owning role/user |
| `created_at`, `updated_at` | |

### 10.2 `document_versions` — state set is NEW

One row per revision.

| Column | Notes |
|--------|-------|
| `id` | PK |
| `document_id` | FK |
| `revision_number` | Two-digit GMP number (00, 01, 02…). **Allocated at effective time** per §7.10 recommendation |
| `status` | One of §4.2 (**NEW** state set) |
| `content_ref` | Pointer to stored content/rendition |
| `effective_from` | Timestamp it became effective |
| `superseded_at` | Timestamp it was superseded (nullable) |
| `retention_until` | **NEW** — when retention expires and destruction becomes permissible |
| `reason_for_change` | Carried from the originating request |
| `created_at` | |

### 10.3 `change_controls`

The change package.

| Column | Notes |
|--------|-------|
| `id` | PK |
| `type` | `CHANGE_SINGLE` / `CHANGE_MULTI` |
| `status` | One of §4.3 |
| `classification` | **NEW** — minor / major / critical |
| `impact_assessment` | **NEW** — structured fields; completeness enforced |
| `requester_id` | For SoD checks |
| `created_at`, `closed_at` | |

### 10.4 `change_control_documents`

Join table: which documents a change affects (supports multi-doc).

| Column | Notes |
|--------|-------|
| `change_control_id` | FK |
| `document_id` | FK |
| `target_version_id` | The new revision being produced |
| `needs_training` | Per-document training flag |
| `released_at` | Per-document release timestamp (for staggered training release) |

### 10.5 `approval_requests`

| Column | Notes |
|--------|-------|
| `id` | PK |
| `document_id` / `version_id` | Subject |
| `change_control_id` | Nullable; set when part of a CC |
| `status` | One of §4.4 |
| `approval_stage` | `hod_review` / `qa_review` |
| `actor_id` | Who acted |
| `reason` | For changes-requested / reject |

### 10.6 `controlled_copies` — NEW

The controlled-copy register that makes reconciliation verifiable.

| Column | Notes |
|--------|-------|
| `id` | PK |
| `copy_number` | Sequential per document/version |
| `document_version_id` | Which version this copy reproduces |
| `holder` | Person/location holding it (shop floor, parts desk, contract site) |
| `issued_at` | |
| `status` | `issued` / `reconciled` (returned or destroyed) |
| `reconciled_at` | |
| `reconciled_method` | returned / destroyed / force-overridden |

### 10.7 `signatures`

| Column | Notes |
|--------|-------|
| `id` | PK |
| `change_control_id` / `version_id` | Subject |
| `signatory_id` | |
| `signed_at` | |
| `meaning` | What the signature attests (review/approve/release) — Part 11 requires the meaning be captured |
| `waived` | Boolean |
| `waived_by` | Admin id if waived |
| `waiver_reason` | Required if waived |

### 10.8 `retirements` — NEW

| Column | Notes |
|--------|-------|
| `id` | PK |
| `document_id` | FK |
| `status` | One of §4.5 |
| `justification` | Required |
| `requester_id`, `approver_id` | SoD |
| `precheck_results` | References/training/filing check outcomes |
| `destroyed_at`, `destruction_method`, `destruction_approver_id` | |

### 10.9 `audit_trail` — cross-cutting, append-only

| Column | Notes |
|--------|-------|
| `id` | PK |
| `entity_type` | document / version / change_control / signature / copy / retirement |
| `entity_id` | |
| `action` | Transition or field change |
| `actor_id` | Who |
| `occurred_at` | Server timestamp (contemporaneous) |
| `old_value`, `new_value` | For field/state changes |
| `reason` | For discretionary actions (waiver, override, reject, dispute) |

Append-only. No updates, no deletes. This is the ALCOA+ backbone.

### 10.10 `classification_matrix` — NEW, data-driven

Stores the rules mapping impact answers → class, and class → required signatory set. Editable by QA without code change. Versioned itself (the matrix is a controlled artifact).

---

## 11. Screen inventory

Screens grouped by role and workflow. For each: purpose, key elements, and the guards the UI must reflect (while remembering the real enforcement is server-side).

### 11.1 Universal / shared

**S1 — Repository (current effective documents).** The single source of truth. Lists effective documents, scoped by branch/department. Opens the current effective version as a read-only / watermarked rendition. Largest-traffic screen; must be fast and simple. Viewers see only this.

**S2 — Document detail / history.** Shows a document's current version plus its full version history (effective dates, supersession, who approved). The screen that answers "which version was effective in March". Read access broad; in-flight detail role-gated.

**S3 — Unified intake ("Start a request").** §5. One door. Captures target(s), reason, content. Shows the inferred type with rationale. Confirm / dispute. Surfaces the abandoned-draft fork. This is the primary "easy" surface — keep it clean.

**S4 — My tasks / inbox.** Role-aware queue: items awaiting *this* user's action (endorse, review, sign, reconcile, release training, effectiveness review). The workflow engine's face to each user.

### 11.2 Author screens

**S5 — Draft editor.** Upload/edit content, supply reason-for-change, attach impact answers for changes. Submit. Shows current state and what happens next.

**S6 — Changes-requested response.** When QA/HOD requests changes, the author sees the request, the reason, and revises/resubmits. Preserves prior versions visibly.

### 11.3 HOD screens

**S7 — Endorsement queue.** Employee submissions awaiting this HOD. Endorse or request changes. **UI must hide/disable endorse when HOD = submitter** and surface the fallback route (§6.4).

### 11.4 QA screens

**S8 — QA review/approval.** The core QA workstation. Review content, request changes, reject (reason required), approve. Set training requirement. Set effective date (today or scheduled). **Approve disabled when QA = author/submitter.**

**S9 — Change-control screening.** Screen submitted changes: approve for work / request clarification / reject. **Cannot proceed past impact until impact complete.** Assign/confirm classification (with override + reason).

**S10 — Change-control workstation.** Manage an open change: affected documents, per-document review status, signature matrix progress, reconciliation status, training release. Drive the change through its tail.

**S11 — Reconciliation screen.** Shows the controlled-copy register for the outgoing version: every issued copy and its status. Cannot confirm until all accounted; force-override available (reason required) for exceptions.

**S12 — Effectiveness review.** After a change is live, the review screen for an independent approver to confirm objective met and close. **Reviewer ≠ requester enforced.**

**S13 — Retirement review.** Review a retirement request; see pre-check results (references/training/filing); approve or block. Initiate retention hold.

### 11.5 Signatory screens

**S14 — Signature screen.** Apply an electronic signature to a change package where this user is in the required set. Captures meaning of signature (Part 11). Shows what is being attested.

### 11.6 Training screens

**S15 — Training assignment & status.** Assign training on effective documents; record completion; show threshold status per document; surface stragglers (and confirm they are blocked from execution).

### 11.7 Admin screens

**S16 — User & role management.** Users, roles, branch scoping.

**S17 — Exception console.** Where waivers and forced reconciliations are performed — **always reason-required, always logged**. This screen must make the gravity visible; it is the most sensitive surface in the system.

**S18 — Classification matrix editor.** Edit the data-driven matrix (impact→class, class→signatories). The matrix is itself version-controlled.

### 11.8 Oversight screens

**S19 — Audit-trail viewer.** Read-only, filterable view of the append-only audit trail by entity, actor, date. The screen you open in front of an inspector.

**S20 — Dashboards.** Open changes by state, overdue training, documents due for periodic review, retention-expiry queue, in-flight bottlenecks.

> **Periodic review note.** Beyond the request-driven flows, effective documents are subject to **periodic review** (typically every 1–3 years, per client policy). The system should track each document's next-review date and surface due/overdue items on S20, raising a change request when a review concludes a revision is needed. This is a scheduled obligation distinct from event-driven change.


---

## 12. Audit trail & data integrity (the layer under everything)

This is not a feature; it is a property the whole system must have. Every section above assumes it.

### 12.1 What must be captured

Every one of the following writes an audit entry: state transition, signature application, signature waiver, field edit on a controlled record, classification assignment/override, reconciliation confirmation, force-override, rejection, dispute/override of inferred type, training threshold/release, retirement approval, destruction.

### 12.2 What each entry contains

Who (actor identity), what (action/transition), when (server-side timestamp — contemporaneous), the old value and new value where applicable, and the reason where the action is discretionary.

### 12.3 Properties

- **Append-only.** No updates, no deletes, ever. Enforced at the database level (no UPDATE/DELETE grants on the audit table; ideally a trigger that rejects them).
- **Attributable.** Every entry ties to an authenticated user. No shared accounts for controlled actions.
- **Contemporaneous.** Timestamps are server-generated at the moment of action, not client-supplied.
- **Secure & enduring.** Survives for the document's full retention period and beyond.

### 12.4 ALCOA+ mapping

| Principle | How the system satisfies it |
|-----------|----------------------------|
| Attributable | Authenticated actor on every entry/signature |
| Legible | Structured, human-readable audit viewer (S19) |
| Contemporaneous | Server timestamps at action time |
| Original | Version content preserved; superseded versions retained |
| Accurate | Guards prevent invalid transitions; classification enforced |
| Complete | Every action audited, including failures/overrides |
| Consistent | State machine enforces one valid path |
| Enduring | Append-only storage through retention |
| Available | Repository + history + audit viewer retrievable on demand |

### 12.5 Electronic signature requirements (Part 11 / Annex 11)

- Each signature captures: signer identity, timestamp, and the **meaning** of the signature (what it attests).
- The signature is **permanently linked** to the record signed and cannot be excised or copied to another record.
- Signing requires authentication (the act of signing is itself an authenticated event).
- Waivers are signatures' shadow: admin-only, reason-required, logged, visible at effectiveness review.

---

## 13. Gap register → work items

This maps each correction to current-system reality, with severity and the work required. **Keep** = current behaviour is correct. **Adjust** = modify existing. **Build** = net-new.

| # | Item | Current state | Action | Severity | Work |
|---|------|--------------|--------|----------|------|
| 1 | Version-level state set | States live on document row; overwrite-in-place | **Build** | High | Add `document_versions.status` (§4.2); migrate supersession logic to version |
| 2 | Supersession atomicity | Old version silently overwritten | **Build** | High | Atomic RPC: successor→effective + predecessor→superseded in one txn |
| 3 | Retirement workflow | Unreachable; orphaned | **Build** | High | New `retirements` table + states (§8); pre-checks; QA approval |
| 4 | Retention time-gate | Absent | **Build** | High | `retention_until`; guard on destruction; approved logged destruction event |
| 5 | Controlled-copy register | Reconciliation is unverifiable assertion | **Build** | Med-High | `controlled_copies` table (§10.6); reconciliation reads it; force-override path |
| 6 | Mandatory impact assessment | Absent | **Build** | High | `impact_assessment` fields; `impact_pending` hard gate (no submit-anyway) |
| 7 | Risk classification | Absent; everything uniform rigor | **Build** | High | `classification` + data-driven matrix (§10.10); drives signature set |
| 8 | Classification-driven signature matrix | Single uniform signing | **Adjust/Build** | High | Matrix keyed by class; completion check reads required set |
| 9 | Concurrency / lock conflict | Single-doc lock only; multi-doc overlap unguarded | **Build** | High | Lock-conflict check; `queued` state |
| 10 | Effectiveness review before closure | effective→closed in one move | **Build** | Med | `effectiveness_review` state; independent approver guard |
| 11 | HOD-is-submitter fallback | Undefined | **Build** | Med-High | Fallback endorser routing; logged |
| 12 | Training straggler blocking | Threshold exists; blocking unclear | **Adjust** | High | Enforce execution block for untrained; record %, track stragglers |
| 13 | Future effective date / scheduled | Likely collapsed into active | **Adjust/Build** | Med | `scheduled` state; date-driven activation |
| 14 | Reject preserves history | To verify | **Verify/Adjust** | Med | Ensure reject retains draft + reason, never deletes |
| 15 | Revision-number burn policy | Bumped at lock; abandon behaviour undefined | **Adjust** | Low-Med | Allocate display revision at effective time (recommended) |
| 16 | Dead enum states | `draft`, `qa_screening` unreachable | **Adjust** | Low | Remove from CHECK or repurpose to `impact_pending`/`classified` |
| 17 | Unified intake + inference | Two separate entries | **Build** | Med | Intake router; infer/confirm/dispute; abandoned-draft fork |
| 18 | Audit trail completeness | Partial | **Verify/Adjust** | High | Ensure every §12.1 action audited; append-only enforced |
| 19 | Periodic review tracking | To verify | **Build/Adjust** | Med | Next-review dates; due/overdue surfacing |
| 20 | Keep: no-self-approve | Correct | **Keep** | — | Maintain action-level SoD |
| 21 | Keep: mandatory HOD endorsement | Correct | **Keep** | — | Maintain (plus add fallback #11) |
| 22 | Keep: every revision through CC | Correct | **Keep** | — | Maintain; add classification depth |
| 23 | Keep: two-digit GMP revisions | Correct | **Keep** | — | Maintain |
| 24 | Keep: lock during open CC | Correct for single-doc | **Keep** | — | Extend to multi-doc via #9 |

### 13.1 Suggested build sequence

1. **#16** (remove dead states — trivial, clears confusion).
2. **#1, #2** (version-level state + atomic supersession — foundational; everything else assumes it).
3. **#6, #7, #8** (impact + classification + signature matrix — the change-pipe core).
4. **#9** (concurrency guard — depends on locking model).
5. **#3, #4** (retirement + retention — independent track).
6. **#5** (copy register — if client uses physical copies; see §14).
7. **#10, #11, #12, #13** (effectiveness review, HOD fallback, straggler blocking, scheduling).
8. **#17** (unified intake — routing layer over the now-correct pipes).
9. **#14, #18, #19** (history preservation, audit completeness, periodic review — verification + surfacing passes).

---

## 14. Decisions the client's QA must ratify

These are not engineering decisions; the system stores them as data, but the *values* must come from the client's quality organization before go-live.

1. **Classification matrix.** The exact rules for minor vs major vs critical, and the required signatory set for each. The system holds this as editable data (§10.10), but QA must author and approve the initial matrix.
2. **Retention periods.** How long superseded and retired versions are held before destruction becomes permissible — varies by document type and regulatory regime.
3. **Controlled copies — applicable or not.** Whether the client issues physical controlled copies (shop-floor printouts, contract-site copies) or runs fully paperless. Determines whether the copy register (#5) is load-bearing or near-trivial.
4. **Periodic review cadence.** The review interval per document class (commonly 1–3 years).
5. **QA scoping.** Whether QA approval authority is global across branches or branch-scoped, in the multi-branch tenant model.
6. **Training threshold policy.** Whether documents may go effective below 100% trained, and at what threshold — plus confirmation that untrained users are blocked from execution.
7. **Effectiveness-review window.** How long after a change goes effective the effectiveness review occurs, and for which classes it is mandatory.
8. **Regulatory regime confirmation.** Which framework(s) the client operates under (FDA/EMA/other; and whether device-specific clauses apply). This validates the whole specification against the right clause set.

> **Final caveat.** This specification follows standard GxP/GMP patterns and is a sound, robust blueprint. It is **not** a compliance certification. Before go-live, the controls here should be checked against the relevant regulation text and the client's own ratified quality manual. The source of truth for any audit is the regulation and the quality manual, not this document.

---

## Appendix A — Quick state-transition index

**Document:** `draft → in_review → {pending_training | scheduled} → active → locked_in_cc → active → retired`

**Version:** `draft → in_approval → approved → effective → superseded → retained → destroyed`

**Change control:** `submitted → [clarification] → impact_pending → classified → [queued] → approved_for_document_work → documents_in_review → signatures_pending → pending_reconciliation → [pending_training] → effective → effectiveness_review → closed` (+ `rejected` terminal)

**Approval request:** `pending → {changes_requested → pending | approved | rejected}` across stages `hod_review`, `qa_review`

**Retirement:** `retirement_requested → retirement_approved → pending_destruction → destroyed`

## Appendix B — Guard checklist (server-side, non-negotiable)

- [ ] Author ≠ approver on every approval (action-level)
- [ ] HOD ≠ submitter on endorsement; fallback routed + logged
- [ ] QA ≠ requester on change approval and effectiveness review
- [ ] Impact assessment complete before classification (no submit-anyway)
- [ ] Lock-conflict check before document work; queue if locked
- [ ] One effective version per document (constraint)
- [ ] Supersession atomic (single transaction)
- [ ] All required signatures (per class) or logged waiver before reconciliation
- [ ] Waiver admin-only, reason-required, logged
- [ ] Every issued copy accounted before effective, or logged force-override
- [ ] Untrained users blocked from execution; stragglers tracked
- [ ] Scheduled documents not live until effective date
- [ ] Retirement pre-checks pass before approval
- [ ] Retention expired before destruction (time-gate)
- [ ] Destruction approved + logged; metadata/audit retained
- [ ] Every controlled action writes an append-only audit entry
- [ ] Reject preserves draft + reason (never deletes)

*End of specification.*
