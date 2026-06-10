# QMS-MANAJA — Platform Strategy Consolidated Reference

**Date:** 2026-06-07  
**Purpose:** Single consolidated reference document combining the tenancy strategy, commercial packaging decisions, and all Admin Console design decisions. Use this as the working foundation for all further platform discussions, build planning, and stakeholder conversations.

---

## Overview

QMS-MANAJA is moving from a single-client compliance platform into a controlled, multi-tenant SaaS product. This document captures the full picture of what that means: the architecture, the business model, the Admin Console structure, the access rules, the billing approach, and the build sequence.

Everything in this document is based on:
- The Tenancy and Feature Packaging Strategy
- The Project Status Report (2026-06-06)
- The Platform Super Admin Console Q&A (answered by the product owner)
- Existing product decisions and architecture already built into the platform

Where answers were deferred with "recommend," the recommended position is stated clearly and flagged. These should be reviewed and confirmed before build begins on that area.

---

## Part 1 — What We Are Building

### 1.1 The Product Position

QMS-MANAJA is not a document storage tool. It is a controlled compliance operating system for regulated industrial organizations. The product enforces how regulated work moves:

> Documents are numbered, reviewed, approved, changed, trained on, tracked, and audited.

That is the core value proposition and the framing that should anchor every sales conversation.

### 1.2 The Architecture Decision

**Single shared codebase. Tenant-isolated data.**

One deployment. One product roadmap. One security model. One billing model. All subscribing organizations run as isolated tenants on the same infrastructure.

Each tenant (called an **Organization** in the UI) is a fully separated operating unit with:
- Its own users and departments
- Its own SOP library, numbering rules, and approval workflows
- Its own configuration and branding settings
- Its own feature entitlements based on its subscription license
- Complete data isolation from every other organization on the platform

This model keeps operations efficient and allows the product to scale without rebuilding for each new client. Enterprise clients with high data residency or contractual requirements can be offered dedicated deployment later using the same codebase.

### 1.3 The Current State

The product is feature-complete in its core compliance workflows:

| Area | Status |
|---|---|
| SOP library and structured numbering (DEPT/SOP/NNN) | Complete |
| HOD and QA approval workflows | Complete |
| Master Index with department filtering | Complete |
| Change control with multi-document direction | In progress |
| Training tracking foundations | In place |
| Equipment and PM tracking | In place |
| Audit trail and digital signatures | In place |
| Dashboard KPIs and Pulse notifications | In place |
| PWA and mobile access | In place |

The platform is now technically ready to begin tenancy architecture work once the current SOP numbering, approval, Master Index, and change-control updates are accepted and stable.

---

## Part 2 — Language and Terminology

These are the confirmed UI terms to use throughout the platform:

| Concept | Term Used in UI |
|---|---|
| The admin control area | **Admin Console** |
| The highest-level account | **Super Admin** |
| Subscribing organizations | **Organization** |
| Client workspaces | **Organization** |
| Subscription packages | **Licenses** *(subject to review)* |
| Optional feature modules | **Add-ons** |
| Internal word for multi-tenancy | Tenant (internal/technical use only) |

Suspended organizations should see a soft message such as **"Your account is temporarily unavailable"** rather than the word "Suspended."

The word "tenant" should never appear in any client-facing UI. All visible references use "Organization."

---

## Part 3 — The Admin Console

### 3.1 What It Is

The Admin Console is the platform control center. It gives the platform owner:
- Full visibility into usage behaviour, performance, and financials
- The ability to manage every organization on the platform
- Control over feature entitlements, licenses, billing, and access
- A surface for onboarding, leads, announcements, and support

It is not a technical settings page. It is a business and operational control center with technical depth where needed.

### 3.2 Separation from Tenant App

The Admin Console is completely separated from the tenant-facing application:

- **Separate area:** The Admin Console lives at its own route (e.g. `/platform` or `/admin`) with its own sidebar and layout. No tenant user can see or access it.
- **Separate login route:** Platform admins log in through a dedicated login route, separate from the tenant user login screen.
- **No shared session:** A platform admin session and a tenant user session are distinct. A platform admin can have a demo/test tenant for testing purposes, but their administrative access is governed by a different identity layer.
- **PWA consideration:** Since the app is PWA-enabled, the separate admin login route must be accessible from the PWA without interference. This needs to be resolved during the routing design — likely through route-based session context rather than separate PWA manifests.

