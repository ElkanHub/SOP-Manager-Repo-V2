# QMS-MANAJA Tenancy and Feature Packaging Strategy

## Purpose

This document captures the recommended strategy for turning QMS-MANAJA from a single-client industrial compliance platform into a multi-tenant SaaS product with clear commercial packaging.

The goal is to protect the strength of what has already been built while creating a sales model that is easy for clients to understand, easy for the team to maintain, and flexible enough for different organization sizes.

## What We Have Built

QMS-MANAJA has already moved beyond a simple SOP repository. The current platform contains the foundation of a full operational Quality Management System:

- Controlled SOP library
- SOP approval workflow
- HOD and QA review process
- Master Index
- Structured Level II SOP numbering
- Department codes
- Change control lifecycle
- Multi-document change control direction
- Audit trail
- Digital signatures
- User roles and department scoping
- Dashboard KPIs
- Training tracking foundations
- Equipment and preventive maintenance tracking
- Request hub and forms direction
- PWA/mobile-friendly access
- Notifications and Pulse items

The value is not just that users can upload SOPs. The value is that the system is starting to enforce how regulated work should move: documents are numbered, reviewed, approved, changed, trained on, tracked, and audited.

That is what should be sold.

## Tenancy Recommendation

The recommended approach is a single codebase with tenant-isolated data.

Each subscribing organization should become a tenant. A tenant represents one company, site group, or regulated operating unit. Every tenant should have its own configuration, users, departments, numbering rules, records, workflows, and feature entitlements.

### Core Tenant Tables

The system should introduce a tenant identity layer:

- `tenants`
- `tenant_memberships`
- `tenant_settings`
- `tenant_feature_entitlements`

Most operational tables should receive a `tenant_id`, including:

- `profiles`
- `departments`
- `sops`
- `sop_versions`
- `sop_approval_requests`
- `change_controls`
- `change_control_documents`
- `document_numbering_settings`
- `document_number_sequences`
- `equipment`
- `pm_tasks`
- `training_modules`
- `training_assignments`
- `training_attempts`
- `request_forms`
- `request_form_submissions`
- `pulse_items`
- `audit_log`

This allows all tenants to run on the same application while keeping their data separated by database policy and application logic.

### Why Shared Infrastructure First

A shared infrastructure model is the best starting point because it keeps operations efficient:

- One codebase to deploy
- One product roadmap
- One security model
- One billing model
- Easier support and onboarding
- Faster rollout of features

For high-value enterprise clients, the same codebase can later support dedicated deployments if required by contract, data residency, or internal IT policy.

### Tenant Isolation Rules

Tenant isolation should not depend on UI hiding alone. It should be enforced at multiple levels:

- Database row-level security must scope data by `tenant_id`.
- Server actions must validate the authenticated user tenant.
- Storage paths should include tenant identifiers.
- Audit logs must record tenant context.
- Feature access must be checked before protected actions run.

The UI can hide unavailable features, but the server must still enforce the restriction.

## Tenant Configuration

Each tenant should be able to configure key operational settings without code changes.

Recommended tenant settings:

- Organization name
- Logo and brand color
- Default timezone
- Date format
- Department list
- Department document codes
- SOP numbering format
- Change control numbering format
- Default retention period
- Default review cycle
- QA department designation
- Notification defaults
- Enabled modules
- Storage limits
- User limits

The department code work already moves the product in the right direction. Department names remain human-readable, while codes become controlled document identity values.

## Feature Entitlements

Feature packaging should be explicit in the database.

Recommended structure:

- `features`
- `plans`
- `plan_features`
- `tenant_feature_entitlements`

Each feature should have:

- Feature key
- Display name
- Description
- Category
- Whether it is billable
- Whether it is included in a plan
- Whether it can be sold as an add-on

Example feature keys:

- `sop_library`
- `sop_approvals`
- `document_numbering`
- `master_index`
- `change_control_basic`
- `change_control_multi_document`
- `training_compliance`
- `equipment_pm`
- `request_forms`
- `ai_delta_summary`
- `ai_risk_insights`
- `advanced_reports`
- `controlled_copies`
- `auditor_portal`
- `api_access`
- `white_label_branding`

