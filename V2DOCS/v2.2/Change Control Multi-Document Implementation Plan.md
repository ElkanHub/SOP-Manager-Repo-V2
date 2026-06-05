# Change Control Multi-Document Implementation Plan

## References

This plan implements the alignment described in:

- `V2DOCS/v2.2/Change Control Multi-Document Alignment.md`

It is also based on:

- `V2DOCS/v2.2/QA-SOP-007-02 - SOP FOR DOCUMENT CONTROL.doc`
- `V2DOCS/v2.2/SOP Process Consolidation - What Needs to Change in SOP-Guard Pro.md`

## Objective

Upgrade Change Control from a single-SOP workflow into a numbered, QA-controlled, multi-document process that department users can request and QA can manage through a dedicated hub.

## Navigation Plan

### Department Users

Sidebar:

```text
Requests
  - Document Requests
  - Change Control Requests
```

Add:

- `/requests/change-control`
- `/requests/change-control/new`
- `/requests/change-control/[id]`

Users can:

- submit a Change Control request
- upload supporting files
- list affected documents
- track request status
- respond to QA clarification requests

### QA Users

Sidebar:

```text
Request Hub
  - Document Request Hub
  - Change Control Hub
```

Add:

- `/requests/hub/change-control`
- `/requests/hub/change-control/[id]`

QA can:

- screen submitted requests
- approve for document work
- reject
- request clarification
- assign reviewers and signatories
- monitor affected document status
- confirm reconciliation
- release training/effective-date gates
- close the Change Control

## Phase 1 - Database Foundation

Add or alter:

- `change_controls.cc_number`
- `change_controls.requester_id`
- `change_controls.originating_department`
- `change_controls.rationale`
- `change_controls.impact_assessment`
- `change_controls.affected_departments`
- `change_controls.qa_owner_id`
- `change_controls.status`
- `change_controls.submitted_at`
- `change_controls.screened_at`
- `change_controls.closed_at`
- `change_controls.rejected_at`
- `change_controls.rejection_reason`

Add child table:

```text
change_control_documents
```

Suggested columns:

- `id`
- `change_control_id`
- `document_id`
- `document_number`
- `document_title`
- `document_level`
- `document_type`
- `department`
- `old_revision`
- `new_revision`
- `old_file_url`
- `new_file_url`
- `reason_for_change`
- `review_status`
- `training_required`
- `training_deadline`
- `training_status`
- `effective_date`
- `created_at`
- `updated_at`

Add sequence or function:

```text
generate_change_control_number()
```

Recommended output:

```text
CC/QA/YYYY/NNNN
```

## Phase 2 - Status Model

Use a clear status model:

```text
draft
submitted
qa_screening
clarification_requested
approved_for_document_work
documents_in_review
signatures_pending
pending_reconciliation
pending_training
effective
closed
rejected
```

Each status transition must write to `audit_log`.

## Phase 3 - Department Request UI

Build `/requests/change-control`.

Views:

- My Change Controls
- Draft
- Submitted
- Clarification Requested
- Active/In Progress
- Closed

Build `/requests/change-control/new`.

Form fields:

- Change title
- Originating department
- Rationale
- Impact assessment
- Affected departments
- Proposed affected documents
- New document required yes/no
- Supporting attachments
- Requested implementation timeline

Submission creates:

- `change_controls` row
- child affected-document rows where known
- Pulse alert to QA
- audit log entry

## Phase 4 - QA Change Control Hub

Build `/requests/hub/change-control`.

Tabs:

- New
- Clarification
- In Review
- Signatures
- Reconciliation
- Training
- Closed
- Rejected

QA table columns:

- CC Number
- Title
- Requester
- Department
- Affected departments
- Affected documents count
- Status
- Age
- Due date
- Owner

QA actions:

- screen
- approve for document work
- request clarification
- reject
- assign QA owner
- set deadline

## Phase 5 - Change Control Detail Page

Build detail page for department and QA views.

Sections:

- Summary
- Rationale and impact
- Affected documents
- Review comments
- Signatories
- Reconciliation
- Training
- Effective date release
- Audit history

Affected document panel:

- add existing SOP/document
- add proposed new document
- upload old/new file where applicable
- show old revision and proposed new revision
- show review status
- show effective date

## Phase 6 - SOP Workflow Integration

Update SOP submission/revision flow:

- New document or revision can be tied to an existing Change Control.
- If no Change Control exists, user can create/request one first.
- SOP update should not silently create an isolated CC unless QA chooses a one-document CC path.
- SOP detail shows linked Change Control number.
- SOP revision history includes CC number and approval/effective dates.

## Phase 7 - Signatures And Reconciliation

Move signature package to the Change Control parent.

Required behavior:

- signatories are snapshotted at assignment time
- signatories sign the Change Control package
- signatures are immutable
- waivers require admin/QA-authorized reason
- when all signatures complete, status moves to `pending_reconciliation`

Reconciliation:

- QA confirms old controlled copies have been retrieved or reconciled
- QA enters reconciliation note
- audit entry is written
- documents can proceed to training/effective-date release

## Phase 8 - Training Gate

For each affected document:

- QA marks training required yes/no
- if training required, calculate 15 working day deadline
- link or create training module
- track completion threshold
- block effective date until threshold is met

QA hub should show:

- documents awaiting training setup
- documents with incomplete training
- documents ready for effective date

## Phase 9 - Reports

Add reports:

- Change Control Register
- Open Change Controls
- Overdue Change Controls
- Signature Status by Change Control
- Reconciliation Log
- Change Control Document Impact Report
- Revision History by Change Control Number

Update existing reports:

- SOP Change History
- Audit Trail
- Documents Due for Review
- Training Log

## Phase 10 - Dashboard And Pulse

Dashboard KPIs:

- Open Change Controls
- Awaiting QA Screening
- Awaiting Department Response
- Awaiting Signatures
- Awaiting Reconciliation
- Awaiting Training
- Overdue Change Controls

Pulse events:

- CC submitted
- clarification requested
- approved for document work
- document review assigned
- signature required
- signatures complete
- reconciliation required
- training required
- effective date ready
- CC closed

## Efficiency Recommendations

Build in this order:

1. Database parent/child model and CC number generation.
2. Requests sidebar dropdown and department request screen.
3. Request Hub dropdown and QA Change Control Hub.
4. Change Control detail page with affected documents.
5. SOP revision flow linked to Change Control.
6. Signature and reconciliation package at CC level.
7. Training/effective-date gate per affected document.
8. Reports, dashboard, and Pulse refinements.

This order gives real users a working process early while avoiding a risky full rewrite of SOP approvals all at once.

## Acceptance Criteria

The implementation is complete when:

- a department user can submit a numbered Change Control request
- QA receives the request in Change Control Hub
- one Change Control can hold multiple affected documents
- each affected document can carry old revision, new revision, and file references
- QA can approve, reject, or request clarification
- signatories can sign at the Change Control package level
- QA can confirm reconciliation before activation
- training can block effectiveness where required
- affected documents show the same CC number in revision history
- reports and audit trail can filter by CC number
- sidebar navigation shows Change Control as dropdown items under Requests and Request Hub
