# QMS-MANAJA Platform Super Admin Console Strategy

## Purpose

This document defines the platform-level control area needed when QMS-MANAJA becomes a multi-tenant SaaS product.

In the tenant model, each client organization will have its own admin users who manage only their own company. Above those organization admins, QMS-MANAJA also needs a protected platform owner area for managing all tenants, onboarding, plans, billing, usage, external service costs, and support operations.

This area should not be presented as a normal tenant feature. It should be a separate platform control layer.

## Naming Recommendation

Avoid calling this area "sudo" in the user interface.

Internally, the role can be named:

- `super_admin`
- `platform_admin`
- `platform_owner`

Recommended UI names:

- Platform Admin
- Owner Console
- Control Center
- Super Admin Console

The best user-facing name is **Platform Admin Console** or **Owner Console**.

## Core Purpose

The Platform Admin Console gives the platform owner control over:

- Tenant creation
- Tenant onboarding
- Tenant admin creation
- Plans and feature access
- Billing status
- Usage limits
- AI and external service usage
- Tenant health
- Support access
- Platform-wide audit logs
- System configuration

This is the area that gives the product owner full control over the SaaS business from above.

## Role Separation

The app should separate three levels of authority:

### 1. Platform Owner / Super Admin

This is the highest level. This user can manage all tenants and platform settings.

Responsibilities:

- Create organizations
- Create tenant admins
- Assign plans
- Control billing status
- Enable or disable feature packages
- Monitor usage
- Manage external service limits
- Suspend or reactivate tenants
- Review platform-wide audit activity

### 2. Tenant Admin

This user belongs to one organization and manages only that organization.

Responsibilities:

- Invite users inside their tenant
- Manage departments
- Assign roles
- Configure department codes
- Manage tenant users
- View tenant-level settings
- Use only enabled modules

### 3. Normal Tenant Users

These are managers and employees inside a tenant.

Responsibilities:

- Submit SOPs
- Review or approve based on role
- Complete training
- Perform PM tasks
- Use enabled modules only

## Why This Area Is Required

Once public signup is removed, the platform owner needs a controlled way to create organizations and onboard clients.

Without a Platform Admin Console:

- Tenant creation becomes manual and risky
- Billing status is hard to track
- Feature access becomes scattered
- AI costs can grow without control
- Support access becomes unsafe
- There is no clear place to manage demos, leads, onboarding, and tenant setup

For a compliance SaaS product, this control area is not optional. It is part of the business infrastructure.

## Main Console Sections

Recommended sidebar sections:

- Overview
- Tenants
- Leads & Demos
- Onboarding
- Plans & Features
- Billing
- Usage & Costs
- AI Usage
- Platform Users
- Support Access
- Announcements
- Audit Log
- System Settings

## 1. Overview Dashboard

The overview dashboard should show the health of the entire platform.

Recommended KPI cards:

- Total tenants
- Active tenants
- Trial tenants
- Onboarding tenants
- Suspended tenants
- Payment-overdue tenants
- Total active users
- Monthly AI usage
- Monthly storage usage
- Tenants near usage limits
- Open onboarding tasks
- Recent tenant activity
- Security or failed-login alerts

The goal is to give the platform owner a quick view of business health and platform risk.

## 2. Tenant Management

This is the main area for creating and managing client organizations.

Features needed:

- Create new tenant
- View all tenants
- Search tenants
- Filter tenants by status
- Edit tenant details
- Set tenant logo
- Set tenant workspace slug
- Set tenant industry
- Set tenant country or region
- Set tenant timezone
- Set tenant status
- Suspend tenant
- Reactivate tenant
- Archive tenant
- View tenant users
- View tenant departments
- View tenant modules
- View tenant SOP count
- View tenant storage use
- View tenant AI usage
- View tenant billing state

Recommended tenant statuses:

- Prospect
- Onboarding
- Trial
- Active
- Payment Overdue
- Suspended
- Archived

Important rule:

Suspending a tenant should block tenant users from normal app access, but platform admins should still be able to view the tenant record.

## 3. Tenant Onboarding

Tenant onboarding should guide the setup after a client agrees to use the product.

Features needed:

- Create tenant workspace
- Create first tenant admin
- Send tenant admin invite
- Assign starting plan
- Enable selected modules
- Add initial departments
- Set QA department
- Configure department codes
- Configure SOP numbering format
- Configure change control numbering format
- Upload tenant logo
- Set timezone
- Set default review cycle
- Set retention defaults
- Mark onboarding checklist items as complete
- Add onboarding notes

Recommended onboarding checklist:

- Tenant created
- Tenant admin invited
- Tenant plan selected
- Departments configured
- QA department selected
- SOP numbering configured
- Change control numbering configured
- Logo uploaded
- First users invited
- Initial SOP import planned
- Go-live date agreed

## 4. Tenant Admin Creation

Since public signup should eventually be removed, tenant admins must be created from inside the Platform Admin Console.

Features needed:

- Create tenant admin user
- Assign admin to tenant
- Send invite email
- Resend invite
- Revoke invite
- Force password setup
- Require onboarding completion
- Require signature setup
- Require MFA later
- Deactivate tenant admin
- Transfer tenant ownership to another admin

Recommended fields:

- Full name
- Email
- Job title
- Phone
- Tenant
- Role
- Invite status
- Invite expiry

Invite statuses:

- Pending
- Accepted
- Expired
- Revoked

## 5. Plans and Feature Control

This section controls what each tenant can use.

Features needed:

- Assign tenant plan
- Change tenant plan
- Enable add-ons
- Disable add-ons
- Set custom feature overrides
- Set user limits
- Set storage limits
- Set AI usage limits
- Set module-specific limits
- View entitlement history
- Preview what the tenant can access

Recommended plans:

- Core QMS
- QMS Professional
- QMS Enterprise

Recommended feature switches:

- SOP Library
- Master Index
- SOP Approvals
- Structured SOP Numbering
- Basic Change Control
- Multi-Document Change Control
- Training Compliance
- Equipment and PM
- Request Hub
- Advanced Reports
- AI Delta Summary
- AI Risk Insights
- Auditor Portal
- API Access
- White Label Branding

Important rule:

Feature access must be enforced in both the UI and server/database layer. Hiding a sidebar item is not enough.

## 6. Billing Management

Even if billing starts manually, the platform needs billing state from the beginning.

Features needed:

- Set billing plan
- Set billing cycle
- Set subscription status
- Set trial end date
- Set contract start date
- Set contract end date
- Add billing contact
- Add invoice notes
- Record manual payments
- Mark invoices paid or overdue
- Suspend tenant for payment issues
- Reactivate tenant after payment
- Store billing reference IDs for future Stripe integration

Recommended billing statuses:

- Trial
- Active
- Past Due
- Cancelled
- Suspended
- Custom Contract

Future billing integrations:

- Stripe
- Paystack
- Manual enterprise invoicing

## 7. Usage Metrics

Usage metrics are needed for billing, support, cost control, and plan enforcement.

Track per tenant:

- Active users
- Total users
- SOP count
- SOP versions
- Change controls
- Training modules
- Training assignments
- Equipment records
- PM tasks
- Storage used
- Document uploads
- Report exports
- Emails sent
- AI requests
- AI credits used
- API calls
- Login activity

Usage views needed:

- Current month
- Previous month
- Last 90 days
- Year to date
- Per tenant
- Per feature
- Per user where needed

Usage warnings:

- Near user limit
- Near storage limit
- Near AI limit
- Near API limit
- Unusual spike in usage

## 8. AI and External Service Cost Control

This is critical because AI and other external services can create real operating costs.

Features needed:

- Monthly AI usage limit per tenant
- AI credit balance
- AI usage by feature
- AI usage by tenant
- AI usage by user
- Soft warning threshold
- Hard stop threshold
- Manual credit top-up
- Disable AI when limit is reached
- Notify tenant admin when usage is high
- Notify platform owner when costs spike

AI features to track:

- SOP delta summaries
- Training slide generation
- Questionnaire generation
- Risk insights
- Document comparison
- Future AI assistant features

Possible control model:

- Each AI action consumes credits.
- Each tenant gets monthly credits based on plan.
- Add-on packages can increase credits.
- Tenant admins can request more credits.
- Platform owner can manually approve credit increases.

## 9. Platform Users

The platform owner may eventually need internal team members who help with onboarding, billing, support, or implementation.

Features needed:

- Create platform admin users
- Assign platform role
- Deactivate platform admin
- Require MFA
- View platform admin activity
- Restrict sensitive actions by role

Recommended platform roles:

- Owner
- Support Admin
- Billing Admin
- Implementation Manager
- Read-only Auditor

Role examples:

- Owner can do everything.
- Billing Admin can manage plans and billing.
- Support Admin can view tenants and support tickets.
- Implementation Manager can create tenants and run onboarding.
- Read-only Auditor can view platform logs only.

## 10. Support Access and Impersonation

Support access is useful but must be tightly controlled.

Features needed:

- View tenant as support
- Impersonate tenant admin or tenant user
- Require reason before impersonation
- Log impersonation start and end
- Show visible banner while impersonating
- Restrict destructive actions during impersonation
- Allow emergency support access only for platform owner

Audit data to capture:

- Platform admin ID
- Tenant ID
- User impersonated
- Reason
- Start time
- End time
- Actions taken

Important rule:

No support access should happen silently. Every support session must be visible and audited.

## 11. Platform-Wide Audit Log

The platform needs an audit trail above the tenant level.

Track:

- Tenant created
- Tenant updated
- Tenant suspended
- Tenant reactivated
- Tenant archived
- Tenant admin created
- Invite sent
- Invite revoked
- Plan changed
- Feature enabled
- Feature disabled
- Billing status changed
- AI limit changed
- Storage limit changed
- User limit changed
- Support impersonation started
- Support impersonation ended
- Platform admin created
- Platform admin deactivated

