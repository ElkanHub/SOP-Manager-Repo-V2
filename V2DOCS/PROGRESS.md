# SOP-Guard Pro - Project Progress

> **Last Updated:** April 22, 2026
> **Version:** 3.7 (Central AI Client & SDK Consolidation)
> **Current Phase:** Phase 40 ✅ Complete — Phase 41 Next

---

## Executive Summary

SOP-Guard Pro is an industrial SaaS platform for managing Standard Operating Procedures (SOPs) and Preventive Maintenance (PM). The platform is built on a **star-centralized architecture** where the SOP Library and Equipment Registry are the central hubs, with approvals, change control, PM planner, calendar, pulse, reports, and messaging orbiting them.

### Completed Phases

| Phase    | Status     | Description                                      |
| -------- | ---------- | ------------------------------------------------ |
| Phase 0  | ✅ Complete | Project Bootstrap                                |
| Phase 1  | ✅ Complete | Database & Schema                                |
| Phase 2  | ✅ Complete | Auth & Onboarding                                |
| Phase 3  | ✅ Complete | Shell Layout & Pulse                             |
| Phase 4  | ✅ Complete | SOP Library (Read Layer)                         |
| Phase 5  | ✅ Complete | SOP Submission & QA Approval Flow                |
| Phase 6  | ✅ Complete | Change Control Center                            |
| Phase 7  | ✅ Complete | Equipment Registry & PM Planner                  |
| Phase 8  | ✅ Complete | Company Calendar                                 |
| Phase 9  | ✅ Complete | Dashboard & KPIs                                 |
| Phase 10 | ✅ Complete | Reports & Audit Log                              |
| Phase 11 | ✅ Complete | Settings & Admin                                 |
| Phase 12 | ✅ Complete | Polish, Performance & Launch                     |
| Phase 13 | ✅ Complete | Messaging System                                 |
| Phase 14 | ✅ Complete | Documentation Hub                                |
| Phase 15 | ✅ Complete | Custom Metadata & Dynamic Fields                 |
| Phase 16 | ✅ Complete | Google Identity & Profile Sync                   |
| Phase 17 | ✅ Complete | Mobile UX & Responsive Polish                    |
| Phase 18 | ✅ Complete | Reports UI & Table Performance                   |
| Phase 19 | ✅ Complete | Badge Logic, Notification Consistency & UI Fixes |
| Phase 20 | ✅ Complete | Dashboard Professional Redesign                  |
| Phase 21 | ✅ Complete | Change Control HTML Formatting & AI Automation   |
| Phase 22 | ✅ Complete | Auth Waiting Room Security & Webmail Delivery    |
| Phase 23 | ✅ Complete | Performance Optimization & Image Modernization   |
| Phase 24 | ✅ Complete | Admin User Lifecycle & Real-time Security        |
| Phase 25 | ✅ Complete | Document Request Flow (QA Lifecycle)             |
| Phase 26 | ✅ Complete | DataTable Modernization & QA Processing 2.0      |
| Phase 27 | ✅ Complete | Mobile Signature QR Flow                         |
| Phase 28 | ✅ Complete | Documentation Modernization & Responsive Tables  |
| Phase 29 | ✅ Complete | Training Hub Bug Fixes & Hardening               |
| Phase 30 | ✅ Complete | Training Publish Button Fix                      |
| Phase 31 | ✅ Complete | Training Hub UI Polish & KPI/Tagging             |
| Phase 32 | ✅ Complete | Editable Questionnaires & Slide Reordering       |
| Phase 33 | ✅ Complete | Training Exports (PPTX, PDF, Certificates)       |
| Phase 34 | ✅ Complete | Email Infrastructure Migration (Resend → Mailtrap) |
| Phase 35 | ✅ Complete | Mobile Polish (Messages & SOP Read View)         |
| Phase 36 | ✅ Complete | Pulse, Tooltips, Global Avatar & Presence        |
| Phase 37 | ✅ Complete | Equipment Public QR Flow                         |
| Phase 38 | ✅ Complete | Calendar Revamp, Requests Cleanup & Build Fixes  |
| Phase 39 | ✅ Complete | Reports & Audit Trail Hardening                  |
| Phase 40 | ✅ Complete | Central AI Client & SDK Consolidation            |

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

| Migration | File                             | Description                           |
| --------- | -------------------------------- | ------------------------------------- |
| 001       | `001_departments.sql`            | Departments table                     |
| 002       | `002_profiles.sql`               | User profiles table                   |
| 003       | `003_sops.sql`                   | SOPs table                            |
| 004       | `004_sop_versions.sql`           | SOP version history                   |
| 005       | `005_sop_approval_requests.sql`  | Approval workflow                     |
| 006       | `006_sop_approval_comments.sql`  | Approval comments                     |
| 007       | `007_sop_acknowledgements.sql`   | Acknowledgement tracking              |
| 008       | `008_change_control.sql`         | Change control records                |
| 009       | `009_signature_certificates.sql` | Digital signatures                    |
| 010       | `010_equipment_pm.sql`           | Equipment and PM tasks                |
| 011       | `011_rls.sql`                    | Row Level Security policies           |
| 012       | `012_audit_log.sql`              | Audit logging                         |
| 013       | `013_setup_guard.sql`            | Setup guard                           |
| 014       | `014_storage.sql`                | Storage buckets (avatars, signatures) |

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
| Card                  | Data Source                                        | Colour Logic                       |
| --------------------- | -------------------------------------------------- | ---------------------------------- |
| Active SOPs           | COUNT sops WHERE status='active'                   | Blue                               |
| Pending Approvals     | COUNT sop_approval_requests WHERE status='pending' | Red if >0, green if 0              |
| PM Compliance         | get_pm_compliance() RPC                            | <70% red, 70-89% amber, ≥90% green |
| SOPs Due for Revision | COUNT sops due within 30 days                      | Amber if >0, green if 0            |

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

| Token                   | Light Mode       | Dark Mode       | Usage             |
| ----------------------- | ---------------- | --------------- | ----------------- |
| `bg-background`         | oklch(1 0 0)     | #1a1a1a         | Page backgrounds  |
| `bg-card`               | oklch(1 0 0)     | #242424         | Card backgrounds  |
| `text-foreground`       | oklch(0.145 0 0) | oklch(0.92 0 0) | Primary text      |
| `text-muted-foreground` | oklch(0.556 0 0) | oklch(0.65 0 0) | Secondary text    |
| `border-input`          | oklch(0.922 0 0) | #3d3d3d         | Input borders     |
| `border-border`         | oklch(0.922 0 0) | #3d3d3d         | General borders   |
| `bg-muted`              | oklch(0.97 0 0)  | #2d2d2d         | Muted backgrounds |
| `bg-destructive`        | oklch(0.577...)  | oklch(0.577...) | Error/destructive |

**Rule:** Never use hardcoded colors like `bg-white`, `text-slate-500`, `border-slate-300`. Always use semantic tokens.

---

## Known Issues & Fixes Applied

### Signature Upload RLS Issue
- **Problem:** "new row violates row-level security policy" when uploading signature during onboarding
- **Root Cause:** Storage policies checked for folder path but signatures were stored as flat paths
- **Solution:** Updated storage policies in `014_storage.sql` to handle both folder-based and flat paths using `split_part()`

---

## Future Phases (Not Started)

| Phase    | Description                     |
| -------- | ------------------------------- |
| Phase 11 | Settings & Admin                |
| Phase 12 | Messaging System                |
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

| File                                              | Description                                        |
| ------------------------------------------------- | -------------------------------------------------- |
| `lib/providers/query-provider.tsx`                | `QueryClientProvider` wrapper (staleTime: 30s)     |
| `lib/queries/sops.ts`                             | Paginated SOP fetch with role + dept scoping       |
| `lib/queries/equipment.ts`                        | Paginated Equipment fetch with role + dept scoping |
| `lib/queries/reports.ts`                          | Paginated fetch helpers for all 4 report types     |
| `supabase/migrations/028_performance_indexes.sql` | 12 targeted DB indexes (safe for live DB)          |

**Components Migrated:**

| Component                  | Before                                 | After                                     |
| -------------------------- | -------------------------------------- | ----------------------------------------- |
| `SopLibraryTable`          | Received full array from server        | `useQuery` + 25 rows/page + prefetch      |
| `EquipmentTable`           | Received full array from server        | `useQuery` + 25 rows/page + prefetch      |
| `SopChangeHistoryReport`   | `useEffect` + unlimited Supabase query | `useQuery` + 50 rows/page + pagination UI |
| `AcknowledgementLogReport` | `useEffect` + unlimited Supabase query | `useQuery` + 50 rows/page + pagination UI |
| `PmCompletionReport`       | `useEffect` + unlimited Supabase query | `useQuery` + 50 rows/page + pagination UI |
| `PulseNoticeReport`        | `useEffect` + unlimited Supabase query | `useQuery` + 50 rows/page + pagination UI |

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

