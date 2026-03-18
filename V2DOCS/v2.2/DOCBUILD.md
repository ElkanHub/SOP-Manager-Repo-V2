# SOP-Guard Pro — DOCBUILD.md
> **Documentation Build Plan** | One-pass instruction file for the agent
> Build the complete user documentation site for SOP-Guard Pro from start to finish in a single pass.
> Do not stop between sections. Do not defer anything. Complete the entire build before committing.

---

## WHAT THIS FILE IS

This is the agent's complete instruction set for building the SOP-Guard Pro documentation site. It tells you exactly what to build, where to put it, what every page contains, and how the UI must look and behave.

When BUILD.md and the implemented codebase agree, use both. When they differ, **the implemented codebase is the truth** — document what was actually built, not what was planned. Before writing any content, inspect the actual app to verify how each feature works.

---

## BEFORE YOU START — INFORMATION GATHERING

Do this before writing a single page. It takes 10 minutes and prevents every content error.

**Step 1 — Read these files in full:**
- `V2DOCS/v2.2/BUILD-v2.2.md` — the complete build specification. Primary content source.
- `V2DOCS/v2.2/UI-DESIGN-SPEC-v2.2.md` — the UI specification. Use it to describe what things look like.
- Any files in `/V2DOCS/` or `/content/` in the codebase root.

**Step 2 — Inspect the implemented app:**
Walk through every route in the app and note:
- The actual navigation order in the sidebar
- What each page's heading says
- What status badges are called (exact label text)
- What button labels say (exact text)
- What error messages look like
- Any feature that differs from BUILD.md

**Step 3 — Resolve conflicts:**
If something in BUILD.md says one thing and the app does another, document the app. Flag the difference in a comment in the code but write the docs for the real behaviour.

**Step 4 — Confirm role names:**
The exact role names used in the app UI (not the database values) must match what you write in docs. Check the onboarding wizard and the settings user management table for the exact strings displayed.

---

## ARCHITECTURE DECISIONS

### Where the docs live

The documentation is a **separate route group** inside the existing Next.js app — not a separate project, not a separate domain. It lives at `/docs` and is fully self-contained. To aces the documentation, add a link to the docs in the TopNav-as a button with the text "Docs" or a book icon.

```
/app
  /(docs)
    /layout.tsx                       ← Docs shell — completely different from dashboard shell
    /docs/page.tsx                    ← Docs home / landing
    /docs/[...slug]/page.tsx          ← All doc pages, caught by slug
/content
  /docs/                              ← All MDX content files (see structure below)
/components
  /docs/                              ← All docs-specific components
```

The docs site is accessible to **anyone** — no authentication required. It is public-facing. Do not wrap it in the dashboard middleware. The docs route group has its own layout that does not render the TopNav, Sidebar, or Pulse.

### Content format

All documentation content is written in **MDX** (Markdown + JSX). Install the required packages:

```bash
npm install next-mdx-remote gray-matter
npm install @tailwindcss/typography
npm install rehype-highlight highlight.js
npm install flexsearch
```

Each MDX file has a frontmatter block:
```yaml
---
title: "Page title"
description: "One sentence description for SEO and sidebar"
section: "getting-started"
order: 1
role: "all"    # "all" | "employee" | "manager" | "qa" | "admin"
---
```

### Content file structure

```
/content/docs/
  /getting-started/
    01-introduction.mdx
    02-quickstart.mdx
    03-onboarding.mdx
    04-understanding-your-role.mdx
  /the-pulse/
    01-overview.mdx
    02-notification-types.mdx
    03-notices-and-replies.mdx
    04-personal-todos.mdx
  /sop-library/
    01-overview.mdx
    02-reading-sops.mdx
    03-acknowledging-sops.mdx
    04-searching-cross-department.mdx
    05-submitting-sops.mdx
    06-version-history.mdx
  /approvals/
    01-overview.mdx
    02-reviewing-a-submission.mdx
    03-requesting-changes.mdx
    04-approving-and-activating.mdx
  /change-control/
    01-overview.mdx
    02-understanding-the-diff.mdx
    03-signing-a-change-control.mdx
    04-signature-waiver.mdx
    05-deadlines-and-escalation.mdx
  /equipment/
    01-overview.mdx
    02-adding-equipment.mdx
    03-asset-detail.mdx
    04-logging-pm-completion.mdx
    05-reassigning-tasks.mdx
  /calendar/
    01-overview.mdx
    02-pm-dates.mdx
    03-creating-events.mdx
  /reports/
    01-overview.mdx
    02-sop-change-history.mdx
    03-acknowledgement-log.mdx
    04-pm-completion-log.mdx
    05-notice-log.mdx
    06-ai-risk-insights.mdx
  /messaging/
    01-overview.mdx
    02-direct-messages.mdx
    03-group-conversations.mdx
    04-mentions.mdx
    05-referencing-records.mdx
    06-notifications-and-muting.mdx
  /settings/
    01-your-profile.mdx
    02-your-signature.mdx
    03-notification-preferences.mdx
    04-departments.mdx
    05-user-management.mdx
    06-deactivating-users.mdx
  /admin/
    01-first-setup.mdx
    02-role-system-explained.mdx
    03-granting-admin-access.mdx
    04-audit-log.mdx
  /reference/
    01-role-permissions-matrix.mdx
    02-sop-status-reference.mdx
    03-pulse-item-types.mdx
    04-keyboard-shortcuts.mdx
    05-glossary.mdx
```

**Total: 45 MDX files. Every file must contain complete, accurate content. No placeholder text anywhere.**

---

## DOCS SHELL UI SPEC

The docs shell is completely different from the app shell. It is a documentation site, not a dashboard. Think Next.js docs or Stripe docs — clean, readable, navigation-focused.

### Layout structure

```
┌──────────────────────────────────────────────────────────────┐
│                    Docs TopBar (56px fixed)                   │
├────────────────┬─────────────────────────────────┬───────────┤
│                │                                 │           │
│   Left Nav     │       Content Area              │ On-page   │
│   (260px)      │       max-w-3xl mx-auto         │ nav       │
│   sticky       │       px-8 py-10                │ (200px)   │
│                │                                 │ sticky    │
└────────────────┴─────────────────────────────────┴───────────┘

Breakpoints:
  ≥1280px: All three columns
  1024-1279px: Left nav + content (no on-page nav)
  <1024px: Content only. Left nav behind hamburger drawer.
```

### Docs TopBar

```
Height: 56px, fixed, z-50
Background: white
Border-bottom: 1px solid #E2E8F0
Padding: px-6

Left:
  "SOP-GUARD PRO" — 13px/700 text-[#0D2B55] letter-spacing: 0.08em
  "/" separator — text-slate-300 mx-3
  "Documentation" — 13px text-slate-500

Center: Search bar
  max-w-sm w-full
  Height: 32px, bg-[#F8FAFC], border: 1px solid #E2E8F0, rounded-md
  Placeholder: "Search docs..." with ⌘K badge right-inset (bg-slate-100 text-slate-500 text-11 px-1.5 rounded)
  Search icon 14px text-slate-400 left-inset pl-8

Right:
  "Back to app" — text-13 text-[#1A5EA8] hover:underline
  ArrowUpRight icon 14px inline ml-1
  Only shown when user is authenticated — check session server-side.
  If not authenticated: hidden entirely.
```

### Left Navigation