### 3.3 Platform Admin Roles

There are five platform-level roles. All are controlled by the platform owner.

| Role | What They Can Do |
|---|---|
| **Platform Owner** | Absolute access to everything. Only two Platform Owner accounts can exist at most. The primary owner cannot be deactivated by anyone. The secondary owner is designated by the primary. |
| **Super Admin** | Broad platform access controlled by the Platform Owner. Can be granted or restricted on specific areas. |
| **Support Admin** | Can view tenant status and support-related data. Can see billing status but not financial details. Cannot access raw tenant data without impersonation (Phase 2+). |
| **Billing Admin** | Manages billing records, invoices, payment tracking. Access to billing details but not tenant operational data. |
| **Implementation Manager** | Can create organizations, manage onboarding checklists, assign onboarding tasks. |
| **Read-Only Auditor** | View-only access to platform records. Cannot take any actions. |

**Key rules:**
- Only Platform Owners can create other platform admins.
- Only Platform Owners can create or promote Super Admins.
- No other admin role has the privilege to create or promote admin accounts.
- Platform admin accounts have expiry dates and must be invited (not directly created).
- Platform admins cannot deactivate themselves.
- All platform admins must use MFA. Inactive or unverified accounts are blocked.
- Sensitive actions require password re-confirmation.

### 3.4 Admin Console UX

- Shares the visual language of the existing dashboard but is clearly identifiable as a platform admin area
- Denser and more operational than the tenant-facing app
- Desktop-first but usable on mobile
- Own sidebar with clear section grouping
- Tenant context is clearly displayed when viewing any organization record
- Breadcrumbs are required when navigating into tenant-level detail
- Dangerous actions use confirmation modals and require typing the organization name to confirm
- First screen on open: **recommended as a summary dashboard** showing active organizations, recent activity, billing health, usage indicators, and any alerts

---

## Part 4 — Organization (Tenant) Model

### 4.1 What an Organization Represents

For Phase 1: **one organization = one company = one operating site.**

Multi-site support (where one company manages multiple sites under one account) is an Enterprise-tier future feature. Until then, companies with multiple sites are separate organizations unless they share an account.

### 4.2 Organization Identity

Each organization has:
- A unique name (enforced — no duplicates)
- A unique workspace slug (e.g. `qmsmanaja.com/app/company-name`)
- Its own configuration, users, records, and feature entitlements

Custom domains are **not supported** (confirmed: no).

### 4.3 Organization Lifecycle Statuses

All of the following statuses will be supported:

| Status | Meaning |
|---|---|
| **Prospect** | A lead that has not yet converted to an active organization |
| **Onboarding** | Account created, onboarding in progress, not yet live |
| **Trial** | 14-day trial on Core QMS features with usage limits |
| **Active** | Live paying organization |
| **Payment Overdue** | Past the grace period, payment not received |
| **Suspended** | Access to services blocked; login still allowed with message |
| **Archived** | Deactivated but recoverable (at a fee) |

**Suspended behavior:** Users can still log in. All compliance services are blocked. A soft message explains why. Tenant admin is the first point of contact for resolution.

**Archived behavior:** Recoverable at a cost. The recovery process and fee structure are to be defined.

**Deletion policy:** Organizations are **never deleted** through a standard admin action. Deletion requires the organization to submit a formal deletion request, sign a deletion agreement, and receive a proof-of-deletion record. This protects both parties and ensures regulatory compliance around document retention.

### 4.4 Suspension Timeline

- **Grace period:** 3 days after payment due date
- **Suspension trigger:** 7 days after payment due date (if unpaid after grace period)
- Tenant admin receives payment reminders before and during overdue period
- Platform admins receive alerts when any organization enters Payment Overdue status

### 4.5 Default Settings at Tenant Creation

- Default SOP numbering format: **auto-created** ✓
- Default departments: **not auto-created** (to be configured during onboarding or by tenant admin)
- Department codes: **set by tenant admin inside the app**

---

## Part 5 — Onboarding Process

### 5.1 Two-Stage Onboarding

Onboarding has two stages that happen in sequence:

**Stage 1 — Online Onboarding**
Completed through a structured form or wizard inside the Admin Console. Gathers all required information about the organization. The tenant admin cannot access the app until this stage is complete.

