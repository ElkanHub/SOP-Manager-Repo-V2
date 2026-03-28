# SOP-Guard Pro - Project Progress

> **Last Updated:** March 28, 2026
> **Version:** 2.4 (Badge & Notification Consistency)
> **Current Phase:** Phase 19 ✅ Complete — Phase 20 Next

---

## Executive Summary

SOP-Guard Pro is an industrial SaaS platform for managing Standard Operating Procedures (SOPs) and Preventive Maintenance (PM). The platform is built on a **star-centralized architecture** where the SOP Library and Equipment Registry are the central hubs, with approvals, change control, PM planner, calendar, pulse, reports, and messaging orbiting them.

### Completed Phases

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 0 | ✅ Complete | Project Bootstrap |
| Phase 1 | ✅ Complete | Database & Schema |
| Phase 2 | ✅ Complete | Auth & Onboarding |
| Phase 3 | ✅ Complete | Shell Layout & Pulse |
| Phase 4 | ✅ Complete | SOP Library (Read Layer) |
| Phase 5 | ✅ Complete | SOP Submission & QA Approval Flow |
| Phase 6 | ✅ Complete | Change Control Center |
| Phase 7 | ✅ Complete | Equipment Registry & PM Planner |
| Phase 8 | ✅ Complete | Company Calendar |
| Phase 9 | ✅ Complete | Dashboard & KPIs |
| Phase 10 | ✅ Complete | Reports & Audit Log |
| Phase 11 | ✅ Complete | Settings & Admin |
| Phase 12 | ✅ Complete | Polish, Performance & Launch |
| Phase 13 | ✅ Complete | Messaging System |
| Phase 14 | ✅ Complete | Documentation Hub |
| Phase 15 | ✅ Complete | Custom Metadata & Dynamic Fields |
| Phase 16 | ✅ Complete | Google Identity & Profile Sync |
| Phase 17 | ✅ Complete | Mobile UX & Responsive Polish |
| Phase 18 | ✅ Complete | Reports UI & Table Performance |
| Phase 19 | ✅ Complete | Badge Logic, Notification Consistency & UI Fixes |

---

## Phase 0: Project Bootstrap

### Completed Tasks

- **Next.js 15 App Router** project initialized with TypeScript
- **Shadcn/UI** component system installed and configured
- **Tailwind CSS v4** with custom theme tokens
- **Supabase** client configuration (server and browser)
- **Zustand** for state management
- **TanStack Table v8** for data tables
- **Project structure** established following the BUILD.md conventions

### File Structure Created

```
/app
  /layout.tsx                 # Root layout with DM Sans/DM Mono fonts
  /globals.css                # Tailwind v4 with dark mode support
  /page.tsx                   # Root proxy redirect
  /(auth)                    # Auth route group
    /login/page.tsx
    /signup/page.tsx
    /setup/page.tsx
    /onboarding/page.tsx
  /(dashboard)               # Dashboard route group
    /layout.tsx              # Dashboard shell layout
    /dashboard/page.tsx
    /library/page.tsx
    /library/[id]/page.tsx
    /settings/page.tsx
/components
  /ui/                       # Shadcn components
  /shell/                    # TopNav, GlobalSearch
  /library/                  # SopLibraryTable, SopViewer, etc.
  /onboarding/               # Onboarding wizard steps
  /pulse/                   # ThePulse, PulseItem, composers
/lib
  /supabase/                 # Server and client clients
  /utils/                   # Utilities (cn, dates, permissions)
/actions                     # Server actions
/hooks                       # Custom React hooks
/types                       # TypeScript types
/store                       # Zustand stores
/public                     # Static assets
```

---

## Phase 1: Database & Schema

### Completed Tasks

All 14 database migrations executed successfully:

| Migration | File | Description |
|-----------|------|-------------|
| 001 | `001_departments.sql` | Departments table |
| 002 | `002_profiles.sql` | User profiles table |
| 003 | `003_sops.sql` | SOPs table |
| 004 | `004_sop_versions.sql` | SOP version history |
| 005 | `005_sop_approval_requests.sql` | Approval workflow |
| 006 | `006_sop_approval_comments.sql` | Approval comments |
| 007 | `007_sop_acknowledgements.sql` | Acknowledgement tracking |
| 008 | `008_change_control.sql` | Change control records |
| 009 | `009_signature_certificates.sql` | Digital signatures |
| 010 | `010_equipment_pm.sql` | Equipment and PM tasks |
| 011 | `011_rls.sql` | Row Level Security policies |
| 012 | `012_audit_log.sql` | Audit logging |
| 013 | `013_setup_guard.sql` | Setup guard |
| 014 | `014_storage.sql` | Storage buckets (avatars, signatures) |

### Key Schema Features

- **Soft delete** on profiles (`is_active = false`)
- **Signatory snapshot** on change_controls (stored as JSONB)
- **Pulse broadcast model** for notifications
- **SOP locking** during active change control
- **Version format:** vMAJOR.MINOR (e.g., v1.0, v1.1)
- **Equipment secondary departments** support

---

## Phase 2: Auth & Onboarding

### Completed Tasks

- **Authentication flows:**
  - Login (`/login`)
  - Signup (`/signup`)
  - Setup (first admin) (`/setup`)
  - Onboarding wizard (`/onboarding`)

- **Onboarding Wizard (4 steps):**
  1. Department & Role selection
  2. Profile details (name, job title, employee ID, phone)
  3. Digital signature capture (draw or upload)
  4. Review & completion

- **Auth features:**
  - Avatar upload to Supabase Storage
  - Signature upload to Supabase Storage
  - Profile completion tracking (`onboarding_complete`)
  - Middleware route protection

### Security Features

- RLS policies for all tables
- Storage policies for avatars and signatures
- Session validation via `getUser()` (not `getSession()`)
- Inactive user blocking in middleware

---

## Phase 3: Shell Layout & Pulse

### Completed Tasks

**Top Navigation:**
- Brand logo and name
- Global search component (shell ready for Phase 4)
- Theme toggle (light/dark/system)
- Notifications bell
- User avatar dropdown

