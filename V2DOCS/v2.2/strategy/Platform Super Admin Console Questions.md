# QMS-MANAJA Platform Super Admin Console Questions

## Purpose

This document contains the questions that need to be answered before building the Platform Super Admin Console for QMS-MANAJA.

The goal is to capture the product owner's thinking on every major part of the platform-level control area: tenants, onboarding, plans, billing, usage, AI costs, support access, lead handling, security, and system settings.

Take time to answer these carefully. Short answers are fine where the decision is simple. Longer answers are useful where the decision affects the business model, compliance posture, or future scalability.

## How To Use This Document

Answer directly under each question.

Recommended answer format:

```md
Answer:
```

If a question does not apply yet, write:

```md
Answer: Not needed for phase 1.
```

If you are unsure, write:

```md
Answer: Unsure. My current thinking is...
```

## 1. Overall Vision

1. What do you want the Platform Super Admin Console to feel like: a business control center, a technical admin area, or a simple tenant setup tool?

Answer:

2. Who exactly will use this console at the beginning? Only you, or other Russolution/team members too?

Answer:

3. Should this console be hidden from all tenant users completely, or visible only if a platform admin logs in?

Answer:

4. Should the Platform Super Admin Console live inside the same app layout, or should it have a separate `/platform` or `/owner` area with its own sidebar?

Answer:

5. Should platform admins use the same login screen as tenant users, or should there be a separate platform admin login route?

Answer:

6. What is the main outcome you want from this console in the first version?

Answer:

7. What would make the first version successful enough for you to start onboarding real organizations?

Answer:

8. Are there any actions you personally want to approve manually before the platform allows them?

Answer:

## 2. Naming and Language

1. What should the console be called in the UI?

Options to consider:

- Platform Admin
- Owner Console
- Control Center
- Super Admin Console
- QMS-MANAJA Admin

Answer:

2. What should your highest-level account be called?

Options to consider:

- Platform Owner
- Super Admin
- Owner
- Platform Administrator

Answer:

3. Should the word "tenant" appear in the UI, or should the UI say "organization", "client", or "company" instead?

Answer:

4. What should client workspaces be called?

Options to consider:

- Tenant
- Organization
- Company
- Workspace
- Client

Answer:

5. Should plans be called "plans", "packages", "subscriptions", or "licenses"?

Answer:

6. Should add-on modules be called "add-ons", "modules", "feature packs", or "extensions"?

Answer:

7. Should suspended tenants see the word "suspended", or should the app show a softer message like "account temporarily unavailable"?

Answer:

## 3. Role Separation

1. Should platform admins be stored separately from tenant users, or can a tenant user also be a platform admin?

Answer:

2. Should your own platform owner account be completely outside any tenant, or should it also belong to a tenant for testing/demo purposes?

Answer:

3. Should there be only one platform owner account, or can there be multiple owners?

Answer:

4. What platform roles do you want in phase 1?

Options to consider:

- Owner
- Support Admin
- Billing Admin
- Implementation Manager
- Read-only Auditor

Answer:

5. Should platform admins be able to create other platform admins?

Answer:

6. Should only the platform owner be able to create other platform admins?

Answer:

7. Should platform admins be required to use MFA before accessing the console?

Answer:

8. Should platform admin access be blocked from inactive or unverified accounts?

Answer:

9. Should platform admin actions require re-entering a password for sensitive actions?

Answer:

## 4. Tenant / Organization Model

1. What should each tenant represent: one company, one site, one legal entity, or one operating unit?

Answer:

2. Should one company be able to have multiple sites inside one tenant?

Answer:

3. If a company has multiple sites, should they share SOPs and users, or should each site be separated?

Answer:

4. Should tenant names be unique?

Answer:

5. Should every tenant have a unique workspace URL or slug?

Example:

`qmsmanaja.com/app/company-name`

Answer:

6. Should tenants be able to use their own custom domain later?

Answer:

7. What tenant statuses do you want?

Options to consider:

- Prospect
- Onboarding
- Trial
- Active
- Payment Overdue
- Suspended
- Archived

Answer:

8. What should happen when a tenant is suspended?