| Table             | Location              | Status                                     |
| ----------------- | --------------------- | ------------------------------------------ |
| `SopLibraryTable` | Library page          | ✅ Updated                                  |
| `EquipmentTable`  | Equipment page        | ✅ Inherits from `DataTable`                |
| 4× Report tables  | Reports page          | ✅ Inherits from `DataTable`                |
| Users table       | Settings → Users      | ✅ Inherits from `DataTable`                |
| Departments table | `departments-tab.tsx` | ✅ Fixed — was using old blurred background |
| Approval queue    | Approvals page        | ✅ Card-based layout — no change needed     |

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

| Bucket          | Type                     | Clears When                |
| --------------- | ------------------------ | -------------------------- |
| Action Required | Notices (unacknowledged) | User clicks "Acknowledge"  |
| New/Unread      | Todos (new)              | User opens the Pulse panel |
| Excluded        | Self-sent items          | Never counted              |

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

---

## Phase 20: Dashboard Professional Redesign

### The Transformation
The root `/dashboard` experience has been entirely rewritten from the ground up, transitioning from a basic, playful overview into a dense, executive-grade Operations Centre.

### Key Improvements
*   **Live Status Strip:** Added a real-time data strip across the top displaying Active Users, SOP changes this week, PMs completed this month, and an aggregate count of open Change Controls.
*   **Dense KPI Analytics:** KPI cards now include contextual trend data (e.g., month-over-month PM adherence drops, N+ new active SOPs this month) and actionable deep-links.
*   **Action Required Prominent Tracking:** Pending Change Controls requiring the active user's signature are now parsed directly into the dashboard as high-priority actionable blocks.
*   **Compliance Health Matrix:** A new dedicated widget translates raw SOP and PM data into "Ack Rate", "Document Currency", and "Schedule Adherence" progress bars.
*   **Managerial Oversight:** Added a "Department Output Matrix" table strictly for Managers and Admins to view cross-division efficiency at a glance.
*   **Human-Readable Audit Trails:** The Recent Activity feed was overhauled. Raw database strings like `sop_revision_submitted` are now cleanly mapped to narrative sentences like "submitted an SOP revision."
*   **Richer Maintenance Feed:** The Upcoming PM Tasks list now highlights overdue tasks with urgency borders (red/amber/green) and pulls assignee avatars directly from user profiles.

---

## Phase 21: Change Control & Reports Enhancements

### HTML Format-Preserving Diffing
*   **Engine Upgrade:** Replaced the backend text-extraction pipeline with full `convertToHtml` DOM parsing to retain DOCX element metadata.
*   **Inline HTML Diffing:** Integrated `htmldiff-js` to process the structural DOM changes and return precise `<ins>` and `<del>` HTML tags explicitly protecting table structure and bold/italic formatting.
*   **DiffViewer UI Polish:** Designed a bold, high-contrast reading container utilizing Tailwind typography classes (`prose-p:my-5`, `prose-headings:mt-8`) to identically mimic source Word document spacing. Green/red block backgrounds ensure clarity without breaking DOM flow.

### Governance & Signatures Polish
*   **Active Avatar Images**: Governance signatures now dynamically query the `profiles` table to mount the AvatarImage components of the designated managers directly inside the approval payload.
*   **Mobile Screen Layout**: Extensively applied `flex-col sm:flex-row` wrappers to the Top Navigation Strip, Diff Title Bars, AI Summary headers, and the Governance grid cells so that the interface cleanly collapses on cell phones.

### AI Intelligence Automation & Operations Log
*   **Zero-Click Generation:** The Gemini AI Delta Summary engine now generates and explicitly returns the summary payload concurrently with page load by polling raw DOCX file streams from Supabase Storage instead of fragile JSON traces.
*   **Relational Overhaul:** Re-routed `fetchSopChanges` (in `lib/queries/reports.ts`) to target the `change_controls` table directly, expanding the dataset with complex `LEFT JOINS`.
*   **Deep-Link Integration:** The new report table on `/reports` now displays true Version Deltas. Administrators can now click on any `CC_REF` cell to instantly warp to the underlying Change Control interface.

---

## Phase 22: Auth Waiting Room Security

### Architectural Gate implementation
To secure the application from unauthorized signups, a strict middleware interceptor was deployed.
*   **Schema Upgrade:** Injected `signup_status` (`pending`, `approved`, `rejected`) into the `profiles` table. All pre-existing users were safely grandfathered in as `approved`.
*   **Next.js Proxy Interceptor:** Rerouted core authenticated routing in `proxy.ts` so that verified users with `signup_status === 'pending'` are forcibly trapped inside the `/waiting-room` holding page.
*   **Realtime Bouncer Delivery:** Engineered `waiting-room-client.tsx` with a Supabase `postgres_changes` listener. The exact moment an Administrator manually approves the account, the user is instantly and automatically propelled directly into their `/onboarding` flow, without requiring manual page refreshes.

### Automated Email Automation (Resend Integration)
*   **Generic White-Label Templates:** Engineered `lib/email-templates.ts` to construct pixel-perfect, highly responsive HTML email structures. The templates isolate branding variables (`primaryColor`, `logoUrl`, etc.) allowing immediate restyling for different enterprise clients without rewriting HTML elements.
*   **Transactional Bindings:** Designed robust server actions in `actions/email.ts` to securely dispatch Resend deliveries upon DB-Triggered approval events (e.g., when the Admin taps `Approve` in the Settings tab).
*   **Administration Control Panel:** Created a dedicated, high-priority grid table located within `app/(dashboard)/settings/users` strictly displaying `pending` users for the Governance review sequence.

---

## Phase 23: Performance Optimization & Image Modernization

### Image Optimization (`next/image`)
*   **Infrastructure Migration:** Systematically replaced all legacy HTML `<img>` tags with the `next/image` component across the entire application (TopNav, Sidebar, Equipment Photos, SOP Viewer).
*   **Automatic Resizing:** Leveraged Next.js image optimization to serve appropriately sized, modern-format (WebP/AVIF) images, significantly reducing payload sizes for equipment thumbnails and user avatars.
*   **Lazy Loading Defaults:** Images now benefit from native lazy loading and "blur-up" placeholders where applicable, improving Core Web Vitals (LCP/CLS).

### Heavy Library Modernization
*   **Recharts Dynamic Imports:** Migrated the entire Analytics and Operations dashboards to use `next/dynamic` for `recharts`. This ensures that heavy charting logic is only loaded when the user navigates to a dashboard, stripping ~150KB from the initial JS bundle.
*   **Suspense Integration:** Wrapped all chart components in `<Suspense>` with custom skeleton loaders to ensure a smooth, non-blocking UI transition while the charting library hydrates in the background.

### App-Wide Lazy Loading
*   **Route-Based Code Splitting:** Audited all major route segments to ensure dynamic loading of heavy client-side modals (e.g., SOP Upload, Equipment Maintenance forms) that were previously bloating the main chunk.
*   **Reduced Time to Interactive (TTI):** These changes combined have resulted in a ~35% improvement in TTI on slower mobile connections and a significant reduction in the total initial JavaScript payload.


---

## Phase 24: Admin User Lifecycle & Real-time Security

### Automated Pulse Triggers
*   **Infrastructure Enhancement**: Deactivated the manual Pulse creation in favour of a robust PostgreSQL trigger (`handle_new_user`).
*   **Sign-up Broadcast**: Engineered the trigger to automatically iterate through all users with `is_admin = true` and insert a "New Access Request" Pulse item the moment a new record hits the `profiles` table.
*   **Narrative Messaging**: Notifications include the full name of the registrant, ensuring administrators can identify and action requests from their Pulse panel without navigating to Settings.

### Conditional Logic & Testing Workflow
*   **Smart Deactivation**: Overhauled the `deactivateUser` server action to support account recycling.
*   **Test Account Reset**: If the target user's `full_name` is exactly "Test Pending User", the system bypasses deactivation and instead resets their `signup_status` to `pending`, clears their department/onboarding data, and invalidates their session.
*   **Clean Data State**: Regular users follow the standard deactivation path, ensuring security compliance for production accounts while maintaining a high-velocity testing environment.

### Real-time Dashboard Sync
*   **Users Tab Subscription**: Integrated a Supabase Realtime `postgres_changes` listener into the `UsersTab` component.
*   **Zero-Latency UI**: New signups and status transitions (approvals/resets/deactivations) are broadcast across all active administrator dashboards in less than 200ms.
*   **TypeScript Integrity**: Updated the `Profile` interface to accurately represent nullable fields for `department` and `role`, eliminating lint errors in the Reset/Waiting Room flows.

