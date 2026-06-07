# QMS-MANAJA AI SOP Builder Strategy

## Purpose

This document defines the proposed AI SOP Builder feature for QMS-MANAJA.

The feature will allow organizations to generate SOP drafts through a guided, human-in-the-loop AI process. It is intended to complete the value of the platform by helping businesses create SOPs before those SOPs enter document control, approval, change control, training, and audit workflows.

The feature should be treated as a premium AI package.

## Product Value

QMS-MANAJA already helps organizations control SOPs after they exist:

- SOP Library
- Master Index
- SOP numbering
- HOD/QA review
- Approval workflow
- Change control
- Training tracking
- Audit trail

The AI SOP Builder adds value before document control begins.

It helps organizations:

- Create SOP drafts faster
- Use a consistent SOP structure
- Follow their own company format
- Get AI-guided clarification questions
- Revise drafts through comments and feedback
- Export a Word document
- Later submit the generated SOP into the controlled approval workflow

The key sales message:

> QMS-MANAJA does not only control SOPs. It helps organizations create better SOPs, revise them with AI, and move them into formal approval when ready.

## Feature Name Options

Possible names:

- AI SOP Builder
- SOP Drafting Assistant
- SOP Generator
- QMS-MANAJA SOP Agent
- Controlled SOP Builder

Recommended name:

**AI SOP Builder**

This name is clear, premium, and easy for clients to understand.

## Core Concept

The AI SOP Builder should not be a blank text editor.

Instead, it should be an interactive drafting workflow:

1. User starts a new SOP generation session.
2. User provides the SOP objective, purpose, process area, department, scope, and known requirements.
3. The AI agent reviews the information.
4. The agent asks clarification questions if required.
5. The agent generates an SOP draft.
6. The draft is converted into a Word document.
7. The Word document is displayed using the existing SOP read/view experience.
8. The user comments on the document to request changes.
9. The AI agent uses those comments as revision instructions.
10. The agent generates a revised Word document.
11. The user repeats the review/revision cycle until satisfied.
12. The user downloads the Word file.
13. Optionally, the user can submit the final draft into the controlled SOP approval workflow.

This makes SOP creation guided, structured, and interactive.

## Important Compliance Boundary

The AI SOP Builder must generate **draft SOPs only**.

It must not automatically create an approved or effective SOP.

A generated SOP becomes controlled only after it enters the normal approval process:

- HOD review if required
- QA review
- Approval
- Effective date
- Training if required
- Audit logging

This protects the compliance model.

## Company SOP Template Requirement

Organizations should be able to upload an empty SOP template document.

This template should represent how the company wants its SOPs to look.

Examples of template content:

- Company logo
- Header layout
- Footer layout
- Title page style
- Table layout
- Section numbering style
- Heading hierarchy
- Revision table format
- Approval/signature table format
- Document metadata fields
- Page numbering
- Font styles
- Spacing
- Company-specific wording

The AI SOP Builder should use this uploaded document as the tenant's SOP formatting template.

## Why Template Upload Matters

Different organizations format SOPs differently.

One company may use:

- Numbered section headings
- Logo in the top-left
- Department and SOP number in the header
- Approval table on page one

Another company may use:

- Large title page
- Different section names
- Different footer fields
- Different revision-history table

If the AI generates plain text without respecting company format, the user still has to spend time reformatting the document.

The template feature solves that problem.

The agent should generate SOP content into the tenant's preferred SOP layout.

## Template Handling

Each tenant should be able to manage SOP templates.

Recommended features:

- Upload SOP template `.docx`
- Name the template
- Mark one template as default
- Preview template metadata
- Replace template
- Archive old templates
- Track who uploaded the template
- Track when the template was updated
- Use default template for new SOP generations

Recommended tenant template records:

- Template name
- Template file path
- Template version
- Default template flag
- Uploaded by
- Uploaded date
- Status: active, archived
- Notes

## Template Validation

When a tenant uploads an SOP template, the system should validate it.

Validation should check:

- File is `.docx`
- File is not corrupted
- File size is within limit
- File can be parsed
- Required placeholders are present if placeholders are used
- Header/footer can be read
- Document can be regenerated safely

If validation fails, the user should receive a clear message.

## Template Placeholders

The platform may support placeholders inside templates.

Possible placeholders:

- `{{SOP_TITLE}}`
- `{{SOP_NUMBER}}`
- `{{DEPARTMENT}}`
- `{{DOCUMENT_LEVEL}}`
- `{{VERSION}}`
- `{{EFFECTIVE_DATE}}`
- `{{PURPOSE}}`
- `{{SCOPE}}`
- `{{RESPONSIBILITIES}}`
- `{{PROCEDURE}}`
- `{{RECORDS}}`
- `{{REFERENCES}}`
- `{{REVISION_HISTORY}}`

However, placeholders should not be required in the first version if they slow the build down.

The first version can use the uploaded template as a style/layout reference and insert generated SOP sections into a known body area.

## SOP Agent Word Document Skill Requirement

The SOP agent should not only generate text.

It must use a dedicated Word-document generation and editing workflow.

The agent should rely on a specific Word-document skill/instruction file, similar to a `SKILLS.md` or agent skill file, that defines how to:

- Read `.docx` files
- Preserve document structure
- Preserve heading styles
- Preserve tables
- Preserve headers and footers
- Insert generated content into the correct sections
- Update placeholders
- Create revision tables
- Create procedure tables where needed
- Export clean `.docx` files
- Avoid corrupting Word documents
- Keep formatting consistent across revisions

This is important because the quality of the Word output is part of the value of the feature.

The model should not be trusted to manually invent document formatting every time. The system should have a consistent document-building harness that uses the tenant template and controlled document-generation rules.

## Agent Harness Recommendation

The feature should use a custom SOP Agent harness.

The harness is not a custom AI model. It is the workflow layer around the model.

The harness should manage:

- User intake
- Clarification questions
- SOP outline creation
- Draft generation
- Template selection
- Word document generation
- Document preview
- User comments
- AI revision instructions
- Draft version history
- Export/download
- AI usage tracking
- Tenant feature entitlement checks
- Tenant AI credit usage

The AI model should be connected through this harness.

This gives the app control over the process instead of relying on one loose AI prompt.

## Why We Need Our Own Harness

A simple AI prompt is not enough because the feature needs:

- A repeatable SOP process
- Tenant-specific templates
- Proper Word files
- Revision history
- Human comments
- AI chat clarification
- Downloadable files
- AI cost tracking
- Tenant package enforcement
- Optional submission into controlled approval

The model generates content. The harness turns that content into a reliable product workflow.

## Main User Workflow

### Step 1: Start SOP Builder

User selects:

- Department
- SOP title or working title
- Process area
- SOP purpose
- SOP objective
- Intended users
- Equipment involved
- Materials involved
- Risks or hazards
- Records/forms involved
- Regulatory or internal references
- Preferred SOP template

### Step 2: AI Clarification

The agent reviews the intake.

If information is missing, the agent asks questions.

Example questions:

- What is the start and end point of this process?
- Who is responsible for performing this task?
- Who verifies completion?
- Are there safety risks?
- Are there required records or logbooks?
- Are there acceptance criteria?
- What happens if the process fails?

The user answers in a chat interface.

### Step 3: SOP Outline

The agent generates an outline first.

The user can approve or adjust the outline before full drafting.

This avoids generating a long document in the wrong direction.

### Step 4: Draft Generation

The agent generates the full SOP draft.

The draft should follow:

- Tenant SOP template
- Tenant document style
- SOP structure rules
- Controlled wording where needed
- Clear procedural steps
- Responsibilities
- Records and references

### Step 5: Word Document Creation

The system creates a `.docx` file using the selected template.

The generated content should be inserted into the template while preserving:

- Logo
- Header
- Footer
- Styles
- Tables
- Section formatting
- Revision table
- Metadata blocks

### Step 6: SOP Read View Preview

The generated Word file should display using the existing SOP read/view experience.

The user should not have to download the file just to review it.

### Step 7: Comment-Guided Revision

The user highlights or comments on parts of the SOP.

These comments are not normal approval comments. They are instructions to the AI agent.

Examples:

- "Make this step more specific."
- "Add the cleaning frequency here."
- "This responsibility belongs to QA, not Production."
- "Add a warning before this step."
- "Expand this procedure into numbered steps."
- "Make this section match our existing wording."

The agent uses the comments to revise the document.

### Step 8: AI Revision

The agent reads:

- Current draft
- User comments
- Chat instructions
- Tenant template
- SOP structure requirements

Then it generates a revised draft and a new Word file.

Each revision should be saved as a version.

### Step 9: Final Review

The user can review the final document in the read view.

They can either:

- Download the Word file
- Continue revising
- Submit the draft into SOP approval

### Step 10: Download or Submit

Download path:

- User downloads `.docx`
- Document remains a draft/export outside formal control

Submit path:

- User submits generated draft into SOP approval
- The controlled SOP numbering and approval workflow take over
- HOD/QA review applies normally

## Chat Interface Requirement

The SOP Builder should include a chat area.

The chat is used for:

- Agent clarification questions
- User answers
- User instructions
- Agent explanations
- Revision summaries
- Follow-up prompts

The chat should be tied to the SOP generation session.

The agent should be able to say:

- "I need more information before drafting this section."
- "Please confirm who approves this record."
- "I have updated the procedure based on your comments."
- "The template does not contain a revision table. Should I create one?"

## Commenting Feature Reuse

The approval workflow already has a commenting/annotation feature.

That concept should be reused for the SOP Builder, but with a different purpose.

Approval comments:

- Used by HOD/QA to approve or request changes

SOP Builder comments:

- Used by the author to instruct the AI agent

The UI can feel similar, but the backend records should be separate or clearly tagged so approval comments and AI drafting comments are not mixed.

## Data Model Direction

Recommended tables:

- `sop_generation_sessions`
- `sop_generation_messages`
- `sop_generation_drafts`
- `sop_generation_comments`
- `sop_generation_templates`
- `sop_generation_exports`
- `sop_generation_ai_usage`

### `sop_generation_sessions`

Purpose:

Stores the overall SOP Builder session.

Fields:

- tenant ID
- user ID
- department
- title
- purpose
- objective
- status
- selected template ID
- created date
- updated date

Statuses:

- intake
- awaiting_clarification
- outline_ready
- drafting
- draft_ready
- revising
- completed
- exported
- submitted_to_approval
- cancelled

### `sop_generation_messages`

Purpose:

Stores the chat between user and agent.

Fields:

- session ID
- sender: user or agent
- message
- timestamp
- related draft ID if applicable

### `sop_generation_drafts`

Purpose:

Stores each generated SOP draft version.

Fields:

- session ID
- draft version
- outline JSON
- structured SOP content
- Word file path
- preview file path if needed
- generated by model
- created date
- change summary

### `sop_generation_comments`

Purpose:

Stores user comments and AI revision instructions.

Fields:

- session ID
- draft ID
- comment
- quoted text
- section heading
- anchor/hash
- status
- created by
- created date
- resolved by AI revision

### `sop_generation_templates`

Purpose:

Stores tenant SOP templates.

Fields:

- tenant ID
- template name
- file path
- version
- status
- is default
- uploaded by
- uploaded date
- notes

### `sop_generation_exports`

Purpose:

Stores exported Word files.

Fields:

- session ID
- draft ID
- file path
- exported by
- exported date
- export type

### `sop_generation_ai_usage`

Purpose:

Tracks AI usage and cost for the session.

Fields:

- tenant ID
- user ID
- session ID
- model used
- operation type
- input tokens or credits
- output tokens or credits
- estimated cost
- created date

## Template Storage

Tenant templates should be stored securely.

Recommended storage path:

`tenant/{tenant_id}/sop-templates/{template_id}.docx`

Generated drafts:

`tenant/{tenant_id}/sop-builder/{session_id}/draft-{version}.docx`

Exports:

`tenant/{tenant_id}/sop-builder/{session_id}/exports/{export_id}.docx`

This keeps tenant files separated when tenancy is implemented.

## AI Prompt and Agent Behavior

The SOP agent should have a controlled system instruction.

The instruction should tell the agent:

- It is generating draft SOPs only
- It must ask questions when information is missing
- It must follow tenant template structure
- It must avoid inventing critical facts
- It must write clear procedural steps
- It must identify missing records/forms
- It must identify unclear responsibilities
- It must preserve compliance language
- It must produce structured content for Word generation

The prompt should not be the only control. The harness should enforce structure.

## Safety and Quality Controls

The agent should not make unsupported claims.

It should flag uncertainty.

Examples:

- "Please confirm the acceptance criteria."
- "Please confirm the cleaning frequency."
- "Please confirm whether QA or Production owns this record."

The final draft should include a warning that the document is AI-generated and must be reviewed before use.

This warning should not appear in the final downloaded SOP unless the user chooses to include it. It should be shown in the app during review.

## Integration With Existing SOP Workflow

The AI SOP Builder should be separate from controlled SOP approval at first.

