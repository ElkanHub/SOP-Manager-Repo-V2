# Platform Super Admin Console Questions

# QMS-MANAJA Platform Super Admin Console Questions

## Purpose

This document contains the questions that need to be answered before building the Platform Super Admin Console for QMS-MANAJA.

The goal is to capture the product owner’s thinking on every major part of the platform-level control area: tenants, onboarding, plans, billing, usage, AI costs, support access, lead handling, security, and system settings.

Take time to answer these carefully. Short answers are fine where the decision is simple. Longer answers are useful where the decision affects the business model, compliance posture, or future scalability.

## How To Use This Document

Answer directly under each question.

Recommended answer format:

```markdown
Answer:
```

If a question does not apply yet, write:

```markdown
Answer: Not needed for phase 1.
```

If you are unsure, write:

```markdown
Answer: Unsure. My current thinking is...
```

## 1. Overall Vision

1. What do you want the Platform Super Admin Console to feel like: a business control center, a technical admin area, or a simple tenant setup tool?

Answer:i want it to be a main cantrol center taht gives me insgight into the usge behaviour, peformanceand also the financials, able to know how much is being spent. so basically agood blend of a business control center and a technical admin area.

1. Who exactly will use this console at the beginning? Only you, or other Russolution/team members too?

Answer:so the main operator will be me, then there will be other members too but not from russolution…they will have controlled access. i will have absolute access to everything but i will controll want they can see and do when they come the app, for example like my commissioner, a fellow admin, an auditor…. i should beable to controll their access

1. Should this console be hidden from all tenant users completely, or visible only if a platform admin logs in?

Answer:No tenant user dhouldbe able to see he conrol center

1. Should the Platform Super Admin Console live inside the same app layout, or should it have a separate `/platform` or `/owner` area with its own sidebar?

Answer:Yes the platform super Admin should have its own seperate area and sidebar….so a separate app layout.that is strictly gaurded

1. Should platform admins use the same login screen as tenant users, or should there be a separate platform admin login route?

Answer:no platforma admins should have a separate login route.

1. What is the main outcome you want from this console in the first version?

Answer: the main outcome is to have absolute control of the platform. this is where i will use to solve any problem in the app and get any overview of the app so it has to be flawless

1. What would make the first version successful enough for you to start onboarding real organizations?

Answer:ok so all the processes that will be needed to onboard the first organization should be there annd all neccessary control and oversight processes.

1. Are there any actions you personally want to approve manually before the platform allows them?

Answer:unsure for now

## 2. Naming and Language

1. What should the console be called in the UI?

Options to consider:

- Platform Admin
- Owner Console
- Control Center
- Super Admin Console
- QMS-MANAJA Admin

Answer:Admin Console

1. What should your highest-level account be called?

Options to consider:

- Platform Owner
- Super Admin
- Owner
- Platform Administrator

Answer:Super Admin

1. Should the word “tenant” appear in the UI, or should the UI say “organization”, “client”, or “company” instead?

Answer:Organiation

1. What should client workspaces be called?

Options to consider:

- Tenant
- Organization
- Company
- Workspace
- Client

Answer:Organization

1. Should plans be called “plans”, “packages”, “subscriptions”, or “licenses”?

Answer:Licenses,,,,i might change my mind

1. Should add-on modules be called “add-ons”, “modules”, “feature packs”, or “extensions”?

Answer:add-ons

1. Should suspended tenants see the word “suspended”, or should the app show a softer message like “account temporarily unavailable”?

Answer:yes a softer message

## 3. Role Separation

1. Should platform admins be stored separately from tenant users, or can a tenant user also be a platform admin?

Answer:looking at how the system has been built a user can be promoted to an admin so i think they should not be separated….

1. Should your own platform owner account be completely outside any tenant, or should it also belong to a tenant for testing/demo purposes?

Answer:it should be donein a wayt that it is seperated from the others but then cn also be tested and demoed.

1. Should there be only one platform owner account, or can there be multiple owners?

Answer:There can only two platform owners at most….. but there can be multiple super admins who are controlled by the platform owners….theiracces and right can be controlled.

1. What platform roles do you want in phase 1?

Options to consider:

- Owner
- Support Admin
- Billing Admin
- Implementation Manager
- Read-only Auditor

Answer:all the above