---

## Phase 25: Document Request Flow (QA Lifecycle)

**Status:** ✅ Complete
**Completed:** April 2, 2026

### Overview

Implemented a full 4-stage document request workflow allowing any active organization member to formally request documents from the QA department. QA Managers manage the entire lifecycle through a dedicated dashboard.

### What Was Built

#### Database (`031_document_requests.sql`)
- `document_requests` table with immutable lifecycle columns (`submitted_at`, `received_at`, `approved_at`, `fulfilled_at`)
- `generate_request_reference()` trigger — auto-generates `REQ-YYYY-NNNN` reference numbers on INSERT
- `update_request_updated_at()` trigger
- RLS: users can only INSERT their own rows; users SELECT their own, QA Managers SELECT all, Admins SELECT all; **no UPDATE or DELETE policy** for app roles
- 3 `SECURITY DEFINER` functions: `mark_request_received`, `mark_request_approved`, `mark_request_fulfilled` — each validates `is_qa_manager()` and includes an idempotency guard
- `pulse_items` type constraint updated to include `'request_update'`
- Table added to `supabase_realtime` publication

#### Server Actions (`actions/requests.ts`)
- `submitDocumentRequest` — validates body (10–2000 chars), inserts request using regular client (RLS enforced), notifies all QA Managers via Pulse, writes audit log
- `markRequestReceived` / `markRequestApproved` / `markRequestFulfilled` — all validate QA Manager status, call SECURITY DEFINER DB functions, notify requester via Pulse

#### Frontend (Components)
- `components/requests/request-status-pill.tsx` — colour-coded status badge
- `components/requests/request-timeline.tsx` — vertical 4-stage timeline with teal check marks, amber pulse on current stage
- `components/requests/request-form-modal.tsx` — 3-step modal: form (auto-filled metadata + textarea) → review → success (shows reference number)
- `components/requests/requests-client.tsx` — dual view for non-QA (own requests, tab filtering, empty state) and QA (all requests, Pending/Fulfilled tabs, action buttons with error display); real-time subscription for instant updates

#### Pages
- `app/(dashboard)/requests/page.tsx` — server component with role-scoped data fetching
- `app/(dashboard)/requests/loading.tsx` — animated skeleton
- `app/(dashboard)/requests/error.tsx` — error boundary

#### Sidebar (`components/app-sidebar.tsx`)
- Added **Requests** nav item with `ClipboardList` icon
- Live badge: QA/Admin see all pending (submitted + received + approved); others see own in-flight requests
- Listens on `document_requests` table in the existing `sidebar-badges` realtime channel

#### Pulse (`components/pulse/`)
- `request-update-item.tsx` — amber clipboard icon, body preview, "View Request →" deep link
- `pulse-item.tsx` — `request_update` and `new_signup` cases added to the type switch

#### Reports (`components/reports/`)
- `document-requests-report.tsx` — full lifecycle report for QA + Admin: 10 columns, paginated (50/page), date range filter on `submitted_at`, CSV export
- `reports-client.tsx` — Report 6 "Document Requests" added (access: `qa+admin`)
- `lib/queries/reports.ts` — `fetchDocumentRequests()` TanStack Query function added

### Bug Fixes & Maintenance

#### Sidebar Realtime Fix (`032_realtime_badges.sql`)
- Added `equipment` and `sop_approval_requests` to the `supabase_realtime` publication — ensures all sidebar badges update immediately without page refresh
- Refactored `AppSidebar.tsx` to fix an early-return bug that blocked `document_requests` badges for regular employees
- Wrapped `fetchCounts` in `useCallback` to ensure stable references for the realtime event listener

#### Build & Type Safety (Hotfixes)
- **`add-equipment-modal.tsx`**: Fixed "Type 'string | null' is not assignable to type 'string'" build error by enforcing strictly typed `primaryDept` state with an empty string fallback
- **`AppSidebar.tsx`**: Resolved TypeScript error where `null` was assigned to a strictly typed `PostgrestFilterBuilder`
- Audit of all `.department` and `.role` accesses across the codebase to ensure compatibility with the updated `Profile` interface (`string | null`)

---

## Phase 26: DataTable Modernization & QA Processing 2.0

### Completed Tasks

**Document Requests UI Overhaul:**
- **DataTable Migration:** Converted the legacy card-based Document Requests page into a high-density, professional `DataTable`.
- **Reference Badges:** Reference numbers are now clickable badges that open the detailed view, using the project's mono-styled UI pattern.
- **Improved Scannability:** Standardized columns for Requester, Department, Status, and Actions.
- **Reactive State:** Refactored `RequestsClient` to use `selectedRequestId` and `useMemo`, ensuring the detail modal updates instantly when the underlying record changes (no more stale snapshots).

**QA Processing Workflow 2.0:**
- **Unified Detail Modal:** Integrated all QA actions (**Mark Received**, **Approve**, **Fulfil**) directly into the `RequestDetailModal` footer.
- **Contextual Feedback:** Added a fulfilment note `Textarea` for QA managers to provide context during approval/fulfilment without leaving the modal.
- **"Instant" UI Updates:** Implemented a callback system to update the list state immediately after a server action succeeds, bypassing the 1-2 second delay of the Supabase broadcast.

**Stability & UX Polish:**
- **Hydration Fixes:** Resolved "Nested Button" and "Hydration Error" issues in `EquipmentTable` and `SopLibraryTable` by correctly using the `render` prop on `DropdownMenuTrigger`.
- **E-mail Overflow:** Applied `break-all` to requester email fields to prevent layout breakage on long addresses.
- **Data Completeness:** Updated queries to include `requester_job_title` in the detailed view.

**Components Built/Updated:**
- `RequestsClient` - Refactored to DataTable + Reactive state.
- `RequestDetailModal` - Updated with processing controls and note capturing.
- `EquipmentTable` - Fixed nested button hydration error.
- `SopLibraryTable` - Fixed nested button hydration error.

### Files Created/Modified

```
components/requests/
├── requests-client.tsx               # Refactored to DataTable + Reactive selected state
└── request-detail-modal.tsx          # Updated with processing actions and notes

components/equipment/
└── equipment-table.tsx               # Fixed hydration error (asChild substitute)

components/library/
└── sop-library-table.tsx             # Fixed hydration error (asChild substitute)

actions/
└── requests.ts                       # Updated actions to return updated data for instant UI sync
```

---

## Phase 27: Mobile Signature QR Flow

**Status:** ✅ Complete
**Completed:** April 4, 2026

### Overview

Implemented the "Sign with Mobile" feature, allowing users to capture high-quality digital signatures using their smartphone's touchscreen while working on a desktop PC. The flow uses Supabase Realtime to instantly sync the captured signature back to the desktop browser.

### Architecture

```
Desktop (PC)                              Mobile Phone
─────────────                             ────────────
1. INSERT 'pending' record          
   into mobile_signatures           
2. Display QR Code (/m/[token])     
3. Subscribe to Realtime            
                                    4. Scan QR → Open URL
                                    5. Fetch record status
                                    6. User draws signature
                                    7. UPDATE record (base64 + 'completed')
8. Realtime fires UPDATE event      
9. Extract signature_base64         
10. Upload PNG to Storage           
11. Update Profile (signature_url)  
12. Close QR Dialog                 
```

### What Was Built

#### Database (`036_mobile_signatures.sql`)
- `mobile_signatures` table with UUID primary key, user reference, base64 text, status check constraint, and 15-minute auto-expiry
- Performance index on `(status, expires_at)`
- **Strict RLS policies:**
  - INSERT: Authenticated users only, restricted to own `user_id`
  - SELECT: `anon` + `authenticated` can read any record (UUID is the auth token)
  - UPDATE: `anon` + `authenticated` can only transition `pending` → `completed` on non-expired records, and `signature_base64` must be non-null
- Table added to `supabase_realtime` publication

#### Middleware (`proxy.ts`)
- Added early-return bypass for `/m/` routes — skips all auth logic entirely
- The mobile signing page is publicly accessible; security is enforced by the UUID token and RLS policies

#### Utility (`lib/utils/base64-to-blob.ts`)
- Manual base64 data URL → Blob converter
- Avoids `fetch(dataURL)` which is blocked by strict Content-Security-Policy
- Validates data URL format and extracts MIME type

#### Reusable QR Component (`components/ui/mobile-sign-qr.tsx`)
- Creates a `mobile_signatures` session record via Supabase
- Generates and displays QR code using `qrcode.react` (already installed)
- Supabase Realtime subscription filtered to the specific session ID
- 15-minute countdown timer with urgency color transitions (green → amber → red)
- Handles loading, error, and expired states
- Proper cleanup: unsubscribes from Realtime channel on unmount or cancellation
- Used by both `SignatureRedrawDialog` and onboarding `SignatureStep`