**Stage 2 — Live Onboarding**
A meeting between an assigned Implementation Manager (or any designated platform admin) and the organization's representative. Further details are confirmed. Configuration is completed. The organization is cleared for go-live.

An onboarding summary is sent to the tenant admin after the process is complete.

### 5.2 What Onboarding Covers

| Item | Handled in Onboarding |
|---|---|
| Organization name and details | ✓ |
| Client logo upload | ✓ |
| QA department designation | ✓ |
| Enabled modules selection | ✓ |
| Go-live date | ✓ |
| First SOP numbering format | ✗ — Installation |
| Change control numbering | ✗ — Installation |
| Department codes | ✗ — Configured by tenant admin in app |
| Existing SOP import | ✗ — Installation |
| User import | ✗ — Installation |

**Installation** (post-onboarding data migration and configuration) is a separate, priced service.

### 5.3 Onboarding Checklist

The Admin Console will show a visible onboarding checklist per organization. Mandatory checklist items must be completed before an organization can go live. Items and mandatory/optional designation are to be defined during build planning.

The system sends reminders to platform admins (and optionally the tenant admin) if onboarding is stalled.

### 5.4 Tenant Admin Creation

- Only Platform Owners can create the first tenant admin for an organization
- Tenant admin receives a password setup link via email
- Invites expire (recommended: 48–72 hours — to be confirmed)
- Invites can be resent or revoked by the Platform Owner
- Tenant admin must complete profile setup and set a digital signature before accessing document-control features
- Tenant admin MFA is required
- Tenant admins can create other tenant admins once inside the app (this is already in the existing app)
- Platform admins can transfer tenant admin ownership if an admin leaves

---

## Part 6 — Licenses and Feature Entitlements

### 6.1 License Tier Names

| Tier | Target |
|---|---|
| **Core QMS** | Small manufacturers, labs, companies moving away from spreadsheets |
| **QMS Professional** | Growing regulated companies with QA oversight and operational tracking needs |
| **QMS Enterprise** | Multi-site companies, larger manufacturers, clients with external auditors |

### 6.2 Trial

- 14-day free trial on **Core QMS features only**
- Trial tenants have usage limits
- No self-service trial creation — all trials are set up by platform admins
- Trial is a separate org status from Active

### 6.3 Feature Behavior for Tenants

- Locked premium features are **completely hidden** in the UI (not shown as locked/greyed)
- A **"Request Upgrade"** option is shown where appropriate when a tenant reaches a feature boundary
- Plan changes can take effect **immediately or at next billing cycle** — controlled per-tenant from the Admin Console
- Platform admins can **manually override plan limits** for special clients without changing their full license

### 6.4 Feature Entitlement Rules

- Feature entitlements have **start and end dates** (supports temporary trials and promotions)
- Feature changes are **audited**
- Tenant admins are **notified** when features are enabled or disabled
- Disabled features **auto-hide** sidebar links
- Disabled server actions are **blocked at the server** even if called directly — UI hiding alone is not sufficient
- Platform admins can enable a single feature for a tenant manually without upgrading their full license
- Add-ons are **bundled into the subscription invoice** but shown as line items

### 6.5 Confirmed Feature Tiers (from Packaging Strategy)

**Core QMS includes:**
SOP library and upload, structured SOP numbering (DEPT/SOP/NNN), HOD and QA approval workflow, Master Index, basic change control (single document), audit trail, digital signatures, dashboard core KPIs, notifications and Pulse, basic settings, PWA access.

**QMS Professional adds:**
Multi-document change control, training compliance module, equipment registry and PM tracking, request hub, advanced dashboard views, enhanced reports.

**QMS Enterprise adds:**
Multi-site controls, auditor portal, controlled copy management, retention and destruction workflow, API and integration access, white-label branding, advanced security options, priority support.

**Add-ons (available across tiers where licensed):**
- AI Compliance Assistant
- Training Compliance Pack
- Equipment and PM Pack
- Advanced Change Control Pack
- Advanced Reporting Pack
- Auditor Portal

---

## Part 7 — Billing Model

### 7.1 Billing Approach

A mix of manual and automated billing from the start. Manual billing handles early enterprise clients and bank transfers. Automated billing handles Paystack and eventually Stripe.

### 7.2 Supported Payment Methods

| Method | Phase |
|---|---|
| Paystack (card, mobile money) | Phase 1 |
| Manual invoice | Phase 1 |
| Bank transfer | Phase 1 |
| Mobile money (standalone) | Phase 1 |
| Stripe | Later |