```
Width: 260px
Position: sticky top-[56px] h-[calc(100vh-56px)] overflow-y-auto
Background: white
Border-right: 1px solid #E2E8F0
Padding: px-4 py-6

─── ROLE FILTER ──────────────────────────────────────────────
Label: "Show content for:" — 11px uppercase text-slate-400 tracking-wide mb-2

Pill buttons (flex flex-wrap gap-1.5 mb-6):
  All · Employee · Manager · QA · Admin

  Active: bg-[#0D2B55] text-white
  Inactive: bg-slate-100 text-slate-600 hover:bg-slate-200
  Style: text-11 px-2.5 py-1 rounded-full cursor-pointer

  Client-side behaviour:
    When a non-"All" role is selected, pages with role !== selected AND role !== "all"
    have their nav links dimmed: opacity-40 and pointer-events-none.
    This guides attention without hiding content.

─── SECTION GROUPS ───────────────────────────────────────────
Sections (in order):
  GETTING STARTED
  THE PULSE
  SOP LIBRARY
  APPROVALS          [QA badge]
  CHANGE CONTROL
  EQUIPMENT & PM
  CALENDAR
  REPORTS
  MESSAGING
  SETTINGS
  ADMIN              [Admin badge]
  REFERENCE

Section header style:
  11px uppercase letter-spacing-wide text-slate-400 font-600
  px-2 py-1 mt-5 mb-1
  flex items-center gap-2

Role badge on restricted sections:
  QA badge:    bg-blue-50 text-blue-700 text-[10px] px-1.5 rounded-full
  Admin badge: bg-purple-50 text-purple-700 text-[10px] px-1.5 rounded-full

─── PAGE LINKS ───────────────────────────────────────────────
Each page link:
  Height: 30px, padding: px-3 py-1.5
  Font: 13px text-slate-600 hover:text-slate-900
  Border-radius: rounded-md
  Display: flex items-center justify-between

  Default: bg-transparent
  Hover: bg-slate-50
  Active: bg-[#EFF6FF] text-[#1A5EA8] font-500
          border-left: 2px solid #00C2A8

  Role-restricted page indicator (right of label):
    Small 6px circle dot
    QA pages: bg-blue-400
    Admin pages: bg-purple-400
```

### Content Area

```
Max-width: 768px (max-w-3xl)
Margin: 0 auto
Padding: px-8 py-10

─── PAGE HEADER ──────────────────────────────────────────────
Shown above the MDX prose content.

Role badge (if page frontmatter role is not "all"):
  Rendered above the h1.
  employee: bg-slate-100  text-slate-700
  manager:  bg-blue-50    text-blue-700
  qa:       bg-indigo-50  text-indigo-700
  admin:    bg-purple-50  text-purple-700
  Style: text-12 px-3 py-1 rounded-full font-500 inline-block mb-3

h1 (page title from frontmatter):
  font-[DM Sans] text-[30px] font-[500] text-slate-900 leading-tight

Description (from frontmatter):
  text-16 text-slate-500 mt-2 mb-8
  padding-bottom: 2rem
  border-bottom: 1px solid #E2E8F0

─── PROSE STYLES ─────────────────────────────────────────────
Class: prose prose-slate max-w-none

Custom overrides (add to global.css or tailwind.config prose settings):
  h2: text-20 font-500 text-slate-800, mt-10 mb-3, pb-2, border-b border-slate-200
  h3: text-16 font-500 text-slate-700, mt-6 mb-2
  p:  text-15 text-slate-700 leading-[1.75]
  a:  text-[#1A5EA8] hover:underline
  code (inline): bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[13px] font-[DM Mono]
  pre: bg-slate-900 text-slate-100 rounded-xl p-5 overflow-x-auto text-13
  img: rounded-xl border border-slate-200 shadow-sm my-6
  li:  text-15 text-slate-700 leading-[1.75]
  strong: font-500 text-slate-900

─── PAGE FOOTER ──────────────────────────────────────────────
mt-12 pt-8 border-t border-slate-200

flex justify-between items-center

Left (if prev page exists):
  "← [Previous page title]"
  text-13 text-[#1A5EA8] hover:underline

Right (if next page exists):
  "[Next page title] →"
  text-13 text-[#1A5EA8] hover:underline
```

### On-Page Navigation

```
Width: 200px
Position: sticky top-[80px]
Hidden below 1280px (xl breakpoint)

Heading: "On this page" — 11px uppercase tracking-wide text-slate-400 mb-3 px-2

Auto-generated from H2 and H3 in current page:
  H2 links: text-13 text-slate-600 hover:text-slate-900 py-1 px-2 rounded-md
  H3 links: text-12 text-slate-500 hover:text-slate-700 py-0.5 pl-5 rounded-md

  Active (scroll spy via IntersectionObserver):
    text-[#1A5EA8] font-500

Scroll spy implementation:
  IntersectionObserver on each h2/h3 in content area.
  rootMargin: "-80px 0px -70% 0px" — activates when heading is near top of viewport.
  Update activeId state on intersection.
```

---

## MDX CUSTOM COMPONENTS

Build all of these in `/components/docs/` before writing any content. Make them globally available in the MDX provider.

---

### `<Callout type="info|warning|tip|danger">`

```tsx
Props: { type: 'info' | 'warning' | 'tip' | 'danger'; children: React.ReactNode }

Styles by type:
  info:    bg-blue-50    border-l-4 border-blue-400    icon=Info 16px text-blue-600
  warning: bg-amber-50   border-l-4 border-amber-400   icon=AlertTriangle 16px text-amber-600
  tip:     bg-teal-50    border-l-4 border-[#00C2A8]   icon=Lightbulb 16px text-[#00C2A8]
  danger:  bg-red-50     border-l-4 border-red-400     icon=AlertOctagon 16px text-red-600

Layout:
  flex gap-3 p-4 rounded-r-lg my-6 border-radius: 0 8px 8px 0
  Icon: flex-shrink-0 mt-0.5
  Content: text-14 leading-relaxed text-slate-700
           strong elements inside: same colour ramp 800 stop

No border-radius on the left side — the left border IS the accent.
```

---

### `<RoleBadge role="employee|manager|qa|admin" />`

```tsx
Props: { role: 'employee' | 'manager' | 'qa' | 'admin' }

Inline pill used inside prose text to indicate who can perform an action.
Renders as a non-breaking inline element.

Styles:
  employee: bg-slate-100  text-slate-700
  manager:  bg-blue-50    text-blue-700
  qa:       bg-indigo-50  text-indigo-700
  admin:    bg-purple-50  text-purple-700

All: text-11 px-2 py-0.5 rounded-full font-500 inline-flex items-center
```

---

### `<RoleAccess roles={["manager","qa"]}>`

```tsx
Props: { roles: Array<'employee'|'manager'|'qa'|'admin'>; children?: React.ReactNode }

Renders a banner at the top of a page section indicating role requirement.
Placed immediately after the page header (before prose begins).

Banner:
  bg-slate-50 border border-slate-200 rounded-lg p-3 mb-8
  flex items-center gap-2 flex-wrap
  "This section applies to:" text-13 text-slate-600
  [RoleBadge] for each role in the roles array

If children provided: renders children below the banner (for section wrappers).
If no children: just renders the banner (for full-page role restriction).
```

---

### `<StepList>` and `<Step number={1} title="Step title">`