This lets the app grow without hardcoding every pricing decision into the UI.

## What Should Stay Basic

The basic package should include the minimum product experience that makes QMS-MANAJA a real QMS and not just a document folder.

Recommended Basic package:

- User accounts
- Departments
- Department codes
- SOP Library
- SOP upload
- HOD/QA approval flow
- Master Index
- Structured SOP numbering
- Basic revision tracking
- Basic one-document change control
- Audit trail
- Dashboard core KPIs
- Basic notifications
- Settings and admin basics
- PWA access

These should stay basic because they define the core product. If SOP Library, approvals, numbering, or Master Index are locked behind premium plans, the platform will feel incomplete.

Basic should be strong enough for a small company to run document control properly.

## What Should Be Premium

Premium features should be the features that save significant time, reduce compliance risk, support larger operations, or replace manual QA work.

Recommended premium areas:

- Multi-document change control
- Advanced change control lifecycle
- Training compliance
- Equipment and preventive maintenance
- Advanced request hub
- AI document support
- Advanced reporting
- Controlled copy management
- Retention and destruction workflows
- Auditor portal
- Multi-site governance
- Integrations and API access
- White-label branding
- Enterprise security features

Premium should not feel like arbitrary restriction. It should feel like higher operational power.

## Recommended Packaging Strategy

The best commercial model is a hybrid of tiers and add-ons.

Tiers make buying simple. Add-ons let clients expand without forcing them into an oversized plan.

## Proposed Tier Model

### 1. Core QMS

Target clients:

- Small manufacturers
- Small labs
- Startups preparing for compliance
- Companies moving away from spreadsheets and shared folders

Included:

- SOP Library
- SOP approvals
- Department setup
- Department codes
- SOP numbering
- Master Index
- Basic change control
- Basic dashboard
- Audit trail
- Notifications
- PWA access

Value statement:

Core QMS gives the client a controlled, auditable SOP system with formal approvals and a live Master Index.

### 2. QMS Professional

Target clients:

- Growing regulated companies
- Manufacturing sites with QA oversight
- Companies with recurring SOP changes
- Clients that need training and PM tracking

Included:

- Everything in Core QMS
- Multi-document change control
- Training compliance module
- Equipment registry
- Preventive maintenance tracking
- Request hub
- Advanced dashboard views
- Enhanced reports

Value statement:

QMS Professional connects document control to real operational execution: change controls, training, equipment, and PM are tracked in one system.

### 3. QMS Enterprise

Target clients:

- Multi-site companies
- Larger manufacturers
- Clients with external auditors
- Organizations needing integrations or stronger governance

Included:

- Everything in Professional
- Multi-site controls
- Auditor portal
- Advanced report exports
- Controlled copy management
- Retention and destruction workflow
- API/integration access
- White-label branding
- Advanced security options
- Priority support

Value statement:

QMS Enterprise turns QMS-MANAJA into a governance platform for regulated organizations with multiple teams, sites, auditors, and operational controls.

## Add-On Strategy

Add-ons should be used for high-value capabilities that not every client needs.

Recommended add-ons:

### AI Compliance Assistant

Features:

- SOP delta summaries
- AI risk insights
- Training slide generation
- Questionnaire generation
- Document comparison support

Why add-on:

AI has direct compute cost and high perceived value. It should not be bundled into every low-cost plan.

### Equipment and PM Pack

Features:

- Equipment registry
- PM schedules
- PM completion logs
- PM compliance KPIs
- Equipment-linked SOPs

Why add-on:

Some clients only need document control. Others need operational maintenance tracking. This is a clear upsell.

### Training Compliance Pack

Features:

- Training modules
- Assignments
- Questionnaires
- Completion logs
- Training overdue alerts
- Training reports

Why add-on:

Training is a major compliance burden and has strong business value.

### Advanced Change Control Pack

Features:

- Multi-document change control
- QA screening
- Clarification requests
- Signatory tracking
- Reconciliation
- Closure records

Why add-on:

Basic clients can manage simple SOP changes. Larger clients will pay for a full change control package.

### Advanced Reporting Pack

Features:

- Exportable audit reports
- SOP change history reports
- Training reports
- PM reports
- Request reports
- Custom date filters

Why add-on:

Reports are often needed for management review and audits, which makes them high-value.

### Auditor Portal

Features:

- Read-only external auditor access
- Scoped evidence packs
- Time-limited access
- Export restrictions
- Audit activity tracking

Why add-on:

External access increases security responsibility and creates strong audit value.

## Suggested Commercial Structure

The most practical launch strategy:

### Core Subscription

Charge by organization and active user count.

Example:

- Base platform fee
- Included number of users
- Extra active users billed monthly

### Tier Upgrade

Clients can move from Core to Professional or Enterprise when their operation becomes more complex.

### Add-On Modules

Clients can add specific modules without changing their entire plan.

Example:

- Core QMS plus Training Compliance
- Core QMS plus Equipment and PM
- Professional plus AI Compliance Assistant

### Enterprise Custom Pricing

For larger clients:

- Annual contract
- Onboarding fee
- Data migration fee
- Dedicated support
- Optional dedicated deployment

## Sales Positioning

The product should not be sold as software that stores documents.

It should be sold as:

> A controlled compliance operating system for SOPs, change control, training, equipment, PM, and audit readiness.

Main value pillars:

### 1. Audit Readiness

Clients can show who created, reviewed, approved, trained on, changed, and acknowledged controlled documents.

### 2. Process Control

Workflows are not left to memory. SOPs, change controls, training, and PM tasks follow a structured process.

### 3. Reduced QA Burden

QA gets centralized visibility instead of chasing emails, spreadsheets, and scattered document folders.

### 4. Operational Accountability

Departments can see what is pending, overdue, approved, effective, or blocked.

### 5. Scalable Compliance

The system can grow from one site to multiple sites, with tenant-specific settings and package-based expansion.

## How To Sell Each Package

### Core QMS Pitch

"Move your SOPs out of folders and spreadsheets into a controlled, auditable approval system with a live Master Index."

Best for:

- First-time digital QMS clients
- Cost-sensitive clients
- Small regulated teams

### Professional Pitch

"Connect document control to actual execution: change control, training, equipment, PM, and QA requests in one system."

Best for:

- Clients with QA teams
- Clients with equipment-heavy operations
- Clients failing audits due to disconnected records

### Enterprise Pitch

"Govern compliance across sites, teams, auditors, and controlled records with advanced security and reporting."

Best for:

- Multi-site clients
- Clients with external audits
- Clients needing integration or custom workflows

## Implementation Strategy

### Phase 1: Tenant Foundation

- Add `tenants`
- Add `tenant_memberships`
- Add tenant settings
- Add `tenant_id` to core tables
- Backfill existing data to one tenant
- Update RLS policies
- Update server actions
- Update storage paths

### Phase 2: Feature Entitlements

- Add feature registry
- Add tenant feature entitlements
- Add plan definitions
- Add UI feature gating
- Add server-side entitlement checks

### Phase 3: Package UI

- Add tenant admin billing/package screen
- Show enabled modules
- Show locked premium modules in a non-disruptive way
- Add "Request upgrade" actions
- Add internal admin controls for enabling packages

### Phase 4: Sales and Onboarding Support

- Tenant setup wizard
- Department import
- User import
- SOP import
- Numbering setup
- Logo/branding setup
- Initial package assignment

## Important Product Rule

Do not make the core process feel broken for Basic users.

Basic users should still be able to run document control properly. Premium should add depth, automation, and operational reach.

## Recommended Final Position

Use tiers for clarity:

- Core QMS
- QMS Professional
- QMS Enterprise

Use add-ons for flexible growth:

- AI Compliance Assistant
- Training Compliance
- Equipment and PM
- Advanced Change Control
- Advanced Reporting
- Auditor Portal

This gives the platform a clean entry point, a strong upgrade path, and enough flexibility to serve real-world regulated organizations without turning the product into a confusing menu of disconnected features.

