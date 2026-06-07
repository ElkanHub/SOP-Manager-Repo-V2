# SOP-Guard Pro — UI Design Spec
> **Version 2.1** | Companion to BUILD.md v2.1
> This file defines every visual, interaction, and component specification for the agent to implement.
> When BUILD.md says "build X", this file says exactly what X looks like, how it behaves, and what every state renders.

---

## HOW TO USE THIS FILE

- This file is read **alongside** BUILD.md. BUILD.md tells you what to build and in which phase. This file tells you exactly how it should look and behave.
- Every component mentioned in BUILD.md has a corresponding spec here.
- When a component has multiple states (loading, empty, error, filled, disabled), **all states are specified**. Build all of them. No state is optional.
- Measurements are in Tailwind spacing units unless noted otherwise.
- Colour references always use the token names defined in the Design Tokens section.

---

## PART 1 — DESIGN LANGUAGE

### 1.1 Aesthetic Direction

SOP-Guard Pro is an industrial compliance tool. The aesthetic is **precision engineering**: clean, structured, authoritative. Every element earns its place. There is no decoration that does not carry information.

The visual language draws from technical documentation and industrial instrument panels — tight grids, strong typographic hierarchy, deliberate use of white space, and accent colour used with surgical restraint. The navy grounds the interface in authority. The teal provides action and momentum. Amber and red communicate urgency without drama.

This is not a consumer app. It should feel like professional equipment.

### 1.2 Design Tokens

#### Colour Palette
```
-- Brand
--brand-navy:  #0D2B55    Primary backgrounds (TopNav, sidebar header section)
--brand-blue:  #1A5EA8    Headings, informational badges, links
--brand-teal:  #00C2A8    Primary CTA, active state borders, focus rings, dividers

-- Surface
--surface-page:   #F8FAFC    Page background (slate-50)
--surface-card:   #FFFFFF    Cards, table rows, modals
--surface-raised: #F1F5F9    Alternate table rows, input backgrounds (slate-100)

-- Border
--border-default: #E2E8F0    Standard borders (slate-200)
--border-strong:  #CBD5E1    Emphasized borders (slate-300)

-- Text
--text-primary:   #1E293B    Body text, table values (slate-800)
--text-secondary: #64748B    Labels, captions, metadata (slate-500)
--text-muted:     #94A3B8    Placeholder, empty state text (slate-400)

-- Semantic
--status-active:    #059669    Green (active SOP, signed, complete)
--status-active-bg: #F0FDF4
--status-draft:     #D97706    Amber (draft, warnings, due-soon)
--status-draft-bg:  #FFFBEB
--status-pending:   #1A5EA8    Blue (pending QA, pending CC)
--status-pending-bg:#EFF6FF
--status-overdue:   #DC2626    Red (overdue, errors, urgent)
--status-overdue-bg:#FEF2F2
--status-inactive:  #94A3B8    Slate (superseded, inactive)
--status-inactive-bg:#F8FAFC
```

#### Typography
```
Font family: "DM Sans" (primary) — loaded from Google Fonts
             "DM Mono" (code blocks, SOP numbers, asset IDs, version strings)

Scale:
  display:   32px / 700 weight / -0.5px tracking   — page titles
  h1:        24px / 700 weight / -0.3px tracking   — section headings
  h2:        18px / 600 weight / -0.2px tracking   — subsection headings
  h3:        15px / 600 weight / 0px tracking      — card headings, table headers
  body-lg:   15px / 400 weight / 0px tracking      — primary body text
  body:      14px / 400 weight / 0px tracking      — secondary body, table cells
  small:     12px / 400 weight / 0.2px tracking    — captions, timestamps, labels
  mono:      13px / DM Mono / 0px tracking         — SOP numbers, asset IDs, versions

Line heights: display/headings → 1.2, body → 1.5, small → 1.4
```

#### Spacing System (Tailwind scale)
```
4px   → gap-1     micro spacing (badge padding, icon gap)
8px   → gap-2     tight spacing (button icon + label)
12px  → gap-3     component inner padding
16px  → gap-4     standard inner padding
20px  → gap-5     card padding (narrow)
24px  → gap-6     card padding (standard)
32px  → gap-8     section gaps
40px  → gap-10    large section gaps
48px  → gap-12    page header height
```

#### Elevation / Shadows
```
level-0:  none (flat, inline elements)
level-1:  shadow-sm   (0 1px 2px rgba(0,0,0,0.05))     — cards, inputs
level-2:  shadow-md   (0 4px 6px rgba(0,0,0,0.07))     — dropdowns, popovers
level-3:  shadow-lg   (0 10px 15px rgba(0,0,0,0.1))    — modals, sheets
level-4:  shadow-xl   (0 20px 25px rgba(0,0,0,0.12))   — full-screen overlays
```

#### Border Radius
```
sm:   rounded-sm   (2px)   — badges, tags, table cells
md:   rounded-md   (6px)   — inputs, buttons, small cards
lg:   rounded-lg   (8px)   — standard cards, modals
xl:   rounded-xl   (12px)  — large cards, panels
full: rounded-full         — avatars, pill badges
```

#### Motion
```
Easing:
  ease-out:     cubic-bezier(0.0, 0.0, 0.2, 1)   — elements entering
  ease-in:      cubic-bezier(0.4, 0.0, 1, 1)     — elements leaving
  ease-in-out:  cubic-bezier(0.4, 0.0, 0.2, 1)   — repositioning

Duration:
  instant:   0ms      — immediate feedback (button press)
  fast:      100ms    — hover colour transitions
  normal:    200ms    — modal open, dropdown appear
  slow:      300ms    — page transitions, panel slides
  deliberate:600ms    — NumberTicker count-up

Principles:
  - Enter animations use ease-out (decelerate into final position)
  - Exit animations use ease-in (accelerate away)
  - Hover states: 100ms colour/shadow only. Never move elements on hover.
  - Pulse Realtime items: slide in from right edge using AnimatedList
  - Modal backdrop: fade-in 200ms opacity 0→0.4
  - Sheet panels: slide from right 300ms ease-out
  - Never animate layout properties (width, height) — use transform and opacity only
```

---

## PART 2 — SHARED COMPONENT LIBRARY

Build these components first. Every page in the app uses them.

---

### 2.1 `<StatusBadge />`

```
Props:
  status: 'active' | 'draft' | 'pending_qa' | 'pending_cc' | 'superseded' | 
          'overdue' | 'pending' | 'complete' | 'inactive'
  size?: 'sm' | 'md'   default: 'md'
```

```
Anatomy:
  [coloured dot] [label text]

  Dot: 6px circle, filled with status colour
  Padding: px-2 py-0.5 (md) / px-1.5 py-0.5 (sm)
  Border radius: rounded-full
  Font: 12px / 500 weight

Status map:
  active      → bg: status-active-bg,    text: status-active,   dot: status-active,   label: "Active"
  draft       → bg: status-draft-bg,     text: status-draft,    dot: status-draft,    label: "Draft"
  pending_qa  → bg: status-pending-bg,   text: status-pending,  dot: status-pending,  label: "Pending QA"
  pending_cc  → bg: status-pending-bg,   text: status-pending,  dot: status-pending,  label: "Pending CC" + lock icon (12px)
  superseded  → bg: status-inactive-bg,  text: status-inactive, dot: status-inactive, label: "Superseded"
  overdue     → bg: status-overdue-bg,   text: status-overdue,  dot: status-overdue,  label: "Overdue"
  pending     → bg: status-draft-bg,     text: status-draft,    dot: status-draft,    label: "Pending"
  complete    → bg: status-active-bg,    text: status-active,   dot: status-active,   label: "Complete"
  inactive    → bg: status-inactive-bg,  text: status-inactive, dot: status-inactive, label: "Inactive"
```

---

### 2.2 `<DeptBadge />`

```
Props:
  department: string
  colour?: string         from departments.colour
  variant?: 'default' | 'outline'    default: 'default'
  size?: 'sm' | 'md'

Anatomy:
  Pill badge. Solid background tinted from department colour.
  'outline' variant: transparent bg, 1.5px border in the dept colour, text in dept colour.
  Used on cross-department SOP viewer header.
  
Layout: px-2 py-0.5 rounded-full text-12 font-500
Text: department name, truncated at 16 chars with ellipsis
```

Department colour mapping (for the 4 seed departments):
```
QA:          bg-blue-100    text-blue-700    border-blue-300
Engineering: bg-orange-100  text-orange-700  border-orange-300
Logistics:   bg-green-100   text-green-700   border-green-300
Maintenance: bg-purple-100  text-purple-700  border-purple-300
```
New departments added by Admin use a preset palette of 8 colour choices. The colour stored in `departments.colour` is a Tailwind colour name (e.g. 'orange'). The badge derives its classes from a colour → class map in `/lib/utils/dept-colours.ts`.

---

### 2.3 `<Avatar />`

```
Props:
  src?: string     (avatar_url from profiles, optional)
  name: string     (full_name — used for initials fallback)
  size?: 'xs' | 'sm' | 'md' | 'lg'

Sizes:
  xs: 20px     — audit log entries, inline attribution
  sm: 28px     — sidebar user section, table rows
  md: 36px     — card headers, Pulse items
  lg: 48px     — profile settings, onboarding review

Appearance:
  With src: circular image, object-cover
  Without src: circular div, bg-brand-navy text-white
               initials = first letter of first + last name, uppercase
               font size scales with avatar size (xs: 8px, sm: 11px, md: 14px, lg: 18px)
  Border: none by default. Ring variant: ring-2 ring-white (for stacked avatars)
```

---

### 2.4 `<EmptyState />`

