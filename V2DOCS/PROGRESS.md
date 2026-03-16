# SOP-Guard Pro - Project Progress

> **Last Updated:** March 16, 2026
> **Version:** 2.2 (Star-Centralized Architecture)
> **Current Phase:** Phase 5 - SOP Submission & QA Approval Flow

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
| Phase 7-13 | 🔜 Not Started | Future Phases |

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
- Fixed right panel (300px)
- Real-time subscription via Supabase Realtime
- Item types: notices, todos, alerts
- Notice composer with audience selection (self, department, everyone)
- Thread depth enforcement (max 1 level)
- Mark all as read functionality

**Components Built:**
- `TopNav`
- `AppSidebar`
- `ThePulse`
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
| Phase 7 | Equipment Registry |
| Phase 8 | PM Task Management |
| Phase 9 | Dashboard & KPI Reporting |
| Phase 10 | Calendar & Scheduling |
| Phase 11 | Settings & Admin |
| Phase 12 | Audit Log Viewer |
| Phase 13 | Messaging System |

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
├ ƒ /api/gemini/delta-summary
├ ƒ /api/storage/sop-upload
├ ƒ /approvals
├ ƒ /approvals/[id]
├ ƒ /change-control/[id]
├ ƒ /dashboard
├ ƒ /library
├ ƒ /library/[id]
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