**Sidebar:**
- Fixed left panel (240px)
- User mini-profile (avatar, name, department, role)
- Navigation items: Dashboard, SOP Library, Equipment, Calendar, Reports, Settings
- Active state highlighting
- Collapsible to icon strip at 1024px

**The Pulse Panel:**
- Real-time subscription via Supabase Realtime
- Item types: notices, todos, alerts
- Notice composer with audience selection (self, department, everyone)
- Thread depth enforcement (max 1 level)
- Mark all as read functionality
- **Collapsible overlay** - Toggle button slides panel in/out without resizing layout

**Pulse Overlay Enhancement:**
- Toggle button on right edge (visible on all screen sizes)
- Slides in/out as overlay using CSS transform
- Does not affect main content width
- Smooth 300ms transition animation
- Z-index layering: button at z-50, panel at z-40

**Components Built:**
- `TopNav`
- `AppSidebar`
- `ThePulse`
- `PulseWrapper` - Collapsible wrapper component
- `PulseItem`
- `NoticeComposer`
- `TodoComposer`
- `ThemeToggle`
- `ThemeProvider`

---

## Phase 4: SOP Library (Read Layer)

### Completed Tasks

**SOP Library Page (`/library`):**
- TanStack Table with sorting and filtering
- Status filter tabs (All, Active, Draft, Pending, Pending CC)
- Two-layer visibility (own department + secondary departments)
- Row click opens SOP in new tab

**SOP Viewer Page (`/library/[id]`):**
- Document viewer with mammoth.js for .docx rendering
- DOMPurify sanitization
- Tab strip for multiple open SOPs (max 8 tabs)
- Zustand store for tab management

**Components Built:**
- `SopLibraryTable` - Data table with TanStack Table
- `SopTabStrip` - Tab bar for multiple SOPs
- `SopViewer` - Document renderer
- `AcknowledgeButton` - Acknowledgement flow
- `VersionHistorySheet` - Version history modal
- `DeptBadge` - Department badge
- `StatusBadge` - Status indicator

**Global Search:**
- Full-text search across all active SOPs
- Keyboard navigation (arrow keys, enter, escape)
- Debounced search (300ms)
- Cross-department results with department badges

### Two-Layer Visibility Implementation

1. **Default Library view** - Shows only SOPs where `department = user.department` OR `user.department = ANY(secondary_departments)`
2. **Search mode** - Shows ALL Active SOPs across the organization

**Cross-department SOPs:**
- Rendered in read-only mode
- Teal badge indicates cross-department
- No Acknowledge button
- No Submit Edit button

---

## Phase 5: SOP Submission & QA Approval Flow

### Completed Tasks

**SOP Upload Modal (`SopUploadModal`):**
- 3-step modal using Shadcn Dialog component
- Full dark mode support with semantic color tokens
- Drag-and-drop .docx upload (max 25MB)
- Client + server-side validation
- Upload to Supabase Storage via `/api/storage/sop-upload`
- New SOP or Update to Existing flow
- Primary + Secondary department selection

**API Routes:**
- `/api/storage/sop-upload` - Handles .docx upload with MIME type and size validation

**Server Actions (`/actions/sop.ts`):**
- `submitSopForApproval()` - Creates SOP + approval request, sends pulse notification
- `resubmitSop()` - Handles resubmissions with version tracking
- `approveSopRequest()` - QA approval with self-approval block
- `requestChangesSop()` - QA can request changes with comments

**Approvals Page (`/approvals`):**
- QA Manager only (middleware redirect for non-QA)
- Filter by status: All, Pending, Changes Requested, Approved, Rejected
- Grouped by SOP with latest submission visible
- Full dark mode support

**Approval Detail Page (`/approvals/[id]`):**
- Left: SopViewer rendering submitted file
- Right: Submitter details, submission history, action buttons
- Self-approval guard (UI + server)
- Request Changes with comment thread
- Full dark mode support

**Sidebar Integration:**
- Approvals nav item (visible to QA only)
- Uses `is_qa_manager` RPC to determine visibility

**Dark Mode Fixes Applied:**
- Replaced hardcoded `bg-white` with `bg-background` / `bg-card`
- Replaced `text-slate-*` with `text-muted-foreground` / `text-foreground`
- Replaced `border-slate-*` with `border-input` / `border-border`
- Added dark mode variants where needed (e.g., `dark:bg-green-950/50`)

**Components Built:**
- `SopUploadModal` - 3-step upload modal with Shadcn Dialog
- `ApprovalQueueTable` - Approval queue with filtering
- `ApprovalDetailClient` - Approval review page

---

## Phase 6: Change Control Center

### Completed Tasks

**Change Control Page (`/change-control/[id]`):**
- Full dark mode support with semantic color tokens
- Displays CC reference, SOP info, deadline, status
- Progress indicator showing signatures collected
- BorderBeam effect on pending CCs

**DiffViewer Component:**
- Two-column layout (old version left/red, new version right/green)
- "Show All" / "Changes Only" toggle
- Renders from `diff_json` in change_controls table

**DeltaSummaryCard Component:**
- Shows AI-generated summary of changes
- Regenerate button to call Gemini API
- Disclaimer always visible

**SignatureGrid Component:**
- Built from `required_signatories` snapshot (not live query)
- Shows status: Signed (green), Pending (gray), Waived (admin)
- Sign button for current user (if signatory and not signed)
- Waive button for admins

**SignatureConfirmModal:**
- Shows SOP title, version, CC reference
- Displays user's stored signature image
- IP address capture on sign

**WaiveModal (Admin Only):**
- Requires reason text
- Calls `waive_cc_signature()` DB function
- Writes audit log entry

**API Routes:**
- `/api/gemini/delta-summary` - Generates AI summary using Gemini Flash

**Server Actions (`/actions/sop.ts`):**
- `signChangeControl()` - Insert signature certificate, write audit log
- `waiveSignature()` - Call DB function to waive
- `generateDeltaSummary()` - Call Gemini API