```
Props:
  icon: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }   — optional CTA button

Layout:
  Centered vertically and horizontally in parent container
  Minimum height: 240px
  Icon: 48px, text-muted colour, mb-4
  Title: h2 scale, text-primary, mb-2
  Description: body scale, text-secondary, max-w-sm text-center, mb-6
  Action button: secondary variant (see Button spec), shown only if prop provided
```

---

### 2.5 `<ErrorCard />`

```
Props:
  message?: string    — shown to dev in console, not to user
  onRetry?: () => void

Layout:
  Card with border-overdue / 2px border, bg-status-overdue-bg
  Icon: AlertTriangle (Lucide), 20px, text-overdue
  Heading: "Something went wrong" — 15px bold
  Body: "An unexpected error occurred. Try again or contact your administrator."
  Retry button (if onRetry provided): secondary variant, Lucide RefreshCw icon
  The actual error message is console.error()'d — never displayed to the user.
```

---

### 2.6 `<SkeletonRow />`

A single-line skeleton for table loading states.
```
Height: 40px
Content: animate-pulse bg-slate-200 rounded blocks
Layout: same column widths as the table it replaces
Show: 6 rows minimum in any table loading state
```

---

### 2.7 `<ConfirmDialog />`

Used for all destructive or irreversible actions.
```
Props:
  title: string
  description: string
  confirmLabel?: string    default: "Confirm"
  variant?: 'default' | 'destructive'
  onConfirm: () => void
  onCancel: () => void

Layout: Shadcn Dialog, max-w-sm
Header: AlertTriangle icon (destructive) or Info icon (default), 20px
Body: description text, body-lg scale
Footer: Cancel button (ghost) + Confirm button (destructive or primary variant)
```

---

### 2.8 `<Button />` Variants

Extended from Shadcn Button. All variants use DM Sans font.

```
primary:     bg-brand-teal text-white hover:bg-teal-600 active:bg-teal-700
             height: 36px (md) / 32px (sm) / 40px (lg)
             padding: px-4 py-2 (md)
             font: 14px / 500 weight
             border-radius: rounded-md
             transition: background-color 100ms

secondary:   bg-white border border-border-strong text-text-primary
             hover: bg-surface-raised
             Same dimensions as primary

ghost:       bg-transparent text-text-secondary
             hover: bg-surface-raised text-text-primary

destructive: bg-red-600 text-white hover:bg-red-700

icon:        Square. No text. 36px × 36px (md), padding: p-2

shimmer:     Magic UI ShimmerButton.
             Used exclusively for: Sign, Approve, Complete Setup, Submit for QA Review.
             Never on secondary, cancel, or destructive actions.

disabled:    opacity-50 cursor-not-allowed
             Do not use pointer-events-none alone — still allow tooltip display.
```

---

### 2.9 `<Input />` / `<Textarea />`

Extended from Shadcn Input.
```
Height (input): 36px
Padding: px-3 py-2
Background: surface-card
Border: 1px border-border-default
Border-radius: rounded-md
Font: body scale, text-primary
Placeholder: text-muted

Focus ring: outline-none ring-2 ring-brand-teal ring-offset-0
            border-color changes to brand-teal on focus

Error state: border-red-400, ring-red-200
             Error message below: text-12 text-red-600 mt-1

Disabled: bg-surface-raised text-muted cursor-not-allowed

Character counter (Textarea): right-aligned below textarea
  text-12 text-muted when safe, text-amber-600 at 80%, text-red-600 at 100%
```

---

### 2.10 `<PasswordConfirmModal />`

Used exclusively for `is_admin` grant/revoke in Settings.
```
Shadcn Dialog, max-w-sm, non-dismissable (no backdrop click to close)

Header:
  Shield icon (Lucide), 20px, text-brand-navy, mr-2
  "Confirm your identity" — h2 scale

Body:
  "Enter your password to continue. This action will be logged."
  Password input (type="password"), full-width, mt-4

Footer:
  Cancel (ghost) + "Confirm" (primary)
  On error: inline error below password input: "Incorrect password. Try again."
  On success: close modal, proceed with the admin action.

Cannot be closed by pressing Escape or clicking backdrop — requires Cancel or Confirm.
```

---

## PART 3 — APPLICATION SHELL

### 3.1 Shell Layout Mathematics

```
┌─────────────────────────────────────────────────────────┐
│                    TopNav (48px, fixed)                  │
├──────────┬──────────────────────────────────┬───────────┤
│          │                                  │           │
│ Sidebar  │         Main Content             │   Pulse   │
│ (240px)  │   ml-[240px] mr-[300px]          │  (300px)  │
│          │   mt-[48px]                      │           │
│          │                                  │           │
└──────────┴──────────────────────────────────┴───────────┘

Breakpoints:
  ≥1280px: All three panels visible (full layout above)
  1024–1279px: Sidebar collapses to 56px icon strip. Main content: ml-[56px] mr-[300px]
  768–1023px:  Sidebar hidden (drawer mode). Pulse hidden. Main content: full width. 
               PulseBell badge in TopNav shows unread count. Hamburger opens sidebar drawer.
  <768px:      Mobile. Sidebar hidden (bottom nav or hamburger). Pulse hidden.

Main content area padding: p-6 (24px all sides)
Main content max-width: none (fills available width)
```

---

### 3.2 `<TopNav />`

```
Height: 48px, fixed, z-50
Background: bg-brand-navy
Border-bottom: none (clean edge, no border)
Shadow: shadow-sm

Layout (left → right, h-full flex items-center):
  ├─ Logo zone (240px wide, matches sidebar): px-6
  │   "SOP-GUARD PRO"
  │   Font: DM Sans 14px / 700 weight / letter-spacing: 0.08em
  │   Color: white
  │   No icon, no logo image — text only
  │
  ├─ Search zone (flex-1, centred): max-w-xl mx-auto px-6
  │   <GlobalSearch /> — see 3.4
  │
  └─ Actions zone (fixed right, px-4, gap-2, flex items-center):
      <PulseBell />
      [separator: w-px h-5 bg-white/20]
      <UserMenu />
```

---

### 3.3 `<Sidebar />`

```
Width: 240px (expanded) / 56px (collapsed icon strip)
Position: fixed left-0 top-[48px] h-[calc(100vh-48px)]
Background: bg-white
Border-right: 1px border-border-default
Transition: width 200ms ease-in-out

─── USER SECTION (top of sidebar) ───────────────────────
Height: 72px
Background: bg-brand-navy/5 (very light navy tint)
Border-bottom: 1px border-border-default
Padding: px-4 py-3

Expanded:
  Flex row, gap-3, items-center
  [Avatar md] [name + dept]
    name: 14px / 600 weight / text-primary, truncate
    dept: <DeptBadge size="sm" />

Collapsed (icon strip):
  Avatar only, centered. On hover: show name + dept as Tooltip.

─── NAVIGATION ───────────────────────────────────────────
Padding: px-3 py-4
Items: gap-1 (between items)

Each nav item:
  Height: 36px
  Padding: px-3 (expanded) / px-0 justify-center (collapsed)
  Border-radius: rounded-md
  Transition: background-color 100ms
  
  Default: bg-transparent text-text-secondary hover:bg-surface-raised hover:text-text-primary
  
  Active:
    bg-blue-50
    border-left: 3px solid brand-teal (use: border-l-[3px] border-brand-teal)
    text-brand-blue font-600
    icon: text-brand-teal

  Layout: flex items-center gap-3 (expanded) / flex justify-center (collapsed)
  Icon: 18px Lucide icon
  Label: body scale

Navigation items (in order):
  LayoutDashboard  "Dashboard"       /dashboard
  BookOpen         "SOP Library"     /library
  Cog              "Equipment"       /equipment
  CalendarDays     "Calendar"        /calendar
  BarChart2        "Reports"         /reports

─── BOTTOM ───────────────────────────────────────────────
Position: absolute bottom-0 left-0 right-0
Border-top: 1px border-border-default
Padding: px-3 py-3

  Settings item (same style as nav item):
  Settings icon "Settings"  /settings

─── COLLAPSED STATE ──────────────────────────────────────
When width = 56px:
  Labels hidden
  Icons centered
  Tooltips on hover showing the label (Shadcn Tooltip, position: right)
  Active state: left 3px border still visible (becomes a strong visual indicator)
```

---

### 3.4 `<GlobalSearch />`

```
Container: w-full max-w-xl
Input appearance:
  Height: 32px
  Background: white/10 (translucent on dark TopNav)
  Border: 1px border-white/20
  Border-radius: rounded-md
  Text: text-white text-14
  Placeholder: "Search SOPs..." text-white/50
  Icon: Search (Lucide) 16px text-white/50, left-inset pl-9
  Focus: ring-2 ring-white/30, bg-white/15, placeholder fades

Results Dropdown (appears on typing, min 2 characters):
  Position: absolute, full width of input, top: 36px
  Background: bg-white
  Border: 1px border-border-default
  Border-radius: rounded-lg
  Shadow: shadow-lg
  Max-height: 400px overflow-y-auto
  Z-index: z-50

  ─── Result Row ───
  Height: 48px
  Padding: px-4 py-2
  Hover: bg-surface-raised
  Cursor: pointer
  
  Layout: flex items-center gap-3
    [SOP Number in DM Mono 12px text-text-secondary, w-24 truncate]
    [Title in 14px text-primary flex-1 truncate]
    [<DeptBadge size="sm" />]

  Empty result: "No SOPs found" — centered, text-muted, 14px
  Loading: 3 <SkeletonRow /> items

  Header row above results (sticky):
    "Cross-department search" — 11px uppercase tracking-wide text-muted, px-4 py-2
    bg-surface-raised border-b border-border-default
```

---

### 3.5 `<ThePulse />`