1. Should platform admins be able to create other platform admins?

Answer:the platform owner/super admins are the ones who are able to create or grant admin acess roles. no other admin shouldhave that priveledge.

1. Should only the platform owner be able to create other platform admins?

Answer:yes

1. Should platform admins be required to use MFA before accessing the console?

Answer:yes

1. Should platform admin access be blocked from inactive or unverified accounts?

Answer:yes

1. Should platform admin actions require re-entering a password for sensitive actions?

Answer:yes

## 4. Tenant / Organization Model

1. What should each tenant represent: one company, one site, one legal entity, or one operating unit?

Answer:letskeep it one organization for now

1. Should one company be able to have multiple sites inside one tenant?

Answer: For the first version, we can keep it simple with one tenant = one organization, and add sites later as an Enterprise feature.

1. If a company has multiple sites, should they share SOPs and users, or should each site be separated?

Answer:since for now one organizarion to one site it will mean everything of theirs will be seperated unless they share an organizationbut then that feature of linked organizatioons will be a future addition

1. Should tenant names be unique?

Answer:Yes

1. Should every tenant have a unique workspace URL or slug?

Example:

`qmsmanaja.com/app/company-name`

Answer:yes

1. Should tenants be able to use their own custom domain later?

Answer:no

1. What tenant statuses do you want?

Options to consider:

- Prospect
- Onboarding
- Trial
- Active
- Payment Overdue
- Suspended
- Archived

Answer:all the above

1. What should happen when a tenant is suspended?

Answer:if a tenant is suspended they should be able too login bu then their access to all the related services will be blocked and a message will show up telling themwhy

1. Should suspended tenants still be able to log in and see a billing message, or should login be blocked?

Answer:they should be able to login

1. Should archived tenants be recoverable?

Answer:yes archived tenets should be recoverable….butthis will cost them a fee.

1. Should deleting a tenant ever be allowed, or should tenants only be archived?

Answer:tenants will never be deleted…. deletion will require them toapply for that process and sign the agreement between as where asaproof of deletion will be shown to them

1. What basic information should be required to create a tenant?

Answer:unsure 

1. What optional information would be useful but not required?

Answer:unsure

1. Should tenant creation automatically create default departments?

Answer:unsure

1. Should tenant creation automatically create default numbering formats?

Answer:yes

## 5. Tenant Onboarding

1. What should the onboarding process look like after a client agrees to use the product?

Answer:there will be two typesof onboarding which will come ne after the other….. th online onboarding that will have the questionsand gather all the needed info and the live nboarding where thy will meetwith a representative of theteam and further information will be gathered

1. Who should perform the tenant onboarding: you, an implementation manager, or the tenant admin?

Answer:any of the admins  can be selected to do the live onboarding

1. Should onboarding have a checklist in the Platform Admin Console?

Answer:yes

1. Which checklist items are mandatory before a tenant can go live?

Answer:unsure

1. Should the tenant admin be allowed into the app before onboarding is complete?

Answer:no

1. Should onboarding include uploading the client logo?

Answer:yes

1. Should onboarding include setting the QA department?

Answer:yes

1. Should onboarding include setting department codes?

Answer:no that will b done by them when they are in the app

1. Should onboarding include importing existing SOPs?

Answer:no that will come under instalation

1. Should onboarding include importing existing users?

Answer:that will also come under instalation

1. Should onboarding include setting the first SOP numbering format?

Answer:no that will come under instalation

1. Should onboarding include setting change control numbering?

Answer:

1. Should onboarding include choosing enabled modules?

Answer:yes

1. Should onboarding include a go-live date?

Answer:yes

1. Should onboarding notes be visible only to platform admins, or also to tenant admins?

Answer:a copy will be sent to them after the onboarding process

1. Should tenants have an onboarding progress screen inside their own app?

Answer:yes

1. Should the system send reminders if onboarding is incomplete?

Answer:yes

## 6. Tenant Admin Creation

1. Who should be allowed to create the first tenant admin?

Answer:the platform owners

1. What details are required for creating the first tenant admin?

Answer:unsure

1. Should tenant admins receive an invite email, a temporary password, or a password setup link?

Answer:yes

1. Should tenant admin invites expire?

Answer:yes

1. How long should an invite remain valid?

Answer:recommend

1. Should the platform owner be able to resend tenant admin invites?