```tsx
StepList: wrapper div with relative positioning for the connecting line.
  position: relative
  The vertical connecting line: ::before pseudo-element
    position: absolute, left: 12px, top: 24px, bottom: 24px
    width: 1px, background: #E2E8F0

Step:
  Props: { number: number; title: string; children: React.ReactNode }

  Layout: flex gap-4 mb-8 relative
  
  Step circle:
    width: 24px height: 24px flex-shrink-0
    bg-[#0D2B55] text-white rounded-full
    flex items-center justify-center
    font-[DM Mono] text-12 font-600
    position: relative z-10 (sits above the connecting line)
  
  Content: flex-1
    Title: text-16 font-500 text-slate-900 mb-2
    Children (body): text-14 text-slate-700 leading-relaxed
```

---

### `<KeyboardShortcut keys={["Cmd", "K"]} />`

```tsx
Props: { keys: string[] }

Renders an inline keyboard shortcut sequence.

Each key:
  bg-white border border-slate-300 rounded px-1.5 py-0.5
  text-11 font-[DM Mono] text-slate-700
  box-shadow: 0 1px 0 rgba(0,0,0,0.2)
  display: inline-block

Keys separated by "+" text-slate-400 text-11 mx-1

Special key rendering:
  "Cmd" → "⌘" on Mac (detect via navigator.platform)
  "Ctrl" → "Ctrl"
  "Shift" → "⇧"
  "Enter" → "↵"
  "Escape" → "Esc"
```

---

### `<StatusBadge status="active|draft|pending_qa|pending_cc|superseded" />`

```tsx
Props: { status: string }

Renders exactly as the app's StatusBadge renders — matching colours and labels.
Used inline in docs so users can see visually what to look for in the app.

active:      bg-green-50 text-green-700 dot:green-600    "Active"
draft:       bg-amber-50 text-amber-700 dot:amber-600    "Draft"
pending_qa:  bg-blue-50  text-blue-700  dot:blue-600     "Pending QA"
pending_cc:  bg-blue-50  text-blue-700  dot:blue-600     "Pending CC" + Lock icon
superseded:  bg-slate-50 text-slate-500 dot:slate-400    "Superseded"

Dot: 6px circle, inline, mr-1.5
Font: 12px px-2 py-0.5 rounded-full inline-flex items-center
```

---

### `<ScreenCaption text="..." />`

```tsx
Props: { text: string }

Caption rendered below screenshot images.
text-12 text-slate-500 text-center mt-[-12px] mb-6 italic block
```

---

### `<QuickNav links={[{ label, href, description }]} />`

```tsx
Props: { links: Array<{ label: string; href: string; description?: string }> }

Horizontal grid of navigation cards shown at the top of section overview pages.
Gives users fast access to the most common tasks in that section.

Grid: grid grid-cols-2 gap-3 my-8 (1 col on mobile)

Each card:
  bg-white border border-slate-200 rounded-xl p-4
  hover:border-[#00C2A8] hover:shadow-sm
  transition: all 150ms
  cursor-pointer (navigates to href)
  
  Layout: flex items-start justify-between
  Label: text-14 font-500 text-slate-900
  Description: text-12 text-slate-500 mt-1 (if provided)
  Arrow: ArrowRight 14px text-slate-400 flex-shrink-0 mt-1
```

---

### `<PermissionsTable>`

```tsx
No props — self-contained component with hardcoded permission data.

A styled table for the role permissions matrix.

Header row: bg-[#0D2B55] text-white text-13
  Columns: Action | Employee | Manager | QA Manager | Admin+Manager

Rows alternate: bg-white / bg-slate-50
Border: 1px solid #E2E8F0 on all cells

Check mark: CheckCircle2 16px text-green-600 centered in cell
No permission: "—" text-slate-300 centered
Partial: CheckCircle2 16px text-amber-500 + tooltip explaining the condition

The data in this component must reflect the actual implemented permissions.
Read the RLS policies and server actions to verify each cell.
```

---

## DOCS HOME PAGE `/docs`

This is the first page any user lands on. No left nav — full width centred layout.

```
─── HERO SECTION ────────────────────────────────────────────
Background: bg-[#0D2B55]
Padding: py-16 px-8

Content (max-w-3xl mx-auto text-center):

  "SOP-Guard Pro Documentation"
  font-[DM Sans] text-[38px] font-[500] text-white

  "Everything you need to use SOP-Guard Pro confidently — from your first day to advanced admin setup."
  text-18 text-white/70 mt-3 max-w-xl mx-auto

  Search bar (mt-10 max-w-lg mx-auto):
    Height: 48px bg-white rounded-xl
    padding: pl-12 pr-4 text-15 text-slate-700
    Search icon 18px text-slate-400 absolute left-4
    Placeholder: "Search the documentation..."
    On type: opens search results dropdown
    On click ⌘K badge: focuses input

  Quick start row (mt-10 grid grid-cols-3 gap-4 max-w-3xl mx-auto):
    
    Card 1 — "I'm new here"
      bg-white/10 border border-white/20 rounded-xl p-6
      hover:bg-white/15 cursor-pointer transition-colors
      Rocket icon 24px text-[#00C2A8]
      "Quickstart guide" text-16 font-500 text-white mt-3
      "Up and running in 10 minutes." text-13 text-white/70 mt-1
      → /docs/getting-started/quickstart

    Card 2 — "Browse by feature"
      Same card style
      BookOpen icon 24px text-[#00C2A8]
      "Feature guides" text-16 font-500 text-white mt-3
      "Find the module you need." text-13 text-white/70 mt-1
      → scrolls to feature grid below (#features)

    Card 3 — "Setting up for my team"
      Same card style
      Shield icon 24px text-[#00C2A8]
      "Admin setup guide" text-16 font-500 text-white mt-3
      "Configure your organisation from scratch." text-13 text-white/70 mt-1
      → /docs/admin/first-setup

─── FEATURE GRID ────────────────────────────────────────────
id="features"
Padding: py-16 px-8
Background: white

Heading: "Documentation by feature"
  text-24 font-500 text-slate-900 text-center mb-3
Sub: "Select a topic to jump directly to what you need."
  text-16 text-slate-500 text-center mb-10

Grid (max-w-4xl mx-auto grid grid-cols-3 gap-4):
  (2 cols on tablet, 1 col on mobile)

  Each card:
    bg-white border border-slate-200 rounded-xl p-5
    hover:shadow-md hover:border-[#00C2A8]
    transition: all 200ms
    cursor-pointer (navigate to section overview page)

    Top row: flex items-center justify-between
      Icon 20px text-[#1A5EA8]
      Role badge (if section is role-restricted)

    Title: text-15 font-500 text-slate-900 mt-4
    Description: text-13 text-slate-500 mt-1.5 leading-relaxed
    "Learn more →" text-12 text-[#1A5EA8] mt-4

  Cards (in order):
    BookmarkCheck  "The Pulse"          "Real-time notifications, notices, and personal to-dos."
                   → /docs/the-pulse/overview
    
    BookOpen       "SOP Library"        "Read, search, acknowledge, and submit procedures."
                   → /docs/sop-library/overview
    
    ClipboardCheck "Approvals"          "Review and approve SOP submissions."      [QA badge]
                   → /docs/approvals/overview
    
    GitBranch      "Change Control"     "Manage version changes with digital signatures."
                   → /docs/change-control/overview
    
    Cog            "Equipment & PM"     "Track assets and schedule preventive maintenance."
                   → /docs/equipment/overview
    
    CalendarDays   "Calendar"           "View PM schedules and team events."
                   → /docs/calendar/overview
    
    BarChart2      "Reports"            "Audit trails, compliance logs, and AI insights."
                   → /docs/reports/overview
    
    MessageSquare  "Messaging"          "Direct messages and group chats with record references."
                   → /docs/messaging/overview
    
    Settings       "Settings & Admin"   "Profile, users, departments, and organisation setup."  [Admin badge]
                   → /docs/settings/your-profile

─── HELP FOOTER ─────────────────────────────────────────────
bg-slate-50 border-t border-slate-200
py-10 text-center

"Can't find what you're looking for?"
text-15 text-slate-600

"Contact support" → mailto link or support URL
text-[#1A5EA8] hover:underline ml-2
```