```
Width: 300px
Position: fixed right-0 top-[48px] h-[calc(100vh-48px)]
Background: bg-surface-page
Border-left: 1px border-border-default
Display: flex flex-col

─── HEADER ──────────────────────────────────────────────
Height: 52px flex-shrink-0
Padding: px-4 flex items-center justify-between
Border-bottom: 1px border-border-default

Left: 
  "Pulse" — 15px / 600 weight / text-primary
  Unread badge (if >0): ml-2, rounded-full, bg-red-600 text-white text-11 px-1.5 min-w-[18px] text-center

Right:
  "Mark all read" — text-12 text-brand-blue hover:underline cursor-pointer
  Only visible when unread count > 0

─── ITEM GROUPS ─────────────────────────────────────────
flex-1 overflow-y-auto

Groups (in order, only shown when they have items):
  1. Priority     — types: approval_request, cc_signature, pm_overdue, cc_deadline
  2. Today        — types: pm_due, sop_active, approval_update
  3. Messages     — type: notice
  4. Personal     — type: todo

Each Group Header:
  Height: 28px flex items-center px-4
  Label: 11px uppercase letter-spacing-wide text-muted font-600
  Count badge: same as header unread badge but bg-slate-200 text-text-secondary
  Chevron: 14px, rotates 180° when collapsed
  Clickable: toggles group collapse (stored in local state)

─── PULSE ITEM RENDERERS ────────────────────────────────
Base anatomy (all types share this structure):
  Padding: px-4 py-3
  Border-bottom: 1px border-border-default/50
  Background: bg-white (unread) / bg-transparent (read)
  Hover: bg-surface-raised
  Transition: background-color 100ms
  Cursor: pointer (if has entity link)

  Layout: flex gap-3
    [Type icon circle, 32px]
    [Content flex-1 min-w-0]
      [Title 13px/600 text-primary truncate]
      [Body 12px text-secondary line-clamp-2, mt-0.5]
      [Footer: time-ago 11px text-muted + optional action button, mt-1.5]

Type icon circles:
  approval_request: bg-blue-100 icon=FileText text-blue-600
  cc_signature:     bg-brand-navy/10 icon=PenLine text-brand-navy
  pm_due:           bg-amber-100 icon=Wrench text-amber-600
  pm_overdue:       bg-red-100 icon=AlertTriangle text-red-600
  cc_deadline:      bg-red-100 icon=Clock text-red-600
  sop_active:       bg-green-100 icon=CheckCircle text-green-600
  approval_update:  bg-blue-100 icon=MessageSquare text-blue-600
  notice:           bg-slate-100 icon=Bell text-slate-600
  system:           bg-slate-100 icon=Info text-slate-600
  todo:             bg-purple-100 icon=ListTodo text-purple-600

Unread indicator: 6px dot, bg-brand-teal, absolute right: 12px top: 12px

─── NOTICE ITEM SPECIFIC ────────────────────────────────
When thread_depth = 0 and is_read = false, show reply input below body:
  Input: 28px height, text-12, placeholder "Reply...", bg-surface-raised rounded-md
  border: 1px border-border-default, px-3
  Enter to send. On send: creates reply pulse_item with thread_depth=1.
  
When thread_depth = 1:
  Left padding increased by 12px (visual indentation showing it's a reply)
  No reply input — replies cannot be replied to.
  Subtle bg: bg-slate-50 (slightly dimmer than top-level)

─── BOTTOM ZONE ─────────────────────────────────────────
flex-shrink-0
Border-top: 1px border-border-default
Padding: p-3 flex flex-col gap-2

To-do input row:
  flex gap-2 items-center
  Input: flex-1 height-32 text-13 placeholder "Add a personal to-do..."
  Button: "Add" — secondary variant, h-32, text-12

Send Notice button:
  ShimmerButton, full width, h-36
  Icon: Send (Lucide) 14px + "Send Notice" label
  bg-brand-navy (override shimmer default to match product palette)
```

---

### 3.6 `<PulseBell />`

```
Icon: Bell (Lucide) 20px text-white/80 hover:text-white
Position: relative

Unread badge:
  Position: absolute -top-1 -right-1
  Size: min 16px, rounded-full
  Background: bg-red-600
  Text: 10px white, font-700
  Content: count if ≤9, "9+" if >9
  
At ≤1024px: bell is always visible in TopNav regardless of Pulse panel state.
At ≤1024px: clicking bell opens a dropdown overlay of the last 10 pulse items.
            Same rendering as the full Pulse panel but in a dropdown. max-h-96 overflow-y-auto.
```

---

### 3.7 `<UserMenu />`

```
Trigger: Avatar sm + chevron-down icon 14px text-white/60
Dropdown (Shadcn DropdownMenu):
  Width: 200px
  Header section (non-clickable):
    Name: 14px/600 text-primary
    Email: 12px text-secondary truncate
    Role badge + Dept badge (row, gap-1, mt-1)
  Separator
  Menu items:
    UserCircle "Profile & Settings"  → /settings
  Separator
  LogOut "Sign Out" text-red-600 hover:bg-red-50
```

---

## PART 4 — AUTH & ONBOARDING SCREENS

### 4.1 Login Page `/login`

```
Layout: Two-panel (from login-02 block)
Left panel (40% width, hidden on mobile):
  Background: bg-brand-navy
  Content (centered vertically):
    "SOP-GUARD PRO"  — 32px / 700 / white / letter-spacing 0.05em
    Tagline: "Industrial compliance, simplified." — 16px / 400 / white/70 / mt-3
    Decorative element: A subtle grid of thin white/5 lines (CSS background-image: repeating-linear-gradient)
    Three feature bullets at bottom (absolute bottom-12):
      Each: CheckCircle2 icon 14px text-brand-teal + text-14 text-white/80
      "QA-governed SOP management"
      "Digital Change Control with signatures"
      "Real-time Pulse notifications"

Right panel (60% width):
  Background: bg-white
  Content: centered card, max-w-sm, mx-auto, px-8 py-12

  Heading: "Welcome back" — 24px / 700 / text-primary
  Subheading: "Sign in to SOP-Guard Pro" — 14px / text-secondary / mt-1 mb-8

  Form:
    Email input (full width, label "Email address")
    Password input (full width, label "Password", show/hide toggle)
    Submit: primary button "Sign In" full-width h-40

  Inactive account banner (shown when ?reason=inactive):
    bg-status-overdue-bg border border-red-200 rounded-md p-3 mb-4
    AlertTriangle 16px text-red-600 + "Your account has been deactivated."
    Subtext: "Contact your administrator to regain access." text-12 text-red-600

  Session expired banner (shown when ?reason=session_expired):
    bg-status-draft-bg border border-amber-200 rounded-md p-3 mb-4
    Info icon + "Your session expired. Please sign in again."
```

---

### 4.2 Setup Page `/setup` (First Admin Bootstrap)

```
Same two-panel layout as login.
Left panel: identical to login.
Right panel:

  Banner (full-width, top of right panel):
    bg-brand-navy/5 border-b border-border-default p-4
    Shield icon 16px text-brand-navy + "Initial Setup" 14px/600 text-brand-navy
    Subtext: "Create the first administrator account." text-12 text-text-secondary

  Form card: max-w-sm mx-auto px-8 py-10
    Heading: "Create admin account" 22px/700
    Subheading: text-secondary 14px mt-1 mb-6

    Full Name input
    Email input
    Password input (min 12 chars — show strength indicator below input)
    Confirm Password input
    Submit: ShimmerButton "Create Admin Account" full-width

  Password strength indicator:
    4 segment bar below password input
    Empty: all bg-slate-200
    1 segment: bg-red-500 (weak)
    2 segments: bg-amber-500 (fair)
    3 segments: bg-blue-500 (good)
    4 segments: bg-green-500 (strong)
    Label: "Weak" / "Fair" / "Good" / "Strong" in matching colour text-12
```

---

### 4.3 Onboarding Wizard `/onboarding`