Answer:yes

1. Should the platform owner be able to revoke tenant admin invites?

Answer:yes

1. Should tenant admins be required to complete profile setup before accessing the app?

Answer:yes

1. Should tenant admins be required to set up a signature before accessing document-control features?

Answer:yes

1. Should tenant admins be required to set up MFA?

Answer:yes

1. Should there be more than one tenant admin per organization?

Answer:

1. Should tenant admins be able to create other tenant admins?

Answer:yes this control is already in the app

1. Should platform admins be able to transfer tenant ownership from one admin to another?

Answer:yes this has not yet been added to the app

1. What should happen if a tenant admin leaves the organization?

Answer:ownership is transferred, and their access is revoked

## 7. Public Signup and Login

1. Should public signup be fully removed from the marketing site?

Answer:yes

1. Should the login screen show only login, or should it include a “Book Demo” link?

Answer:yes it should include the book a demo link if they are interested

1. Should direct access to `/signup` be blocked, redirected, or hidden only?

Answer:ok it can be redirected to the book a demo

1. Where should blocked signup attempts redirect?

Answer:to book a demo 

1. Should tenant users be created only by tenant admins?

Answer:yes

1. Should tenant admins be created only by platform admins?

Answer:yes

1. Should demo prospects ever be allowed to self-create a trial tenant?

Answer:no

1. If self-service trials are added later, should they be separate from real tenant onboarding?

Answer:yes

1. Should users be able to request access to an existing tenant?

Answer:no

1. Should tenant admins approve user access requests?

Answer:no

## 8. Plans and Packages

1. What plan names do you want to use?

Suggested:

- Core QMS
- QMS Professional
- QMS Enterprise

Answer:what you have is ok

1. Should there be a free trial?

Answer:yes

1. How long should the trial last?

Answer:14 days

1. Should trial tenants have all features, or only Core features?

Answer:only core

1. Should trial tenants have usage limits?

Answer:yes

1. What should be included in Core QMS?

Answer:unsure refer to the docs

1. What should be included in QMS Professional?

Answer:unsure refer to the docs

1. What should be included in QMS Enterprise?

Answer:unsure refer to the docs

1. Should Enterprise always be custom pricing?

Answer:yes

1. Should plans limit the number of users?

Answer:yes…additional users or seats come at a cost

1. Should plans limit storage?

Answer:yes

1. Should plans limit AI usage?

Answer:yes

1. Should plans limit number of SOPs?

Answer:yes

1. Should plans limit number of equipment records?

Answer:yes

1. Should plans limit number of training modules?

Answer:yes

1. Should platform admins be able to override plan limits for special clients?

Answer:yes

1. Should plan changes take effect immediately or at the next billing cycle?

Answer:both…the control should be set in the console

1. Should tenants see their current plan inside their settings?

Answer:yes

1. Should tenants see locked premium features in the UI, or should those features be completely hidden?

Answer:those features shouldbe completely hidden

1. If a premium feature is locked, should the UI show “Request Upgrade”?

Answer:yes

## 9. Feature Entitlements

1. Which features must always be available to every tenant?

Answer:unsure see the docs

1. Which features should be premium?

Answer:unsure refer to the docs

1. Which features should be sold only as add-ons?

Answer:unsure refer to the docs

1. Should platform admins be able to enable one feature manually without changing the tenant’s full plan?

Answer:yes

1. Should feature changes be audited?

Answer:yes

1. Should tenant admins be notified when features are enabled or disabled?

Answer:yes

1. Should disabled features hide sidebar links automatically?

Answer:yes

1. Should disabled server actions be blocked even if someone tries to call them directly?

Answer:yes

1. Should disabled database records be read-only or completely inaccessible?

Answer:unsure…. recommend

1. Should feature entitlements have start and end dates?

Answer:yes

1. Should you support temporary feature trials?

Answer:yes

1. Should add-ons be billed separately or bundled into the tenant subscription?

Answer:it should be bundled in to the subscription but then show clearly as an itenerary

## 10. Billing Management

1. Will billing start as manual billing, automated billing, or a mix of both?

Answer:a mix of both

1. Which payment providers do you want to support eventually?

Options:

- Stripe
- Paystack
- Manual invoice
- Bank transfer
- Mobile money

Answer:all of them…but stripe will have to wait.