---

## CONTENT SPECIFICATIONS — ALL PAGES

Write every page completely. Every heading, every paragraph, every callout must contain real, accurate information. Verify everything against the actual implemented app before writing.

The specification below gives you the required content for each page. Write it as natural prose in MDX — not as bullet points unless a list is genuinely the right format. Use the custom components (`<Callout>`, `<StepList>`, `<RoleAccess>`, etc.) wherever appropriate.

---

### SECTION: GETTING STARTED

---

#### `01-introduction.mdx` — What is SOP-Guard Pro?

Cover:
- What SOP-Guard Pro is: an industrial compliance platform for managing Standard Operating Procedures and preventive maintenance. Not a document editor — a governance and distribution system.
- The platform's two hubs: the SOP Library (the central repository for all procedures) and the Equipment Registry (the register of all maintained assets). Every other module in the platform connects to one of these two hubs. There are no department pages or department-specific sections — department is an attribute of a person and a tag on a record, not a destination in the app.
- Who uses it: employees read and acknowledge procedures; managers submit SOPs, sign Change Controls, and manage maintenance; QA Managers approve everything before it goes live; administrators manage the organisation's structure and users.
- The Pulse: always visible on the right side of every page. The primary way to know what needs your attention — approvals, signatures, PM alerts, messages, and notices all arrive here in real-time.
- The core compliance guarantee: nothing becomes Active without QA sign-off. This is not a setting that can be changed — it is built into the platform's fundamental design.
- What the platform does NOT do: it is not a document editor (SOPs are written in Microsoft Word), it does not replace email, it does not manage HR, it does not store arbitrary files.
- Where to go next: the Quickstart guide.

---

#### `02-quickstart.mdx` — Quickstart guide

Use `<StepList>` with 5 steps:

Step 1: Sign in and complete onboarding (2 minutes)
- Administrator creates your account. You receive an email invitation.
- On first sign-in, the 4-step onboarding wizard launches automatically.
- Complete all four steps: department and role, profile details, digital signature, and the review screen.
- Your digital signature is required before you can proceed. It is used for signing Change Controls.
- After clicking Complete Setup you land on the Dashboard.

Step 2: Understand the Dashboard (1 minute)
- Four KPI cards showing numbers relevant to your role.
- Activity feed showing recent events in your department.
- The Pulse panel on the right — this is where everything that needs your attention arrives.

Step 3: Explore the SOP Library (3 minutes)
- Navigate to SOP Library in the sidebar.
- The table shows all Active SOPs in your department.
- Click any row to open it in the tab viewer.
- Read it. If there is an Acknowledge button in the header bar, click it to confirm you have read this version.
- Try the search bar at the top: type any keyword and results appear from across the whole organisation.

Step 4: Check the Pulse (1 minute)
- Look at the right-side panel. Items are grouped: Priority (action required), Today (informational), Messages, Personal.
- Priority items need your attention first — these are approvals, signatures, or overdue tasks.
- The teal bell icon in the top navigation shows your unread count at all times.

Step 5: Send your first message (2 minutes)
- Navigate to Messages in the sidebar.
- Click New → Direct Message. Search for a colleague.
- Send a message. Try clicking the paperclip icon to reference a SOP from the library inline.

`<Callout type="tip">` You do not need to learn everything immediately. The platform reveals more as your work requires it. Start with reading SOPs and acknowledging them — everything else follows naturally from there.

---

#### `03-onboarding.mdx` — Completing your onboarding

Cover all four steps of the onboarding wizard in detail:

Step 1 — Department and Role: explain what a department is (the team you belong to, determines which SOPs and equipment you see by default), explain the two roles (Manager vs Employee — what each can and cannot do), note that Manager is required to submit SOPs and sign Change Controls, note the warning that appears when Manager is selected, and explain that if your department or role is incorrect you must contact your admin to fix it.

Step 2 — Profile Details: required fields (Full Name, Job Title) vs optional (Employee ID, Phone), avatar upload instructions.

Step 3 — Digital Signature: two methods (draw on screen, or upload a PNG/JPG), why it is required (used for legally binding Change Control signatures), what makes a good signature, how to re-draw if unsatisfied. Emphasise that the Continue button is disabled until a signature is captured.

Step 4 — Review and Confirm: what the summary card shows, what clicking Complete Setup does, where you land after.

`<Callout type="warning">` If your department or role is wrong, do not continue using the platform with incorrect settings — contact your administrator immediately. Department and role determine what you see and what you can do throughout the entire platform.

Updating signature later: Settings → My Profile → Re-draw Signature.

---

#### `04-understanding-your-role.mdx` — Understanding your role and permissions

Cover:
- The three attributes every user has: department, role (Manager or Employee), and the admin flag.
- Employee in plain language: read SOPs, acknowledge them, complete PM tasks, send messages and notices. The platform shows you what is relevant to your work.
- Manager in plain language: everything Employee can do, plus submit SOPs for approval, sign Change Controls, add equipment to the registry, and reassign PM tasks.
- The Admin flag: an additional layer of capability that can be added on top of Manager or Employee. Adds user management, department management, and full audit log access. Does not change operational permissions — an Admin+Employee still cannot sign a Change Control.
- QA: a department designation, not a separate role. A QA Manager is a user in the QA department with the Manager role. They can see all SOPs and equipment across all departments, and they are the only users who can approve SOP submissions and equipment additions.
- Full `<PermissionsTable>` showing every major action.
- `<Callout type="info">` You cannot change your own role. If your role is incorrect, contact your administrator.

---

### SECTION: THE PULSE

---

#### `01-overview.mdx` — The Pulse — your work feed

Cover:
- What the Pulse is and where it lives (fixed right panel, always visible).
- Why it is always visible: it is the primary work interface, not a notification drawer. When something needs your attention, it arrives here.
- The four groups: Priority (action required now), Today (relevant today), Messages (notices and chat notifications), Personal (your to-dos).
- Real-time delivery: items appear without page refresh.
- The unread badge: visible in the top nav at all times, even on smaller screens where the Pulse panel is hidden.
- Marking items as read: click any item. Mark all read button at the top.
- The difference between the Pulse and Messages: the Pulse is a notification feed. Messages is a conversation system. A new chat message creates a Pulse notification that links to the conversation. The conversation itself lives in Messages.

---

#### `02-notification-types.mdx` — Notification types in the Pulse

A comprehensive table of every Pulse item type. For each type cover: what triggers it, who receives it, what it looks like (icon, colour), and what action (if any) is required.

Types to cover: approval_request, approval_update, cc_signature, cc_deadline, pm_due, pm_overdue, sop_active, notice, message, message_mention (mention-specific variant), todo, system.

`<Callout type="tip">` Priority group items (orange/red dot) always appear at the top of the Pulse regardless of when they arrived. Check the Priority group first — these are the items that can block other people's work if you delay.

---

#### `03-notices-and-replies.mdx` — Sending notices and replying