**Components Built:**
- `ChangeControlHeader` - CC reference, status, deadline, progress
- `DiffViewer` - Document comparison view
- `DeltaSummaryCard` - AI summary display
- `SignatureGrid` - Signatory status grid
- `SignatureConfirmModal` - Sign confirmation dialog
- `WaiveModal` - Admin waive dialog
- `change-control-client` - Main page client component

**Dark Mode Implementation:**
- All Phase 6 components use semantic Tailwind tokens
- `bg-background` / `bg-card` instead of hardcoded colors
- `text-muted-foreground` / `text-foreground` for text
- Dark variants: `dark:bg-card`, `dark:text-green-400`, etc.
- Status colors properly adapted for dark mode

---

## Phase 7: Equipment Registry & PM Planner

### Completed Tasks

**Equipment List Page (`/equipment`):**
- TanStack Table with sorting by name, department, status
- Status filter tabs (All, Active, Pending QA, Inactive)
- Row click navigates to detail page
- Department-based filtering (own + secondary)
- Manager-only "Add Equipment" button
- Overdue PM tasks highlighted in red, due soon in amber

**Add Equipment Modal (`AddEquipmentModal`):**
- 3-step dialog using Shadcn Dialog component
- Full dark mode support with semantic color tokens
- Step 1: Basic info (Asset ID, name, serial, model, photo)
- Step 2: Department assignment (primary + secondary), maintenance frequency, initial assignee (required)
- Step 3: Review + Submit
- Creates `equipment` row with `status = 'pending_qa'` and `initial_assignee_id`

**Equipment Detail Page (`/equipment/[id]`):**
- Displays equipment info, photo, department assignment
- QR code for easy scanning (encodes equipment URL)
- PM Task list with due dates, status, assigned users
- PM Task actions: Mark Complete (with photo upload, required notes), Reassign
- QA-only approval/rejection flow
- Service history table

**PM Completion Modal:**
- Notes (required per spec)
- Photo upload (optional)
- Updates `last_serviced`, `next_due` on equipment
- Creates next PM task with same assignee

**Reassign Task (Manager only):**
- Dropdown of active users in primary department
- Updates `assigned_to`, writes audit_log entry

**Cron Routes:**
- `/api/cron/pm-alerts` - Sends pulse items for tasks due in 7 days
- `/api/cron/overdue-check` - Marks overdue tasks, sends alerts to assignees and managers
- Both require CRON_SECRET for authentication

**Database Migrations:**
- `015_pm_task_photo.sql` - Updates `complete_pm_task` function to accept photo_url
- `016_initial_assignee.sql` - Adds `initial_assignee_id` column to equipment table

**Vercel Config:**
- `vercel.json` - Cron schedules for pm-alerts (7am) and overdue-check (6am)

**API Routes:**
- `/api/storage/equipment-photo` - Handles equipment photo upload

**Server Actions (`/actions/equipment.ts`):**
- `submitEquipment()` - Creates new equipment with initial assignee
- `approveEquipment()` - QA approval via RPC
- `rejectEquipment()` - QA rejection with reason
- `completePmTask()` - Complete with notes and photo
- `reassignPmTask()` - Reassign with audit log

**Components Built:**
- `equipment-client` - Equipment list page client
- `equipment-table` - TanStack Table with filtering
- `add-equipment-modal` - 3-step equipment creation
- `equipment-detail-client` - Equipment detail page with QR code

**Sidebar Integration:**
- Equipment nav item (visible to all users)
- Active state highlighting

**Dark Mode Implementation:**
- All Phase 7 components use semantic Tailwind tokens
- `bg-background` / `bg-card` instead of hardcoded colors
- `text-muted-foreground` / `text-foreground` for text
- Dark mode variants: `dark:bg-green-700`, `dark:hover:bg-green-800`, etc.
- Status badges properly styled for dark mode

### Files Created/Modified

```
app/(dashboard)/equipment/
├── page.tsx                          # Server component
├── equipment-client.tsx              # Client component
└── [id]/
    ├── page.tsx                      # Detail server component
    └── equipment-detail-client.tsx  # Detail client component

components/equipment/
├── equipment-table.tsx              # TanStack table
└── add-equipment-modal.tsx           # 3-step modal

actions/
└── equipment.ts                      # Server actions

app/api/
├── storage/equipment-photo/
│   └── route.ts                      # Photo upload API
└── cron/
    ├── pm-alerts/
    │   └── route.ts                  # PM due alerts
    └── overdue-check/
        └── route.ts                  # Overdue check

supabase/migrations/
├── 015_pm_task_photo.sql             # PM photo support
└── 016_initial_assignee.sql         # Initial assignee column

vercel.json                           # Cron schedule config
```

---

## Phase 8: Company Calendar

### Completed Tasks

**Calendar Page (`/calendar`):**
- Monthly grid using date-fns (no external calendar library)
- Today cell highlighted with teal background
- Previous/Next month navigation arrows
- "Today" button to jump to current month
- PM auto-events from equipment table (next 60 days)
- Manual event creation

**Components Built:**
- `calendar-client` - Main calendar page client component
- `calendar-grid` - Monthly grid with day cells
- `calendar-cell` - Individual day cell with event chips
- `calendar-chip` - Color-coded chips (teal=PM, blue=public, slate=dept)
- `new-event-modal` - Create manual events
- `event-detail-popover` - View event details and delete
- `upcoming-panel` - Right sidebar with next 14 days

**Server Actions (`/actions/events.ts`):**
- `createEvent()` - Create manual event
- `deleteEvent()` - Delete own event (validates ownership)

**PM Auto-Events:**
- Queries equipment where status='active' and dept matches (including secondary)
- Renders as teal chips with 🔧 prefix
- Not stored as events - read directly from equipment table

**Event Visibility:**
- Public events visible to all active users
- Department events visible only to user's department

**Upcoming Panel:**
- Shows next 14 days of events and PM due dates
- Chronologically ordered
- Shows PM tasks and manual events separately

**Dark Mode Implementation:**
- All calendar components use semantic Tailwind tokens
- `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`

### Files Created