1. What billing cycles should be supported?

Options:

- Monthly
- Quarterly
- Annual
- Custom contract

Answer:monthly, annual and custom contract

1. Should tenants be suspended automatically when payment is overdue?

Answer:yes

1. If yes, after how many days?

Answer:7 days

1. Should there be a grace period?

Answer:grace period of three days

1. Should tenant admins receive payment reminders?

Answer:yes

1. Should platform admins receive payment overdue alerts?

Answer:yes

1. Should billing contacts be separate from tenant admins?

Answer:yes

1. What billing statuses do you want?

Suggested:

- Trial
- Active
- Past Due
- Cancelled
- Suspended
- Custom Contract

Answer:all the above

1. Should tenant users see billing status, or only tenant admins?

Answer:only admins

1. Should billing be visible inside the tenant app at all?

Answer:yes the  billing should be in the app 

1. Should invoices be stored in the app?

Answer:yes

1. Should manual payment records be tracked?

Answer:yes

1. Should there be renewal reminders?

Answer:yes

## 11. Usage Metrics

1. Which usage metrics matter most to you as the platform owner?

Answer:

1. Should usage be tracked monthly?

Answer:unsure recomend

1. Should usage be tracked daily too?

Answer:unsure….recomend

1. Should usage be visible to tenant admins?

Answer:yes only the bare minimum required to be visible

1. Should usage be used for billing?

Answer:unsure recommned

1. Should user counts include inactive users?

Answer:yes but it showld show their status

1. Should storage usage include archived files?

Answer:unsure 

1. Should report exports be tracked?

Answer:yes exports are to be tracked

1. Should document uploads be tracked?

Answer:yes

1. Should login activity be tracked for billing/security?

Answer:yes

1. Should the platform alert you when usage spikes unexpectedly?

Answer:yes

1. Should tenants receive warnings before reaching limits?

Answer:yes

1. Should tenants be blocked when limits are reached?

Answer:unsure 

1. Which limits should be hard limits?

Answer:unsure

1. Which limits should be soft warnings only?

Answer:unsure

## 12. AI and External Service Costs

1. Which AI features do you expect to offer first?

Answer:unsure

1. Should AI be included in any base plan, or always sold as an add-on?

Answer:no

1. Should AI usage be measured by credits?

Answer:yes

1. If using credits, what should consume credits?

Answer:check the docs

1. Should each tenant have a monthly AI credit allowance?

Answer:yes

1. Should unused AI credits roll over?

Answer:yes

1. Should tenants be blocked when AI credits run out?

Answer:yes

1. Should tenant admins be able to request more AI credits?

Answer:yes

1. Should platform admins manually approve AI credit increases?

Answer:yes

1. Should AI usage be visible per tenant?

Answer:yes

1. Should AI usage be visible per user?

Answer:no not now

1. Should the platform estimate AI cost in money, not just credits?

Answer:no

1. Should AI actions require tenant admin permission?

Answer:not every time

1. Should some AI features be restricted to QA users only?

Answer:yes

1. What should happen if the external AI service is unavailable?

Answer:soft alert should rollout to the tenants and admins ….platfprm admins should be notified immediately to work onthe issue

1. Do you want to support multiple AI providers later?

Answer:yesyes

1. Should there be a global AI kill switch?

Answer:

1. Should generated AI output require human review before use?

Answer:yes

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

Answer:foe now we will rely on Email, AI, Payment providers, file storage, Document conversion, PDF generation and E-signatures

1. Should each external service have usage tracking?

Answer:yes

1. Should each tenant have limits for external services?

Answer:yes

1. Should platform admins receive alerts when external service costs rise?

Answer:yes

1. Should external service failures appear in the Platform Admin Console?

Answer:yes

1. Should tenant admins see external service outages?

Answer:yes

## 14. Platform Users

1. Will anyone besides you need platform admin access in phase 1?

Answer:yes

1. What roles should your internal team eventually have?

Answer:this will depend n what they will be doing in the app

1. Should support staff be able to see billing details?

Answer:they shouldbeable to see thier status but not the finncial details

1. Should billing staff be able to access tenant data?

Answer:unsure

1. Should implementation staff be able to create tenants?

Answer:yes

1. Should read-only platform auditors exist?

Answer:yes

1. Should platform admins have access expiry dates?