Cover:
- What a notice is vs what a message is (broadcast announcement vs conversation).
- How to open the notice composer (Send Notice button at the bottom of the Pulse).
- Audience options: Individual (search by name), My Department, Everyone.
- Writing a notice: subject required, body required, 500 character limit.
- Replies: recipients reply inline in the Pulse. Thread depth is one level — replies cannot be replied to.
- `<Callout type="info">` For back-and-forth conversation use Messaging. For broadcasting information to your team or the whole organisation, use a Notice.

---

#### `04-personal-todos.mdx` — Personal to-dos

Cover:
- What they are and who can see them (only you).
- How to add: input at the bottom of the Pulse.
- How to complete: checkbox on the item.
- Practical use: tracking what you are waiting on.

---

### SECTION: SOP LIBRARY

---

#### `01-overview.mdx` — SOP Library overview

Cover: what the Library is, default view (own dept Active SOPs), status badges and what each means for a regular employee, the tab viewer, the locked indicator, the two-layer visibility rule explained simply.

`<QuickNav>` with links to: Reading SOPs, Acknowledging SOPs, Searching cross-department, Submitting SOPs (manager only).

---

#### `02-reading-sops.mdx` — Reading SOPs

Cover: opening a SOP (click any row), the viewer header (what each field means), how the document renders (Word → read-only HTML), multiple tabs (up to 8, closing with ×), the "no in-app editor" principle.

---

#### `03-acknowledging-sops.mdx` — Acknowledging a SOP

Cover: what an acknowledgement is (formal record of reading), when the button appears, how to acknowledge (click button → confirmed state), what happens after (button replaced by green confirmed indicator), re-acknowledgement when a SOP updates, cross-dept SOPs cannot be acknowledged, where acknowledgements are reported.

`<Callout type="warning">` When a SOP updates to a new version, your old acknowledgement does not carry over. You will see the Acknowledge button again for the new version — this is intentional.

---

#### `04-searching-cross-department.mdx` — Searching across departments

Cover: the search bar searches all Active SOPs org-wide, department badge on every result, what you can do with a cross-department result (read only), the "read only" badge in the viewer, why this is useful.

`<Callout type="info">` Only Active SOPs appear in cross-department search. Draft and pending SOPs from other departments are not visible — by design.

---

#### `05-submitting-sops.mdx` — Submitting a SOP for approval

`<RoleAccess roles={["manager","qa"]}>`

Cover: who can submit, two types (New vs Update), file requirements (.docx only, 25MB max), step-by-step for new SOP submission, step-by-step for update submission, locked SOP warning, what happens after submission, what "QA responses" look like in the Pulse, the path for new SOPs (direct activation) vs updates (Change Control triggered).

`<Callout type="tip">` Write specific, actionable notes in the Notes to QA field. "Updated safety thresholds in Section 3 following new regulatory guidance" is far more useful to a QA reviewer than "minor updates". Good notes lead to faster approvals.

---

#### `06-version-history.mdx` — Viewing version history

Cover: every SOP keeps its complete history, opening the Version History sheet, what it shows, viewing an old version (SUPERSEDED banner), old versions are read-only.

---

### SECTION: APPROVALS

---

#### `01-overview.mdx` — QA Approvals overview

`<RoleAccess roles={["qa"]}>`

Cover: what the Approvals page is, where to find it (only visible to QA Managers), what the queue shows, submission history tracking, self-approval block.

`<Callout type="danger">` You cannot approve a SOP you submitted yourself. The system rejects self-approval automatically.

---

#### `02-reviewing-a-submission.mdx` — Reviewing a submission

`<RoleAccess roles={["qa"]}>`

Cover: opening a submission (click Review), the two-panel layout, what the left panel shows (the submitted file, not the current live version), the right panel details, the review thread.

---

#### `03-requesting-changes.mdx` — Requesting changes

`<RoleAccess roles={["qa"]}>`

Cover: when to request changes, how to do it (Request Changes button → textarea → Send), writing useful feedback (specific is better), what the submitter sees, the resubmission process, the persistent thread.

`<Callout type="tip">` Use the review thread as working notes. Document what you checked, what was acceptable, and what needs changing. This creates a clear record for both parties.

---

#### `04-approving-and-activating.mdx` — Approving a SOP

`<RoleAccess roles={["qa"]}>`

Cover: when to approve, how to approve (Approve button), what happens for a new SOP (direct activation), what happens for an update (Change Control triggered), the submitter notifications in both cases, major vs minor version bump option.

`<Callout type="info">` Approving a SOP update is not the final step — it triggers the Change Control process. The new version only goes Active after all required managers have signed.

---

### SECTION: CHANGE CONTROL

---

#### `01-overview.mdx` — Change Control overview

Cover: what a Change Control is and why it exists (formal record with audit trail), when it is triggered (QA approves an update), who signs (snapshot of managers at CC creation time), the 14-day deadline, what happens when complete (new version active, old superseded, dept notified).

---

#### `02-understanding-the-diff.mdx` — Understanding the document comparison

Cover: what the diff viewer shows, colour coding (red=removed/changed, green=added/changed), Show All vs Changes Only toggle, the AI summary (Gemini-generated, bullet points), the permanent AI disclaimer.

`<Callout type="warning">` The AI summary is a convenience tool, not a legal record. Always read the actual diff before signing. Your signature confirms you reviewed the document changes, not just the AI summary.

---

#### `03-signing-a-change-control.mdx` — Signing a Change Control

`<RoleAccess roles={["manager","qa"]}>`

Cover: who receives the signing request (cc_signature Pulse notification), finding the CC (via Pulse link or Library), the signature grid layout, step-by-step signing process (review diff → click Sign Document → modal shows stored signature → Confirm & Sign), after signing, what happens when all signatures are collected.

`<Callout type="danger">` Your digital signature is legally binding within your organisation. Do not sign without reading the document changes. The AI summary is a guide only.

---

#### `04-signature-waiver.mdx` — Waiving a required signature

`<RoleAccess roles={["admin"]}>`

Cover: when waivers are needed, who can waive (Admin only), how to waive (hover row → Waive button → reason required → confirm), what the waived row shows, the permanent audit trail entry, when to use sparingly.

`<Callout type="danger">` Every waiver is permanently logged with the admin's identity, the waived user, the reason, and the timestamp. This cannot be removed.

---

#### `05-deadlines-and-escalation.mdx` — Deadlines and escalation

Cover: the 14-day deadline, the deadline display colours (green/amber/red), escalation notifications to Admins when deadline passes, what Admins should do, what non-admin users see.

---

### SECTION: EQUIPMENT & PM

---

#### `01-overview.mdx` — Equipment Registry overview

Cover: what the Registry is, default view, statuses (Pending QA, Active, Inactive), the Next Due column and urgency colours, QA approval requirement.

`<QuickNav>` with links to: Adding Equipment, Asset Detail, Logging PM Completion, Reassigning Tasks.

---

#### `02-adding-equipment.mdx` — Adding new equipment

`<RoleAccess roles={["manager","qa"]}>`

Cover: who can add, opening the modal, the three-step form in detail (Basic info including Asset ID format, Maintenance including frequency options and the importance of Last Serviced date, and Initial Assignee being required), after submission QA approval flow.

`<Callout type="tip">` The Last Serviced date seeds the entire maintenance schedule. If equipment was recently serviced, enter the actual date. If never serviced, enter today as the start date.

---

#### `03-asset-detail.mdx` — Asset detail page

Cover: opening an asset, the left column contents (metadata, QR code with explanation), the right column (Next Service card, Log PM Completion button, Service History), secondary department access.