Later, it should integrate with SOP submission.

Possible future action:

**Submit to SOP Approval**

When selected:

- The generated Word file is used as the SOP submission file
- The user fills any missing metadata
- Controlled SOP number is generated
- HOD/QA approval flow begins
- The SOP becomes part of formal document control only after approval

## Packaging and Billing

This feature should be premium.

Recommended packaging:

- AI SOP Builder as an add-on
- Included in QMS Professional with limited credits
- Expanded in QMS Enterprise
- Additional usage sold as AI credits

Possible limits:

- SOP generation sessions per month
- AI revisions per SOP
- Word exports per month
- AI credit allowance
- Maximum document length
- Number of active templates

Recommended plan example:

- Core QMS: no AI SOP Builder by default
- Professional: limited AI SOP Builder credits
- Enterprise: higher limits and custom templates
- AI add-on: available for any paid plan

## Feature Entitlement

The module should have a feature key.

Recommended key:

`ai_sop_builder`

Related feature keys:

- `ai_sop_builder_templates`
- `ai_sop_builder_comments`
- `ai_sop_builder_exports`
- `ai_sop_builder_submit_to_approval`

The system should check feature entitlement before allowing:

- Starting a generation session
- Uploading templates
- Requesting AI revisions
- Exporting Word files
- Submitting generated SOPs to approval

## Build Phases

### Phase 1: Basic AI SOP Builder

Scope:

- Guided intake form
- Clarification chat
- SOP outline
- Full SOP generation
- Word document generation
- Download `.docx`
- AI usage tracking

This phase proves the core value.

### Phase 2: Tenant SOP Templates

Scope:

- Upload empty SOP template
- Mark default template
- Validate `.docx`
- Generate SOP using tenant template
- Preserve header/footer/styles where possible

This phase makes the feature more useful for real organizations.

### Phase 3: SOP Read View and Comment-Guided Revisions

Scope:

- Display generated Word file using SOP read view
- Add drafting comments
- Send comments to AI as revision instructions
- Generate revised draft versions
- Show change summary

This phase makes editing fun and human-in-the-loop.

### Phase 4: Submit Generated SOP Into Approval

Scope:

- Submit final draft into SOP approval
- Generate controlled SOP number
- Route to HOD/QA as required
- Preserve generation history as draft history

This phase connects AI creation to formal document control.

### Phase 5: Advanced Organization Knowledge

Scope:

- Use approved SOPs as style/reference examples
- Suggest linked forms/logbooks
- Suggest training requirements
- Suggest risk and safety checks
- Tenant-specific SOP rules

This phase makes the agent more intelligent and more valuable.

## Required Technical Capabilities

The platform will need:

- AI model integration
- Server-side agent harness
- Word document parser/generator
- Template storage
- Generated document storage
- SOP read view integration
- Comment annotation integration
- Chat interface
- Draft versioning
- AI usage tracking
- Tenant feature entitlement checks
- Download/export system

## Questions To Resolve Before Build

1. What should the feature be called in the UI?
2. Should template upload be available in phase 1 or phase 2?
3. Should every tenant have one default SOP template or multiple templates?
4. Should AI SOP Builder be available only to managers and QA, or also employees?
5. Should generated SOPs show a draft watermark in the preview?
6. Should downloaded SOPs include a draft watermark?
7. Should users be able to submit generated SOPs directly into approval in the first release?
8. Should the system require an SOP objective before generation?
9. Should AI ask questions before every generation or only when needed?
10. Should AI credits be consumed per draft, per revision, or per model call?
11. Should template formatting be strict or best-effort in the first version?
12. Should the agent be allowed to reference existing approved SOPs later?
13. Should the agent suggest forms/logbooks that may need to be created later?
14. Should the agent suggest training requirements?
15. Should the agent generate revision history entries for draft versions?

## Recommended Final Direction

Build the AI SOP Builder as a premium, human-in-the-loop drafting module.

The strongest version of the feature should:

- Avoid a normal text editor
- Use guided intake
- Ask clarification questions
- Generate Word documents
- Use the organization's uploaded SOP template
- Preserve the company's document style
- Display drafts in the existing SOP read view
- Reuse comment-style feedback for AI revisions
- Track draft versions
- Allow final Word download
- Later allow submission into controlled SOP approval

This will make QMS-MANAJA more valuable because it will support the full SOP lifecycle: creation, review, approval, control, training, and future change control.