```
Layout: Full-page bg-surface-page
  Content: max-w-lg mx-auto pt-12 pb-12 px-4

─── PROGRESS HEADER ─────────────────────────────────────
"SOP-GUARD PRO" wordmark — centered, text-brand-navy 13px/700 letter-spacing-wide, mb-8

Progress bar:
  4 segments, w-full, h-1.5, rounded-full, gap-1
  Complete segment: bg-brand-teal
  Current segment: bg-brand-teal/50
  Upcoming: bg-border-default

Step counter: "Step 2 of 4" — text-12 text-muted text-center mt-2 mb-8

─── STEP CARD (all steps share this wrapper) ─────────────
bg-white rounded-xl shadow-md p-8
Step title: 22px/700 text-primary mb-1
Step subtitle: 14px text-secondary mb-8

─── STEP 1: DEPARTMENT & ROLE ───────────────────────────
Department dropdown:
  Label: "Your department" text-13/600 text-primary mb-1.5
  Shadcn Select, full width
  Placeholder: "Select your department"
  Options populated from departments table

Role selector:
  Label: "Your role" text-13/600 text-primary mt-6 mb-3
  Two cards side by side (grid-cols-2 gap-3):

  Role Card:
    Height: 100px
    Border: 2px solid border-border-default
    Border-radius: rounded-lg
    Padding: p-4
    Cursor: pointer
    
    Unselected: bg-white border-border-default
    Selected: bg-blue-50 border-brand-blue
    Hover (unselected): bg-surface-raised border-border-strong

    Content:
      Icon (top): 24px Lucide
        Manager → Briefcase
        Employee → HardHat
      Label: 14px/600 text-primary mt-2
      Description: 12px text-secondary mt-0.5

Manager note (appears when Manager is selected):
  mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md
  Info icon 14px text-amber-600 + text-12 text-amber-700
  "Managers can submit SOPs and are required to sign Change Controls."

Footer: "Continue" primary button, right-aligned

─── STEP 2: PROFILE DETAILS ─────────────────────────────
Full Name: input, full-width, required
Job Title: input, full-width, required
Employee ID: input, full-width, optional — label includes "(optional)"
Phone: input, full-width, optional

Avatar upload:
  mt-6 label "Profile photo (optional)" text-13/600 mb-3
  Layout: flex items-center gap-4
    Circle preview: 72px, border-2 border-dashed border-border-strong rounded-full
      If no upload: bg-surface-raised, UserCircle icon 28px text-muted centered
      If uploaded: actual image, object-cover, rounded-full
    
    Upload zone (right of circle):
      "Upload photo" secondary button sm, icon=Upload
      Below: "PNG or JPG. Max 2MB." text-11 text-muted mt-1

─── STEP 3: DIGITAL SIGNATURE ───────────────────────────
Tab strip: two tabs (draw / upload), below step title
  Active tab: border-b-2 border-brand-teal text-brand-teal
  Inactive: text-text-secondary hover:text-text-primary

Draw tab:
  Canvas: w-full h-[180px] bg-surface-raised rounded-lg border border-border-default
           border-style: dashed when empty, solid when has content
           Cursor: crosshair
           Instruction (when empty): "Draw your signature here" text-muted text-13 centered
  
  Below canvas:
    flex justify-between items-center mt-2
    Left: "Clear" ghost button sm, icon=RotateCcw
    Right: "Preview" shows a thumbnail of drawn signature inline

Upload tab:
  Drag-and-drop zone: w-full h-[180px] dashed border, rounded-lg
    bg-surface-raised hover:bg-blue-50/30 transition-colors
    Icon: Upload 24px text-muted
    Label: "Drop your signature image here" text-13 text-text-secondary
    Subtext: "or click to browse. PNG/JPG, max 2MB." text-12 text-muted mt-1
    On drag-over: border-brand-teal bg-teal-50/30

Signature confirmed state (both tabs, after upload/save):
  mt-4 p-3 bg-status-active-bg border border-green-200 rounded-md
  CheckCircle2 16px text-green-600 + "Signature captured" 14px/600 text-green-700
  "Re-draw" text button (text-brand-blue text-13) right-aligned

"Continue" button disabled and cursor-not-allowed until signature_url is set.

─── STEP 4: REVIEW & CONFIRM ────────────────────────────
Summary card (bg-surface-raised rounded-xl p-6):
  Layout: flex gap-4
    Avatar lg (72px)
    Detail column:
      Name: 20px/700 text-primary
      Job Title: 14px text-secondary mt-0.5
      
      Row of badges: mt-3 flex gap-2 flex-wrap
        <DeptBadge />
        Role badge: same pill style as DeptBadge but colour based on role
          Manager → bg-blue-100 text-blue-700
          Employee → bg-slate-100 text-slate-600
      
      Signature row: mt-3 flex items-center gap-2
        CheckCircle2 14px text-green-600
        "Signature captured" 13px text-green-700

"Complete Setup" ShimmerButton, full-width h-44, mt-6
  icon=Check, label="Complete Setup"
```

---

## PART 5 — SOP LIBRARY

### 5.1 Library Page `/library`

```
Page layout:
  Page header (below TopNav, above content):
    flex items-center justify-between mb-6
    Left: "SOP Library" — display scale (32px/700) text-primary
    Right: "Upload SOP" primary button, icon=Upload (Managers only)

─── TOOLBAR (above table) ───────────────────────────────
  flex items-center gap-3 mb-4

  Status filter tabs (visual tab strip, not Shadcn Tabs):
    All | Active | Draft | Pending | Pending CC
    Employees only see: Active tab (others hidden)
    Active tab style: bg-white shadow-sm border border-border-default text-brand-blue font-600
    Inactive tab: bg-transparent text-text-secondary hover:text-text-primary
    Padding: px-3 py-1.5 rounded-md text-13

  [spacer: flex-1]
  
  Sort dropdown: "Sort by" — secondary button sm, icon=ArrowUpDown
  Filter button: secondary button sm, icon=SlidersHorizontal (future use, renders as disabled in MVP)

─── SOP LIBRARY TABLE ───────────────────────────────────
TanStack Table v8 wrapped in a white rounded-lg shadow-sm border border-border-default

Columns:
  SOP No.      w-[120px]    DM Mono 13px text-text-secondary
  Title        flex-1       14px/500 text-primary + lock icon if locked
  Department   w-[140px]    <DeptBadge />
  Version      w-[80px]     DM Mono 12px text-text-secondary
  Status       w-[140px]    <StatusBadge />
  Date Listed  w-[120px]    12px text-secondary (date formatted "DD MMM YYYY")
  Due Revision w-[130px]    12px. If due_for_revision ≤ today+30: amber-600 bold "DD MMM YYYY"
                             If overdue: red-600 bold
  Actions      w-[48px]     kebab menu (MoreHorizontal icon)

Table header row:
  bg-surface-raised
  height: 40px
  text-11 uppercase letter-spacing-wide text-text-secondary font-600
  border-bottom: 1px border-border-default

Table data rows:
  height: 52px (with 1 line of content) 
  Odd rows: bg-white
  Even rows: bg-surface-raised/50
  hover: bg-blue-50/30 transition-colors 100ms
  cursor: pointer (entire row opens SOP in tab viewer)
  border-bottom: 1px border-border-default/50

Locked SOP row:
  Lock icon (14px, text-amber-500) inline after title
  Title text: text-text-secondary (dimmed slightly)
  Tooltip on lock icon: "Change Control in progress — editing locked"

Actions kebab menu items:
  Open (always)
  Version History
  ─── (separator)
  Submit Edit (Manager only, not locked, own dept)
  ─── 
  Copy SOP Number

─── TAB STRIP ───────────────────────────────────────────
Position: below toolbar, above table
bg-white border border-border-default rounded-t-lg
(Table has rounded-b-lg only — forms a combined unit with tab strip)

Height: 36px, flex items-end px-3 gap-1

Each tab:
  height: 36px, px-3, flex items-center gap-1.5
  Border-top-left-radius + border-top-right-radius: rounded-t-md
  Font: 12px text-text-secondary truncate max-w-[160px]

  Inactive: bg-surface-raised/50 border border-b-0 border-border-default
  Active: bg-white border border-b-0 border-border-default border-b-white font-600 text-text-primary
          border-bottom: 2px solid brand-teal

  Close button: ×, 14px, appears on hover, text-muted hover:text-text-primary
  SOP number prefix in DM Mono 11px text-muted

"+" add tab button: ghost, 28px square, icon=Plus, right of tabs
```

---

### 5.2 SOP Viewer `/library/[id]`

```
Layout: full main content area, flex flex-col

─── VIEWER HEADER BAR ───────────────────────────────────
  bg-white border-b border-border-default
  padding: px-6 py-4
  Height: auto (wraps if needed)

  Row 1: flex items-start justify-between gap-4
    Left metadata:
      flex items-center gap-3 flex-wrap
      SOP Number: DM Mono 13px text-text-secondary bg-surface-raised px-2 py-0.5 rounded-sm
      Title: 20px/700 text-primary
      <DeptBadge />
      Version: DM Mono 12px text-text-secondary
      <StatusBadge />
    
    Right: action bar (see below)
  
  Row 2 (metadata strip): mt-3 flex gap-6 flex-wrap
    Each item: flex items-center gap-1.5
      Icon 13px text-muted + label text-12 text-secondary
      Items: Date Listed · Last Revised · Due for Revision · Approved By

─── ACTION BAR ──────────────────────────────────────────
Own-dept Active SOP:
  flex items-center gap-2
  [Acknowledge button — see below]
  [Submit Edit button — secondary, icon=PenLine] (Manager + not locked)
  [Version History button — ghost, icon=History]

Own-dept Locked SOP (pending_cc):
  [Version History button]
  Badge: border border-amber-400 text-amber-600 bg-amber-50 px-3 py-1 rounded-md text-12
         icon=Lock 12px + "Change Control in Progress — Editing Locked"

Cross-department SOP (read-only):
  Badge: border border-brand-teal text-brand-teal bg-teal-50 px-3 py-1 rounded-md text-12
         icon=Eye 12px + "Read only — from [department name]"
  [Version History button]

Draft/Pending SOP (Manager, own dept):
  [Version History button]
  Status badge only — no actions available until Active

─── ACKNOWLEDGE BUTTON ──────────────────────────────────
States:

Not acknowledged:
  primary button, h-36
  icon=CheckSquare 14px + "Acknowledge"

Acknowledged:
  Replaces button with:
  bg-status-active-bg border border-green-200 rounded-md px-3 py-1.5
  CheckCircle2 14px text-green-600 + "Acknowledged v[version]" 13px text-green-700
  "[date acknowledged]" text-11 text-muted ml-1

─── DOCUMENT VIEWER ─────────────────────────────────────
  flex-1 overflow-y-auto
  Padding: px-12 py-8 (generous reading margins)
  Background: bg-white
  Max-width: 800px mx-auto (readable line length)

  Superseded banner (shown when viewing old version from history):
    Position: sticky top-0
    bg-amber-600 text-white px-6 py-2 text-13/600
    AlertTriangle icon + "SUPERSEDED VERSION — v[X]. Current version is [Y]."
    "View current" link → opens current version in same tab

  Rendered HTML from mammoth.js:
    Wrapped in Tailwind prose class with these overrides:
    prose-headings:font-semibold prose-headings:text-text-primary
    prose-p:text-text-primary prose-p:leading-relaxed
    prose-table:border prose-td:border prose-td:p-2
    prose-strong:text-text-primary
    Font family: DM Sans (inherits from body)
    All heading fonts: DM Sans, not serif

─── VERSION HISTORY SHEET ───────────────────────────────
  Shadcn Sheet from right edge, w-[380px]
  Header: "Version History" + SOP number in DM Mono

  Each version row:
    flex items-start gap-3 px-6 py-4 border-b border-border-default

    Left: Version string in DM Mono 13px, w-[60px]
    Center:
      "Uploaded by [name]" 13px text-primary
      Date: 12px text-secondary
      Current badge (if latest active): bg-status-active-bg text-green-700 text-11 px-1.5 rounded-full
    Right:
      "View" ghost button sm

  Current version row: bg-status-active-bg/30
```