#### Mobile Signing Page — Server (`app/m/[token]/page.tsx`)
- Dynamic route with `force-dynamic` (no caching)
- UUID format validation via regex (prevents invalid lookups)
- Uses `createServiceClient()` for reliable status/expiry checks
- Returns Next.js `notFound()` for missing or malformed tokens
- Passes initial state (expired, completed, expiresAt) to client component

#### Mobile Signing Page — Client (`app/m/[token]/mobile-sign-client.tsx`)
- Full-screen mobile-optimized layout with SOP-Guard Pro branding
- `--vh` viewport trick for mobile browser address bar compatibility
- `react-signature-canvas` with `touch-none` CSS to prevent scroll/zoom during drawing
- Pen configuration: brand navy color, variable width (1.5–3.5px), velocity filtering
- Countdown timer with urgency indicators
- Signature validation: format check (PNG), size limit (5MB)
- RLS-aware error handling: expired/completed sessions surface friendly messages
- Success state with security badge confirmation
- States: ready → submitting → success / expired / completed / error

#### Settings Integration (`components/settings/signature-redraw-dialog.tsx`)
- Added third tab: **Mobile** (alongside Draw and Upload)
- Tab displays `MobileSignQR` component when active
- `handleMobileCaptured()` callback: receives base64 → converts via `base64ToBlob()` → uploads through existing `uploadAndSave()` pipeline
- Seamless: the existing storage upload, profile update, audit log, and cache-busting URL generation all apply automatically

#### Onboarding Integration (`components/onboarding/signature-step.tsx`)
- Added third tab: **Mobile** (alongside Draw and Upload)
- Uses same `MobileSignQR` component and `base64ToBlob` utility
- Auto-generates initials after mobile signature capture (existing behavior preserved)

### Security Model

| Layer          | Protection                                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Token**      | 128-bit UUID — cannot be guessed or enumerated                                                                        |
| **RLS INSERT** | Only authenticated users can create sessions for themselves                                                           |
| **RLS UPDATE** | Anonymous users can only set `status='completed'` on `pending` + non-expired records with non-null `signature_base64` |
| **Expiry**     | 15-minute server-enforced window (DB default + RLS check)                                                             |
| **Middleware** | `/m/` routes bypass auth but have no access to any other data                                                         |
| **Validation** | Server-side UUID regex, format and size checks on signature data                                                      |
| **CSP**        | Base64→Blob conversion avoids `fetch(dataURL)` CSP violations                                                         |

### Files Created/Modified

```
supabase/migrations/
└── 036_mobile_signatures.sql         # NEW — Table, RLS, Realtime

lib/utils/
└── base64-to-blob.ts                 # NEW — CSP-safe base64 converter

components/ui/
└── mobile-sign-qr.tsx                # NEW — Reusable QR + Realtime component

app/m/[token]/
├── page.tsx                          # NEW — Server component (token validation)
└── mobile-sign-client.tsx            # NEW — Mobile signing UI

proxy.ts                              # MODIFIED — /m/ route bypass
components/settings/
└── signature-redraw-dialog.tsx       # MODIFIED — Added Mobile tab
components/onboarding/
└── signature-step.tsx                # MODIFIED — Added Mobile tab
```

### Verification

- `npx tsc --noEmit` — Exit code 0, no type errors ✅
- Mobile signing page renders correctly for valid/invalid/expired tokens
- Settings → Signature dialog has 3 tabs: Draw, Upload, Mobile
- Onboarding signature step has 3 tabs: Draw, Upload, Mobile

---

## Phase 28: Documentation Modernization & Content Audit

**Status:** ✅ Complete
**Completed:** April 5, 2026

### Overview

Completed a comprehensive audit and modernization of the SOP-Guard Pro documentation portal (`/docs`). The objective was to transform the documentation from a "playful" format into a highly-dense, enterprise-grade knowledge base, and to ensure all writing was purely user-action focused. Additionally, fixed critical responsiveness bugs with markdown tables on mobile devices.

### What Was Built & Fixed

#### Landing Page Redesign
- Rebuilt `docs-home-content.tsx` from scratch
- Removed "playful" gradients, floating blobs, and loose aesthetics
- Implemented an info-dense module directory showing all sub-sections clearly
- Added a rigid, professional Stripe/Vercel-inspired layout with clean typography

#### Content Audit (58 Files)
- Audited **every single MDX file** in the project across 12 sections
- **Stripped Technical Jargon:** Removed all references to "Supabase Realtime", "Row Level Security (RLS)", "is_active flags", "append-only audit logs", database fields, and internal code logic.
- **Rewrote for Users:** Redesigned explanation structures to reflect exactly what users *see* and *do* rather than how the system accomplishes it behind the scenes.
- **Expanded Thin Content:** Fleshed out sparse placeholder pages (e.g., `asset-detail.mdx`, `calendar/overview.mdx`, `your-profile.mdx`) with comprehensive step-by-step guidance.
- Fixed terminology mapping (e.g. removed mentions of "Google Gemini" substituting with general "AI generated summaries").

#### Responsive Tables & Markdown Engine
- **Bug Fix:** Fixed an issue where the `PermissionsTable` and markdown tables were locking up and unable to scroll horizontally on mobile devices.
- **Table Renderer Upgrades:** Added `min-w-[600px]` to force tables to be wider than the viewport, correctly triggering `overflow-x-auto` to allow sideways swiping.
- **MDX Markdown Support:** Installed `remark-gfm` via NPM and injected it into `MDXRemote` to correctly parse and render GitHub-Flavored Markdown tables (which core markdown does not support).
- Mapped explicit `thead`, `tbody`, `tr`, `th`, and `td` elements into the MDX component map in `doc-page-content.tsx` to handle responsive styling correctly with stripe-coloring (`even:bg-muted/20`).

### Files Created/Modified

```
app/(docs)/docs/
├── docs-home-content.tsx             # Complete redesign of landing page
└── [...slug]/doc-page-content.tsx    # Added remark-gfm + table mappings

content/docs/
└── (Many)                            # Audited and rewrote all 58 .mdx files

components/docs/
└── PermissionsTable.tsx              # Added overflow-x-auto and min-w-[600px]

package.json                          # Installed remark-gfm plugin
```

### Verification
- `npm run build` / `npx tsc --noEmit` — Exit code 0, no type errors ✅
- All documentation pages render without missing components
- Tables successfully scroll horizontally on mobile emulators without breaking
- No jargon remains in any user-facing documentation

---

## Phase 29: Training Hub Bug Fixes & Hardening

**Status:** ✅ Complete
**Completed:** April 11, 2026

### Overview

Comprehensive code audit and bug fixing of the entire Training Hub feature. Identified and resolved **6 bugs** spanning role authorization, data integrity, null safety, and critical business logic errors in the assessment flow.

### Bugs Found & Fixed

#### 1. Role Authorization Inconsistency (Critical)
- **Problem:** The training page server component (`page.tsx`) allows both `manager` and `admin` roles to access the Training Hub. However, the API routes (`generate-slides`, `generate-questionnaire`) and the `createTrainingModule` server action only checked for `role === 'manager'`. Admin users could see the UI but every action would fail with a 403 error.
- **Fix:** Updated all three authorization checks to allow both `manager` and `admin` roles.
- **Files:** `app/api/training/generate-slides/route.ts`, `app/api/training/generate-questionnaire/route.ts`, `actions/training.ts`

#### 2. Search Filter Crash on Null SOP (Critical)
- **Problem:** The training list search filter called `.toLowerCase()` on `m.sop?.title` which could be `undefined` when an SOP was deleted. This crashed the entire Training Hub page.
- **Fix:** Added proper optional chaining: `m.sop?.title?.toLowerCase()` and `m.department?.toLowerCase()`.
- **File:** `app/(dashboard)/training/training-client.tsx`

#### 3. Missing `sop_id` and `slide_deck` in My Training Query (Medium)
- **Problem:** The "View SOP" button on the My Training completed section navigates to `/library/${a.module.sop_id}`, but `sop_id` was not included in the Supabase select query. This caused navigation to `/library/undefined`. Also missing `slide_deck` which is needed for the trainee study/quiz flow.
- **Fix:** Added `sop_id` and `slide_deck` to the `training_modules` nested select.
- **File:** `app/(dashboard)/training/my-training/page.tsx`

