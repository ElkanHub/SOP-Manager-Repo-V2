# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Next.js dev server on http://localhost:3000
npm run build    # Production build
npm run start    # Run production build
npm run lint     # ESLint (uses eslint.config.mjs, eslint-config-next)
```

No test runner is configured. The root is a Next.js 16 / React 19 project (`"next": "16.1.6"` in `package.json`, despite BUILD docs referring to "Next.js 15" — trust `package.json`). TypeScript strict mode is on; `npx tsc --noEmit` is the standard typecheck.

Supabase migrations live in `supabase/migrations/` and are applied via the Supabase CLI (`supabase db push` / `supabase migration up`). 36+ migrations exist — always add a new numbered SQL file rather than editing older ones.

Auxiliary scripts at the repo root (`check_db.js`, `check_admins.js`, `test-signup.js`, `optimize-image.js`) are one-off utilities, not part of the build.

## Architecture

### Star-centralized domain model
The SOP Library (`sops`) and Equipment Registry (`equipment`) are the two hubs. Every other feature — approvals, change control, PM tasks, calendar events, training modules, Pulse notifications, requests, reports — references one of these two. When adding a feature, figure out which hub it orbits before designing tables or routes.

### Identity is 3 attributes (`profiles` row)
`department` (FK to `departments.name`), `role` (`manager` | `employee`), `is_admin` (bool). The QA department is the sole approval authority — no SOP goes Active without a QA manager sign-off, enforced inside the `approve_sop_request` RPC (not in application code). QA managers cannot self-approve: the RPC rejects `submitted_by === qa_user_id`. Permission helpers live in `lib/utils/permissions.ts`.

### Auth flow & routing
- **`proxy.ts`** at repo root is the Next.js middleware (registered via `next.config.ts` — it is *not* named `middleware.ts`). It calls `supabase.auth.getUser()`, loads the profile, and redirects based on `is_active` / `signup_status` / `onboarding_complete`. Any new auth-gated state transition goes here.
- `app/(auth)/` — login, signup, setup (first-admin bootstrap), onboarding, password reset.
- `app/(dashboard)/` — main app. The layout wires `SidebarProvider` → `TooltipProvider` → `TopNav` + `AppSidebar` + `PulseWrapper` + `<main>`. Add new page groups here; they inherit the shell.
- `app/(docs)/` — in-app documentation pages rendered from MDX in `content/`.
- `app/m/[token]/` — **public, unauthenticated** mobile signature capture page. `proxy.ts` short-circuits any `/m/*` request before auth runs. Do not add auth gates here.

### Supabase clients — pick the right one
- `lib/supabase/client.ts` — browser client (use in `"use client"` components).
- `lib/supabase/server.ts` — server client, exports `createClient()` (user-scoped, for Server Components and most server actions) and `createServiceClient()` (service role, bypasses RLS — only for verified admin operations).
- `lib/supabase/middleware.ts` — `updateSession()` used by `proxy.ts` to refresh cookies.

Always use `supabase.auth.getUser()` server-side. Never `getSession()` — it reads the cookie without revalidating the JWT.

### RLS is the security layer
Every table has RLS enabled. Never trust frontend filtering for access control. The one deliberate exception is the SOP library's two-layer visibility: the department filter for the default Library view is applied at the *query* layer, not RLS, because the search feature intentionally exposes all `status = 'active'` SOPs across departments. Cross-department SOPs render read-only with an empty action bar. Don't "fix" this — if the policy ever needs to change, it requires reinstating RLS dept filters and revisiting search.

### Server actions, not API routes (mostly)
`actions/*.ts` holds mutation entry points called from Client Components via the `'use server'` pattern (auth, sop, equipment, training, messages, pulse, requests, events, email, settings, onboarding). Heavy domain logic (version incrementing, approval workflows, audit snapshots) is inside **Postgres RPC functions** called from these actions. When modifying workflow logic, check if the source of truth is the RPC (in `supabase/migrations/`) before editing the action.

`app/api/*` is reserved for:
- Gemini AI endpoints (`/api/gemini/delta-summary`, `/api/gemini/risk-insights`)
- Storage handlers (`/api/storage/*`)
- Cron endpoints (`/api/cron/pm-alerts`, `/api/cron/overdue-check`, `/api/cron/training-deadline-check`)
- Docs proxy/search
- `/api/change-control/diff` for pre-computed HTML diffs

### State management
- **Server state:** TanStack Query. Query keys are typed string arrays (`['sops', 'library', deptFilter]`).
- **UI state:** Zustand stores in `store/` (`sop-tabs.ts`, `messages-store.ts`, `report-store.ts`). Hook pattern: `useSopTabStore`.
- **Forms:** React Hook Form + Zod resolvers.

### The Pulse (real-time notification surface)
`components/pulse/pulse-wrapper.tsx` is always mounted inside the dashboard layout and maintains a single Supabase Realtime subscription per user. The badge logic has two buckets: notices (counted until explicitly acknowledged) and everything else (counted if new since last panel open, tracked in `localStorage.last_pulse_view`). Audience-wide notices are broadcast as a **single** `pulse_items` row with `recipient_id = NULL` and audience filtering happens on the client — do not fan out one row per recipient.

### SOPs: upload-only, versioned, locked during CC
There is no in-app SOP editor. Users upload `.docx` files; `mammoth.js` + DOMPurify renders them read-only. Versions follow `vMAJOR.MINOR`; `lib/utils/version.ts` has `incrementVersion()`. When a Change Control is active against an SOP, `sops.locked = true` — the Submit Edit path must check this. The CC completion trigger releases the lock.

### Change Control signatures
Required signatories are snapshotted into `change_controls.required_signatories jsonb` at creation time. Completion checks run against the snapshot, not a live query — transfers/new-hires mid-CC never affect signing requirements. Signatures are stored signature images in Supabase Storage referenced by immutable `signature_certificates` rows. Never write UPDATE/DELETE policies for audit-trail tables.

### Soft-delete only
Profiles are never hard-deleted. Offboarding sets `profiles.is_active = false`. FK references from audit logs, signatures, acknowledgements, and pulse items must stay valid.

## Conventions

- **Icons:** `lucide-react` only. Don't add other icon libraries.
- **UI primitives:** Shadcn-style wrappers around `@base-ui/react/*` in `components/ui/` (Tooltip, Popover, Dialog, Select, etc.). `TooltipProvider` is already mounted in the dashboard layout — for a new tooltip just use `<Tooltip><TooltipTrigger render={<Button/>}>...</TooltipTrigger><TooltipContent>...</TooltipContent></Tooltip>`. Base UI triggers use the `render` prop to render as a different element (avoids nested buttons).
- **Styling:** Tailwind utility classes only. Colors must come from the brand tokens (`brand-navy`, `brand-blue`, `brand-teal`, semantic `muted-foreground`, `destructive`, etc.) — never hardcode hex in className. Dark mode must work; the palette is gray-based with blue/teal accents, not an inverted light palette.
- **File naming:** `kebab-case.tsx` for components, `camelCase.ts` for utilities, `PascalCase` components, `snake_case` DB columns.
- **No business logic in components.** Extract to `actions/` (server) or `hooks/` (client).
- **Service role key is server-only.** Never expose under a `NEXT_PUBLIC_` prefix.