### 7.3 Billing Cycles

- Monthly
- Annual (with discount)
- Custom contract

### 7.4 Pricing Structure

| Element | Decision |
|---|---|
| Core QMS | Public price |
| QMS Professional | Public price |
| QMS Enterprise | Custom pricing — always |
| Pricing model | Mix of base platform fee + per-seat cost |
| Onboarding fee | Free |
| Installation service | Priced separately |
| Data migration | Billed separately |
| Annual payment discount | Yes |
| Archive recovery | Priced |
| Add-ons | Bundled into subscription invoice as line items |

Annual discount amount, per-seat pricing, and special pricing for small companies or multi-site clients are to be defined — pending recommendation review.

### 7.5 Billing Statuses

Trial / Active / Past Due / Cancelled / Suspended / Custom Contract

### 7.6 Billing in the App

- Billing is visible inside the tenant app (to tenant admins only — not all users)
- Invoices are stored in the app
- Manual payment records are tracked
- Renewal reminders are sent
- Billing contact can be separate from tenant admin contact

### 7.7 Billing Reports

Platform admins can generate:
- Billing reports
- Revenue reports
- Usage reports
- AI cost reports
- Tenant health reports

---

## Part 8 — Public Signup and Access Control

### 8.1 Confirmed Access Rules

- **Public signup is fully removed** from the marketing site
- `/signup` redirects to a **"Book a Demo"** page
- The login screen includes a **"Book a Demo"** link for interested visitors
- Demo prospects cannot self-create a trial tenant — all provisioning goes through platform admins
- Users can only be created by tenant admins
- Tenant admins can only be created by platform admins
- Users cannot request access to an existing organization
- Self-service trials, if ever added later, will be a separate flow from real tenant onboarding

### 8.2 Leads and Demo Management

A **Leads & Demos** section will exist in the Admin Console with the full sales pipeline:

**Lead statuses:** New → Contacted → Demo Scheduled → Demo Completed → Proposal Sent → Won → Lost

- Demo requests are stored inside the platform
- Demo booking form collects information (fields to be defined — recommended: company name, industry, size, contact name, email, phone, compliance needs)
- New demo requests trigger email alerts to Platform Owners and Pulse notifications to relevant admins
- Lost leads include a mandatory reason
- Expected proposal value is tracked per lead
- Demo notes are stored
- A lead can be **converted into an organization** directly — carrying over relevant contact and company information
- The first tenant admin can optionally be created from the lead contact

---

## Part 9 — AI and External Services

### 9.1 AI Position

- AI is **never included in any base license** — it is always an add-on
- AI is measured in **credits**
- Each tenant on the AI add-on has a **monthly credit allowance**
- Unused credits **roll over**
- Tenants are **blocked** when credits are exhausted
- Tenant admins can **request more credits** — Platform Owner manually approves
- AI usage is visible at the tenant level (not per-user in Phase 1)
- Some AI features are **restricted to QA users only**
- All AI-generated output requires **human review before use** — no auto-apply
- Multiple AI providers will be supported in the future
- If the AI service is unavailable: soft alert to tenants, immediate alert to platform admins

### 9.2 External Services

For Phase 1, the platform depends on:

| Service | Notes |
|---|---|
| Email | Core for all notifications, invites, and alerts |
| AI provider | Add-on feature, credit-based |
| Payment provider | Paystack + manual in Phase 1 |
| File storage | Tenant-isolated storage paths |
| Document conversion | For SOP and compliance document processing |
| PDF generation | For reports and audit exports |
| E-signature | Built into existing approval workflows |

- Every external service has usage tracking
- Every external service has per-tenant limits
- External service failures appear in the Admin Console
- Platform admins receive cost alerts when external service spend rises
- Tenant admins are notified of external service outages

---

## Part 10 — Platform Audit Log

The platform maintains an immutable audit log that:

- Records **every platform admin login** (including IP address and device)
- Records **failed login attempts**
- Records **all tenant views** by platform admins
- Records **all feature changes** made to tenant entitlements
- Records **all sensitive actions** with a mandatory reason
- Captures **before-and-after values** for changes (recommended)
- Is **never deletable**
- Is **exportable** by Platform Owners only
- Retention: recommended minimum 7 years (to be confirmed)