---

## PART 6 — SOP UPLOAD MODAL

### 6.1 `<SopUploadModal />`

```
Shadcn Dialog, max-w-2xl, non-dismissable during upload

─── HEADER ──────────────────────────────────────────────
"Upload SOP" / "Submit SOP Edit" — 20px/700 text-primary
Subtext: "Step X of 3" — 13px text-secondary

─── STEP INDICATOR (below header) ───────────────────────
3 segments, w-full, h-1 bg-border-default rounded-full
Filled portion: bg-brand-teal, animated width transition 300ms

─── STEP 1: FILE UPLOAD ─────────────────────────────────
Drop zone:
  w-full h-[200px] rounded-xl
  border: 2px dashed border-border-strong
  bg-surface-raised

  Default state (centered):
    Cloud icon (Lucide CloudUpload) 40px text-muted mb-3
    "Drag your .docx file here" 15px/600 text-primary
    "or click to browse" 13px text-secondary mt-1
    "Word documents only (.docx) · Max 25MB" 12px text-muted mt-1

  Drag-over state:
    border-brand-teal bg-teal-50/40
    icon colour → text-brand-teal
    label → "Drop to upload"

  File selected (success) state:
    Icon: FileText 32px text-brand-teal
    Filename: 14px/600 text-primary truncate max-w-[300px]
    File size: 12px text-muted mt-1
    "Change file" text button text-12 text-brand-blue mt-2

  Error state:
    border-red-400 bg-red-50/30
    AlertTriangle icon text-red-500
    Error message: "File must be a .docx document" / "File must be under 25MB"
    text-13 text-red-600

─── STEP 2: METADATA ────────────────────────────────────
Type selector (top):
  Two radio card options (same style as onboarding role cards)
  "New SOP" (FilePlus icon) / "Update Existing SOP" (FilePen icon)

If "New SOP":
  SOP Number: input, label "SOP Number", required
    Inline validation on blur: check uniqueness. Show green ✓ or red × inline.
  Title: input, label "SOP Title", required
  Primary Department: auto-filled badge (not editable unless QA user)
    QA: Shadcn Select dropdown
  Secondary Departments: multi-select
    Custom multi-select built on Shadcn Popover:
      Trigger: "Add departments..." ghost button with ChevronDown
      Dropdown: list of all departments except primary. Each row: checkbox + <DeptBadge />
      Selected shown as stacked badges below trigger

If "Update Existing SOP":
  Target SOP search:
    Label: "Select SOP to update"
    Search input with dropdown (same as GlobalSearch but filtered to own dept)
    On select: shows SOP card with Number, Title, current version, status
    
    Locked SOP warning (if selected SOP has locked=true):
      bg-amber-50 border border-amber-300 rounded-md p-3 mt-3
      Lock icon + "A Change Control is already in progress for this SOP."
      "Editing is locked until the Change Control is complete."
      "Next" button disabled when a locked SOP is selected

─── STEP 3: NOTES TO QA ─────────────────────────────────
Textarea: full-width h-[120px] placeholder "Add any notes for the QA reviewer..."
Character counter below (right-aligned)
"This is optional but helps QA review your submission faster." text-12 text-muted mt-2

─── MODAL FOOTER (all steps) ────────────────────────────
  flex justify-between items-center px-6 py-4
  border-top: 1px border-border-default
  
  Left: "Back" ghost button (Steps 2 and 3 only)
  Right: "Next" primary (Steps 1 and 2) / "Submit for QA Review" ShimmerButton (Step 3)

─── SUCCESS STATE (after submit) ────────────────────────
  Replaces step content
  Centered: CheckCircle2 48px text-green-600, animated scale-in
  "Submitted for QA Review" 20px/700 text-primary mt-4
  "You'll be notified when QA responds." 14px text-secondary mt-2
  "Close" secondary button mt-6
```

---

## PART 7 — QA APPROVAL FLOW

### 7.1 Approvals Queue `/approvals`

```
Page header: "SOP Approvals" display scale
Badge: total pending count, bg-status-overdue-bg text-red-600 text-12 font-600 px-2 rounded-full

Filter tab strip (same style as Library): All | Pending | Changes Requested | Approved | Rejected

─── APPROVAL CARD ───────────────────────────────────────
bg-white rounded-xl border border-border-default shadow-sm
Padding: p-5
Hover: shadow-md transition-shadow 200ms
Cursor: pointer → navigates to /approvals/[id]

Layout:
  Row 1: flex items-start justify-between
    Left: flex items-center gap-3
      <Avatar md />
      [Name 14px/600, Dept badge, Role badge — stacked]
    Right: <StatusBadge /> + time-ago 12px text-muted

  Row 2 (mt-3): SOP info
    SOP Number: DM Mono 12px text-muted
    Title: 16px/600 text-primary mt-0.5
    
  Row 3 (mt-2): flex items-center gap-2
    Type badge: "New SOP" (blue) or "Update" (amber) — small pill badge
    Submission label: "Submission 1" / "Resubmission 2" in text-12 text-muted
    
  Row 4 (mt-4): flex justify-end
    "Review Submission →" primary button sm

Self-submission badge (QA Manager viewing their own submission):
  bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5 text-12 text-amber-700
  AlertTriangle 12px + "Requires another QA Manager to approve"
  Shown on the card in place of the "Review" button

─── EMPTY STATE ─────────────────────────────────────────
  CheckCircle2 48px text-green-400
  "All caught up" 18px/600 text-primary mt-4
  "No pending SOP submissions." 14px text-secondary mt-2
```

---

### 7.2 Approval View `/approvals/[id]`

```
Layout: two-panel (no sidebar interference — full main content width)
  Left panel (65% width): SOP viewer (same <SopViewer /> component, document rendering)
  Right panel (35% width, border-l): fixed-height flex-col, overflow hidden

─── RIGHT PANEL HEADER ──────────────────────────────────
  px-5 py-4 border-b border-border-default bg-white
  "Submission Details" 15px/600 text-primary

  Submitter card (bg-surface-raised rounded-lg p-4 mt-4):
    flex gap-3
    <Avatar md />
    Name 14px/600 + Job Title 12px text-secondary + Employee ID 12px text-muted
    Department badge + Role badge (mt-2 flex gap-1)
    "Submitted [time-ago]" 12px text-muted mt-1

  Submission version strip:
    mt-4 border-t border-border-default pt-4
    "Submission history" 11px uppercase letter-spacing-wide text-muted mb-2
    Each row: flex items-center gap-2 py-1.5
      Version label: 13px text-text-secondary
      Time: 12px text-muted
      Status badge (sm)
      "View" text button if not current row

─── RIGHT PANEL ACTIONS ─────────────────────────────────
  flex-1 overflow-y-auto px-5 py-4

  Self-approval block (QA Manager viewing own submission):
    bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4
    AlertTriangle 16px text-amber-600
    "You submitted this SOP" 14px/600 text-amber-800 mt-2
    "Another QA Manager must approve it." 13px text-amber-700 mt-1

  Normal state (different QA Manager reviewing):
    Approve button: ShimmerButton full-width mb-3 icon=CheckCircle text-15/600
    Request Changes button: secondary full-width icon=MessageSquare text-14

    "Request Changes" expands an inline textarea:
      Label "Notes for submitter" text-13/600
      Textarea h-[100px] mt-2
      "Send Request" primary sm + "Cancel" ghost sm (row, mt-2, gap-2)

─── APPROVAL THREAD ─────────────────────────────────────
  border-t border-border-default pt-4
  "Review Thread" 13px/600 text-text-secondary mb-3

  Each thread item (chronological, oldest at top):
    flex gap-3 py-3 border-b border-border-default/50
    
    <Avatar sm /> 
    Content:
      Name 13px/600 + Role badge sm + time-ago 11px text-muted (same row)
      
      Action badge (if applicable): mt-1
        action='changes_requested': bg-amber-50 text-amber-700 border-amber-200 text-11 px-1.5
        action='approved':          bg-green-50 text-green-700 border-green-200 text-11 px-1.5
        action='resubmitted':       bg-blue-50 text-blue-700 border-blue-200 text-11 px-1.5
      
      Comment text: 13px text-text-primary mt-1
```

---

## PART 8 — CHANGE CONTROL

### 8.1 Change Control Page `/change-control/[id]`