Each record should include:

- Actor
- Action
- Tenant affected
- Timestamp
- IP/device info if available
- Metadata
- Reason where required

## 12. Leads and Demo Management

Because public signup should be removed, the demo request becomes the main entry point.

Features needed:

- View demo requests
- Add lead manually
- Track lead status
- Add lead notes
- Assign internal owner
- Record demo date
- Record requested modules
- Convert lead to tenant
- Create tenant from lead
- Create tenant admin from lead contact

Recommended lead statuses:

- New
- Contacted
- Demo Scheduled
- Demo Completed
- Proposal Sent
- Won
- Lost

Lead fields:

- Company name
- Contact name
- Email
- Phone
- Industry
- Country
- Company size
- Requested modules
- Notes
- Lead source

## 13. Announcements and Platform Notices

The platform owner needs a way to communicate with tenants.

Features needed:

- Send notice to one tenant
- Send notice to all tenants
- Send notice to selected plan level
- Maintenance announcement
- Release update
- Billing reminder
- Security notice
- Track notice acknowledgements

Notice types:

- Maintenance
- Product Update
- Billing
- Security
- General

## 14. System Settings

This section controls global platform behavior.

Features needed:

- Global feature defaults
- Default plan limits
- Default user limits
- Default storage limits
- Default AI limits
- Allowed file types
- Max upload size
- Default SOP numbering template
- Default change control numbering template
- Email provider settings
- AI provider settings
- Support contact details
- Maintenance mode
- Terms and policy links

Important rule:

System settings should be restricted to the highest platform role.

## Data Model Direction

Recommended platform tables:

- `platform_admins`
- `platform_audit_log`
- `tenants`
- `tenant_memberships`
- `tenant_settings`
- `tenant_feature_entitlements`
- `plans`
- `features`
- `plan_features`
- `tenant_billing`
- `tenant_usage_monthly`
- `tenant_ai_usage`
- `tenant_invites`
- `lead_requests`
- `support_sessions`
- `platform_announcements`

Important distinction:

Platform admins should not simply be normal tenant users with `is_admin = true`. They should be stored and authorized separately so tenant admins and platform admins cannot be confused.

## Security Requirements

The Platform Admin Console must be highly protected.

Requirements:

- Separate platform admin role/table
- MFA support for platform admins
- Strict route protection
- Server-side authorization checks
- Platform-wide audit logging
- Reason required for impersonation
- Reason required for tenant suspension
- No tenant user can access platform routes
- No tenant admin can manage other tenants
- Sensitive changes must be logged

Sensitive actions:

- Tenant suspension
- Tenant deletion or archival
- Billing status change
- Feature removal
- AI limit change
- Support impersonation
- Platform admin creation

## Recommended Build Phases

### Phase 1: Core Platform Control

Build the minimum required to manage tenants.

Scope:

- Platform admin access
- Tenant list
- Tenant creation
- Tenant status
- Tenant admin creation
- Plan assignment
- Feature entitlements
- Platform audit log

Why first:

This gives control over tenant onboarding and package access.

### Phase 2: Billing and Usage

Add business and cost visibility.

Scope:

- Billing status
- Trial dates
- Contract dates
- User limits
- Storage limits
- AI limits
- Usage tracking
- Usage dashboard

Why second:

This controls revenue and operating costs.

### Phase 3: Leads and Onboarding

Connect sales to tenant creation.

Scope:

- Demo request list
- Lead tracking
- Convert lead to tenant
- Onboarding checklist
- Tenant setup progress

Why third:

This supports a cleaner sales workflow after public signup is removed.

### Phase 4: Support and Governance

Add support and advanced oversight.

Scope:

- Support impersonation
- Support session logs
- Announcements
- Advanced platform audit filters
- Platform user role management

Why fourth:

This improves long-term operations once there are multiple tenants.

## Public Signup Impact

When tenancy is implemented, public signup should be removed from the public site.

Recommended public flow:

- Visitor views marketing pages.
- Visitor books a demo.
- Platform owner reviews the lead.
- Platform owner creates tenant after interest is confirmed.
- Platform owner creates first tenant admin.
- Tenant admin invites users from inside the app.

Recommended auth flow:

- Public login remains.
- Public signup is hidden or removed.
- Direct signup routes are blocked.
- Tenant user creation happens through invite.
- Tenant admin creation happens through Platform Admin Console.

This protects tenant ownership and keeps compliance access controlled.

## Recommended Final Position

QMS-MANAJA should have a separate Platform Admin Console for managing the entire SaaS business.

The first version does not need every advanced feature, but it must include:

- Platform owner account
- Tenant creation
- Tenant admin creation
- Plan assignment
- Feature entitlements
- Tenant status
- Platform audit logging

After that, billing, usage, AI cost controls, lead management, and support access can be added in phases.

This gives the platform owner control from above while keeping each tenant cleanly isolated and professionally managed.