Answer:yes

1. Should platform admin invitations be used instead of direct account creation?

Answer:yes

1. Should platform admins be able to deactivate themselves?

Answer:no

1. Who can deactivate a platform owner?

Answer:there will only be two platform owners, the mainone and the second one whois called n by the main….no one can revoke the main

## 15. Support Access and Impersonation

1. Do you want support impersonation in phase 1?

Answer:no

1. Should platform admins be able to view tenant data without impersonating?

Answer:no

1. Should impersonation require a written reason every time?

Answer:yes

1. Should tenant admins be notified when support impersonation happens?

Answer:yes

1. Should support impersonation show a visible banner?

Answer:yes

1. Should destructive actions be blocked during impersonation?

Answer:yes

1. Should support impersonation sessions expire automatically?

Answer:yes

1. How long should an impersonation session last?

Answer:recommend

1. Should impersonation be limited to tenant admins only, or any tenant user?

Answer:recommend

1. Should platform owner approval be required before a support admin can impersonate?

Answer:yes

1. Should all impersonated actions be logged separately?

Answer:yes

1. Should tenants be able to disable support access?

Answer:yes

## 16. Platform-Wide Audit Log

1. What actions must always be audited?

Answer:unsure…recommed

1. Should every platform admin login be audited?

Answer:yes

1. Should failed login attempts be audited?

Answer:yes

1. Should tenant views by platform admins be audited?

Answer:yes

1. Should audit logs be exportable?

Answer:yes

1. Who can view platform audit logs?

Answer:platform owners

1. Can platform audit logs ever be deleted?

Answer:no

1. How long should platform audit logs be retained?

Answer:recommend

1. Should audit logs capture IP address and device information?

Answer:yes

1. Should sensitive platform actions require a reason?

Answer:yes

1. Should audit logs include before-and-after values for changes?

Answer:recommend

1. Should tenant admins see audit records involving their tenant?

Answer:recommend

## 17. Leads and Demo Management

1. Should demo requests be stored inside the app?

Answer:yes

1. Should there be a Leads & Demos section in the Platform Admin Console?

Answer:yes

1. What information should the demo booking form collect?

Answer:recommend

1. Should leads be assigned to an internal owner?

Answer:unsure

1. What lead statuses do you want?

Suggested:

- New
- Contacted
- Demo Scheduled
- Demo Completed
- Proposal Sent
- Won
- Lost

Answer:all the above

1. Should a lead be convertible into a tenant?

Answer:yes

1. When converting a lead, what information should carry over to the tenant?

Answer:unsure

1. Should the first tenant admin be created from the lead contact?

Answer:unsure

1. Should demo notes be stored?

Answer:recommend

1. Should proposal values or expected revenue be tracked?

Answer:yes

1. Should lost leads include a reason?

Answer:yes

1. Should demo requests trigger email alerts to you?

Answer:yes it should trigger emails to the owners

1. Should demo requests trigger Pulse/platform notifications?

Answer:yes for the pulse of the required admins 

## 18. Announcements and Platform Notices

1. Do you want platform-wide announcements?

Answer:yes

1. Who should be able to send announcements?

Answer:owners and all other platform admins depending on the type of announcement

1. Should announcements go to tenant admins only or all users?

Answer:it dependson what ype of announcement…there should be control over that

1. Should announcements support targeting by plan?

Answer:yes

1. Should announcements support targeting by specific tenant?

Answer:yes

1. Should announcements require acknowledgement?

Answer:yes acknowledgment from tenant admins

1. Should maintenance notices appear before users log in?

Answer:recommend

1. Should announcement delivery be tracked?

Answer:yes

1. Should platform announcements also send email?

Answer:yes

1. Should tenants be able to opt out of some announcement types?

Answer:no

## 19. System Settings

1. What global settings should only the platform owner control?

Answer:unsure….recommend

1. Should there be a global maintenance mode?

Answer:yes

1. What should users see during maintenance mode?

Answer:recommend

1. Should specific tenants be excluded from maintenance mode?

Answer:no

1. Should platform admins configure allowed file types?

Answer:yes

1. Should platform admins configure maximum upload size?

Answer:yes

1. Should platform admins configure default numbering templates?

Answer:yes

1. Should platform admins configure default plan limits?

Answer:recommend