Answer:

9. Should suspended tenants still be able to log in and see a billing message, or should login be blocked?

Answer:

10. Should archived tenants be recoverable?

Answer:

11. Should deleting a tenant ever be allowed, or should tenants only be archived?

Answer:

12. What basic information should be required to create a tenant?

Answer:

13. What optional information would be useful but not required?

Answer:

14. Should tenant creation automatically create default departments?

Answer:

15. Should tenant creation automatically create default numbering formats?

Answer:

## 5. Tenant Onboarding

1. What should the onboarding process look like after a client agrees to use the product?

Answer:

2. Who should perform the tenant onboarding: you, an implementation manager, or the tenant admin?

Answer:

3. Should onboarding have a checklist in the Platform Admin Console?

Answer:

4. Which checklist items are mandatory before a tenant can go live?

Answer:

5. Should the tenant admin be allowed into the app before onboarding is complete?

Answer:

6. Should onboarding include uploading the client logo?

Answer:

7. Should onboarding include setting the QA department?

Answer:

8. Should onboarding include setting department codes?

Answer:

9. Should onboarding include importing existing SOPs?

Answer:

10. Should onboarding include importing existing users?

Answer:

11. Should onboarding include setting the first SOP numbering format?

Answer:

12. Should onboarding include setting change control numbering?

Answer:

13. Should onboarding include choosing enabled modules?

Answer:

14. Should onboarding include a go-live date?

Answer:

15. Should onboarding notes be visible only to platform admins, or also to tenant admins?

Answer:

16. Should tenants have an onboarding progress screen inside their own app?

Answer:

17. Should the system send reminders if onboarding is incomplete?

Answer:

## 6. Tenant Admin Creation

1. Who should be allowed to create the first tenant admin?

Answer:

2. What details are required for creating the first tenant admin?

Answer:

3. Should tenant admins receive an invite email, a temporary password, or a password setup link?

Answer:

4. Should tenant admin invites expire?

Answer:

5. How long should an invite remain valid?

Answer:

6. Should the platform owner be able to resend tenant admin invites?

Answer:

7. Should the platform owner be able to revoke tenant admin invites?

Answer:

8. Should tenant admins be required to complete profile setup before accessing the app?

Answer:

9. Should tenant admins be required to set up a signature before accessing document-control features?

Answer:

10. Should tenant admins be required to set up MFA?

Answer:

11. Should there be more than one tenant admin per organization?

Answer:

12. Should tenant admins be able to create other tenant admins?

Answer:

13. Should platform admins be able to transfer tenant ownership from one admin to another?

Answer:

14. What should happen if a tenant admin leaves the organization?

Answer:

## 7. Public Signup and Login

1. Should public signup be fully removed from the marketing site?

Answer:

2. Should the login screen show only login, or should it include a "Book Demo" link?

Answer:

3. Should direct access to `/signup` be blocked, redirected, or hidden only?

Answer:

4. Where should blocked signup attempts redirect?

Answer:

5. Should tenant users be created only by tenant admins?

Answer:

6. Should tenant admins be created only by platform admins?

Answer:

7. Should demo prospects ever be allowed to self-create a trial tenant?

Answer:

8. If self-service trials are added later, should they be separate from real tenant onboarding?

Answer:

9. Should users be able to request access to an existing tenant?

Answer:

10. Should tenant admins approve user access requests?

Answer:

## 8. Plans and Packages

1. What plan names do you want to use?

Suggested:

- Core QMS
- QMS Professional
- QMS Enterprise

Answer:

2. Should there be a free trial?

Answer:

3. How long should the trial last?

Answer:

4. Should trial tenants have all features, or only Core features?

Answer:

5. Should trial tenants have usage limits?

Answer:

6. What should be included in Core QMS?

Answer:

7. What should be included in QMS Professional?

Answer:

8. What should be included in QMS Enterprise?

Answer:

9. Should Enterprise always be custom pricing?

Answer:

10. Should plans limit the number of users?

Answer:

11. Should plans limit storage?

Answer:

12. Should plans limit AI usage?

Answer:

13. Should plans limit number of SOPs?