---

#### `04-logging-pm-completion.mdx` — Logging a PM completion

Cover: who can log (employees and managers in primary or secondary dept), how to log (button on asset detail), what to fill in (notes required, photo optional), what happens after (service history updates, next due recalculates, new task auto-created).

`<Callout type="info">` You do not need to be the assigned person to log a completion. If someone else completes the work, they can log it — the completed_by field records who actually did the work.

---

#### `05-reassigning-tasks.mdx` — Reassigning PM tasks

`<RoleAccess roles={["manager"]}>`

Cover: when to reassign, how to reassign (Service History table → kebab menu → Reassign), selecting from active department members, no automatic notification to new assignee, audit trail logging.

---

### SECTION: CALENDAR

---

#### `01-overview.mdx` — Company Calendar

Cover: two types of entries (PM dates automatic, manual events), chip colour coding, navigation, the upcoming panel.

---

#### `02-pm-dates.mdx` — PM dates on the calendar

Cover: PM dates are automatic, when they update, clicking a PM chip, using the calendar for maintenance planning.

---

#### `03-creating-events.mdx` — Creating calendar events

Cover: how to open the new event modal (hover + button), fields, visibility options (My Department / Public), editing and deleting own events, limitation that events are informational (no Pulse notifications).

`<Callout type="info">` For time-sensitive team communication, use a Notice via the Pulse. Calendar events are informational and do not trigger any notifications.

---

### SECTION: REPORTS

---

#### `01-overview.mdx` — Reports overview

Cover: what Reports is (historical data views, not live dashboard), the five report types, date range filter, CSV export, access levels by report.

`<QuickNav>` linking to each of the five reports.

---

#### `02-sop-change-history.mdx` — SOP Change History

Cover: what it shows, columns, access levels, use cases (regulatory audit prep, tracking when a SOP was last updated).

---

#### `03-acknowledgement-log.mdx` — Acknowledgement Log

Cover: what it shows, columns, access levels, use cases (verifying team has read an updated SOP, compliance audit evidence).

`<Callout type="tip">` After a Change Control completes, run this report filtered to that SOP to track who has and has not acknowledged the new version.

---

#### `04-pm-completion-log.mdx` — PM Completion Log

Cover: what it shows, columns (noting that Assigned To and Completed By are separate fields), access levels, use cases.

---

#### `05-notice-log.mdx` — Pulse / Notice Log

`<RoleAccess roles={["admin"]}>`

Cover: what it shows, columns, Admin-only access.

---

#### `06-ai-risk-insights.mdx` — AI Risk Insights

`<RoleAccess roles={["qa","admin"]}>`

Cover: what it is, how to generate, what it produces (risk level + bullet points), risk level colours, cache behaviour and regenerate, the permanent disclaimer.

`<Callout type="warning">` AI Risk Insights is a supplementary tool. The assessment is AI-generated and is not a substitute for manual review, professional judgement, or regulatory compliance assessment.

---

### SECTION: MESSAGING

---

#### `01-overview.mdx` — Messaging overview

Cover: what the module is, where to find it, conversation types (DM and Group), the unique in-app reference feature, privacy guarantee (enforced at DB level not just UI), distinction from the Pulse (notification feed vs conversation), what file uploads are not supported and the fallback message.

---

#### `02-direct-messages.mdx` — Direct messages

Cover: starting a new DM, one-conversation-per-pair enforcement, sending messages, keyboard shortcuts (Enter/Shift+Enter), editing (15-minute window, locked after, edited label), deleting (soft-delete, "This message was deleted." replacement).

---

#### `03-group-conversations.mdx` — Group conversations

Cover: starting a group (minimum 2 others, name required), adding members later, group name, leaving a group, notification settings overview (detailed in notifications page).

`<Callout type="info">` Unlike direct messages, group conversations can be muted. If a group is very active and you only need to check it periodically, change the notification setting to Muted.

---

#### `04-mentions.mdx` — Mentioning someone

Cover: how to mention (type @, see suggestions, select), how mentions render (teal highlight, brighter for own mentions), mention notifications override mute settings, practical use in busy groups.

---

#### `05-referencing-records.mdx` — Referencing records in messages

Cover: what a reference is vs a file upload, how to open the reference picker (paperclip icon), what you can reference (SOPs, equipment, Change Controls), search and browse modes, one reference per message, how the reference card renders in the thread (type label, title, status badge, Open button), status updates on the card over time (superseded, inactive), the Open button follows Library visibility rules for cross-dept SOPs, file upload limitation and the platform message shown.

`<Callout type="tip">` This is the most powerful feature of messaging in SOP-Guard Pro. Instead of saying "check SOP-007", embed the actual SOP — your colleague clicks Open and reads it immediately, in context, without leaving the conversation.

---

#### `06-notifications-and-muting.mdx` — Message notifications and muting

Cover: DM notifications (always on, cannot mute), group notification settings (All / Mentions only / Muted), how to change settings (conversation header → Settings icon), the muted indicator in the conversation list, unread count still updates for muted conversations.

---

### SECTION: SETTINGS

---

#### `01-your-profile.mdx` — Editing your profile

Cover: where to find settings, what is editable (name, job title, employee ID, phone), saving changes, avatar upload (size limits, circular preview), what cannot be changed (department, role, admin status — admin sets these).

---

#### `02-your-signature.mdx` — Your digital signature

Cover: where signature is used (Change Control signing), viewing current signature, re-drawing (Settings → My Profile → Re-draw Signature → same interface as onboarding), that updates affect future signings only — past certificates are immutable.

`<Callout type="info">` Your signature is stored securely and only accessible by the platform. It is never shared externally.

---

#### `03-notification-preferences.mdx` — Notification preferences

Cover: the two toggles (in-app Pulse, email), what each controls, recommendation to keep both on, context for when disabling might be appropriate.

---

#### `04-departments.mdx` — Managing departments

`<RoleAccess roles={["admin"]}>`

Cover: where to find (Settings → Departments tab), what departments are, adding (name unique and permanent, colour choice), editing (colour only, name cannot change), deleting (blocked if has users or SOPs — specific counts shown in error), QA department cannot be deleted.

`<Callout type="danger">` Department names are permanent after creation. Choose carefully. The name appears in badges throughout the platform and in all historical reports. If a department needs to be renamed, contact your platform administrator — the database name must match the display name consistently.

---

#### `05-user-management.mdx` — Managing users

`<RoleAccess roles={["admin"]}>`

Cover: where to find, the user table columns, how users join (self-service signup → onboarding → appear in table), changing role, changing department, granting admin (password confirmation required), revoking admin, the prohibition on changing own account, inactive users section.

`<Callout type="danger">` You cannot change your own role, department, or admin status. These operations can only be performed on other users. This prevents accidental self-lockout.

---

#### `06-deactivating-users.mdx` — Deactivating and reactivating users

`<RoleAccess roles={["admin"]}>`

Cover: what deactivation does (is_active = false, session terminated immediately, cannot log in, sees deactivation message), what it does NOT do (does not delete — all historical data preserved), how to deactivate, what the user sees, reactivation, the soft-delete guarantee for compliance purposes.

`<Callout type="info">` SOP-Guard Pro uses soft-delete for users — nobody is ever permanently removed. This is intentional: regulatory compliance requires that records of who signed what and who performed which maintenance tasks are preserved indefinitely, even after someone leaves the organisation.

---

### SECTION: ADMIN

---