1. Should email provider settings be editable from the UI or only from environment variables?

Answer:from the UI as well

1. Should AI provider settings be editable from the UI or only from environment variables?

Answer:from the UI as well

1. Should support contact details be editable from the UI?

Answer:yes

1. Should legal links such as Terms and Privacy Policy be configurable?

Answer:yes

## 20. Tenant Branding

1. Should each tenant be able to upload its own logo?

Answer:yes

1. Should each tenant be able to set brand colors?

Answer:yes

1. Should white-label branding be premium?

Answer:strict yes

1. Should the app still show QMS-MANAJA branding for basic tenants?

Answer:yes

1. Should tenant branding apply to reports and exports?

Answer:yes

1. Should tenant branding apply to emails?

Answer:recomend

1. Should tenant branding apply to the login page?

Answer:no

1. Should tenant-specific login pages be supported later?

Answer:yes later

## 21. Tenant Data and Storage

1. Should each tenant have separate storage folders?

Answer:unsure….recommend

1. Should tenant files be separated by tenant ID in storage paths?

Answer:unsure recommend

1. Should platform admins be able to view tenant files?

Answer:unsure……recommend

1. Should tenant admins be able to export all tenant data?

Answer:unsure…recommend

1. Should tenants be able to request data deletion?

Answer:yes

1. How should archived tenant data be handled?

Answer:recommend

1. Should storage usage be calculated automatically?

Answer:yes

1. Should storage limits block uploads or only warn admins?

Answer:recommend

1. Should document retention rules vary by tenant?

Answer:it may vary depending on thier policies so it will vary by tenant

1. Should tenant data be restorable after accidental deletion?

Answer:recommend

## 22. Tenant Security

1. Should tenant admins be required to use MFA?

Answer:yes

1. Should all users eventually be required to use MFA?

Answer:yes

1. Should password rules vary by tenant?

Answer:it should be standard

1. Should tenant admins be able to deactivate users immediately?

Answer:yes

1. Should tenant admins be able to force password resets?

Answer:no

1. Should platform admins be able to force tenant-wide logout?

Answer:yes but it will require the aproval of QA admin or another admin

1. Should login sessions expire after a set time?

Answer:reommend

1. Should tenant admins see failed login attempts for their users?

Answer:yes

1. Should platform admins see security alerts across tenants?

Answer:yes

1. Should suspicious activity automatically lock an account?

Answer:yes

## 23. Tenant-Level Admin Features

1. What should tenant admins be allowed to manage inside their own tenant?

Answer:recommend

1. Should tenant admins create users directly or invite them by email?

Answer:invite them by email 

1. Should tenant admins assign departments?

Answer:yes

1. Should tenant admins assign roles?

Answer:yes

1. Should tenant admins configure department codes?

Answer:yes

1. Should tenant admins configure SOP numbering?

Answer:yes

1. Should tenant admins configure change control numbering?

Answer:yes

1. Should tenant admins manage billing, or only view billing?

Answer:recommend

1. Should tenant admins request upgrades?

Answer:yes

1. Should tenant admins see usage metrics?

Answer:only the bare mnium required

1. Should tenant admins see AI usage?

Answer:yes

1. Should tenant admins manage feature settings inside enabled modules?

Answer:recommend

## 24. HOD and Department Governance

1. Should HOD remain defined as same-department manager for now?

Answer:yes

1. Should each department eventually have one explicit HOD?

Answer:not now

1. Should departments have deputy HODs?

Answer:not now

1. Should HOD assignment be tenant-admin controlled?

Answer:not now

1. Should platform admins be able to override HOD assignment?

Answer:not now

1. What should happen if a department has no HOD?

Answer:

1. What should happen if a department has multiple managers?

Answer:the ap has this covered

1. Should HOD approval be required for all employee SOP submissions?

Answer:not strictly

1. Should HOD approval be optional per tenant?

Answer:—-

1. Should HOD approval be configurable by document type later?

Answer:—-

## 25. Plans, Pricing, and Sales Strategy

1. Do you want simple public pricing, or should pricing be demo/contact-sales based?

Answer:recommend

1. Should Core QMS have a public price?

Answer:yes

1. Should Professional have a public price?

Answer:yes

1. Should Enterprise always be custom?

Answer:yes

1. Should pricing be per user, per tenant, or a mix?