Answer:

14. Should plans limit number of equipment records?

Answer:

15. Should plans limit number of training modules?

Answer:

16. Should platform admins be able to override plan limits for special clients?

Answer:

17. Should plan changes take effect immediately or at the next billing cycle?

Answer:

18. Should tenants see their current plan inside their settings?

Answer:

19. Should tenants see locked premium features in the UI, or should those features be completely hidden?

Answer:

20. If a premium feature is locked, should the UI show "Request Upgrade"?

Answer:

## 9. Feature Entitlements

1. Which features must always be available to every tenant?

Answer:

2. Which features should be premium?

Answer:

3. Which features should be sold only as add-ons?

Answer:

4. Should platform admins be able to enable one feature manually without changing the tenant's full plan?

Answer:

5. Should feature changes be audited?

Answer:

6. Should tenant admins be notified when features are enabled or disabled?

Answer:

7. Should disabled features hide sidebar links automatically?

Answer:

8. Should disabled server actions be blocked even if someone tries to call them directly?

Answer:

9. Should disabled database records be read-only or completely inaccessible?

Answer:

10. Should feature entitlements have start and end dates?

Answer:

11. Should you support temporary feature trials?

Answer:

12. Should add-ons be billed separately or bundled into the tenant subscription?

Answer:

## 10. Billing Management

1. Will billing start as manual billing, automated billing, or a mix of both?

Answer:

2. Which payment providers do you want to support eventually?

Options:

- Stripe
- Paystack
- Manual invoice
- Bank transfer
- Mobile money

Answer:

3. What billing cycles should be supported?

Options:

- Monthly
- Quarterly
- Annual
- Custom contract

Answer:

4. Should tenants be suspended automatically when payment is overdue?

Answer:

5. If yes, after how many days?

Answer:

6. Should there be a grace period?

Answer:

7. Should tenant admins receive payment reminders?

Answer:

8. Should platform admins receive payment overdue alerts?

Answer:

9. Should billing contacts be separate from tenant admins?

Answer:

10. What billing statuses do you want?

Suggested:

- Trial
- Active
- Past Due
- Cancelled
- Suspended
- Custom Contract

Answer:

11. Should tenant users see billing status, or only tenant admins?

Answer:

12. Should billing be visible inside the tenant app at all?

Answer:

13. Should invoices be stored in the app?

Answer:

14. Should manual payment records be tracked?

Answer:

15. Should there be renewal reminders?

Answer:

## 11. Usage Metrics

1. Which usage metrics matter most to you as the platform owner?

Answer:

2. Should usage be tracked monthly?

Answer:

3. Should usage be tracked daily too?

Answer:

4. Should usage be visible to tenant admins?

Answer:

5. Should usage be used for billing?

Answer:

6. Should user counts include inactive users?

Answer:

7. Should storage usage include archived files?

Answer:

8. Should report exports be tracked?

Answer:

9. Should document uploads be tracked?

Answer:

10. Should login activity be tracked for billing/security?

Answer:

11. Should the platform alert you when usage spikes unexpectedly?

Answer:

12. Should tenants receive warnings before reaching limits?

Answer:

13. Should tenants be blocked when limits are reached?

Answer:

14. Which limits should be hard limits?

Answer:

15. Which limits should be soft warnings only?

Answer:

## 12. AI and External Service Costs

1. Which AI features do you expect to offer first?

Answer:

2. Should AI be included in any base plan, or always sold as an add-on?

Answer:

3. Should AI usage be measured by credits?

Answer:

4. If using credits, what should consume credits?

Answer:

5. Should each tenant have a monthly AI credit allowance?

Answer:

6. Should unused AI credits roll over?

Answer:

7. Should tenants be blocked when AI credits run out?

Answer:

8. Should tenant admins be able to request more AI credits?

Answer:

9. Should platform admins manually approve AI credit increases?

Answer:

10. Should AI usage be visible per tenant?

Answer:

11. Should AI usage be visible per user?

Answer:

12. Should the platform estimate AI cost in money, not just credits?

Answer:

13. Should AI actions require tenant admin permission?

Answer:

14. Should some AI features be restricted to QA users only?

Answer:

15. What should happen if the external AI service is unavailable?

Answer:

16. Do you want to support multiple AI providers later?

Answer:

17. Should there be a global AI kill switch?

Answer:

18. Should generated AI output require human review before use?

Answer:

## 13. External Services Beyond AI

1. Which external services do you expect the app to use?

Options:

- Email
- SMS
- WhatsApp
- AI
- Payment provider
- File storage
- Document conversion
- PDF generation
- E-signature provider

Answer:

2. Should each external service have usage tracking?

Answer:

3. Should each tenant have limits for external services?

Answer:

4. Should platform admins receive alerts when external service costs rise?

Answer:

5. Should external service failures appear in the Platform Admin Console?

Answer:

6. Should tenant admins see external service outages?

Answer:

## 14. Platform Users

1. Will anyone besides you need platform admin access in phase 1?

Answer:

2. What roles should your internal team eventually have?

Answer:

3. Should support staff be able to see billing details?

Answer:

4. Should billing staff be able to access tenant data?

Answer:

5. Should implementation staff be able to create tenants?

Answer:

6. Should read-only platform auditors exist?

Answer:

7. Should platform admins have access expiry dates?

Answer:

8. Should platform admin invitations be used instead of direct account creation?

Answer:

9. Should platform admins be able to deactivate themselves?

Answer:

10. Who can deactivate a platform owner?

Answer:

## 15. Support Access and Impersonation

1. Do you want support impersonation in phase 1?

Answer:

2. Should platform admins be able to view tenant data without impersonating?

Answer:

3. Should impersonation require a written reason every time?

Answer:

4. Should tenant admins be notified when support impersonation happens?

Answer:

5. Should support impersonation show a visible banner?

Answer:

6. Should destructive actions be blocked during impersonation?

Answer:

7. Should support impersonation sessions expire automatically?

Answer:

8. How long should an impersonation session last?

Answer:

9. Should impersonation be limited to tenant admins only, or any tenant user?

Answer:

10. Should platform owner approval be required before a support admin can impersonate?

Answer:

11. Should all impersonated actions be logged separately?

Answer:

12. Should tenants be able to disable support access?

Answer:

## 16. Platform-Wide Audit Log

1. What actions must always be audited?

Answer:

2. Should every platform admin login be audited?

Answer:

3. Should failed login attempts be audited?

Answer:

4. Should tenant views by platform admins be audited?

Answer:

5. Should audit logs be exportable?

Answer:

6. Who can view platform audit logs?

Answer:

7. Can platform audit logs ever be deleted?

Answer:

8. How long should platform audit logs be retained?

Answer:

9. Should audit logs capture IP address and device information?

Answer:

10. Should sensitive platform actions require a reason?

Answer:

11. Should audit logs include before-and-after values for changes?

Answer:

12. Should tenant admins see audit records involving their tenant?

Answer:

## 17. Leads and Demo Management

1. Should demo requests be stored inside the app?

Answer:

2. Should there be a Leads & Demos section in the Platform Admin Console?

Answer:

3. What information should the demo booking form collect?

Answer:

4. Should leads be assigned to an internal owner?

Answer:

5. What lead statuses do you want?

Suggested:

- New
- Contacted
- Demo Scheduled
- Demo Completed
- Proposal Sent
- Won
- Lost

Answer:

6. Should a lead be convertible into a tenant?

Answer:

7. When converting a lead, what information should carry over to the tenant?

Answer:

8. Should the first tenant admin be created from the lead contact?

Answer:

9. Should demo notes be stored?

Answer:

10. Should proposal values or expected revenue be tracked?

Answer:

11. Should lost leads include a reason?

Answer:

12. Should demo requests trigger email alerts to you?

Answer:

13. Should demo requests trigger Pulse/platform notifications?

Answer:

## 18. Announcements and Platform Notices

1. Do you want platform-wide announcements?

Answer:

2. Who should be able to send announcements?

Answer:

3. Should announcements go to tenant admins only or all users?

Answer:

4. Should announcements support targeting by plan?

Answer:

5. Should announcements support targeting by specific tenant?

Answer:

6. Should announcements require acknowledgement?

Answer:

7. Should maintenance notices appear before users log in?

Answer:

8. Should announcement delivery be tracked?

Answer:

9. Should platform announcements also send email?

Answer:

10. Should tenants be able to opt out of some announcement types?

Answer:

## 19. System Settings

1. What global settings should only the platform owner control?

Answer:

2. Should there be a global maintenance mode?

Answer:

3. What should users see during maintenance mode?

Answer:

4. Should specific tenants be excluded from maintenance mode?

Answer:

5. Should platform admins configure allowed file types?

Answer:

6. Should platform admins configure maximum upload size?

Answer:

7. Should platform admins configure default numbering templates?

Answer:

8. Should platform admins configure default plan limits?

Answer:

9. Should email provider settings be editable from the UI or only from environment variables?

Answer:

10. Should AI provider settings be editable from the UI or only from environment variables?

Answer:

11. Should support contact details be editable from the UI?

Answer:

12. Should legal links such as Terms and Privacy Policy be configurable?

Answer:

## 20. Tenant Branding

1. Should each tenant be able to upload its own logo?

Answer:

2. Should each tenant be able to set brand colors?

Answer:

3. Should white-label branding be premium?

Answer:

4. Should the app still show QMS-MANAJA branding for basic tenants?

Answer:

5. Should tenant branding apply to reports and exports?

Answer:

6. Should tenant branding apply to emails?

Answer:

7. Should tenant branding apply to the login page?

Answer:

8. Should tenant-specific login pages be supported later?

Answer:

## 21. Tenant Data and Storage

1. Should each tenant have separate storage folders?

Answer:

2. Should tenant files be separated by tenant ID in storage paths?

Answer:

3. Should platform admins be able to view tenant files?

Answer:

4. Should tenant admins be able to export all tenant data?

Answer:

5. Should tenants be able to request data deletion?

Answer:

6. How should archived tenant data be handled?

Answer:

7. Should storage usage be calculated automatically?

Answer:

8. Should storage limits block uploads or only warn admins?

Answer:

9. Should document retention rules vary by tenant?

Answer:

10. Should tenant data be restorable after accidental deletion?

Answer:

## 22. Tenant Security

1. Should tenant admins be required to use MFA?

Answer:

2. Should all users eventually be required to use MFA?

Answer:

3. Should password rules vary by tenant?

Answer:

4. Should tenant admins be able to deactivate users immediately?

Answer:

5. Should tenant admins be able to force password resets?

Answer:

6. Should platform admins be able to force tenant-wide logout?

Answer:

7. Should login sessions expire after a set time?

Answer:

8. Should tenant admins see failed login attempts for their users?

Answer:

9. Should platform admins see security alerts across tenants?

Answer:

10. Should suspicious activity automatically lock an account?

Answer:

## 23. Tenant-Level Admin Features

1. What should tenant admins be allowed to manage inside their own tenant?

Answer:

2. Should tenant admins create users directly or invite them by email?

Answer:

3. Should tenant admins assign departments?

Answer:

4. Should tenant admins assign roles?

Answer:

5. Should tenant admins configure department codes?

Answer:

6. Should tenant admins configure SOP numbering?

Answer:

7. Should tenant admins configure change control numbering?

Answer:

8. Should tenant admins manage billing, or only view billing?

Answer:

9. Should tenant admins request upgrades?

Answer:

10. Should tenant admins see usage metrics?

Answer:

11. Should tenant admins see AI usage?

Answer:

12. Should tenant admins manage feature settings inside enabled modules?

Answer:

## 24. HOD and Department Governance

1. Should HOD remain defined as same-department manager for now?

Answer:

2. Should each department eventually have one explicit HOD?

Answer:

3. Should departments have deputy HODs?

Answer:

4. Should HOD assignment be tenant-admin controlled?

Answer:

5. Should platform admins be able to override HOD assignment?

Answer:

6. What should happen if a department has no HOD?

Answer:

7. What should happen if a department has multiple managers?

Answer:

8. Should HOD approval be required for all employee SOP submissions?

