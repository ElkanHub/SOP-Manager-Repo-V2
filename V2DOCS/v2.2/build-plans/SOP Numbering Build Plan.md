# SOP Numbering Build Plan

## Objective

Implement structured, tenant-ready SOP numbering for Level II SOP documents only, using the agreed format:

```text
{DEPT}/SOP/{SEQ}
```

Default rendered example:

```text
QA/SOP/007
```

Existing SOPs will be converted. Future SOP numbers will be generated and validated by the system, not typed freely by users.

## Guiding Principles

- Apply strict numbering only to Level II SOPs in this phase.
- Preserve existing legacy SOP numbers for traceability.
- Generate numbers server-side/database-side to prevent duplicates.
- Make department codes and numbering format configurable for future tenancy.
- Do not create false lifecycle controls for Level III and IV documents until those document types have their own platform spaces.
- Revisions keep the same SOP number and only increment revision `00`, `01`, `02`.

## Phase 1 - Schema and Configuration

### 1. Add Department Codes

Add a `code` column to `departments`.

Recommended constraints:

- Not null after backfill
- Unique
- Uppercase
- 2 to 10 characters
- No spaces
- No slash characters
- Pattern: `^[A-Z0-9]+$`

Backfill known departments with reasonable default codes:

| Name Match | Code |
| --- | --- |
| Quality Assurance / QA | QA |
| Quality Control / QC | QC |
| Production | PROD |
| Engineering | ENG |
| Warehouse | WH |
| Human Resources / HR | HR |
| Maintenance | MNT |
| Regulatory | REG |

If a department cannot be mapped confidently, generate a temporary uppercase abbreviation and surface it in Settings for admin review.

### 2. Add Numbering Settings

Create `document_numbering_settings`.

Initial fields:

- `id uuid primary key`
- `document_type text not null default 'SOP'`
- `format_template text not null default '{DEPT}/SOP/{SEQ}'`
- `sequence_padding int not null default 3`
- `sequence_scope text not null default 'department_document_type'`
- `is_active boolean not null default true`
- `created_at timestamptz`
- `updated_at timestamptz`

Future tenant-ready field:

- `organization_id uuid`

Do not require tenancy to be live now, but design the table so it can accept organization scoping later.

### 3. Add Sequence Table

Create `document_number_sequences`.

Initial fields:

- `id uuid primary key`
- `department_code text not null`
- `document_type text not null`
- `last_sequence int not null default 0`
- `created_at timestamptz`
- `updated_at timestamptz`

Unique key:

```text
department_code + document_type
```

Future tenant-ready key:

```text
organization_id + department_code + document_type
```

### 4. Add Legacy Number Field

Add to `sops`:

- `legacy_sop_number text`
- `document_type text not null default 'SOP'`

For this phase, `document_type = 'SOP'` for Level II records.

## Phase 2 - Database Functions and Validation

### 1. Generate Next SOP Number

Add a function:

```text
generate_next_sop_number(p_department_name text)
```

Responsibilities:

- Resolve department code from department name.
- Load active numbering setting.
- Increment the sequence atomically.
- Render the configured template.
- Return the generated number.

Default result:

```text
QA/SOP/001
```

### 2. Preview Next SOP Number

Add a read-only function:

```text
preview_next_sop_number(p_department_name text)
```

Responsibilities:

- Resolve department code.
- Read current sequence without incrementing.
- Render the next number preview.

This is used by the UI only.

### 3. Validate SOP Number

Add a validation function:

```text
is_valid_sop_number(p_sop_number text)
```

For the default format, it should validate:

```text
^[A-Z0-9]+/SOP/[0-9]{3,}$
```

The validation should ultimately be generated from the active numbering setting, but a strict default validation is acceptable for this first implementation.

### 4. Enforce Validation

For Level II SOPs:

- `document_level = 'level_2'`
- `document_type = 'SOP'`
- `sop_number` must match the configured SOP numbering format.

For non-Level-II records:

- Do not enforce new format yet.
- Do not create false numbering rules for future document types.

## Phase 3 - Convert Existing SOPs

### 1. Identify Convertible Records

Convert records where:

```text
document_level = 'level_2'
```