```
app/(dashboard)/calendar/
└── page.tsx                          # Server component

components/calendar/
├── calendar-client.tsx               # Main client
├── calendar-grid.tsx                # Monthly grid
├── calendar-cell.tsx                # Day cell
├── calendar-chip.tsx                # Event chip
├── new-event-modal.tsx              # Create event modal
├── event-detail-popover.tsx          # Event detail popover
└── upcoming-panel.tsx               # 14-day sidebar

actions/
└── events.ts                        # Event server actions
```

---

## Phase 9: Dashboard & KPIs

### Completed Tasks

**Dashboard Page (`/dashboard`):**
- 4 KPI cards with NumberTicker animations (600ms duration)
- Clickable cards navigate to relevant filtered pages
- Real-time data from database

**KPI Cards:**
| Card | Data Source | Colour Logic |
|------|-------------|-------------|
| Active SOPs | COUNT sops WHERE status='active' | Blue |
| Pending Approvals | COUNT sop_approval_requests WHERE status='pending' | Red if >0, green if 0 |
| PM Compliance | get_pm_compliance() RPC | <70% red, 70-89% amber, ≥90% green |
| SOPs Due for Revision | COUNT sops due within 30 days | Amber if >0, green if 0 |

**Activity Feed:**
- Last 10 audit_log entries
- Supabase Realtime subscription for live updates
- Shows actor, action, entity type, timestamp
- Formatted action labels for readability

**Upcoming PM Section:**
- Next 5 pending PM tasks
- Urgency colors: overdue (red), ≤7 days (amber), OK (green)
- Shows equipment name, asset ID, due date

**Data Scoping:**
- Managers/Admins see cross-department KPIs
- Employees scoped to own department
- Pending Approvals shows own submissions for non-QA

**Components Built:**
- `dashboard-client` - Main dashboard client component
- `NumberTicker` - Custom animated counter component

**Dark Mode Implementation:**
- All components use semantic Tailwind tokens
- Color-coded KPIs adapt to dark mode
- Proper contrast ratios maintained

### Files Created

```
app/(dashboard)/dashboard/
└── page.tsx                          # Server component

components/
├── dashboard/
│   └── dashboard-client.tsx           # Main dashboard client
└── ui/
    └── number-ticker.tsx             # Animated number counter
```

---

## Phase 10: Reports & Audit Log

### Completed Tasks

**Reports Page (`/reports`):**
- Two-panel layout: report selector on left, content on right
- Date range filtering with from/to inputs
- CSV export for all reports (client-side)

**Report 1 — SOP Change History:**
- Source: `audit_log` filtered to SOP + Change Control events
- Columns: SOP No., Action, Actor Name, Dept, Timestamp
- Access: QA, Manager (own dept)

**Report 2 — Worker Acknowledgement Log:**
- Source: `sop_acknowledgements` joined with profiles and sops
- Columns: SOP No., SOP Title, Employee Name, Dept, Version, Acknowledged At
- Access: QA, Manager (own dept)

**Report 3 — PM Completion Log:**
- Source: `pm_tasks` (complete) joined with equipment and profiles
- Columns: Asset ID, Asset Name, Dept, Assigned To, Completed By, Date, Notes
- Access: QA, Manager (own dept)

**Report 4 — Pulse / Notice Log:**
- Source: `pulse_items` where type='notice'
- Columns: Sender, Audience, Target Dept, Subject, Body, Sent At
- Access: Admin only (403 for non-admins)

**Report 5 — AI Risk Insights:**
- Trigger: "Generate Insights" button
- POST to `/api/gemini/risk-insights`
- Fetches last 30 days of audit_log for scope
- Calls Gemini Flash API
- Returns risk level (low/medium/high) + insights list
- Risk badge with color coding (green/amber/red)
- Access: QA Manager + Admin only

**Components Built:**
- `reports-client` - Main reports page
- `sop-change-history-report` - Report 1
- `acknowledgement-log-report` - Report 2
- `pm-completion-report` - Report 3
- `pulse-notice-report` - Report 4
- `risk-insights-report` - Report 5

**API Routes:**
- `/api/gemini/risk-insights` - AI risk analysis

**State Management:**
- Zustand store for report date filters

**CSV Export:**
- Client-side CSV builder (no library)
- Proper escaping and formatting

**Access Control:**
- Role-based visibility for each report
- Server-side 403 for unauthorized access

**Dark Mode Implementation:**
- All report components use semantic Tailwind tokens

### Files Created

```
app/(dashboard)/reports/
└── page.tsx                          # Server component

components/reports/
├── reports-client.tsx                # Main reports page
├── sop-change-history-report.tsx    # Report 1
├── acknowledgement-log-report.tsx     # Report 2
├── pm-completion-report.tsx         # Report 3
├── pulse-notice-report.tsx          # Report 4
└── risk-insights-report.tsx         # Report 5

store/
└── report-store.ts                 # Zustand filter store

app/api/gemini/risk-insights/
└── route.ts                        # AI insights API
```

---

## Design System

### Typography
- **Primary Font:** DM Sans (via Google Fonts)
- **Monospace Font:** DM Mono

### Color Palette