```
Page layout: flex flex-col gap-6 p-6

─── CC HEADER CARD ──────────────────────────────────────
bg-white rounded-xl border border-border-default shadow-sm
Position: relative (for BorderBeam)
Padding: p-6

When status='pending': BorderBeam component applied to this card.
  BorderBeam borderWidth={2} duration={8} colorFrom="#00C2A8" colorTo="#1A5EA8"

Layout: flex items-start justify-between gap-4

Left column:
  CC Reference: DM Mono 12px text-muted "CC-2024-001"
  SOP Title: 20px/700 text-primary mt-1
  flex gap-3 mt-3:
    <DeptBadge />
    Version: DM Mono 12px text-text-secondary bg-surface-raised px-2 py-0.5 rounded-sm
    issued-by attribution: "Issued by [QA Manager name]" text-12 text-muted

Right column (flex flex-col items-end gap-2):
  <StatusBadge status />
  Progress: "3 of 5 signatures" 13px text-text-secondary
  Progress bar: w-[180px] h-2 bg-border-default rounded-full
    Fill: bg-brand-teal rounded-full, width = percentage

Deadline row (mt-4 pt-4 border-t border-border-default):
  flex items-center gap-2
  CalendarClock icon 15px
  "Signature deadline: [date]" 13px
  
  If deadline > today+3: text-text-secondary
  If deadline ≤ today+3 AND > today: text-amber-600 font-600
  If deadline < today: text-red-600 font-600 + "(OVERDUE)" suffix

─── TWO-COLUMN BODY ─────────────────────────────────────
grid grid-cols-[1fr_340px] gap-6

Left column:
  <DiffViewer />

Right column (flex flex-col gap-4):
  <DeltaSummaryCard />
  <SignatureGrid />

─── DIFF VIEWER ─────────────────────────────────────────
bg-white rounded-xl border border-border-default shadow-sm overflow-hidden

Toolbar:
  flex items-center justify-between px-4 py-3 border-b border-border-default bg-surface-raised
  Left: "Document Comparison" 14px/600 text-primary
  Right: Toggle group (Shadcn): "Show All" / "Changes Only" text-13

Two columns inside (grid-cols-2 divide-x divide-border-default):
  Each column header:
    px-4 py-2.5 bg-surface-raised border-b border-border-default
    Version label: DM Mono 12px
    Left header: bg-red-50 text-red-700 "Previous: v[X]"
    Right header: bg-green-50 text-green-700 "Updated: v[Y]"

  Content area: px-6 py-4 max-h-[600px] overflow-y-auto (each side scrolls independently)

  Diff rendering:
    Unchanged paragraph: 14px text-text-primary leading-relaxed py-2
    
    Changed paragraph (left/old):
      py-2 bg-red-50/60 border-l-4 border-red-400 pl-4 text-text-primary
      Deleted text inline: <del> tag styled: line-through text-red-700 bg-red-100
    
    Changed paragraph (right/new):
      py-2 bg-green-50/60 border-l-4 border-green-400 pl-4 text-text-primary
      Added text inline: <ins> tag styled: no underline text-green-800 bg-green-100

─── DELTA SUMMARY CARD ──────────────────────────────────
bg-white rounded-xl border border-border-default shadow-sm

Header:
  flex items-center justify-between px-5 py-4 border-b border-border-default
  Left: Sparkles icon 16px text-brand-blue + "AI Summary" 14px/600 text-primary
  Right: RefreshCw icon button ghost sm (regenerate)

Content: px-5 py-4
  Bullet list: space-y-2
    Each item: flex gap-2
      Dot: 6px circle bg-brand-teal mt-[7px] flex-shrink-0
      Text: 13px text-text-primary leading-relaxed

Loading state: 3 skeleton lines of varying width (animate-pulse)

Disclaimer (always visible, pinned at bottom of card):
  border-t border-border-default px-5 py-3 bg-surface-raised
  Info icon 12px text-muted + "AI-generated. Verify against the full diff before signing." text-11 text-muted

─── SIGNATURE GRID ──────────────────────────────────────
bg-white rounded-xl border border-border-default shadow-sm

Header:
  px-5 py-4 border-b border-border-default
  "Required Signatures" 14px/600 text-primary
  Count: "[X] of [Y] collected" 13px text-text-secondary float-right

Each signatory row:
  px-5 py-4 border-b border-border-default/50 flex items-center gap-3

  <Avatar md />
  
  Info (flex-1):
    Name: 14px/600 text-primary
    Role + Dept badges (flex gap-1 mt-1)
  
  Status column (flex flex-col items-end gap-1):

    Signed state:
      CheckCircle2 16px text-green-600
      "Signed" text-12 text-green-600 font-600
      "[timestamp]" text-11 text-muted

    Pending state (someone else):
      Clock icon 16px text-muted
      "Pending" text-12 text-text-secondary

    Action state (current user, not yet signed):
      ShimmerButton sm: "Sign Document" icon=PenLine
      
    Waived state:
      MinusCircle 16px text-muted
      "Waived by Admin" text-12 text-muted
      Entire row: opacity-60

    Waive button (Admin only, on pending rows — appears on row hover):
      ghost sm "Waive" text-12 text-text-secondary
      On click: opens <WaiveModal />

─── SIGNATURE CONFIRM MODAL ─────────────────────────────
Shadcn Dialog max-w-md

Header: "Sign Change Control" 20px/700
        "CC-[ref] · [SOP Title]" 13px text-secondary mt-1

Signature preview box:
  mt-4 bg-surface-raised rounded-xl border border-border-default p-4
  min-height: 120px flex items-center justify-center
  User's signature image: max-h-[100px] object-contain
  Below: "[Your name]" 12px text-muted text-center mt-2

Confirmation text:
  mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-13 text-blue-800
  "By confirming, you are signing your digital signature to this Change Control.
   This action is permanent and cannot be undone. Your IP address and timestamp will be recorded."

Footer:
  Cancel ghost + "Confirm & Sign" ShimmerButton

─── WAIVE MODAL ─────────────────────────────────────────
Shadcn Dialog max-w-sm

Header: "Waive Signature" 18px/700
Icon: AlertTriangle 20px text-amber-600 + amber subtext: "This action will be permanently logged."

Body:
  "You are waiving the signature requirement for [name] on [CC ref]." text-13 text-primary
  Reason textarea (required): "Reason for waiver" label, h-[80px], mt-4
  "This reason will be recorded in the audit log." text-11 text-muted mt-1

Footer: Cancel ghost + "Confirm Waive" destructive button
```

---

## PART 9 — EQUIPMENT REGISTRY

### 9.1 Equipment Page `/equipment`

```
Identical page structure to Library page.
Header: "Equipment Registry" + "Add Equipment" button (Managers only)
Same toolbar pattern. Filters: All | Active | Pending QA | Inactive
```

```
─── EQUIPMENT TABLE ─────────────────────────────────────
Columns:
  Asset ID     w-[120px]    DM Mono 13px text-muted
  Name         flex-1       14px/500 text-primary
  Department   w-[140px]    <DeptBadge />
  Status       w-[130px]    <StatusBadge />
  Frequency    w-[120px]    12px text-secondary "Monthly", "Weekly", etc.
  Last Service w-[120px]    12px text-secondary (formatted date)
  Next Due     w-[120px]    Urgency coloured (see below)
  Actions      w-[48px]     kebab menu

Next Due urgency:
  next_due < today:         "OVERDUE" badge (bg-red-100 text-red-700) + date in red-600 bold
  today ≤ next_due ≤ today+7: date in amber-600 bold
  next_due > today+7:       date in text-secondary
```

---

### 9.2 Asset Detail `/equipment/[id]`

```
Page layout: grid grid-cols-[1fr_380px] gap-6 p-6

─── LEFT COLUMN ─────────────────────────────────────────

Asset header card (bg-white rounded-xl p-6 border shadow-sm):
  flex items-start gap-5
  
  Photo (if exists): 80px×80px rounded-xl object-cover border border-border-default
  No photo: 80px×80px bg-surface-raised rounded-xl flex items-center justify-center
            Cog icon 32px text-muted
  
  Info:
    Asset ID: DM Mono 12px text-muted
    Name: 22px/700 text-primary mt-0.5
    flex gap-2 mt-2: <DeptBadge /> + secondary dept badges + <StatusBadge />
    
    Meta row: mt-3 flex gap-5 text-12 text-secondary
      Serial: "S/N: [value]"
      Model: "Model: [value]"

Specs card (bg-white rounded-xl p-5 border shadow-sm mt-4):
  "Maintenance Specs" 14px/600 text-primary mb-4
  
  Grid 2-col:
    Frequency | [value]
    Interval  | [N days / monthly etc]
    Last Serviced | [date]
    Next Due | [date, urgency coloured]
  
  Linked SOP (if exists): mt-4 pt-4 border-t border-border-default
    "Linked SOP" label 12px text-muted mb-2
    flex items-center gap-2
      FileText 14px text-brand-blue
      SOP Number DM Mono 12px text-muted
      Title 13px text-brand-blue hover:underline cursor-pointer (opens in Library tab)

QR Code card (bg-white rounded-xl p-5 border shadow-sm mt-4):
  "Asset QR Code" 14px/600 text-primary mb-3
  QR SVG: 160px×160px centered, p-3 border border-border-default rounded-lg bg-white
  "Download" ghost button sm mt-3 icon=Download

─── RIGHT COLUMN ────────────────────────────────────────

Next Service card:
  bg-white rounded-xl p-5 border shadow-sm
  Urgency colours applied to border-left (4px):
    Overdue: border-l-4 border-red-500
    Due soon: border-l-4 border-amber-500
    OK: border-l-4 border-green-500
  
  "Next Scheduled Service" 13px/600 text-muted uppercase tracking-wide
  Date: 24px/700 (urgency coloured) mt-1
  "Assigned to: [name]" 13px text-secondary mt-2 flex items-center gap-2 <Avatar xs />
  
  "Log PM Completion" ShimmerButton full-width mt-4 icon=Wrench
  (disabled + tooltip if equipment is inactive or pending_qa)

Service History table (bg-white rounded-xl border shadow-sm mt-4):
  "Service History" 14px/600 text-primary px-5 pt-5 mb-3
  
  Table columns: Date | Completed By | Notes preview | Actions
  Same table styling as other tables
  Notes: truncated to 40 chars, full text on hover via Tooltip
  Actions kebab: "View photo" (if exists) | "Reassign" (Manager only, pending tasks)
  
  Empty state: Wrench icon + "No service history yet" text-muted

QA Approval zone (visible to QA Manager if status='pending_qa'):
  bg-amber-50 border border-amber-200 rounded-xl p-5 mt-4
  "Pending QA Approval" 14px/600 text-amber-800 mb-3
  [Approve Equipment] ShimmerButton full-width mb-2 icon=CheckCircle
  [Reject] secondary button full-width
```

---

## PART 10 — DASHBOARD

### 10.1 Dashboard `/dashboard`