#### `01-first-setup.mdx` — First-time organisation setup

`<RoleAccess roles={["admin"]}>`

`<StepList>` with 6 steps:

Step 1: Create the first admin account — navigate to /setup (only accessible before any admin exists), fill in the form, complete onboarding, first admin is placed in QA by default.

`<Callout type="warning">` The /setup route is permanently inaccessible after the first admin account is created. If you need to access it again (e.g. testing a fresh installation), all admin accounts must first be removed from the database.

Step 2: Set up departments — Settings → Departments, QA already exists, add all teams with descriptive names and colours.

Step 3: Invite your team — share the signup URL, they complete onboarding themselves, review new users in Settings → Users for correct department and role.

Step 4: Assign admin access — Settings → Users → Grant Admin for appropriate people, requires password confirmation.

Step 5: Add SOPs — QA Managers begin uploading .docx files, each goes through the approval flow.

Step 6: Register equipment — Managers add equipment records, each requires QA approval before entering maintenance rotation.

---

#### `02-role-system-explained.mdx` — The role system explained

`<RoleAccess roles={["admin"]}>`

Cover all combinations in detail, the `<PermissionsTable>`, key distinctions (admin is a flag not a role, QA visibility is department-based, admin does not override operational role).

---

#### `03-granting-admin-access.mdx` — Granting and revoking admin access

`<RoleAccess roles={["admin"]}>`

Cover: why password confirmation is required (high-impact irreversible-feeling action, deliberate friction), the permanent audit log entry for every grant/revoke, recommendations for limiting admin access, what to do when an admin leaves the organisation.

---

#### `04-audit-log.mdx` — The audit log

`<RoleAccess roles={["qa","admin"]}>`

Cover: what it is (append-only, permanent record), who can access, what is recorded (comprehensive list), what is NOT recorded (messages, to-dos, calendar events), the append-only guarantee (enforced at DB level), how to use it for regulatory audits (export via Reports).

---

### SECTION: REFERENCE

---

#### `01-role-permissions-matrix.mdx` — Role permissions matrix

Full `<PermissionsTable>` covering all actions. Every cell must reflect the actual implemented permissions — verify against RLS policies and server actions before writing.

---

#### `02-sop-status-reference.mdx` — SOP status reference

A `<StatusBadge>` for each status followed by a clear definition:

- `<StatusBadge status="draft" />` **Draft** — Created, not yet submitted. Visible to Managers in the owning dept and QA only.
- `<StatusBadge status="pending_qa" />` **Pending QA** — Submitted for review. In the QA queue. Not visible to Employees.
- `<StatusBadge status="pending_cc" />` **Pending CC** — QA approved. Change Control issued. Locked. Not visible to Employees.
- `<StatusBadge status="active" />` **Active** — The current operative version. Visible to all users in the dept and via cross-dept search.
- `<StatusBadge status="superseded" />` **Superseded** — A previous version replaced by a newer Active version. Accessible via Version History only.

---

#### `03-pulse-item-types.mdx` — Pulse item type reference

A comprehensive reference table of all pulse item types — matches the notification types page but formatted as a quick-reference table. Include: type, trigger, who receives it, action required (yes/no), links to.

---

#### `04-keyboard-shortcuts.mdx` — Keyboard shortcuts

Using `<KeyboardShortcut>` components, document every shortcut:

| Action | Shortcut |
|--------|----------|
| Open global search | ⌘K / Ctrl+K |
| Close current SOP tab | ⌘W / Ctrl+W |
| Go to Dashboard | G then D |
| Go to SOP Library | G then L |
| Go to Equipment | G then E |
| Go to Calendar | G then C |
| Go to Messages | G then M |
| Go to Reports | G then R |
| Go to Settings | G then S |
| Send message | Enter |
| New line in message | Shift+Enter |
| Cancel message edit | Escape |
| Navigate mention suggestions | ↑ ↓ |
| Select mention | Enter or Tab |
| Dismiss mention list | Escape |

---

#### `05-glossary.mdx` — Glossary

Define every technical term used in the platform UI. Include at minimum:

**Acknowledgement** — A formal record that a user has read the current version of a SOP. Logged with user name, SOP, version, and timestamp.

**Active** — The status of a SOP or equipment record that is currently live and in force.

**Asset ID** — A unique identifier for a piece of equipment in the Equipment Registry (e.g. ASSET-001).

**Audit Log** — A permanent, append-only record of all significant actions in the platform. Cannot be modified or deleted.

**Change Control** — A formal process for updating a SOP from one version to another, requiring digital signatures from all relevant managers before the new version goes live.

**Department** — A team or division within an organisation. Users belong to exactly one department. SOPs and equipment have a primary department and optionally secondary departments.

**Diff Viewer** — The side-by-side comparison tool in a Change Control that shows exactly what changed between the old and new version of a SOP.

**Digital Signature** — A handwritten signature image stored during onboarding, combined with an immutable database record capturing user ID, timestamp, and IP address. Used for signing Change Controls.

**The Gold Rule** — The platform's core visibility rule: employees only ever see SOPs with status Active. Enforced at the database level.

**Locked SOP** — A SOP with an active Change Control in progress. Cannot accept new edit submissions until the CC completes.

**PM Task** — A scheduled preventive maintenance task for a registered equipment asset.

**The Pulse** — The fixed real-time notification and work feed on the right side of every page.

**QA** — Quality Assurance. The department responsible for approving SOPs and equipment additions. The sole approval authority in the platform.

**Reference Card** — An inline card embedded in a chat message that links to a specific SOP, equipment record, or Change Control in the platform.

**Secondary Department** — An additional department tag on a SOP or equipment record. Users in a secondary department can view and interact with the record even though it primarily belongs to another department.

**Signatory** — A Manager required to digitally sign a Change Control. Signatories are determined at the time the Change Control is created and cannot be changed (only waived by an Admin).

**Soft Delete** — A data deletion approach where a record is marked inactive rather than removed. SOP-Guard Pro uses soft delete for users — setting is_active = false rather than deleting the row, preserving all historical references.

**SOP** — Standard Operating Procedure. A document describing how a specific task or process should be performed.

**Superseded** — A SOP version that has been replaced by a newer Active version. Still accessible via Version History but no longer the operative procedure.

**Version History** — A complete log of all versions of a SOP that have ever been approved and activated, accessible from the SOP viewer.

---

## SEARCH IMPLEMENTATION

### Search index generation

Create `/scripts/build-search-index.js`. This script runs during `next build`.

It should:
1. Read all MDX files from `/content/docs/` recursively
2. Parse frontmatter with `gray-matter`
3. Strip MDX syntax (components, JSX) to extract plain text
4. Build an array of `SearchEntry` objects
5. Write to `/public/search-index.json`

Add to `package.json`:
```json
"scripts": {
  "prebuild": "node scripts/build-search-index.js"
}
```

The `SearchEntry` interface:
```typescript
interface SearchEntry {
  id:          string;      // unique slug
  title:       string;      // from frontmatter
  description: string;      // from frontmatter
  section:     string;      // human-readable section name
  slug:        string;      // URL: /docs/section/page-name
  excerpt:     string;      // first 200 chars of plain-text content
  role:        string;      // from frontmatter role field
}
```

### Client-side search

Load `flexsearch` and the index in the search bar component:

```typescript
// Lazy-load on first keystroke to avoid blocking initial render
const loadSearch = async () => {
  const { default: FlexSearch } = await import('flexsearch');
  const res = await fetch('/search-index.json');
  const entries: SearchEntry[] = await res.json();
  const index = new FlexSearch.Index({ tokenize: 'forward' });
  entries.forEach((e, i) => index.add(i, `${e.title} ${e.description} ${e.excerpt}`));
  return { index, entries };
};
```

### Search results dropdown

```
Position: absolute, full width of search bar, top: 40px
bg-white border border-slate-200 rounded-xl shadow-lg z-50
max-height: 400px overflow-y-auto

Result row (height: 56px px-4 hover:bg-slate-50 cursor-pointer):
  flex items-start gap-3 py-3
  
  Section label: text-10 uppercase tracking-wide text-slate-400
                 bg-slate-100 px-1.5 py-0.5 rounded text-center
                 width: 80px flex-shrink-0 mt-0.5
  
  Content:
    Title: text-14 font-500 text-slate-900
    Excerpt: text-12 text-slate-500 line-clamp-1 mt-0.5

No results: "No results for '[query]'" text-13 text-slate-500 px-4 py-6 text-center

Keyboard nav:
  ↑↓ to move active result
  Enter to navigate to active result
  Escape to close
  Active result: bg-blue-50 ring-1 ring-[#1A5EA8] ring-inset
```

---

## ROUTING AND NAVIGATION

### Dynamic route handler

`/app/(docs)/docs/[...slug]/page.tsx`:

```typescript
// slug = ['sop-library', 'reading-sops']
// Find file: /content/docs/sop-library/02-reading-sops.mdx
// Match by stripping the numeric prefix from the filename
// Return 404 if no match

export async function generateStaticParams() {
  // Return all slug combinations for static generation at build time
}
```

Numeric prefixes on filenames control ordering only. URLs never include them:
- File: `02-reading-sops.mdx` → URL: `/docs/sop-library/reading-sops`

### Prev/Next link generation

At build time, compute ordered page list from all MDX frontmatter (sorted by section order then page order). Inject `prev` and `next` into each page's props.

### Active nav highlighting

Use `usePathname()` from `next/navigation`. Match the current path to nav item hrefs. Auto-expand the parent section when a child page is active.

### 404 handling

Custom not-found page for the docs route group:
```
/app/(docs)/not-found.tsx
```
Shows: "Page not found" heading, "The documentation page you were looking for does not exist.", "Back to docs home" link.

---

## MIDDLEWARE EXCLUSION

Add the docs routes to the middleware exclusion matcher so they bypass the auth check:

```typescript
// middleware.ts
export const config = {
  matcher: [
    '/((?!docs|_next/static|_next/image|favicon.ico|search-index.json).*)'
  ]
}
```

The "Back to app" link in the TopBar checks for a valid session server-side and renders only when authenticated:
```typescript
const supabase = createServerClient(...)
const { data: { user } } = await supabase.auth.getUser()
// Pass isAuthenticated as prop to TopBar component
```

---

## TAILWIND CONFIG ADDITION

Add to `tailwind.config.ts` if not already present:

```typescript
plugins: [
  require('@tailwindcss/typography'),
],
theme: {
  extend: {
    typography: {
      DEFAULT: {
        css: {
          maxWidth: 'none',
          h2: {
            borderBottom: '1px solid #E2E8F0',
            paddingBottom: '0.5rem',
          },
          code: {
            backgroundColor: '#F1F5F9',
            color: '#1E293B',
            borderRadius: '4px',
            padding: '0.2em 0.4em',
            fontWeight: '400',
          },
          'code::before': { content: 'none' },
          'code::after': { content: 'none' },
        }
      }
    }
  }
}
```

---

## COMPLETION CHECKLIST

Run every item before committing. Mark nothing complete until all 45 pages have real content.

**Package installation:**
- [ ] `next-mdx-remote` installed
- [ ] `gray-matter` installed
- [ ] `@tailwindcss/typography` installed and added to tailwind.config.ts
- [ ] `rehype-highlight` and `highlight.js` installed and configured in MDX setup
- [ ] `flexsearch` installed

**Directory structure:**
- [ ] `/app/(docs)/` route group created with its own layout.tsx
- [ ] `/content/docs/` directory with all 12 section folders
- [ ] All 45 MDX files exist
- [ ] `/components/docs/` directory with all 9 custom components

**Content:**
- [ ] Every MDX file has correct frontmatter (title, description, section, order, role)
- [ ] No placeholder text anywhere — every page has complete, accurate content
- [ ] All content verified against the actual implemented app (not just BUILD.md)
- [ ] Every role-restricted page has a `<RoleAccess>` banner
- [ ] `<Callout>` components used throughout with appropriate type (info/tip/warning/danger)
- [ ] `<StepList>` used for all multi-step processes
- [ ] The Permissions Matrix in `01-role-permissions-matrix.mdx` matches actual RLS policies

**MDX Components:**
- [ ] `<Callout>` renders all 4 variants correctly
- [ ] `<RoleBadge>` renders all 4 role variants inline in text
- [ ] `<RoleAccess>` banner renders correctly at the top of restricted pages
- [ ] `<StepList>` and `<Step>` render with circles and connecting line
- [ ] `<KeyboardShortcut>` renders keyboard key styling correctly
- [ ] `<StatusBadge>` matches the exact appearance in the app
- [ ] `<ScreenCaption>` renders below images
- [ ] `<QuickNav>` renders card grid for section overview pages
- [ ] `<PermissionsTable>` renders with correct data

**Docs Home:**
- [ ] Hero section renders with search bar and 3 quick-start cards
- [ ] Feature grid renders all 9 feature cards with correct links
- [ ] Help footer renders
- [ ] Page is public (no auth required)

**Navigation:**
- [ ] Left nav renders all 12 sections with correct page links
- [ ] Role filter pills filter nav items correctly
- [ ] Active page highlighted correctly
- [ ] Section auto-expands when current route is inside it
- [ ] Prev/Next links render in every page footer and link correctly
- [ ] On-page nav appears at ≥1280px and updates on scroll

**Search:**
- [ ] `scripts/build-search-index.js` runs without errors during `npm run build`
- [ ] `/public/search-index.json` is generated with all 45 entries
- [ ] Search returns results for: "SOP", "acknowledge", "signature", "PM", "QA", "Change Control", "message", "admin"
- [ ] Keyboard nav works (↑↓ Enter Escape)
- [ ] No-results state renders gracefully
- [ ] ⌘K focuses the search bar

**Shell:**
- [ ] Docs TopBar renders correctly
- [ ] "Back to app" link shows when authenticated, hidden when not
- [ ] Mobile: sidebar accessible via hamburger drawer
- [ ] Left nav scrolls independently
- [ ] Content renders cleanly at 768px, 1024px, 1280px+

**Routing:**
- [ ] `/docs` renders the home page
- [ ] `/docs/getting-started/quickstart` renders correctly
- [ ] `/docs/sop-library/reading-sops` renders correctly
- [ ] Invalid slug renders the styled 404 page
- [ ] Docs routes excluded from dashboard auth middleware
- [ ] `generateStaticParams` covers all 45 pages (no 404s on static export)

**Code quality:**
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npm run lint` passes
- [ ] No `any` types in docs components
- [ ] Search index script handles MDX parsing errors gracefully (logs warning, skips file, continues)

**Commit:** `docs: complete documentation site — 45 pages, search, navigation, MDX components, docs home`

---

*End of DOCBUILD.md*
*Write every page completely. No placeholder content. No "TODO: add content here".*
*The documentation is what makes the platform usable on day one for every person in the organisation.*
