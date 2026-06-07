# Change Control Multi-Document Alignment

## Source Documents

This alignment note is based on:

- `V2DOCS/v2.2/source-documents/QA-SOP-007-02 - SOP FOR DOCUMENT CONTROL.doc`
- `V2DOCS/v2.2/strategy/SOP Process Consolidation — What Needs to Change in SOP-Guard Pro.md`

## Core Decision

Change Control must be treated as a QA-controlled parent process, not as a hidden one-to-one workflow attached to a single SOP.

The correct model is:

```text
Change Control
  -> affected document 1
  -> affected document 2
  -> affected document 3
```

One Change Control can cover one document or multiple documents. This is required because one real-world quality, regulatory, equipment, process, or safety change can affect several SOPs, forms, formats, logbooks, protocols, or specifications at the same time.

## Why This Is Needed

The document-control SOP states that preparation of new documents is initiated through Change Control and that all revisions must be controlled. QA oversees the full lifecycle of GMP documents, including:

- document numbering
- review
- approval
- issuance
- controlled-copy distribution
- retrieval and reconciliation
- archival
- destruction
- lifecycle traceability

Because QA controls the document lifecycle, Change Control should be a formal QA-governed document package with its own number, status, audit trail, and affected-document list.

## Change Control Numbering

Change Controls must have a formal reference number.

Recommended format:

```text
CC/QA/YYYY/NNNN
```

Example:

```text
CC/QA/2026/0001
```

The exact pattern should remain configurable, but the system must enforce uniqueness and generate the next number automatically.

## Relationship To SOP Revisions

SOP revision numbering remains:

```text
00 -> 01 -> 02
```

The Change Control records:

- old revision
- new revision
- affected document number
- affected document title
- approval date
- effective date
- reason/rationale
- reconciliation confirmation
- training requirement

Each affected document keeps its own revision history, but all related document revisions reference the same Change Control number.

## Correct Workflow

1. Department user identifies need for change.
2. Department user submits a Change Control request.
3. QA receives an alert.
4. QA screens the request.
5. QA approves the Change Control for document work or returns it for clarification.
6. Department uploads draft or revised affected document(s).
7. HOD and affected departments review where required.
8. QA performs final review.
9. Required signatories sign the Change Control package.
10. QA confirms old-copy reconciliation before issue.
11. Training gate opens if required.
12. QA sets the Effective Date after training is complete or confirms no training is required.
13. Affected documents become active.
14. Change Control is closed.

## Sidebar And Navigation Decision

Change Control should be discoverable from Requests, because department users are requesting a formal QA-controlled change.

Sidebar structure:

```text
Requests
  - Document Requests
  - Change Control Requests

Request Hub
  - Document Request Hub
  - Change Control Hub
```

For non-QA users:

- `Requests` remains the sidebar parent item.
- `Change Control Requests` appears as a dropdown child.
- Department users can create and track their own Change Control requests.

For QA users:

- `Request Hub` remains the QA operational hub.
- `Change Control Hub` appears as a dropdown child.
- QA can screen, approve, reject, assign reviews, monitor signatures, confirm reconciliation, release training/effective-date gates, and close Change Controls.

## App Areas Affected

### Requests

Add a Change Control request flow for department users.

Users should be able to:

- create a Change Control request
- enter rationale
- select originating department
- select affected department(s)
- identify affected document(s)
- propose new or revised documents
- upload supporting files
- track status
- respond to QA clarification requests

### Request Hub

QA needs a Change Control Hub.

QA should be able to:

- view all submitted Change Controls
- screen new requests
- request clarification
- approve request for document work
- reject with documented reason
- assign review/signature requirements
- monitor aging and deadlines
- confirm reconciliation
- close the Change Control

### SOP Library

SOP update flow must be linked to Change Control.

Required changes:

- update existing SOP should require selecting or creating a Change Control
- SOP detail should show linked Change Control history
- version history should show Change Control number
- master index should include current revision and effective date
- active documents should be traceable back to the Change Control that created or revised them

### Approvals

SOP approvals become part of a larger Change Control package when applicable.

Required changes:

- approval detail should show parent Change Control number
- QA review should understand whether the document is part of a single-document or multi-document Change Control
- HOD/cross-functional review should be tracked against affected documents

### Change Control

The existing Change Control page should evolve from one-SOP signing into a package view.

It should show:

- Change Control number
- rationale
- requester
- originating department
- affected departments
- affected documents
- per-document old and new revision
- per-document draft/final file
- review status
- signature status
- reconciliation status
- training status
- effective date
- audit history

### Pulse

Add notifications for:

- Change Control submitted to QA
- QA requests clarification
- Change Control approved for document work
- affected department review required
- HOD review required
- QA review required
- signature required
- all signatures complete
- reconciliation required
- training required
- effective date ready
- Change Control closed

### Training

Training must connect to affected documents under the Change Control.

Required changes:

- training modules can be generated or assigned for affected documents
- training deadline remains 15 working days after issuance/approval
- QA sees which affected documents are waiting on training
- Effective Date cannot be set until training threshold is met when training is required

### Reports

Add or update reports:

- Change Control Register
- Change Control aging report
- Change Control signature status report
- Change Control reconciliation report
- Document revision history grouped by Change Control number
- Documents due for review
- Audit trail filter by Change Control number

### Dashboard

Add KPIs:

- open Change Controls
- Change Controls awaiting QA screening
- Change Controls awaiting department response
- Change Controls awaiting signatures
- Change Controls awaiting reconciliation
- Change Controls awaiting training
- overdue Change Controls

### Permissions

Recommended permissions:

- Department users: create and track own Change Control requests.
- Department managers/HODs: endorse and review department Change Controls.
- QA managers: screen, approve, reject, assign reviewers, confirm reconciliation, set effective dates, close Change Controls.
- Admins: configure numbering, override/waive where allowed, and manage system-level settings.
- Signatories: sign only assigned Change Controls.

### Audit And Security

The Change Control process must be audit-heavy.

Audit events must include:

- request created
- submitted to QA
- QA screened
- clarification requested
- approved for document work
- document added
- document draft uploaded
- reviewer assigned
- review completed
- signature requested
- signature completed
- signature waived
- reconciliation confirmed
- training gate opened
- effective date set
- Change Control closed
- Change Control rejected

No Change Control should be hard-deleted. Closed and rejected records remain available for audit traceability.

## Final Target Model

The most compliant long-term model is:

```text
Change Control
  cc_number
  requester
  originating_department
  rationale
  impact_assessment
  affected_departments
  status
  due_date
  qa_owner
  audit trail

Change Control Documents
  change_control_id
  document_id
  document_number
  document_title
  document_level
  old_revision
  new_revision
  old_file
  new_file
  review_status
  training_required
  training_status
  effective_date
```

This makes the app understandable in real-world use because users request a change once, QA controls it once, and all affected documents remain tied to the same controlled package.