Tenant admins may be given a filtered view of audit records involving their own organization (recommended — to be confirmed).

---

## Part 11 — Security

### 11.1 Platform Admin Security

- Separate login route from tenant users
- MFA required for all platform admins
- Inactive or unverified accounts blocked
- Sensitive actions require password re-confirmation
- Platform admin accounts have expiry dates
- Sessions expire after set duration (recommended: 4–8 hours idle — to be confirmed)
- All actions logged with IP and device context

### 11.2 Tenant Security

- Tenant admins must use MFA
- All users will eventually require MFA
- Password rules are standard platform-wide (no per-tenant variation)
- Tenant admins can deactivate users immediately
- Platform admins can force tenant-wide logout (requires approval from QA admin or a second platform admin)
- Suspicious activity auto-locks accounts
- Tenant admins see failed login attempts for their own users
- Platform admins see security alerts across all tenants
- Login sessions expire after a set time

### 11.3 Tenant Data Security

Tenant data isolation is enforced at multiple layers — not just the UI:

1. **Database row-level security** scoped by `tenant_id`
2. **Server-side validation** of authenticated user's tenant on every request
3. **Storage paths** include tenant identifiers
4. **Audit logs** record tenant context on every action
5. **Feature entitlement checks** run server-side before any protected action

The UI hides unavailable features. The server blocks them. Both layers are always active.

Storage handling (separate buckets vs. path-based isolation) is to be confirmed — recommended: path-based isolation with tenant ID prefix (`/tenant-{id}/...`) as the standard approach for shared infrastructure.

---

## Part 12 — Announcements and Maintenance

- Platform-wide announcements can be sent by Platform Owners and other platform admins (by role)
- Announcements can be targeted by **license tier** or **specific organization**
- Announcements can be sent to **tenant admins only** or **all users** — controlled per announcement
- Announcements require **acknowledgement from tenant admins**
- Announcement delivery is tracked
- Announcements also send email
- Tenants cannot opt out of announcements
- **Maintenance mode** can be activated globally (no per-tenant exclusion)
- Maintenance mode shows a configured message to users
- Email/AI/support contact details and legal links (Terms, Privacy Policy) are editable from the Admin Console UI — not only environment variables

---

## Part 13 — Tenant Branding

| Feature | Decision |
|---|---|
| Upload own logo | All tiers — Yes |
| Set brand colors | All tiers — Yes |
| White-label branding (remove QMS-MANAJA branding) | Enterprise / premium — Yes |
| QMS-MANAJA branding shown for basic tenants | Yes |
| Branding applies to reports and exports | Yes |
| Branding applies to emails | Recommended — to be confirmed |
| Branding applies to login page | No (now); Yes (future) |

---

## Part 14 — Support Impersonation

Support impersonation is **not in Phase 1**. When built (Phase 2+):

- Platform admins cannot view raw tenant data without impersonating — there is no "read-only peek"
- Every impersonation session requires a **written reason**
- Tenant admin is **notified** when impersonation happens
- A visible **impersonation banner** is shown during the session
- Destructive actions are **blocked** during impersonation
- Sessions **expire automatically** (recommended: 30–60 minutes — to be confirmed)
- **Platform Owner approval** is required before a Support Admin can impersonate
- All impersonated actions are **logged separately**
- Tenant admins can **disable support access** for their organization

---

## Part 15 — Data Migration (Existing Data)

The current development environment and its data will become the **platform demo space** — used for demos and internal testing. It does not represent any real organization's data.

When tenancy is introduced:
- All current data is migrated into a clearly labelled demo/seed tenant
- This demo tenant is used by Platform Owners for testing and demonstrating the product
- Real paying organizations are always provisioned as fresh tenants

Migration approach (gradual vs. one-step) and the specific handling of current departments, users, SOP numbering settings, audit logs, and storage files within the demo tenant are to be defined during the tenancy build phase.

---

## Part 16 — Build Sequence

### What Triggers the Tenancy Build

The tenancy build begins **after** the current PR (SOP numbering, HOD approval routing, Master Index improvements, change-control direction) is reviewed, accepted, and stable.

### Recommended Phase Order

#### Phase 1 — Tenant Foundation and Core Admin Console
*Goal: Everything needed to onboard and manage the first paying organization*