**Light Mode:**
- Background: White (#FFFFFF)
- Card Background: White (#FFFFFF)
- Border: Light gray (#E5E7EB)
- Text Primary: Slate 800 (#1E293B)
- Text Secondary: Slate 500 (#64748B)

**Dark Mode:**
- Background: Dark gray (#1A1A1A)
- Card Background: Slightly lighter (#242424)
- Border: Medium gray (#3D3D3D)
- Text Primary: Light gray (#EBEBEB)
- Text Secondary: Medium gray (#A6A6A6)
- **Brand Colors Preserved:**
  - Brand Navy: #0D2B55
  - Brand Blue: #1A5EA8
  - Brand Teal: #00C2A8

### Features

- **Full Dark Mode Support** - Light, Dark, and System modes
- **Auth Pages** - Background image with gradient overlay
- **Responsive Design** - Mobile, tablet, and desktop breakpoints

### Dark Mode Implementation

All components use semantic Tailwind tokens for proper dark mode support:

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `bg-background` | oklch(1 0 0) | #1a1a1a | Page backgrounds |
| `bg-card` | oklch(1 0 0) | #242424 | Card backgrounds |
| `text-foreground` | oklch(0.145 0 0) | oklch(0.92 0 0) | Primary text |
| `text-muted-foreground` | oklch(0.556 0 0) | oklch(0.65 0 0) | Secondary text |
| `border-input` | oklch(0.922 0 0) | #3d3d3d | Input borders |
| `border-border` | oklch(0.922 0 0) | #3d3d3d | General borders |
| `bg-muted` | oklch(0.97 0 0) | #2d2d2d | Muted backgrounds |
| `bg-destructive` | oklch(0.577...) | oklch(0.577...) | Error/destructive |

**Rule:** Never use hardcoded colors like `bg-white`, `text-slate-500`, `border-slate-300`. Always use semantic tokens.

---

## Known Issues & Fixes Applied

### Signature Upload RLS Issue
- **Problem:** "new row violates row-level security policy" when uploading signature during onboarding
- **Root Cause:** Storage policies checked for folder path but signatures were stored as flat paths
- **Solution:** Updated storage policies in `014_storage.sql` to handle both folder-based and flat paths using `split_part()`

---

## Future Phases (Not Started)

| Phase | Description |
|-------|-------------|
| Phase 11 | Settings & Admin |
| Phase 12 | Messaging System |
| Phase 13 | (Reserved for future expansion) |

---

## Technical Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 + Shadcn/UI
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **State:** Zustand
- **Tables:** TanStack Table v8
- **Icons:** Lucide React
- **Date Handling:** date-fns
- **Document Rendering:** mammoth.js
- **HTML Sanitization:** DOMPurify

---

## Build Status

```
Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/cron/overdue-check
├ ƒ /api/cron/pm-alerts
├ ƒ /api/gemini/delta-summary
├ ƒ /api/gemini/risk-insights
├ ƒ /api/storage/equipment-photo
├ ƒ /api/storage/sop-upload
├ ƒ /approvals
├ ƒ /approvals/[id]
├ ƒ /change-control/[id]
├ ƒ /dashboard
├ ƒ /equipment
├ ƒ /equipment/[id]
├ ƒ /library
├ ƒ /library/[id]
├ ƒ /calendar
├ ƒ /reports
├ ○ /login
├ ƒ /onboarding
├ ƒ /settings
├ ○ /setup
└ ○ /signup

○  (Static)   prerendered as static content
ƒ  (Dynamic)   server-rendered on demand
```

**Build:** ✅ Passing
**TypeScript:** ✅ No errors

---

## Phase 14: Documentation Hub

### Completed Tasks

**Documentation Home (`/docs`):**
- **Premium Pharma Aesthetic**: Re-engineered for a clinical, high-end look with deep navy gradients and glassmorphism.
- **Hero Section**: Dynamic search integration with glow effects and quick-link cards.
- **Feature Exploration**: Interactive grid displaying core platform capabilities.

**Documentation Shell & Navigation:**
- **Theme-Aware Architecture**: Fully transitioned to semantic theme variables (`bg-background`, `border-border`, etc.) for seamless dark mode support.
- **Dynamic TopNav**: Session-aware "Back to Application" link that detects user state and routes correctly (Login vs Dashboard).
- **Responsive Sidebar**: Clean navigation with role-based filtering and active state highlighting.
- **Mobile Experience**: Polished mobile menu with blur backgrounds and smooth transitions.

**Search Component:**
- **Command + K**: Integrated a professional search interface with keyboard shortcuts.
- **FlexSearch Integration**: Client-side indexing of all MDX documentation content.
- **API Indexing**: Dynamic endpoint for fetching and indexing documentation sections.

**Individual Doc Pages:**
- **Typography Refinement**: Optimized line heights, spacing, and font sizes for MDX content.
- **Custom MDX Components**: Theme-aware `Callout`, `PermissionsTable`, `KeyboardShortcut`, and `RoleBadge` components.
- **Breadcrumbs**: Fully functional and theme-consistent breadcrumb navigation.

**Build & Stability:**
- **Static Pre-rendering Fixes**: Resolved critical `TypeError` during build by implementing defensive mapping and session guards.
- **Proxy Enhancements**: Updated `proxy.ts` (middleware) to handle root redirects for logged-in users.

### Components Built/Refined:
- `DocsShell`
- `DocsHomeContent`
- `DocPageContent`
- `Search` (with FlexSearch)
- `Breadcrumbs`
- `Callout`
- `PermissionsTable`
- `QuickNav`
- `RoleBadge`
- `StatusBadge`

### Files Created/Modified:
```
app/(docs)/
├── layout.tsx
├── docs-shell.tsx
├── docs/
│   └── docs-home-content.tsx
└── [...slug]/
    └── doc-page-content.tsx

components/docs/
├── Search.tsx
├── Breadcrumbs.tsx
├── Callout.tsx
├── PermissionsTable.tsx
├── QuickNav.tsx
├── RoleBadge.tsx
└── StatusBadge.tsx

api/docs/list/route.ts
proxy.ts
```

---

## Phase 11: Settings & Admin

**Status:** ✅ Complete
**Date Completed:** 2026-03-20

### What Was Built

**Server Actions** (`actions/settings.ts` — 12 new actions):
- `updateProfile`, `redrawSignature`, `updateNotificationPrefs` (all users)
- `addDepartment`, `updateDepartmentColour`, `deleteDepartment` (admin: QA dept blocked; deletion guarded by user/SOP counts)
- `changeUserRole`, `changeUserDepartment` (admin + audit_log)
- `grantAdmin`, `revokeAdmin` (admin: password re-entry via `signInWithPassword` + audit_log: `admin_granted` / `admin_revoked`)
- `deactivateUser` (admin: `is_active=false` + `auth.admin.signOut()` + audit_log), `reactivateUser`

**Components** (`components/settings/`):
- `settings-client.tsx` — tabs; admin tabs never rendered or hydrated for non-admins
- `profile-tab.tsx` — avatar upload, profile form, signature re-draw dialog
- `notifications-tab.tsx` — email/pulse Switch toggles, immediate persist
- `departments-tab.tsx` — add/edit-colour/delete table with deletion guard messaging
- `users-tab.tsx` — active users table + inactive collapsible; role/dept selects, grant/revoke admin with password confirm, deactivate/reactivate
- `password-confirm-modal.tsx` — reusable password re-entry dialog for admin actions
- `signature-redraw-dialog.tsx` — draw + upload tabs, Supabase storage upload

**Page** (`app/(dashboard)/settings/page.tsx`):
- Full server component; non-admin users never receive user list data
- Redirects inactive users to `/login?reason=inactive`

**Type Fix** (`types/app.types.ts`):
- `notification_prefs: any` → `NotificationPrefs { email: boolean; pulse: boolean }`

**Shadcn Added:** `switch`, `collapsible`, `alert-dialog`

**Verification:** `npm run build` — Exit code 0, 76 routes clean ✅

---

## Phase 12: Polish, Performance & Launch

**Status:** ✅ Complete
**Date Completed:** 2026-03-20

### What Was Built

**Loading States (11 new `loading.tsx` files):**
- `app/(dashboard)/dashboard/loading.tsx` — 4 KPI card skeletons + activity feed + upcoming PM rows
- `app/(dashboard)/library/loading.tsx` — table skeleton with status tabs and column headers
- `app/(dashboard)/library/[id]/loading.tsx` — tab strip + document body skeleton
- `app/(dashboard)/approvals/loading.tsx` — approval card list skeleton
- `app/(dashboard)/approvals/[id]/loading.tsx` — two-panel skeleton (viewer left, detail right)
- `app/(dashboard)/change-control/[id]/loading.tsx` — CC header + diff viewer + signature grid skeleton
- `app/(dashboard)/equipment/loading.tsx` — equipment table with photo thumbnails skeleton
- `app/(dashboard)/equipment/[id]/loading.tsx` — detail page with photo area, info cards, PM task list skeleton
- `app/(dashboard)/calendar/loading.tsx` — monthly 7-column grid skeleton
- `app/(dashboard)/reports/loading.tsx` — two-panel (selector + table) skeleton
- `app/(dashboard)/settings/loading.tsx` — tab strip + form fields + signature preview skeleton

**Error Boundaries:**
- `app/(dashboard)/error.tsx` — top-level dashboard shell boundary
- `app/(dashboard)/dashboard/error.tsx`
- `app/(dashboard)/library/error.tsx`
- `app/(dashboard)/approvals/error.tsx`
- `app/(dashboard)/equipment/error.tsx`
- `app/(dashboard)/calendar/error.tsx`
- `app/(dashboard)/reports/error.tsx`
- `app/(dashboard)/settings/error.tsx`
- `components/ui/error-page.tsx` — shared full-page error component: logs raw errors to console only, shows generic message + digest reference code (first 8 chars)
- `components/ui/error-card.tsx` — reusable inline error card for client component data errors

**Performance:**
- `components/library/sop-viewer-lazy.tsx` — `next/dynamic` wrapper for `SopViewer` with `ssr: false`, prevents heavy `docx-preview` (~600KB) from blocking initial page load
- `app/(dashboard)/library/[id]/page.tsx` — updated to import `SopViewerLazy` instead of `SopViewer`

**Security Headers (`next.config.ts`):**
- `X-DNS-Prefetch-Control: on`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy` — covering self, fonts.googleapis.com, Supabase storage/realtime (wss), Gemini API
- `images.remotePatterns` — allows `*.supabase.co` storage images via `next/image`

### Files Created/Modified:

```
app/(dashboard)/
├── error.tsx                           # Top-level boundary
├── dashboard/
│   ├── loading.tsx                     # NEW
│   └── error.tsx                       # NEW
├── library/
│   ├── loading.tsx                     # NEW
│   ├── error.tsx                       # NEW
│   └── [id]/
│       └── loading.tsx                 # NEW
├── approvals/
│   ├── loading.tsx                     # NEW
│   ├── error.tsx                       # NEW
│   └── [id]/
│       └── loading.tsx                 # NEW
├── change-control/
│   └── [id]/
│       └── loading.tsx                 # NEW
├── equipment/
│   ├── loading.tsx                     # NEW
│   ├── error.tsx                       # NEW
│   └── [id]/
│       └── loading.tsx                 # NEW
│   └── error.tsx                       # NEW
├── calendar/
│   ├── loading.tsx                     # NEW
│   └── error.tsx                       # NEW
├── reports/
│   ├── loading.tsx                     # NEW
│   └── error.tsx                       # NEW
└── settings/
    ├── loading.tsx                     # NEW
    └── error.tsx                       # NEW

components/ui/
├── error-page.tsx                      # NEW — shared error boundary page
└── error-card.tsx                      # NEW — inline error card

components/library/
└── sop-viewer-lazy.tsx                 # NEW — dynamic() wrapper for SopViewer

next.config.ts                          # MODIFIED — security headers + image domains
```
## Phase 13: Messaging System

**Status:** ✅ Complete
**Date Completed:** 2026-03-22

### What Was Built
- **Real-time Chat Engine**: Built on Supabase Realtime for instant messaging.
- **Department & Direct Channels**: Support for broad department-wide broadcasts and private direct messages.
- **Messaging UI**: Fixed-height viewport with message history, member list, and real-time typing indicators.
- **Integration**: Integrated into the main sidebar for quick access.

---

## Phase 15: Custom Metadata & Dynamic Fields

**Status:** ✅ Complete
**Date Completed:** 2026-03-22

### What Was Built
- **Dynamic Schema**: Implemented `custom_field_definitions` and `custom_fields` JSONB architecture to allow ad-hoc metadata without ALTER TABLE.
- **Field Management UI**: New settings tab for admins to add, reorder (drag & drop), and delete custom fields for SOPs and Equipment.
- **Dynamic Form Rendering**: Sophisticated form engine that renders appropriate UI components (Input, Select, Date, Checkbox) based on JSON definitions.
- **Cross-Component Sync**: Unified custom field data display across SOP Viewer, Equipment Detail, and Library tables.

---

## Phase 16: Google Identity & Profile Sync

**Status:** ✅ Complete
**Date Completed:** 2026-03-23

### What Was Built
- **Google OAuth Integration**: Added support for Google sign-in methods in login and signup flows.
- **Database Identity Sync**: Updated the `handle_new_user` trigger in `010_triggers.sql` to automatically extract and sync `full_name` and `avatar_url` from OAuth metadata.
- **`UserAvatar` Component**: Created a high-end reusable component that prioritizes Google/uploaded images and falls back to generated initials with a premium gradient background.
- **UX Integration**: Standardized avatar display across `TopNav`, `SideBar`, `UsersTab`, and Onboarding steps.

---

## Phase 17: Mobile UX & Responsive Polish

**Status:** ✅ Complete
**Date Completed:** 2026-03-23

### What Was Built
- **Mobile SideBar Accessibility**: Significantly increased touch targets for sidebar navigation by enlarging items and increasing vertical padding (`py-3`).
- **Dashboard Grid Reorganization**: Transitioned the dashboard KPI grid to a 2x2 layout on mobile, replacing the previous vertical stack for a more professional utilization of space.
- **SOP Library Streamlining**: Implemented responsive column visibility in the TanStack table. Non-essential columns (SOP No., Date) now hide on small screens to prioritize document titles and status.
- **Professional Pill Filters**: Upgraded the status filter group into a refined, high-end pill-based toggle system with smooth transitions and horizontal scrolling.
- **Edge-to-Edge Headers**: Reconfigured the layout shell and client components to allow page headers to hit the full viewport width on mobile.
- **Micro-Padding Optimization**: Removed unnecessary global horizontal margins on mobile, reclaimed screen real estate for cards and tables while maintaining a premium 16px internal safe zone.
- **Shared Intials Utility**: Centralized the `getInitials` logic into `lib/utils.ts`, resolving multiple "missing function" errors and standardizing avatar fallbacks across the platform.
- **Messaging Glitch Resolution**: Implemented optimistic-to-realtime message resolution in `conversation-thread.tsx`, eliminating duplicate chat bubbles during active sessions.

**Verification:** `npm run build` — Exit code 0, 82 routes clean ✅

---

## Phase 18: Reports UI & Table Performance

**Status:** ✅ Complete  
**Date Completed:** 2026-03-28

### What Was Built

#### Reports Page Visual Hierarchy
- **Standing-out containers**: The main report card and the AI Risk Insights section were converted from transparent/blurred backgrounds to solid `bg-card` with `shadow-md` and `border-border`, giving them the same visual weight and definition as the page header.
- **AI Insights card** is now wrapped in its own `Card` component when displayed, matching the elevation of the primary report container.
- **Empty state** for Risk Insights was refined with a more subtle dashed border.

#### Notification Sound Update
- Message notification sound changed to `mixkit-positive-interface-beep-221.wav` in both `the-pulse.tsx` (realtime handler) and the Settings page sound preview button (`notifications-tab.tsx`).

#### Server-Side Pagination + TanStack Query Caching

All major data tables now use true server-side pagination with TanStack Query v5 caching, `keepPreviousData` to eliminate page-turn flash, and next-page prefetch for instant navigation.

**Infrastructure Created:**

| File | Description |
|---|---|
| `lib/providers/query-provider.tsx` | `QueryClientProvider` wrapper (staleTime: 30s) |
| `lib/queries/sops.ts` | Paginated SOP fetch with role + dept scoping |
| `lib/queries/equipment.ts` | Paginated Equipment fetch with role + dept scoping |
| `lib/queries/reports.ts` | Paginated fetch helpers for all 4 report types |
| `supabase/migrations/028_performance_indexes.sql` | 12 targeted DB indexes (safe for live DB) |

**Components Migrated:**

| Component | Before | After |
|---|---|---|
| `SopLibraryTable` | Received full array from server | `useQuery` + 25 rows/page + prefetch |
| `EquipmentTable` | Received full array from server | `useQuery` + 25 rows/page + prefetch |
| `SopChangeHistoryReport` | `useEffect` + unlimited Supabase query | `useQuery` + 50 rows/page + pagination UI |
| `AcknowledgementLogReport` | `useEffect` + unlimited Supabase query | `useQuery` + 50 rows/page + pagination UI |
| `PmCompletionReport` | `useEffect` + unlimited Supabase query | `useQuery` + 50 rows/page + pagination UI |
| `PulseNoticeReport` | `useEffect` + unlimited Supabase query | `useQuery` + 50 rows/page + pagination UI |

**Server Pages Optimized:**
- `app/(dashboard)/library/page.tsx` — SOP bulk fetch removed; passes only auth context to client.
- `app/(dashboard)/equipment/page.tsx` — Equipment bulk fetch removed; passes only auth context to client.

**Database Indexes (`028_performance_indexes.sql`):**
```sql
-- SOP Library
CREATE INDEX IF NOT EXISTS sops_dept_status_idx ON sops(department, status);
CREATE INDEX IF NOT EXISTS sops_status_created_idx ON sops(status, created_at DESC);
-- Equipment
CREATE INDEX IF NOT EXISTS equipment_dept_status_idx ON equipment(department, status);
-- PM Tasks
CREATE INDEX IF NOT EXISTS pm_tasks_due_date_idx ON pm_tasks(due_date, status);
CREATE INDEX IF NOT EXISTS pm_tasks_status_completed_idx ON pm_tasks(status, completed_at DESC);
-- Audit Log (reports)
CREATE INDEX IF NOT EXISTS audit_log_entity_created_idx ON audit_log(entity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_actor_created_idx ON audit_log(actor_id, created_at DESC);
-- Pulse Items
CREATE INDEX IF NOT EXISTS pulse_items_recipient_read_idx ON pulse_items(recipient_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS pulse_items_audience_dept_idx ON pulse_items(audience, target_department, created_at DESC);
CREATE INDEX IF NOT EXISTS pulse_items_type_created_idx ON pulse_items(type, created_at DESC);
-- Messages
CREATE INDEX IF NOT EXISTS messages_conv_created_idx ON messages(conversation_id, created_at DESC);
```

> **Note:** `028_performance_indexes.sql` must be applied manually in the Supabase SQL editor. Uses `IF NOT EXISTS` throughout — safe on a live database.

**Verification:** `npx tsc --noEmit` — Exit code 0, no type errors ✅
    switch (definition.field_type) {
        case 'text':    return <input ... />
        case 'number':  return <input type="number" ... />
        case 'date':    return <input type="date" ... />
        case 'select':  return <select>{definition.field_options.map(...)}</select>
        case 'checkbox': return <input type="checkbox" ... />
    }
}

The Dynamic Table Columns
tsx// Build columns dynamically
const baseColumns = ['Title', 'Status', 'Created At'] // always present

const customColumns = fieldDefs
    .filter(f => f.is_visible)
    .map(f => ({
        header: f.field_label,
        cell: (row) => row.custom_fields?.[f.field_key] ?? '—'
    }))

const allColumns = [...baseColumns, ...customColumns]

---

## Phase 19: Badge Logic, Notification Consistency & UI Fixes

### Goals

- Standardize all sidebar and notification badge styling across the application
- Fix incorrect Equipment badge count (was showing PM Task count)
- Implement persistent, action-aware Pulse badge logic that clears correctly
- Ensure UI consistency across all tables (card-based design)
- Resolve TypeScript/syntax errors introduced during refactoring

### Completed Tasks

#### 1. Full Table UI Audit & Standardization

All data table containers throughout the application now use a consistent, premium card-based design system:
- `bg-card` — solid background that stands out from the page
- `shadow-md` — visual elevation
- `border-border` — solid, visible border (replaced all blurred/transparent variants)

**Tables Audited & Updated:**

| Table | Location | Status |
|---|---|---|
| `SopLibraryTable` | Library page | ✅ Updated |
| `EquipmentTable` | Equipment page | ✅ Inherits from `DataTable` |
| 4× Report tables | Reports page | ✅ Inherits from `DataTable` |
| Users table | Settings → Users | ✅ Inherits from `DataTable` |
| Departments table | `departments-tab.tsx` | ✅ Fixed — was using old blurred background |
| Approval queue | Approvals page | ✅ Card-based layout — no change needed |

#### 2. Sidebar Badge Standardization

**Files Modified:**
- `components/app-sidebar.tsx`

**Changes:**
- All sidebar badges changed from `bg-brand-teal` → **`bg-red-500`** for high-attention visibility
- **Equipment badge** pivot: was counting all `pm_tasks` with `status IN ('pending', 'overdue')`. Now correctly counts `equipment` with `status = 'pending_qa'`
  - QA users: all pending equipment
  - Managers: only their department's pending equipment
  - Employees: no equipment badge
- Realtime subscription updated from `pm_tasks` → `equipment` table

#### 3. Pulse Notification System Overhaul

**Files Modified:**
- `components/shell/top-nav.tsx`
- `components/pulse/pulse-wrapper.tsx`

**Badge Logic — Two Buckets:**

| Bucket | Type | Clears When |
|---|---|---|
| Action Required | Notices (unacknowledged) | User clicks "Acknowledge" |
| New/Unread | Todos (new) | User opens the Pulse panel |
| Excluded | Self-sent items | Never counted |

**Cross-Component Sync — Custom Events:**
- `pulse-toggle` — fires when Bell icon opens the Pulse; `PulseWrapper` listens and syncs open state + `last_pulse_view`
- `pulse-viewed` — fires when either Bell or Handle opens the Pulse; both `TopNav` and `PulseWrapper` refresh their counts

**TopNav Bell (`top-nav.tsx`):**
- Replaced ephemeral `newNotifs` state with a proper async `fetchPulseCounts` function using `useCallback`
- Fetches `pulse_acknowledgements` to determine which notices have been actioned
- Uses `last_pulse_view` (localStorage) to determine what is "new"
- Realtime subscriptions on `pulse_items` and `pulse_acknowledgements`

**Pulse Handle (`pulse-wrapper.tsx`):**
- Completely rewritten with clean two-bucket logic
- Correctly filters by audience: `everyone`, `department`, and `self` receipts
- Excludes sender's own items from count
- Realtime subscriptions on `pulse_items` and `pulse_acknowledgements`
- Updates count immediately on open (via `setTimeout(fetchBadgeCount, 30)` after localStorage write)

**Bug Fixed:** Previous logic used `storedLastSeen = 0` (value of unset `last_pulse_view`) which made every item appear "new" forever — causing the permanent "9+" badge.

#### 4. TypeScript & Syntax Bug Fixes

- Added missing `useCallback` import to both `top-nav.tsx` and `pulse-wrapper.tsx`
- Fixed scoping error in `top-nav.tsx` where `fetchPulseCounts` was declared inside a `useEffect` but referenced at component scope
- Fixed ordering error: `fetchPulseCounts` declared after its first `useEffect` use — moved above all `useEffect` calls
- Fixed unclosed `useEffect` block left over from a partial refactor

### Technical Architecture

```
User opens Pulse (Bell or Handle click)
    │
    ├── localStorage.setItem('last_pulse_view', Date.now())
    ├── window.dispatchEvent('pulse-viewed') → TopNav refreshes count
    ├── window.dispatchEvent('pulse-toggle') → PulseWrapper syncs open state
    └── fetchBadgeCount() re-runs with updated lastOpenedAt
            │
            ├── Notices: if !isAcked → count++ (regardless of lastOpenedAt)
            └── Todos: if !isAcked AND created > lastOpenedAt → count++
```

### Verification

- TypeScript errors resolved; `npm run dev` shows no runtime errors in console
- Badge count updates immediately on panel open
- Badge count decrements immediately on "Acknowledge" action (via realtime subscription)
- Sidebar Equipment badge reflects correct approval count, not PM task count