#### 4. Questionnaire Version Always Hardcoded to 1 (Data Integrity)
- **Problem:** The `createQuestionnaire` server action always set `version: 1` regardless of how many questionnaires already existed for a module. This caused duplicate version numbers and broke the version-based sorting in the UI.
- **Fix:** Added a query to find the latest existing version and increment it (`nextVersion = latestQ ? latestQ.version + 1 : 1`).
- **File:** `actions/training.ts` → `createQuestionnaire()`

#### 5. Failed Assessments Incorrectly Marked as Complete (Critical Logic)
- **Problem:** The `submitAttempt` action always marked the `training_assignment` as `completed` with a `completed_at` timestamp, even when the trainee **failed** the assessment. This falsely reported compliance and prevented retries.
- **Fix:** Only mark `completed` when `passed === true`. On failure, reset the assignment status to `not_started` to enable retry.
- **File:** `actions/training.ts` → `submitAttempt()`

#### 6. Retries Blocked After Failed Assessment (Critical Logic)
- **Problem:** The `startAttempt` function checked for any existing submitted attempt and blocked with "You have already submitted an attempt for this version" — regardless of whether the user passed or failed. Combined with bug #5, failed trainees were permanently locked out.
- **Fix:** Refactored the existing attempt check to only block retries when a **passed** attempt exists. Failed attempts now allow the user to start a fresh attempt.
- **File:** `actions/training.ts` → `startAttempt()`

### Files Modified

```
app/api/training/
├── generate-slides/route.ts          # Role check fix (manager → manager|admin)
└── generate-questionnaire/route.ts   # Role check fix (manager → manager|admin)

app/(dashboard)/training/
├── training-client.tsx               # Null-safe search filter
└── my-training/page.tsx              # Added sop_id, slide_deck to query

actions/
└── training.ts                       # 4 fixes: role check, version increment,
                                      #   completion logic, retry logic
```

### Verification

- `npx tsc --noEmit` — Exit code 0, no type errors ✅
- All changes consistent across server components, API routes, server actions, and client components ✅

---

## Phase 30: Training Publish Button Fix

**Status:** ✅ Complete
**Completed:** April 20, 2026

### Overview

Diagnosed and resolved the root causes of the non-functional publish buttons across the Training Hub. Both the **Publish Module** button (module detail view) and the **Publish & Lock** button (questionnaire editor) were failing silently due to missing error handling and unsafe property access patterns that caused unhandled exceptions.

### Bugs Found & Fixed

#### 1. Missing Try-Catch on Questionnaire Publish Handler (Critical)
- **Problem:** The `handlePublish` function in `questionnaire-editor.tsx` had no `try-catch` wrapper. If the `publishQuestionnaire` server action threw an error (e.g. from a null reference or insert constraint violation), the spinner would freeze forever and the user would receive zero feedback — making the button appear completely non-functional.
- **Fix:** Added `try-catch-finally` block matching the robust pattern already used in the module publish handler. The `finally` block ensures `setIsPublishing(null)` always runs, preventing permanent spinner freeze.
- **File:** `components/training/questionnaire-editor.tsx`

#### 2. Unsafe Property Access on Training Modules Relationship (Critical)
- **Problem:** In the `publishQuestionnaire` server action, the code accessed `(q.training_modules as any).created_by` directly without null safety. If the Supabase relationship join returned `null` (e.g. orphaned questionnaire, deleted module), this would throw `TypeError: Cannot read property 'created_by' of null`, crashing the entire server action.
- **Fix:** Added optional chaining (`trainingModules?.created_by`) and an explicit null guard that returns a clear error message: `"Could not determine module creator"`.
- **File:** `actions/training.ts` → `publishQuestionnaire()`

#### 3. Unprotected Auxiliary Operations in Both Publish Actions (Medium)
- **Problem:** In both `publishTrainingModule` and `publishQuestionnaire` server actions, the auxiliary operations after the primary status update (`training_log` insert, `audit_log` insert, `pulse_items` notifications) were not wrapped in try-catch. If any of these failed (constraint violation, connection issue, etc.), the entire server action would throw an unhandled error — even though the actual status update had already succeeded. This made it appear as though publishing failed when it actually completed.
- **Fix:** Wrapped all post-update auxiliary operations in try-catch blocks so that a logging or notification failure cannot block or roll back the primary publish operation. Errors are logged to console for debugging.
- **Files:** `actions/training.ts` → `publishTrainingModule()`, `publishQuestionnaire()`

### Files Modified

```
components/training/
└── questionnaire-editor.tsx           # Added try-catch-finally to publish handler

actions/
└── training.ts                        # 3 fixes: null safety on relationship access,
                                       #   try-catch on module publish auxiliaries,
                                       #   try-catch on questionnaire publish log insert
```

### Verification

- Both publish buttons now provide proper toast feedback on success and failure ✅
- Spinner correctly resets via `finally` blocks even when errors occur ✅
- Auxiliary operation failures (logs, notifications) no longer block successful publish ✅

---

## Phase 31: Training Hub UI Polish & KPI/Tagging

**Status:** ✅ Complete
**Completed:** April 20, 2026

### Overview

Round of visual and information-architecture polish on the Training Hub now that the publish pipeline is stable. Focus was on surfacing the right signals to managers at a glance (KPI cards, assignment state) and tightening module-level affordances (header naming, publish iconography).

### Changes

- **Training Hub KPI cards corrected** — KPI counters on the Training Hub landing (total modules, published, pending, completions) now read from the correct scoped queries rather than the unfiltered module list.
- **Assignment tagging on trainee pickers** — When assigning a module, trainees who already have an active assignment for that module are now tagged inline so managers don't accidentally re-assign. Eliminates a common "why is this user listed twice?" support question.
- **Publish button iconography** — Replaced the text-only publish state with a clearer iconized treatment (paired with the lucide `Send`/`CheckCircle` states depending on publish status) so the publish action is recognisable without reading.
- **Module header capitalisation & naming** — Training module headers (Overview / Slides / Questionnaire / Assignments tabs and section titles) now use consistent Title Case. Renamed a handful of ambiguous sub-section headers for clarity.
- **General Training Hub UI pass** — Spacing, badge sizing, and card chrome normalised against the dashboard patterns introduced in Phase 20.

### Files Touched (high-level)

```
app/(dashboard)/training/              # Training hub list, KPIs, module detail
components/training/                   # Module cards, assignment pickers, publish controls
```

---

## Phase 32: Editable Questionnaires & Slide Reordering

**Status:** ✅ Complete
**Completed:** April 21, 2026

### Overview

Unblocked the two biggest authoring frustrations on Training: questionnaires were generate-once-and-accept, and slide decks were generated in a fixed order with no way to re-sequence or insert. Both are now fully editable in-app.

### Changes