Answer:

9. Should HOD approval be optional per tenant?

Answer:

10. Should HOD approval be configurable by document type later?

Answer:

## 25. Plans, Pricing, and Sales Strategy

1. Do you want simple public pricing, or should pricing be demo/contact-sales based?

Answer:

2. Should Core QMS have a public price?

Answer:

3. Should Professional have a public price?

Answer:

4. Should Enterprise always be custom?

Answer:

5. Should pricing be per user, per tenant, or a mix?

Answer:

6. Should there be setup/onboarding fees?

Answer:

7. Should data migration be billed separately?

Answer:

8. Should AI be billed by usage, package, or credit bundles?

Answer:

9. Should annual payment receive a discount?

Answer:

10. Should there be special pricing for small companies?

Answer:

11. Should there be special pricing for multi-site companies?

Answer:

12. What is the main value you want sales conversations to focus on?

Answer:

## 26. Reporting and Commissioner/Client Visibility

1. Should platform admins generate reports about tenant health?

Answer:

2. Should platform admins generate usage reports?

Answer:

3. Should platform admins generate billing reports?

Answer:

4. Should platform admins generate AI cost reports?

Answer:

5. Should tenant admins be able to export their own reports?

Answer:

6. Should reports carry tenant branding?

Answer:

7. Should reports carry QMS-MANAJA branding?

Answer:

8. Should some reports be reserved for premium plans?

Answer:

## 27. Build Phases

1. Do you agree with Phase 1 being focused on tenant creation, tenant admin creation, plans, feature entitlements, and audit logging?

Answer:

2. Is anything missing from Phase 1 that you consider essential?

Answer:

3. Is anything in Phase 1 too much and should be moved later?

Answer:

4. Do you agree with Phase 2 being billing and usage?

Answer:

5. Do you agree with Phase 3 being leads and onboarding?

Answer:

6. Do you agree with Phase 4 being support impersonation, announcements, and advanced governance?

Answer:

7. What should be built first after the current SOP/change-control work is accepted?

Answer:

8. What should not be built until later?

Answer:

9. What features are required before selling to the first external tenant?

Answer:

10. What features are required before selling to enterprise clients?

Answer:

## 28. Data Migration

1. When tenancy is added, should all current data become the first tenant?

Answer:

2. What should that first tenant be called?

Answer:

3. Who should be the first tenant admin for the existing data?

Answer:

4. Should current departments be copied into the first tenant unchanged?

Answer:

5. Should current users be assigned to the first tenant automatically?

Answer:

6. Should current SOP numbering settings become tenant-specific settings?

Answer:

7. Should current audit logs be linked to the first tenant?

Answer:

8. Should current storage files be moved into tenant-specific folders?

Answer:

9. Should migration happen in one step or gradually?

Answer:

10. What data must not be lost during tenancy migration?

Answer:

## 29. User Experience

1. Should platform admin screens look like the current dashboard style?

Answer:

2. Should platform admin screens be denser and more operational?

Answer:

3. Should platform admin screens have their own sidebar?

Answer:

4. Should tenant context be clearly shown when viewing tenant details?

Answer:

5. Should dangerous actions use confirmation modals?

Answer:

6. Should dangerous actions require typing the tenant name?

Answer:

7. Should platform admins see breadcrumbs when inside tenant records?

Answer:

8. Should the console be optimized for desktop first?

Answer:

9. Should the console be usable on mobile?

Answer:

10. What should the first screen show when you open the Platform Admin Console?

Answer:

## 30. Open Concerns

1. What concerns do you have about introducing tenancy?

Answer:

2. What concerns do you have about billing?

Answer:

3. What concerns do you have about AI costs?

Answer:

4. What concerns do you have about tenant data security?

Answer:

5. What concerns do you have about support impersonation?

Answer:

6. What concerns do you have about removing public signup?

Answer:

7. What concerns do you have about pricing and packaging?

Answer:

8. What part of the Platform Admin Console feels most urgent to you?

Answer:

9. What part feels least urgent?

Answer:

10. Is there anything not covered in this questionnaire that you want included?

Answer:
