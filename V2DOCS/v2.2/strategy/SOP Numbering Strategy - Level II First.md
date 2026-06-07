# SOP Numbering Strategy - Level II First

## Purpose

This document records the agreed approach for applying the document numbering requirement from `SOP Process Consolidation - What Needs to Change in SOP-Guard Pro.md`, point 1, without overextending the current platform beyond the document classes it actually controls today.

## Source Requirement

The process consolidation document states that controlled documents should use a structured numbering system:

- SOP format: `QA/SOP/007`
- Meaning: Department Code / Document Type / Sequential Number
- Controlled copy format: `YY/DC/NNNN`
- Logbook format: `LOG/XX/DC/YYYY`

The same document also defines a four-level hierarchy:

- Level I: Quality Manual and Policies
- Level II: SOPs and Protocols
- Level III: Work Instructions, Specifications, Methods
- Level IV: Records, Forms, Logs

## Current Platform Reality

The app currently treats controlled documents primarily as SOP records. Even though the schema now has `document_level`, the platform does not yet provide first-class lifecycle spaces for Level III and Level IV documents such as work instructions, forms, records, and logbooks.

In the real QMS, many Level III and Level IV formats are attached to or referenced by a Level II SOP. For this platform phase, those linked formats are treated as part of the SOP package, not independent controlled records.

## Agreed Decision

Apply structured numbering now only to Level II SOPs.

The standard format for this phase is:

```text
{DEPT}/SOP/{SEQ}
```

Examples:

```text
QA/SOP/001
QC/SOP/002
PROD/SOP/003
ENG/SOP/004
```

Level III and Level IV formats, logs, and records will not be given their own independent platform numbering workflow yet. When a linked format or logbook attached to an SOP changes, the controlled platform change is still treated as a revision to the Level II SOP package.

## Why This Is the Correct Scope

This avoids creating the appearance that the app fully controls forms, logbooks, work instructions, and records when it does not yet have dedicated registers, workflows, approvals, retention rules, or issuance tracking for those document types.

From a compliance standpoint, it is safer to strictly control the document class the app actually manages today: Level II SOPs.

Future phases can introduce dedicated spaces for:

- Forms and formats
- Logbooks
- Work instructions
- Specifications
- Records
- Controlled copy issuance

At that point, those document classes can receive their own numbering rules and lifecycle controls.

## Department Codes

Department names and department codes must be separate.

Example:

| Department Name | Department Code |
| --- | --- |
| Quality Assurance | QA |
| Quality Control | QC |
| Production | PROD |
| Engineering | ENG |
| Warehouse | WH |
| Human Resources | HR |

The department name is for human-readable UI. The department code is used in controlled document numbering.

Department codes should be:

- Required before creating a new Level II SOP in that department
- Uppercase
- Unique
- Stable
- 2 to 6 characters where possible
- Letters and numbers only
- No spaces
- No slashes

Changing a department code must not silently rename already-issued SOP numbers.

## Tenant-Ready Numbering Configuration

Because the platform will later support multiple organizations, the numbering format should not be hardcoded permanently.

The default SOP numbering format should be configurable in Settings:

```text
{DEPT}/SOP/{SEQ}
```

Supported tokens for this phase:

| Token | Meaning |
| --- | --- |
| `{DEPT}` | Department code |
| `{TYPE}` | Document type code, currently `SOP` |
| `{SEQ}` | Sequential number |
| `{YYYY}` | Four-digit year, reserved for future use |
| `{YY}` | Two-digit year, reserved for future use |

Even though the setting is flexible, the recommended and default format for the current client remains:

```text
{DEPT}/SOP/{SEQ}
```

The sequence padding should default to `3`, producing values such as:

```text
001
002
003
```

## Existing SOP Conversion

Existing SOPs should be converted to the new format.

The old value should be preserved in a legacy field so there is traceability.

Example:

| Old SOP Number | Department | New SOP Number |
| --- | --- | --- |
| SOP-001 | QA | QA/SOP/001 |
| SOP-014 | Production | PROD/SOP/001 |

The conversion should be logged in the audit trail.

The sequence should be generated per department and document type, not globally.

## Rule for Future Revisions

New revisions must keep the same SOP number.

Only the revision changes:

```text
QA/SOP/007 Rev. 00
QA/SOP/007 Rev. 01
QA/SOP/007 Rev. 02
```

The SOP number identifies the controlled document. The revision identifies the version of that document.

## Deferred Scope

The following are intentionally deferred:

- `YY/DC/NNNN` controlled copy numbering
- `LOG/XX/DC/YYYY` logbook numbering
- Independent Level III and Level IV document numbering
- Form/logbook/work-instruction registers
- Independent lifecycle workflows for non-SOP controlled documents

These should be handled when the platform introduces first-class document spaces for those document types.