```
Page header: "Dashboard" display scale
Date subtext: "Monday, 13 March 2026" text-secondary text-14 mt-1

─── KPI CARDS ROW ───────────────────────────────────────
grid grid-cols-4 gap-4 mb-6

Each KPI card (bg-white rounded-xl p-5 border shadow-sm):
  Hover: shadow-md transition-shadow 200ms
  Cursor: pointer (navigates to related page)

  Card layout:
    flex items-start justify-between
    Left:
      Label: 12px uppercase tracking-wide text-muted font-600 mb-3
      Value: <NumberTicker value={n} duration={0.6} />
              Text class: 32px font-700 (urgency coloured — see KPI specs)
      Subtext: 12px text-secondary mt-1 (e.g. "in your department")
    Right:
      Icon circle: 40px rounded-full flex items-center justify-center
      Icon: 20px Lucide

KPI specifications:
  Active SOPs:
    Icon: BookOpen, icon circle bg-blue-100 text-brand-blue
    Value: neutral (text-text-primary always)
    Subtext: "active in your department"
    
  Pending Approvals:
    Icon: ClipboardCheck, icon circle
    0 items: bg-green-100 text-green-600, value text-green-600
    >0 items: bg-red-100 text-red-600, value text-red-600
    Subtext: "awaiting QA review"
    
  PM Compliance:
    Icon: Gauge, icon circle
    ≥90%: bg-green-100 text-green-600, value text-green-600
    70-89%: bg-amber-100 text-amber-600, value text-amber-600
    <70%: bg-red-100 text-red-600, value text-red-600
    Shows "%" suffix (built into NumberTicker suffix prop)
    Subtext: "this month"
    
  Due for Revision:
    Icon: CalendarClock, icon circle
    0 items: bg-green-100 text-green-600, value text-green-600
    >0 items: bg-amber-100 text-amber-600, value text-amber-600
    Subtext: "due within 30 days"

─── TWO-COLUMN BODY ─────────────────────────────────────
grid grid-cols-[1fr_320px] gap-6

─── ACTIVITY FEED ───────────────────────────────────────
bg-white rounded-xl border shadow-sm

Header: flex justify-between items-center px-5 pt-5 pb-3 border-b border-border-default
  "Recent Activity" 15px/600 text-primary
  "View all" text-12 text-brand-blue hover:underline → /reports

Each activity row:
  flex gap-3 px-5 py-3.5 border-b border-border-default/50 hover:bg-surface-raised

  <Avatar sm />

  Content (flex-1 min-w-0):
    Row: [Actor name 13px/600] [action verb 13px text-secondary] [entity name 13px text-brand-blue truncate]
    Row: [time-ago 11px text-muted mt-0.5]

  New item animation: AnimatedList slide-in from right

─── UPCOMING PM ─────────────────────────────────────────
bg-white rounded-xl border shadow-sm

Header: px-5 pt-5 pb-3 border-b border-border-default
  "Upcoming Maintenance" 15px/600 text-primary

Each PM row:
  flex gap-3 px-5 py-3.5 border-b border-border-default/50

  Urgency indicator: 4px wide left strip, full height
    overdue: bg-red-500 · due ≤7 days: bg-amber-500 · OK: bg-green-500

  Content:
    Asset name: 13px/600 text-primary truncate
    Equipment ID: DM Mono 11px text-muted + Dept badge sm
    Assigned to: "→ [name]" 12px text-text-secondary (flex items-center gap-1.5 <Avatar xs />)
  
  Right column (flex-shrink-0 text-right):
    Due date: 12px font-600 (urgency coloured)
    "OVERDUE" badge if past due
```

---

## PART 11 — CALENDAR

### 11.1 Calendar `/calendar`

```
Layout: grid grid-cols-[1fr_280px] gap-6 p-6

─── CALENDAR GRID ───────────────────────────────────────
bg-white rounded-xl border shadow-sm overflow-hidden

Header bar:
  flex items-center justify-between px-5 py-4 border-b border-border-default
  Left: chevron-left button (prev month)
  Centre: "March 2026" — 17px/700 text-primary
  Right: "Today" secondary button sm + chevron-right button

Day headers row:
  grid grid-cols-7
  Each: text-11 uppercase tracking-wide text-muted text-center py-2
        border-b border-border-default bg-surface-raised

Day cells grid (grid grid-cols-7):
  Each cell: min-h-[100px] p-2 border-b border-r border-border-default

  Today cell: bg-brand-teal/8
  Today date number: 14px/700 text-brand-teal in a 24px circle bg-brand-teal text-white
  Other date number: 13px text-text-secondary (current month) / text-muted (other month)
  
  Event chips (inside cell, mt-1 space-y-0.5):
    Height: 20px rounded-sm px-1.5 text-11 truncate
    pm_auto: bg-teal-100 text-teal-800
    manual public: bg-blue-100 text-blue-800
    manual dept: bg-slate-100 text-slate-700
    
  Overflow: If >3 events: show first 3 chips + "N more" text-11 text-muted

"+ New Event" button: appears on cell hover (position: absolute bottom-1 right-1)
  ghost sm h-5 px-1 text-11 text-brand-teal icon=Plus

─── UPCOMING PANEL ──────────────────────────────────────
bg-white rounded-xl border shadow-sm

Header: "Upcoming" 14px/600 px-4 py-4 border-b border-border-default

Item row:
  flex gap-3 px-4 py-3 border-b border-border-default/50 hover:bg-surface-raised

  Date column (w-[48px] flex-shrink-0 text-center):
    Day: 20px/700 (urgency coloured for PM items)
    Month: 11px text-muted uppercase

  Content:
    Title: 13px/600 text-primary truncate
    Type chip: text-10 uppercase tracking-wide px-1.5 py-0.5 rounded-sm
      pm_auto: bg-teal-100 text-teal-700
      manual: bg-blue-50 text-blue-700
    Dept badge sm if dept-scoped event
```

---

## PART 12 — REPORTS

### 12.1 Reports `/reports`

```
Layout: grid grid-cols-[220px_1fr] gap-6 p-6

─── REPORT SELECTOR (left column) ───────────────────────
bg-white rounded-xl border shadow-sm p-3

"Reports" 13px/600 text-muted uppercase tracking-wide px-2 mb-2

Each report item:
  Height: 38px px-3 rounded-md flex items-center gap-3 cursor-pointer
  Icon: 16px Lucide
  Label: 14px text-text-primary
  
  Default: bg-transparent hover:bg-surface-raised
  Active: bg-blue-50 text-brand-blue font-600 border-l-[3px] border-brand-teal

  Reports:
    History    "SOP Change History"
    Users      "Acknowledgement Log"
    Wrench     "PM Completion Log"
    Bell       "Pulse / Notice Log"      (Admin badge shown: small pill "Admin")
    Sparkles   "AI Risk Insights"        (QA/Admin badge)

─── REPORT CONTENT (right column) ───────────────────────

Report toolbar:
  flex items-center gap-3 mb-4
  Date range picker (two Shadcn date pickers: From + To, connected)
  [spacer flex-1]
  "Export CSV" secondary button sm icon=Download

Report table: same style as SOP Library table
  Column configurations per report (see BUILD.md Phase 10)

─── AI RISK INSIGHTS SPECIAL LAYOUT ─────────────────────
(When Report 5 selected)

"Generate Insights" ShimmerButton full-width mb-6 icon=Sparkles
  Only shown when no cached results

Results card (bg-white rounded-xl border shadow-sm p-6):
  Risk level header:
    flex items-center gap-3 mb-4 pb-4 border-b border-border-default
    Risk badge (large, 18px/700):
      Low:    bg-green-100 text-green-800 border border-green-300
      Medium: bg-amber-100 text-amber-800 border border-amber-300
      High:   bg-red-100 text-red-800 border border-red-300
    "Overall Risk Level" 13px text-text-secondary ml-3
    [spacer]
    "Regenerate" ghost sm icon=RefreshCw + generated timestamp text-11 text-muted

  Insights list: space-y-4
    Each item: flex gap-3
      Numbered circle: 20px rounded-full bg-brand-navy text-white text-11 flex-shrink-0
      Text: 14px text-text-primary leading-relaxed

  Disclaimer: mt-6 pt-4 border-t border-border-default
    Info icon 13px text-muted + text-12 text-muted
    "AI-generated assessment. Use as a supplementary review tool only."
```

---

## PART 13 — SETTINGS

### 13.1 Settings `/settings`

```
Page header: "Settings" display scale

Layout: grid grid-cols-[200px_1fr] gap-8 mt-6

─── SETTINGS NAV (left column) ──────────────────────────
Vertical tab list (same style as report selector):
  User      "My Profile"    (all users)
  Bell      "Notifications" (all users)
  Building2 "Departments"   (Admin only — not rendered for non-admins)
  Users     "User Management" (Admin only)

─── PROFILE TAB ─────────────────────────────────────────
bg-white rounded-xl border shadow-sm p-6

Avatar section (top):
  flex items-center gap-5 pb-6 border-b border-border-default mb-6
  <Avatar lg />
  Right:
    Name: 18px/700 text-primary
    "Change photo" secondary sm button icon=Upload
    "Remove" ghost sm text-text-secondary (if has avatar)

Form fields (grid-cols-2 gap-4):
  Full Name (required) · Job Title (required)
  Employee ID (optional) · Phone (optional)

"Save Changes" primary button mt-6

Signature section (mt-8 pt-8 border-t border-border-default):
  "Digital Signature" 16px/600 text-primary mb-4
  Current signature preview: bg-surface-raised rounded-xl p-4 inline-block
    Signature image max-h-[80px] object-contain
  flex gap-3 mt-3:
    "Re-draw Signature" secondary button icon=PenLine
    → opens <SignatureCanvas /> in Shadcn Dialog (same as onboarding Step 3)

─── NOTIFICATIONS TAB ───────────────────────────────────
bg-white rounded-xl border shadow-sm p-6

"Notification Preferences" 16px/600 mb-6

Each toggle row (flex items-center justify-between py-4 border-b border-border-default):
  Left:
    Icon + "Setting name" 14px/600 text-primary
    Description: 13px text-secondary mt-0.5
  Right: Shadcn Switch

Items:
  Bell "In-App Notifications" — "Receive Pulse updates in real-time"
  Mail "Email Notifications" — "Get notified by email for critical actions"

─── DEPARTMENTS TAB (Admin only) ────────────────────────
bg-white rounded-xl border shadow-sm p-6

Header: flex justify-between items-center mb-6
  "Departments" 16px/600
  "Add Department" primary sm button icon=Plus

Department table:
  Columns: Colour | Name | Is QA | Created | Actions
  Colour cell: 24px rounded-full swatch using the stored colour
  Is QA cell: CheckCircle2 text-green-600 (true) or — text-muted (false)
  Actions: Edit (pencil icon) | Delete (trash icon)
    Delete: disabled + tooltip "Cannot delete — has [N] users or SOPs" when in use
    Delete QA dept: always disabled + tooltip "The QA department cannot be deleted"
    Edit: opens inline row editing for colour only (name cannot be changed after creation)

─── USER MANAGEMENT TAB (Admin only) ────────────────────
bg-white rounded-xl border shadow-sm p-6

"Active Users" 16px/600 mb-4

User table:
  Columns: User | Department | Role | Admin | Status | Joined | Actions
  
  User cell: flex items-center gap-3
    <Avatar sm /> + Name 13px/600 + email 12px text-secondary (stacked)
  
  Department: <DeptBadge />
  Role: Manager / Employee pill badge
  Admin: CheckCircle2 text-green-600 (true) or — text-muted (false)
  Status: Active (green dot + "Active") / Inactive (grey dot + "Inactive")
  Joined: formatted date text-12 text-secondary
  
  Actions (kebab menu, disabled for own row with tooltip "Cannot edit your own account"):
    "Change Role"        → role toggle dialog (no password needed)
    "Change Department"  → dept select dialog
    ─── separator
    "Grant Admin"        → triggers PasswordConfirmModal (if not already admin)
    "Revoke Admin"       → triggers PasswordConfirmModal (if currently admin)
    ─── separator
    "Deactivate"         → ConfirmDialog destructive (if currently active)
    "Reactivate"         → ConfirmDialog default (if currently inactive)

"Inactive Users" collapsible section below the main table:
  Trigger: flex items-center gap-2 text-13 text-text-secondary cursor-pointer
           ChevronRight icon (rotates on open) + "Inactive Users ([N])"
  Same table columns, rows are dimmed (opacity-60) with "Inactive" status badge
```

---

## PART 14 — EMPTY STATES LIBRARY

Every list/table must have a designed empty state. Use `<EmptyState />` component.

```
SOP Library (no SOPs):
  Icon: BookOpen
  Title: "No SOPs in your department"
  Description: "Get started by uploading your first standard operating procedure."
  Action: "Upload SOP" (Managers only)

Equipment Registry (no equipment):
  Icon: Cog
  Title: "No equipment registered"
  Description: "Add your first piece of equipment to start tracking maintenance."
  Action: "Add Equipment" (Managers only)

Approval Queue (empty):
  Icon: CheckCircle2
  Title: "All caught up"
  Description: "There are no SOP submissions awaiting review."

Pulse (nothing to show):
  Icon: Inbox
  Title: "You're all caught up"
  Description: "New notifications will appear here in real-time."
  (No action button)

Change Control (signature grid has all signed):
  Icon: CheckCircle2 (green)
  Title: "All signatures collected"
  Description: "This Change Control is complete."

Reports (no data for filter):
  Icon: BarChart2
  Title: "No data for this period"
  Description: "Try adjusting the date range filter."
  Action: "Clear filter"

Calendar (no events this month):
  Icon: CalendarDays
  Title: "Nothing scheduled this month"
  Description: "Add an event or PM dates will appear automatically."
  Action: "Add Event"

Service History (no records):
  Icon: Wrench
  Title: "No service history yet"
  Description: "Service records will appear here after the first PM completion."

User Management (no inactive users):
  No empty state shown — the "Inactive Users" section is simply hidden when count = 0.
```

---

## PART 15 — LOADING SKELETON SPECS

Every page must have a `loading.tsx` that renders this skeleton layout before data arrives.

```
─── Library / Equipment loading.tsx ─────────────────────
Page header: 200px × 32px skeleton block
Toolbar: row of 3 skeleton blocks (120px, 80px, 80px)
Table: <SkeletonRow /> × 8
Table header row: bg-surface-raised, animate-pulse column blocks

─── Dashboard loading.tsx ───────────────────────────────
KPI row: 4 skeleton cards (h-[100px] each)
Body: two columns
  Left: header skeleton + 5 row skeletons
  Right: header skeleton + 5 row skeletons

─── SOP Viewer loading.tsx ──────────────────────────────
Viewer header: 2 lines of skeleton (title row + meta row)
Document area: 12 paragraph-width skeleton blocks of varying width (60–100%)

─── Change Control loading.tsx ──────────────────────────
CC header card: h-[100px] skeleton
Body: two columns (diff viewer skeleton left, sidebar skeletons right)

─── All skeleton blocks: ────────────────────────────────
animate-pulse bg-slate-200 rounded-md
Heights: 16px (text), 20px (label), 32px (heading), 40px (button/input), 100px (card)
```

---

## PART 16 — RESPONSIVE BEHAVIOUR SUMMARY

```
Breakpoint system (Tailwind defaults):
  sm:   640px+
  md:   768px+
  lg:   1024px+
  xl:   1280px+

Full layout (sidebar + main + pulse): xl+ (≥1280px)
Collapsed sidebar (icon strip): lg–xl (1024–1279px)
Mobile layout (<1024px):
  - Sidebar hidden behind hamburger menu (Shadcn Sheet from left, full height)
  - Pulse panel hidden
  - PulseBell in TopNav shows unread count
  - Main content: full width, reduced padding (px-4 py-4)
  - Tables: horizontally scrollable with min-width
  - Modals: max-w-[calc(100vw-32px)] centered, max-h-[calc(100vh-80px)] with scroll

Table horizontal scroll on mobile:
  Wrapper: overflow-x-auto -mx-4 px-4 (pulls to page edges)
  Table: min-w-[700px]
  Priority columns stay visible (SOP No., Title, Status, Actions)

Touch targets: All interactive elements minimum 44×44px on mobile
```

---

## PART 17 — ACCESSIBILITY REQUIREMENTS

```
Focus management:
  All interactive elements: focus-visible:outline-none focus-visible:ring-2 
                             focus-visible:ring-brand-teal focus-visible:ring-offset-2
  Never remove focus indicators. Tab order must be logical.

Modals and Sheets:
  role="dialog" aria-modal="true" aria-labelledby="[dialog-title-id]"
  Focus trapped inside while open (Shadcn handles this natively)
  Close on Escape key (except PasswordConfirmModal — must use Cancel button)
  Return focus to trigger element on close

Icon buttons (icon-only, no text):
  aria-label="[action]" on every one. Examples:
    Close tab: aria-label="Close SOP tab"
    Kebab menu: aria-label="Actions for [item name]"
    PulseBell: aria-label="Notifications, [N] unread"

StatusBadge: aria-label="Status: [status]"
DeptBadge: aria-label="Department: [name]"
Avatar (no name visible): aria-label="[full name]'s avatar"

Tables:
  <thead> <th scope="col"> on all header cells
  Row click: role="button" tabIndex={0} onKeyDown handles Enter/Space
  
Form validation:
  Errors linked to inputs via aria-describedby
  aria-invalid="true" on errored inputs
  Error messages: role="alert" for programmatically added errors

Colour alone never conveys information:
  StatusBadge: dot + text label (not just the dot)
  KPI urgency: value text + subtext description (not just colour)
  Diff viewer: columns labelled "Previous" / "Updated" (not just red/green)
```

---

## PART 18 — ANIMATION SPECIFICATIONS

```
Page load (on first render):
  KPI cards: staggered fade-up animation
    Each card: opacity 0→1, translateY 8px→0
    Delay: 0ms, 80ms, 160ms, 240ms (staggered)
    Duration: 300ms ease-out
    CSS: animation: fadeUp 300ms ease-out both; animation-delay: var(--delay)

Pulse new item (Realtime INSERT):
  Magic UI AnimatedList handles the slide-in
  Items slide from right edge, settle into position
  Do not add additional animation on top of AnimatedList

NumberTicker (KPI values):
  duration={0.6} on all instances
  No custom override needed — Magic UI handles the easing

Modal / Dialog:
  Backdrop: opacity 0→0.4, duration 200ms
  Content: scale 0.95→1, opacity 0→1, duration 200ms ease-out
  (Shadcn handles this natively — do not override)

Sheet (slide-in panels):
  From right: translateX 100%→0, duration 300ms ease-out
  (Shadcn handles this natively)

BorderBeam (CC pending card):
  Applied as-is from Magic UI component
  colorFrom="#00C2A8" colorTo="#1A5EA8" borderWidth={2} duration={8}

Acknowledge button transition (on click):
  Button fades out opacity 1→0 (150ms)
  Confirmed badge fades in opacity 0→1 (150ms)
  Use React state + Tailwind transition classes

Approval/Signing success:
  CheckCircle icon: scale-in from 0.5→1, duration 400ms, spring easing
  Background: green flash (opacity 0→0.15→0, 600ms)
```

---

*End of UI Design Spec v2.1 — SOP-Guard Pro*
*Companion to BUILD.md v2.1*
*Every component specified. No state left undefined.*