or where `document_level` is null/legacy but the record is clearly used as an SOP.

### 2. Preserve Legacy Values

Before changing each value:

```text
legacy_sop_number = sop_number
```

### 3. Convert by Department

For each department:

1. Sort existing SOPs by current `sop_number`, then `created_at`.
2. Assign sequential values per department.
3. Render the new number using the active format.

Example:

```text
SOP-001 -> QA/SOP/001
SOP-002 -> QA/SOP/002
SOP-014 -> PROD/SOP/001
```

### 4. Audit Conversion

Insert an `audit_log` record for the conversion batch.

Metadata should include:

- count converted
- affected departments
- old number to new number mapping
- actor or migration marker

## Phase 4 - SOP Creation Flow

### 1. Update SOP Upload Modal

Replace free-text SOP Number for new SOPs with:

- Department selector
- Document level selector
- Auto-generated SOP number preview

For Level II:

- Preview the next number.
- Disable manual editing for ordinary users/managers.

For revisions:

- Preserve existing SOP number.
- Do not generate a new number.

### 2. Admin Override

If needed, QA/Admin may override the generated number.

Override must:

- Still pass validation
- Still be unique
- Be audit logged with reason

This can be deferred if not immediately needed.

### 3. Update Server Action

In `submitSopForApproval`:

- Stop trusting client-provided `sopNumber` for new Level II SOPs.
- Generate the SOP number server-side.
- Preserve existing SOP number for revisions.
- Reject new Level II SOP creation if the department has no valid code.

## Phase 5 - Settings UI

### 1. Department Settings

Update Settings -> Departments:

- Department Name input
- Department Code input
- Helper text explaining the code usage

Suggested helper text:

```text
Department codes are used in controlled SOP numbers, such as QA/SOP/007. Use stable abbreviations like QA, QC, PROD, or ENG. Changing a code does not automatically rename already-issued SOPs.
```

Validation:

- Required
- Uppercase
- Unique
- No spaces
- No slashes

### 2. Numbering Settings

Add a settings section:

- SOP Number Format
- Sequence Padding
- Preview

Default:

```text
{DEPT}/SOP/{SEQ}
```

Preview:

```text
QA/SOP/007
```

Token guidance:

- `{DEPT}`
- `{TYPE}`
- `{SEQ}`
- `{YYYY}`
- `{YY}`

For this phase, lock document type to `SOP` even if `{TYPE}` support is included internally.

## Phase 6 - App-Wide Display and Reporting

Update any UI that displays `sop_number` so it consistently represents the controlled SOP number.

Known affected surfaces:

- SOP Library table
- SOP detail page
- SOP Master Index
- Approvals queue
- Approval detail page
- Change Control detail
- Change Control request package
- Reports
- Global search
- Equipment-linked SOP display
- Training-linked SOP display
- Messaging/reference picker

Most of these already read `sop_number`; the main requirement is ensuring converted/generated numbers are used everywhere.

## Phase 7 - Change Control Alignment

Change Control package documents should use the standardized Level II SOP number.

For this phase:

- `change_control_documents.document_number` should store the SOP number for linked SOPs.
- Manual document entries should be validated only if they are marked as Level II SOP.
- A change to an attached Level III/IV format still references the parent Level II SOP number.

Reason for change should clarify if the actual operational change is to an attached form/logbook/template inside the SOP package.

## Phase 8 - Verification

Minimum verification:

1. TypeScript check:

```text
npx tsc --noEmit
```

2. Migration dry run:

```text
npx supabase db push --dry-run
```

3. Targeted manual checks:

- New SOP preview shows structured number.
- New SOP creation uses generated number.
- Duplicate number cannot be created.
- Existing SOPs are converted.
- Legacy number is preserved.
- Master Index sorts converted SOPs correctly.
- Change Control references converted SOP numbers.
- Reports/search still locate converted SOPs.

## Deferred Work

Do not implement in this phase:

- Controlled copy number generation: `YY/DC/NNNN`
- Logbook numbering: `LOG/XX/DC/YYYY`
- Independent Level III/IV document records
- Form/logbook/work-instruction registers
- Separate approval flows for non-SOP document classes

These should be addressed after the platform defines first-class spaces for those documents.