Answer:its a mix

1. Should there be setup/onboarding fees?

Answer:onboarding is free but installation is priced

1. Should data migration be billed separately?

Answer:yes

1. Should AI be billed by usage, package, or credit bundles?

Answer:recommend

1. Should annual payment receive a discount?

Answer:yes

1. Should there be special pricing for small companies?

Answer:recommend

1. Should there be special pricing for multi-site companies?

Answer:recommend

1. What is the main value you want sales conversations to focus on?

Answer:recommend

## 26. Reporting and Commissioner/Client Visibility

1. Should platform admins generate reports about tenant health?

Answer:yes

1. Should platform admins generate usage reports?

Answer:yes

1. Should platform admins generate billing reports?

Answer:yes

1. Should platform admins generate AI cost reports?

Answer:yes

1. Should tenant admins be able to export their own reports?

Answer:yes

1. Should reports carry tenant branding?

Answer:recommend

1. Should reports carry QMS-MANAJA branding?

Answer:yes

1. Should some reports be reserved for premium plans?

Answer:depends….recommend

## 27. Build Phases

1. Do you agree with Phase 1 being focused on tenant creation, tenant admin creation, plans, feature entitlements, and audit logging?

Answer:

1. Is anything missing from Phase 1 that you consider essential?

Answer:

1. Is anything in Phase 1 too much and should be moved later?

Answer:

1. Do you agree with Phase 2 being billing and usage?

Answer:

1. Do you agree with Phase 3 being leads and onboarding?

Answer:

1. Do you agree with Phase 4 being support impersonation, announcements, and advanced governance?

Answer:

1. What should be built first after the current SOP/change-control work is accepted?

Answer:

1. What should not be built until later?

Answer:

1. What features are required before selling to the first external tenant?

Answer:

1. What features are required before selling to enterprise clients?

Answer:

## 28. Data Migration

1. When tenancy is added, should all current data become the first tenant?

Answer:this current environment plus data will all become the demo sapce used for demos…. the data we have here does not belong to anybody or organizations

1. What should that first tenant be called?

Answer:—-

1. Who should be the first tenant admin for the existing data?

Answer:—-

1. Should current departments be copied into the first tenant unchanged?

Answer:—-

1. Should current users be assigned to the first tenant automatically?

Answer:—-

1. Should current SOP numbering settings become tenant-specific settings?

Answer:—-

1. Should current audit logs be linked to the first tenant?

Answer:—-

1. Should current storage files be moved into tenant-specific folders?

Answer:—-

1. Should migration happen in one step or gradually?

Answer:—-

1. What data must not be lost during tenancy migration?

Answer:—-

## 29. User Experience

1. Should platform admin screens look like the current dashboard style?

Answer:yes but then it should be clear that this is a platform admin console

1. Should platform admin screens be denser and more operational?

Answer:yes

1. Should platform admin screens have their own sidebar?

Answer:yes

1. Should tenant context be clearly shown when viewing tenant details?

Answer:yes

1. Should dangerous actions use confirmation modals?

Answer:yes

1. Should dangerous actions require typing the tenant name?

Answer:yes

1. Should platform admins see breadcrumbs when inside tenant records?

Answer:yes this is needed for navigation

1. Should the console be optimized for desktop first?

Answer:yes

1. Should the console be usable on mobile?

Answer:yes

1. What should the first screen show when you open the Platform Admin Console?

Answer:recommend

## 30. Open Concerns

1. What concerns do you have about introducing tenancy?

Answer: nothing for now

1. What concerns do you have about billing?

Answer: Nothing for now

1. What concerns do you have about AI costs?

Answer: Nothing for now

1. What concerns do you have about tenant data security?

Answer: does this mean there will need to b a separate pace to manage security related stuff…

1. What concerns do you have about support impersonation?

Answer: Nothing for now

1. What concerns do you have about removing public signup?

Answer: since the platform admin console is in the same code base and there is going to be a different route for the for them to login how will they do that in the PWA

1. What concerns do you have about pricing and packaging?

Answer: Nothing for now

1. What part of the Platform Admin Console feels most urgent to you?

Answer:the parts that will eneable getting and managing the first paying client

1. What part feels least urgent?

Answer:impersonation

1. Is there anything not covered in this questionnaire that you want included?

Answer: Nothing for now