- `tenants`, `tenant_memberships`, `tenant_settings`, `tenant_feature_entitlements` tables
- `tenant_id` added to all core operational tables
- Row-level security policies updated
- Server actions updated with tenant validation
- Storage paths updated with tenant identifiers
- Existing data backfilled into demo tenant
- Separate platform admin login route
- Admin Console layout and sidebar (separate from tenant app)
- Platform Owner and Super Admin accounts
- Organization creation and management screens
- Tenant admin invitation and setup flow
- Onboarding checklist in Admin Console
- License and feature entitlement management
- Feature gating in UI and server
- Platform audit log
- Organization status management (Prospect → Active → Suspended → Archived)

#### Phase 2 — Billing and Usage
- Billing records, invoices, manual payment tracking
- Paystack integration
- Usage metrics (SOPs, users, storage, document uploads, login activity)
- Payment overdue detection and suspension automation
- Renewal reminders and overdue alerts
- Billing section in tenant app (admin-only view)
- AI credit tracking and request flow

#### Phase 3 — Leads, Demo Management, and Onboarding Support
- Leads and Demo section in Admin Console
- Demo booking form and public-facing redirect
- Lead pipeline and status management
- Lead-to-organization conversion
- Installation service tracking

#### Phase 4 — Support, Announcements, and Advanced Governance
- Support impersonation with approval, logging, and notifications
- Platform-wide announcements with targeting and acknowledgement
- Maintenance mode
- Multi-site governance (Enterprise tier)
- Advanced reporting pack
- Tenant-specific login pages (future)

### What Must Be Ready Before the First External Paying Client

At minimum:
- Phase 1 complete: tenant isolation working, feature entitlements enforced, Admin Console operational
- At least Core QMS and QMS Professional licenses defined and gated
- Onboarding checklist process working
- Tenant admin invitation and setup working
- Basic billing tracking (even if manual) in place
- Platform audit log running

### What Can Wait

- Support impersonation (Phase 4)
- Full Stripe integration
- Multi-site support
- Self-service trials
- Tenant-specific login pages
- Custom domain support

---

## Part 17 — Open Items to Resolve

The following items were deferred during the Q&A and need to be confirmed before the relevant build phase begins:

| Item | Area | Priority |
|---|---|---|
| Mandatory onboarding checklist items | Onboarding | Phase 1 |
| Required fields for tenant creation | Onboarding | Phase 1 |
| Invite expiry duration | Tenant Admin | Phase 1 |
| First screen content in Admin Console | UX | Phase 1 |
| Usage tracking frequency (daily vs. monthly) | Usage | Phase 2 |
| Hard vs. soft usage limits | Usage | Phase 2 |
| Whether storage limits block uploads or warn only | Storage | Phase 2 |
| Whether billing is used to calculate usage charges | Billing | Phase 2 |
| Per-seat pricing amounts | Commercial | Before sales |
| Annual discount percentage | Commercial | Before sales |
| Special pricing for small or multi-site companies | Commercial | Before sales |
| AI credit bundle size and cost | AI | Phase 2 |
| Audit log retention duration | Audit | Phase 1 |
| Impersonation session duration | Support | Phase 4 |
| Impersonation scope (admins only vs. any user) | Support | Phase 4 |
| Tenant branding applied to emails | Branding | Phase 2+ |
| Storage isolation approach (path-based vs. separate buckets) | Storage | Phase 1 |
| Platform admin access to tenant files | Storage | Phase 1 |
| Demo booking form fields | Leads | Phase 3 |
| Lead-to-tenant carry-over fields | Leads | Phase 3 |
| Whether reports carry tenant branding by default | Reports | Phase 2+ |
| Whether some reports are gated to premium tiers | Reports | Phase 2+ |
| Manual approval requirement for certain platform actions | Governance | TBD |
| What to do when a department has no HOD | Compliance | Current sprint |

---

## Summary Statement

QMS-MANAJA is ready to transition from a single-client compliance product to a commercial SaaS platform. The decisions captured in this document define a clear, practical path:

- A multi-tenant architecture that keeps operations efficient while fully isolating each organization's data
- A controlled access model where no one gets in without an invitation and every action is logged
- A three-tier license structure with add-ons that is easy to buy and easy to expand
- A platform Admin Console that gives the product owner absolute control and visibility
- A phased build sequence that prioritizes everything needed to onboard and manage the first paying client before adding advanced features

The first external paying client is achievable after Phase 1 is complete.