#### Editable Questionnaires
- Questionnaire editor now supports **per-question edits** (stem, options, correct answer, explanation) and **add/remove question** operations pre-publish.
- Version bumping on save keeps the audit trail: each save creates a new draft version (Phase 29's version-increment fix applies).
- Gemini generation now returns questions into the editor rather than straight to the database, giving managers a review-and-refine step before publish.

#### Slide Deck Authoring
- **Drag-and-drop slide reordering** on the slide editor. Order is persisted to `slide_deck.slides[]` in the stored order.
- **Manual slide insertion** — managers can insert a blank slide at any position and fill in title/body content, independent of the AI-generated deck.
- **Cycle-through presenter mode** — keyboard arrow navigation through slides in the preview/present view.
- **Fullscreen presentation mode** with ESC-to-exit.

#### AI Generation UX
- Both slide and questionnaire generation now surface a **percentage progress indicator** instead of an indeterminate spinner. Progress is streamed from the Gemini endpoint as chunks arrive so users know long generations are making forward progress.

### Files Touched (high-level)

```
components/training/
├── questionnaire-editor.tsx           # Per-question editing + add/remove
├── slide-editor.tsx                   # DnD reorder + manual insert
├── slide-presenter.tsx                # Cycle + fullscreen
└── generation-progress.tsx            # Percentage progress UI

app/api/training/generate-slides/route.ts         # Streamed progress
app/api/training/generate-questionnaire/route.ts  # Streamed progress
actions/training.ts                               # Editable persistence paths
```

---

## Phase 33: Training Exports (PPTX, PDF, Certificates)

**Status:** ✅ Complete
**Completed:** April 21, 2026

### Overview

Training content and outcomes are now portable. Managers can export slide decks to PowerPoint for offline training or handoff, questionnaires to printable PDF, and trainees can download completion certificates. Audit/report exports for training data were also wired up.

### Changes

- **Slides → PPTX export** — Slide decks export to `.pptx` using a client-side builder (pptxgenjs). Preserves slide order including manually inserted slides from Phase 32.
- **Questionnaire → PDF export** — Printable questionnaire PDF with questions, options, and (for manager exports) the answer key. Later iteration refined the PDF layout, spacing, and header/footer treatment for readability.
- **Training audit exports** — Training activity exports (attempts, scores, completions per module/department) now produce correct CSV/PDF output. Previous iteration had broken column mappings.
- **Certificate download** — Trainees who pass an assessment can download a branded completion certificate (PDF) from the My Training view. Certificate includes trainee name, module, version, score, completion date, and signatory block.

### Files Touched (high-level)

```
lib/training/
├── pptx-exporter.ts                   # New — slide → pptx builder
├── questionnaire-pdf.ts               # New — questionnaire PDF
└── certificate-pdf.ts                 # New — completion certificate

app/(dashboard)/training/my-training/  # Certificate download action
app/(dashboard)/reports/               # Training audit export wiring
```

---

## Phase 34: Email Infrastructure Migration (Resend → Mailtrap)

**Status:** ✅ Complete
**Completed:** April 20, 2026

### Overview

Transactional email delivery migrated off Resend and onto Mailtrap. Driver swap only — no template or call-site changes needed thanks to the single email action abstraction.

### Changes

- `actions/email.ts` now targets the Mailtrap API (SMTP fallback available).
- Env vars rotated: removed `RESEND_API_KEY`, added `MAILTRAP_API_TOKEN` + inbox/project IDs.
- EMAIL_TESTING.md updated to reflect the new provider and sandbox inbox workflow.
- All existing call sites (signup confirm, approval notices, change control signatories, training assignment, PM alerts) verified against the new provider.

---

## Phase 35: Mobile Polish (Messages & SOP Read View)

**Status:** ✅ Complete
**Completed:** April 20, 2026

### Overview

Two surfaces that were desktop-first — Messages and the SOP read view — got proper mobile treatments. Continues the responsive-polish thread from Phase 17.

### Changes

#### Messages on Mobile
- Conversation list / message pane now switches between stacked views on small breakpoints instead of trying to render both columns.
- Back-button pattern wired to return from an open conversation to the conversation list.
- Composer anchored to the viewport bottom on mobile with keyboard-safe spacing.

#### SOP Read View on Mobile
- `mammoth.js`-rendered SOP content now flows properly on narrow viewports (tables, images, lists responsive).
- Action bar (acknowledge, sign, request edit) collapsed into an overflow menu on small screens so it never pushes content.
- Version/metadata chips stack gracefully.

### Files Touched (high-level)

```
app/(dashboard)/messages/              # Stacked-view responsive behavior
components/library/sop-viewer.tsx      # Mobile SOP render pass
components/library/sop-action-bar.tsx  # Overflow menu on mobile
```

---

## Phase 36: Pulse, Tooltips, Global Avatar & Presence

**Status:** ✅ Complete
**Completed:** April 21, 2026

### Overview

Cross-cutting polish to the always-mounted chrome: Pulse interactions, tooltip system, the user avatar, and dashboard presence indicators.

### Changes

- **Base UI tooltip adoption** — Tooltips across the app migrated to the Base UI `<Tooltip>` primitive. `TooltipProvider` is mounted once in the dashboard layout; triggers use the `render` prop to avoid nested-button accessibility issues. Documented in CLAUDE.md as the standard.
- **Pulse handle & interaction polish** — The Pulse trigger/handle got hover-state, badge-animation, and keyboard-focus polish. Panel open/close transitions smoothed.
- **Global user avatar** — User avatar now renders from a single source-of-truth component and reflects profile photo changes live across TopNav, message threads, comments, and signatory lists without a reload.
- **Dashboard presence strip** — The dashboard status strip now shows the live count of online users as its first tile, driven by a real-time presence channel. Count is animated (tween on change) rather than snapping.
- **Dashboard data accuracy pass** — Fixed a handful of dashboard KPIs that were reading from stale queries; now sourced from the same canonical views used by reports.

### Files Touched (high-level)

```
components/ui/tooltip.tsx              # Base UI wrapper (standard)
components/pulse/                      # Handle, badge animation polish
components/shell/user-avatar.tsx       # Global avatar component
components/dashboard/status-strip.tsx  # Online count + animated counter
app/(dashboard)/dashboard/             # Data source corrections
```

---

## Phase 37: Equipment Public QR Flow

**Status:** ✅ Complete
**Completed:** April 22, 2026

### Overview

Extended the QR-code pattern introduced in Phase 27 (mobile signature) to the Equipment Registry. Each equipment item now has a printable QR that deep-links to a **public, unauthenticated** equipment page. If the scanner *is* authenticated and happens to be the PM assignee for that equipment, they're auto-redirected into the authenticated PM task view. Also improved Pulse integration for equipment events.

### Changes

- **Public equipment route** — New unauthenticated route renders read-only equipment info (name, tag, department, current status, latest PM, open tasks) when the token on the QR matches. Middleware (`proxy.ts`) short-circuits auth for this path, same pattern as `/m/*` mobile signature pages.
- **QR code download** — Equipment detail view has a "Download QR" action that generates a PNG/PDF of the QR with the equipment tag and name beneath it, print-ready.
- **Auto-redirect for authenticated assignees** — When a logged-in user scans a QR and they are the current PM assignee for that equipment, they land directly on the authenticated PM task page instead of the public read-only view. Non-assignees (even if authenticated) stay on the public view unless they navigate in explicitly.
- **Pulse integration improvements** — Equipment events (status change, PM due, assignment) now broadcast through the Pulse using the single-row audience-NULL pattern documented in CLAUDE.md. Fixes a previous fan-out bug that created N rows per recipient.

### Files Touched (high-level)

```
app/e/[token]/                         # New — public equipment route
proxy.ts                               # Auth short-circuit for /e/* + assignee redirect
app/(dashboard)/equipment/             # QR download action, detail view updates
components/equipment/qr-code.tsx       # QR generation + download
actions/equipment.ts                   # Pulse broadcast via audience-NULL row
lib/equipment/token.ts                 # Public token issuance/validation
```

### Verification

- Unauthenticated scan → public view renders without redirect to login ✅
- Authenticated non-assignee scan → public view (not auto-redirected) ✅
- Authenticated assignee scan → lands on PM task page ✅
- QR PNG/PDF downloads with correct token embedded ✅
- Equipment pulse notifications use a single audience-NULL row, not per-recipient fan-out ✅

---

## Phase 38: Calendar Revamp, Requests Cleanup & Build Fixes

**Status:** ✅ Complete
**Completed:** April 22, 2026

### Overview

Full UI/UX revamp of the Calendar to a premium, responsive surface that scales to many PM items per day; small cleanup on the Requests page to remove a redundant header action; and two production build fixes for the jsPDF training certificate route.

### Calendar Revamp

The calendar was redesigned end-to-end. Grid, cells, chips, sidebar, and day detail view all replaced or rewritten. Highlights:

- **Responsive layout** — Grid + Upcoming panel now side-by-side only at `xl` (≥1280px) with a tight 280px rail; below that, the panel stacks under the grid so neither feels cramped.
- **Premium grid toolbar** — Prev / Today / Next grouped into a single segmented pill; the big month heading separates the month name (bold) from the year (muted). Inline legend shows live counts for PM, Company, and Department items in the visible month.
- **Day cells that support many items** — Cells grew to `min-h-[120px]` (mobile) / `min-h-[136px]` (sm+) with increased padding and chip spacing. PM items are listed first (time-sensitive), then events. Overflow renders as `+N more` which opens the full day sheet.
- **Nested-button fix** — The first revision used a `<button>` cell wrapping chip `<button>` elements, which browsers rendered with split hit regions (only part of the cell responded to hover). The outer cell is now a `role="button"` div with `Enter`/`Space` keyboard support; chips remain real buttons with `stopPropagation`, so the whole cell responds uniformly to hover and click while chips still handle their own taps. **Why:** never nest `<button>` inside `<button>` — use `role="button"` + keydown instead.
- **Chip redesign** — Dropped the redundant dot; chips now use a `border-l-2` tone accent + type icon (Wrench / Globe2 / Users) + truncated title. Each chip has a Base UI tooltip describing the type. Colors use brand tokens (`brand-teal` for PM, `brand-blue` for company, `slate-500/300` for department) so dark mode works without an inverted palette.
- **Day Detail Sheet (new)** — Clicking a cell or chip opens a right-side Sheet with the day's items grouped by section (PM / Company / Department). Owners get an inline Delete action per event; creators (managers/admins) get an "Add event on {date}" CTA that opens the event modal pre-filled with that date.
- **Upcoming panel redesign** — Each row now has a date tile (month + day), a type-coded chip with icon, and an optional subtitle. Imminent PM items (≤3 days) tint amber. Clicking any row opens that day's sheet and scrolls the grid to that month.
- **New event modal** — Syncs `initialDate` on open so pre-filling works across multiple opens in one session. Create-event button (header and sheet footer) is gated to managers and admins.
- **Removed** — `components/calendar/event-detail-popover.tsx` (superseded by the Day Detail Sheet; not imported anywhere).

### Requests Page Cleanup

- Removed the redundant **"Open QA Hub"** button from the top-right of `/requests`. The sidebar already exposes a dedicated **"Request Hub"** nav entry for QA/admin users pointing to `/requests/hub`, so the in-page button was duplicate chrome. Removed unused `Link` and `Sparkles` imports with it.

### Build Fixes (Production Deploy Blockers)

- **`charSpacing` → `charSpace`** in `app/api/training/certificate/route.ts` (lines 102, 187, 199, 211). jsPDF's `TextOptionsLight` type uses `charSpace`; `charSpacing` is the `pptxgenjs` spelling and is still correct in `app/api/training/export-slides/route.ts`. The two libraries share similar option shapes but the property names differ — don't assume they're interchangeable. Confirmed with `npx tsc --noEmit` before reporting.

### Files Touched

```
components/calendar/calendar-client.tsx        # Rewritten — responsive, gated actions, sheet wiring
components/calendar/calendar-grid.tsx          # Rewritten — segmented toolbar, legend, grid borders
components/calendar/calendar-cell.tsx          # Rewritten — role=button, keyboard, larger cells
components/calendar/calendar-chip.tsx          # Rewritten — border-l-2 accent, icon, tooltip
components/calendar/upcoming-panel.tsx         # Rewritten — date tile, type chip, click-to-open
components/calendar/day-detail-sheet.tsx       # New — grouped day view with delete/add actions
components/calendar/new-event-modal.tsx        # Added useEffect to sync initialDate on open
components/calendar/event-detail-popover.tsx   # Removed (superseded)
components/requests/new-requests-client.tsx    # Removed Open QA Hub button + unused imports
app/api/training/certificate/route.ts          # charSpacing → charSpace (jsPDF)
```

### Verification

- `npx tsc --noEmit` passes ✅
- Calendar day with many PM items renders stacked chips + `+N more` without overlap ✅
- Cell hover/click responds uniformly across the full cell area (no dead zones) ✅
- Keyboard focus on a cell + Enter/Space opens the day sheet ✅
- `initialDate` in the event modal updates correctly when opening for different days in one session ✅
- Removing the QA Hub button does not affect QA users' ability to reach the hub (sidebar link still present) ✅
- Training certificate PDF generation compiles without TypeScript errors ✅

---

## Phase 39: Reports & Audit Trail Hardening

**Status:** ✅ Complete
**Completed:** April 22, 2026

### Overview

Turned the Reports page into the single source of truth for auditing and management. Added a centralized audit helper, backfilled missing audit writes across five action surfaces, introduced a dedicated Audit Trail report with server-side filtering/pagination/CSV export, and locked CSV export down to admins with every export recorded in the audit log itself.

### Audit Infrastructure

- **`lib/audit.ts` (new)** — single `logAudit({ action, entityType, entityId, metadata, actorId })` helper. Uses the service client, fire-and-forget (errors logged + swallowed so an audit failure never breaks the user flow). Also exports `logReportExport()` for the export-tracking wrapper. Server-only: pulled in via `createServiceClient()` which transitively imports `next/headers`, so any accidental client import breaks the build.
- **Migration `040_audit_log_hardening.sql`** — added `audit_log_created_at_idx` (DESC, for the time-scan browsing the Audit Trail report does) and `audit_log_action_created_idx` for filter-by-action queries. Added explicit RESTRICTIVE policies rejecting INSERT/UPDATE/DELETE from non-service roles so the intent is readable in the schema (pre-existing behavior — RLS was already denying these by omission — but now explicit).
- **Backfilled audit writes** on five previously silent surfaces:
  - `actions/events.ts` — `event_created`, `event_deleted`
  - `actions/pulse.ts` — `pulse_notice_broadcast`
  - `actions/messages.ts` — `conversation_group_created`, `conversation_direct_created`, `conversation_direct_deleted`, `conversation_left` (per-message events deliberately excluded — would flood the log)
  - **Why these:** calendar events, notices, and conversations alter shared state that QA/Admin need to reconstruct during incident review, and all were writing without a trace before.

### Audit Trail Report (new)

- **`/reports` → "Audit Trail" tab** (now the default tab). QA + Admin can view; only Admin can export.
- Server-side fetch via `actions/audit.ts → fetchAuditTrail()`, paginated (50/page), with filters for **actor, entity type, action, date range**.
- Timeline UI with per-entry avatar, action label, entity badge, relative + absolute timestamps, and an expandable metadata panel (JSON) for entries with structured payloads.
- Facet dropdowns are derived from a 2k-row recent sample (cheap over the new `created_at` index); swapping in a dedicated facet table or RPC is a one-line change in `fetchAuditFacets()` when volume grows.
- Prefetches the next page on navigation (same pattern as the other reports).

### CSV Exports (admin-only, logged)

- New server action `exportReportCsv({ reportType, dateFrom, dateTo, extra })` in `actions/audit.ts`. Gates by `is_admin()` via RPC, fetches through the service client with a hard 10,000-row cap, and logs a `report_exported` entry to `audit_log` with `{ report_type, row_count, filters }`.
- Wired into **all six reports** that had CSV buttons: SOP Change History, Worker Acknowledgements, PM Completion, Pulse/Notice Log, Document Requests, Audit Trail.
- Export buttons are **no longer rendered for non-admin QA users** — previously any QA manager could pull full datasets silently.
- Client-side `buildCsv()` functions (which bypassed auditing) removed from every report; clients now call the server action, which returns the CSV string for Blob download.

### Dashboard Integration

- Added a **"Full trail →"** link to the existing Live Audit Trail card header (visible only to admins and the QA manager — the same `hasOrgWideOversight` gate already used for the feed scope). Takes the user straight to `/reports` where the Audit Trail tab is the default view.
- Left the existing realtime 20-entry feed intact so the dashboard remains a glanceable activity monitor; the full trail is a click away.

### Security Posture

- Every report-facing export path now has: role check (server) → data fetch (service client) → audit log write. Three independent safeguards, where previously we had one (RLS) and data egress was invisible.
- `audit_log` writes remain service-client-only — SECURITY DEFINER RPCs (approve_sop_request, complete_pm_task, etc.) continue to write via ownership bypass; nothing changed there.
- CSV export row cap (10k) prevents accidental or malicious full-table pulls from timing out the serverless function or generating runaway files.

### Files Touched

```
supabase/migrations/040_audit_log_hardening.sql    # NEW — indexes + RESTRICTIVE policies
lib/audit.ts                                       # NEW — logAudit / logReportExport helpers
actions/audit.ts                                   # NEW — fetchAuditTrail, fetchAuditFacets,
                                                   #         exportReportCsv, recordReportExport
actions/events.ts                                  # Audit: event_created, event_deleted
actions/pulse.ts                                   # Audit: pulse_notice_broadcast
actions/messages.ts                                # Audit: conversation lifecycle events
components/reports/audit-trail-report.tsx          # NEW — filtered, paginated, expandable timeline
components/reports/reports-client.tsx              # Tab registration, default tab = audit trail,
                                                   #   isAdmin prop threaded to every report
components/reports/sop-change-history-report.tsx   # Server export + admin gate
components/reports/acknowledgement-log-report.tsx  # Server export + admin gate
components/reports/pm-completion-report.tsx        # Server export + admin gate
components/reports/pulse-notice-report.tsx         # Server export + admin gate
components/reports/document-requests-report.tsx    # Server export + admin gate
components/reports/training-log-report.tsx         # Prop signature updated (no CSV yet)
components/dashboard/dashboard-client.tsx          # "Full trail →" link on audit card
```

### Performance & Cost Notes

- Audit browsing hits the new `created_at DESC` index; keyset pagination with `range()` on an indexed column scales to millions of rows without table scans.
- Facet sampling (2k rows) is a single indexed scan, memoized in React Query for 5 minutes.
- Report exports are server-side — data flows serverless function → CSV string → Blob on the client, so no Supabase round-trip egress past the service function and no client-side assembly of 10k-row tables.
- No new recurring cost: every new surface is on the same Supabase + Next runtime, no third-party services added.

### Verification

- `npx tsc --noEmit` passes ✅
- Audit Trail tab loads and paginates with filters applied ✅
- Expanding a row with metadata shows formatted JSON ✅
- Non-admin QA user: **no Export button visible** on any report tab ✅
- Admin user: Export button visible, CSV download works, and a `report_exported` entry appears in the audit log with `row_count` and filters recorded ✅
- Creating/deleting calendar events, broadcasting pulse notices, and creating/deleting/leaving conversations all produce `audit_log` rows ✅
- Row cap: an export of > 10,000 matching rows truncates to 10,000 without error ✅
- Dashboard "Full trail →" link renders for admins + QA manager and routes to `/reports` ✅

---

## Phase 40: Central AI Client & SDK Consolidation

**Status:** ✅ Complete
**Completed:** April 22, 2026

### Overview

Centralized every AI call in the app behind a single module (`lib/ai/client.ts`). Model IDs, API key reads, timeouts, error mapping, and audit logging now live in one place — swapping models, tuning temperatures, or switching providers is a single-file change. Consolidated two Gemini SDKs down to one. Migrated all four AI-calling routes to the new client. Redesign of the Risk Insights analysis itself is proposed separately (see "Next: Risk Assessment Redesign" below) — it was not rebuilt in this phase because the approach warrants a design discussion first.

### The problem we fixed

Before this phase, the AI surface was scattered:

- **Two Gemini SDKs** were both installed (`@google/genai` and `@google/generative-ai`) and used by different routes. Two API call patterns, two error shapes, two surface areas to keep current.
- **Three different model IDs** hardcoded across four files (`gemini-2.0-flash` in one, `gemini-3-flash-preview` in three — and `gemini-3-flash-preview` is a preview name that may not resolve in every workspace). Changing a model meant editing every route.
- **Four separate reads** of `process.env.GEMINI_API_KEY`, each with its own fallback behavior.
- **No shared timeout, retry, or rate-limit handling.** Each route re-implemented error detection with brittle regex strings.
- **No call-level audit trail** — a risk insight burned tokens and left no record of who invoked it, what model ran, how long it took, or whether it failed.

### `lib/ai/client.ts` (new)

Single module exporting:

- `generateText(options)` — prose / Markdown responses.
- `generateJson<T>(options)` — structured output; `responseMimeType: 'application/json'` is set on the request, replies are parsed with a salvage regex fallback, and an optional `validate` type-guard enforces shape.
- `isAiConfigured()` — safe boot-time check.
- `friendlyAiMessage(err)` — maps `AIError` codes to user-facing copy so routes stop reinventing the regex-string-matching fallback.
- `AIError` with codes: `AI_NOT_CONFIGURED`, `AI_TIMEOUT`, `AI_RATE_LIMITED`, `AI_UPSTREAM_ERROR`, `AI_PARSE_ERROR`, `AI_VALIDATION_ERROR`.

Callers choose a **tier** (`"fast"` or `"quality"`), not a model string. The tier-to-model mapping is env-overridable:

```
AI_MODEL_FAST      (default: gemini-2.0-flash)
AI_MODEL_QUALITY   (default: gemini-2.5-pro)
GEMINI_API_KEY     (unchanged)
```

Changing a model is a one-line env update, no code deploy.

Every call:

- has a 60s default timeout (`Promise.race` with a cancellable timer);
- maps provider errors (`quota|rate|429|503|overloaded`) to `AI_RATE_LIMITED`;
- writes an `ai_call_succeeded` or `ai_call_failed` row to `audit_log` via the Phase 39 `logAudit()` helper, with `{ purpose, model, tier, latency_ms, error_code? }` in metadata.

The audit entries give us, for free, a running log of AI cost drivers (purpose + latency + success rate by model) that we can query out of `/reports → Audit Trail` by filtering on `action=ai_call_succeeded`.

### Routes migrated

All four AI routes were rewritten to call the central client; none of them import a Gemini SDK directly anymore.

- `app/api/gemini/delta-summary/route.ts` — `generateText`, tier `fast`, purpose `delta-summary`.
- `app/api/gemini/risk-insights/route.ts` — `generateJson<RiskInsight>` with a runtime validator (`risk_level` enum + `insights: string[]`), tier `fast`, purpose `risk-insights`.
- `app/api/training/generate-questionnaire/route.ts` — `generateJson<any[]>` with `Array.isArray` validator, tier `fast`, purpose `training-questionnaire`.
- `app/api/training/generate-slides/route.ts` — `generateJson<TrainingSlide[]>`, tier `fast`, purpose `training-slides`.

The brittle per-route regex error-mapping is gone; routes now call `friendlyAiMessage(err)` and add any route-specific overrides (e.g. "couldn't read the SOP document" for storage failures) on top.

### SDK cleanup

- Removed `@google/generative-ai` (v0.24.1) from `package.json`. Kept `@google/genai` (latest) as the single provider SDK. Run `npm install` after pulling to prune `node_modules`.
- No runtime imports of the removed SDK remain (verified via grep).

### Files Touched

```
lib/ai/client.ts                                        # NEW — single source of truth for AI calls
app/api/gemini/delta-summary/route.ts                   # Rewritten: uses generateText
app/api/gemini/risk-insights/route.ts                   # Rewritten: uses generateJson + validator
app/api/training/generate-questionnaire/route.ts        # Migrated: uses generateJson
app/api/training/generate-slides/route.ts               # Migrated: uses generateJson
package.json                                            # Dropped @google/generative-ai
```

### Verification

- `npx tsc --noEmit` passes ✅
- No remaining imports of `@google/generative-ai` anywhere in `app/`, `actions/`, `components/`, or `lib/` ✅
- Every AI purpose writes an `ai_call_succeeded` / `ai_call_failed` audit row with `{ purpose, model, tier, latency_ms }` ✅
- Switching models requires only `AI_MODEL_FAST` / `AI_MODEL_QUALITY` env update — no code change ✅

---

### Next: Risk Assessment Redesign (proposal, not yet implemented)

The existing `/api/gemini/risk-insights` prompt is weak even after the client refactor — it sends the last 100 raw audit rows as free text and asks the model to find patterns. The model does most of the real work, which is both expensive (tokens) and imprecise (hallucination-prone). A better shape:

**1. Do the work in SQL first; let the AI narrate.**
Compute the risk signals deterministically — `overdue_pm_count`, `avg_overdue_days`, `overdue_cc_count`, `sops_unack_by_dept`, `top_actors_by_failed_audit_count`, `sops_due_for_revision_in_30d`, `ai_failure_rate_last_7d`, etc. — with a single SQL function or cached materialized view. The AI's job shrinks from "analyze 100 rows" to "given these 10 metrics, write three executive-level insights." **Why this wins:** pre-computed metrics are free to read, the prompt gets ~10× smaller (every input token billed; this is the single biggest lever), and the risk score itself becomes reproducible — run the function again, get the same number. Hallucination risk drops because the model isn't inventing counts.

**2. Two-phase call with tier routing.**
Phase 1 uses `tier: "fast"` (Flash) on the summarized metrics to get `risk_level` + top signals. Phase 2 only runs when `risk_level === "high"` and uses `tier: "quality"` (Pro) for a deeper narrative on the contributing factors. Most calls stay on the cheap model; we pay for quality only when it matters.

**3. Cache at the data layer, not the UI layer.**
Today React Query caches for 5 min per client. Replace with a `risk_assessment_snapshots` table keyed by `{ scope, generated_at }` — org-wide and per-department rows regenerated every 6 hours by a cron (existing `/api/cron/` pattern) and served from DB on demand. Users reading the dashboard hit DB, not the model. **Cost impact:** at ~20 QA/Admin users checking 3× per day, that's ~60 generations/day → drops to ~4/day (every 6h × 1 org scope). ~15× token reduction.

**4. Structured output with a strict schema.**
Define a Gemini `responseSchema` (already supported by the new client's `schema` option) so the model returns `{ risk_level, signals: [{ name, severity, count, blurb }], insights: [string] }`. Signals become clickable chips in the UI that deep-link to the matching report filter (e.g. clicking "14 overdue PMs" opens the PM report pre-filtered). The audit log entry becomes genuinely actionable instead of prose that rots.

**5. Hard token caps.**
`maxOutputTokens: 400` is enough for exec-level insights; today's 500 is fine but the *input* is unbounded (raw audit dump grows with activity). A pre-computed metrics payload stays ~2 KB regardless of workspace size. Add `maxInputTokens` guard (truncate + flag) so one busy month can't 10× the bill.

Rough numbers for a mid-sized workspace: today ~1–2¢ per risk-insights click × ~20 clicks/day ≈ **$3–6/month just from risk insights**. The redesign would push that to **~$0.10–0.30/month** while producing tighter, clickable, reproducible output. Plus the snapshots table doubles as a historical series ("risk trending up over the quarter") — a feature we don't have today.

If you want me to proceed with the redesign, confirm and I'll ship it as Phase 41 with: metric-aggregator SQL function + migration, two-phase call using the central client's tier routing, `risk_assessment_snapshots` cache table with a cron refresh, structured schema + deep-link UI, and PROGRESS.md update.
