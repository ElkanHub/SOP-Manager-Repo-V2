# SOP-Guard Pro v2 Audit Report (Phases 1-10)

## 0. Project Bootstrap (Phase 0)
**Good:**
- Dependencies are correctly installed (`lucide-react`, `mammoth`, `dompurify`, `diff-match-patch`, etc.).
- Shadcn UI and layout components are successfully bootstrapped.

**Bad/Deviations:**
- `.env.local.example` is missing. This violates the Phase 0 checklist.
- The project is using Next.js 16 and Tailwind CSS v4, whereas the specification explicitly requested Next.js 15 and Tailwind v3. This might cause slight UI/build discrepancy later but is acceptable if functionality holds.

**Fixes Needed:**
- Create `.env.local.example` and document all required keys.

## 1. Database & Schema (Phase 1)
**Good:**
- All initial 13 migrations are present and align well with the schema requirements.
- Additional necessary migrations (014 storage, 015 pm_task_photo, 016 initial_assignee) correctly implement storage policies and schema changes required in later phases.
- RLS policies and triggers are properly set up.

**Bad/Deviations:**
- No critical deviations found. The separation of `initial_assignee_id` into migration 016 instead of 005 is acceptable.

## 2. First-Admin Bootstrap, Authentication & Onboarding (Phase 2)
**Good:**
- The `/setup`, `/login`, `/signup`, and `/onboarding` pages exist and use the appropriate Shadcn layouts.
- `OnboardingPage` correctly verifies if the user is logged in and if `onboarding_complete` is true to redirect.

**Bad/Deviations:**
- **Critical:** The root `middleware.ts` is missing! The instructions explicitly stated to create a root `middleware.ts` for route guarding (inactive users, onboarding complete logic, unauthenticated access). Although `lib/supabase/middleware.ts` exists, it must be exported from the root to function for Next.js routing.
- The `SetupPage` (`app/(auth)/setup/page.tsx`) server component does NOT invoke `has_any_admin()` to restrict access if an admin already exists. This violates the rule that it must be checked server-side before rendering.

**Fixes Needed:**
- Create a root `middleware.ts` that implements the routing guard matrix.
- [The developer: Do not rename this file.... as per the recent update on NextJs, the middleware.ts file is now named proxy.ts....]
- Add the `has_any_admin()` check inside `app/(auth)/setup/page.tsx`.

## 3. Shell Layout & The Pulse (Phase 3)
**Good:**
- `TopNav`, `Sidebar`, and Layout structure are implemented using the Shadcn `dashboard-01` pattern.
- `ThePulse` has a functional Realtime subscription and initial fetch logic using the broadcast model (`audience.eq.everyone`, etc.).

**Bad/Deviations:**
- **Incomplete Pulse Components:** The specification required `<PulseItem />` to map to specific renderers (`NoticeItem`, `ApprovalRequestItem`, etc.). Instead, there is a single generic `<PulseItem />` that hardcodes a few types and misses many spec types (`cc_deadline`, `pm_due`, etc.).
- **Missing Notice Threading:** Thread depth enforcement and reply inputs are completely absent. The requirement that replies are only visible on `thread_depth = 0` and that threading is capped to 1 depth is not implemented.
- `TopNav` unread notification bell is a static red dot rather than reflecting the actual unread count.

**Fixes Needed:**
- Refactor `PulseItem` into a map of type-specific renderers.
- Implement notice threading and `thread_depth` enforcement in both UI and server actions.
- Connect `TopNav` bell to actual unread state.

## 4. SOP Library (Read Layer) (Phase 4)
**Good:**
- The `SopLibraryTable` correctly implements TanStack table with the correct columns, including the locking indicator.
- `SopViewer` successfully uses `mammoth` and `DOMPurify` to render and sanitize document content.
- The two-layer query logic is mostly implemented in the library page.

**Bad/Deviations:**
- **Violation of "Never Do" List:** `library/page.tsx` hardcodes the department check `profile.department !== "QA"`. The spec explicitly forbids this and requires checking the `is_qa` flag on the `departments` table (e.g., via the `is_qa_manager` RPC or by fetching the department record).
- **Missing Server Action for Acknowledge:** `AcknowledgeButton` executes a direct `supabase.from('sop_acknowledgements').insert(...)` call from the client rather than using a server action to enforce the `isOwnDept` logic required by the spec.
- **Incorrect "Submit Edit" Behavior in Table:** The spec mandates that the `Submit Edit` button must be disabled (not hidden) for locked SOPs, with a tooltip explaining why. In `SopLibraryTable`, the `DropdownMenuItem` for "Submit Edit" is entirely omitted when `sop.locked` is true.
- **Signed URL verification pending:** The spec requires `fileUrl` for documents to be a 60-minute signed URL generated server-side. Needs to be verified in `library/[id]/page.tsx`.

**Fixes Needed:**
- Remove hardcoded "QA" string in `library/page.tsx` and use a robust `is_qa` check.
- Refactor `AcknowledgeButton` to submit via a server action that verifies `isOwnDept()`.
- Update `SopLibraryTable` to show a disabled `Submit Edit` option with a tooltip for locked SOPs.

## 5. SOP Submission & QA Approval Flow (Phase 5)
**Good:**
- `SopUploadModal` correctly implements the 3-step wizard (Upload -> Meta -> Summary).
- The `/api/storage/sop-upload/route.ts` API route correctly enforces a 25MB limit, `.docx` MIME type validation, and restricts uploads to managers.
- `approvals/[id]/page.tsx` correctly blocks QA managers from approving their own submissions via the `isSelfSubmission` check passed to the client.

**Bad/Deviations:**
- **Critical Security Violation:** Document Storage Bucket. The API route returns a public URL (`getPublicUrl(filePath)`) for uploaded SOPs. The specification stringently stated: "Private bucket (only signed URLs, no public access) - Never expose the Storage key to the client."
- Moreover, it's unconfirmed if the `documents` bucket is properly secured and RLS-protected in the database schema.

**Fixes Needed:**
- Fix the API route to use or assume private buckets, and instead of relying on `getPublicUrl`, the read-layer MUST construct signed URLs on the server.
- Ensure the `documents` bucket exists and is `public: false` in the setup scripts.

## 6. Change Control Center (Phase 6)
**Good:**
- The Change Control detailed view (`change-control-header`, `signature-grid`, `delta-summary-card`) perfectly maps to the specifications.
- Gemini delta summary integration functions well.
- The `waiveSignature` and `signChangeControl` server actions enforce restrictions properly.
- The CRON job `overdue-check` correctly identifies overdue PMs and Change Controls.

**Bad/Deviations:**
- **Incomplete Escalation Logic:** The `overdue-check` CRON job notifies department managers immediately when a CC deadline passes, but it lacks the specific spec rule: "Escalate to QA Manager if overdue by > 3 days." Right now, QA Managers are never specifically escalated to based on the 3-day threshold.

**Fixes Needed:**
- Update `app/api/cron/overdue-check/route.ts` to calculate `days_overdue` and specifically notify the QA Manager when `days_overdue >= 3`.

## 7. Equipment Registry & PM Planner (Phase 7)
**Good:**
- The `/equipment` page and `EquipmentTable` accurately list assets and apply the correct department and RLS filters.
- `AddEquipmentModal` enforces collecting `initial_assignee_id` mapped to the PM PM.
- Equipment details and PM Task logging are well structured.

**Bad/Deviations:**
- **Storage/Display Bug:** For equipment photo uploads and PM task completion photos, the API (`/api/storage/equipment-photo/route.ts`) uploads images to the `documents` bucket. Since the `documents` bucket was strictly set up as private in Phase 1, the `getPublicUrl` returned and stored in the database is essentially a broken link. These images will fail to load with a 400/404.

**Fixes Needed:**
- Either create a designated `public: true` bucket (e.g., `equipment_media`) for these non-sensitive images, OR switch the implementation to generate signed URLs when reading/viewing them. Returning `getPublicUrl` for a private bucket is incorrect.

## 8. Company Calendar (Phase 8)
**Good:**
- The `CalendarGrid` correctly renders a month view with `date-fns` helpers, and overlays pm dates on the correct cells.
- The `UpcomingPanel` shows next 14 days as specified.
- Manual events correctly support `public` and `department` (dept-scoped) visibility.
- The `createEvent` server action auto-assigns `department` based on the current user's profile when `visibility === 'department'`— correct.

**Bad/Deviations:**
- **Missing Role Guard on Event Creation:** The `createEvent` server action does not enforce any role check—all active users can create events. The spec says "Managers & Admins can create manual events". Employees should not be able to create events.
- **Calendar fetches use `serviceClient` with no RLS:** The calendar page uses `serviceClient` and manually adds the OR filter for visibility/department. This bypasses Row Level Security. While the filter is correct, using a privileged client with manual filtering is fragile—it could accidentally leak data if the filter is ever accidentally removed.

**Fixes Needed:**
- Add a `profile.role !== 'manager' && !profile.is_admin` guard in `createEvent` server action to reject the request.
- Consider restricting `NewEventModal` trigger to only show for managers/admins in the UI as well.

## 9. Dashboard & KPIs (Phase 9)
**Good:**
- The `DashboardPage` correctly aggregates 4 KPI cards: Active SOPs, Pending Approvals, PM Compliance %, and SOPs Due for Revision.
- KPI data is correctly scoped: managers/admins/QA see org-wide counts, while employees see only their department.
- All 4 KPI cards use the `NumberTicker` animation component as specified.
- The Realtime subscription on `audit_log` using `supabase.channel` is correctly implemented for a live Activity Feed.
- Upcoming PM Tasks section correctly queries `pm_tasks` ordered by due date ascending.

**Bad/Deviations:**
- **Unscoped Audit Feed for Dashboard:** The `DashboardPage` fetches the `audit_log` via `serviceClient` with NO department filter. This means employees see the entire organization's activity feed, not a scoped feed for their own department as specified. The spec states: "Activity Feed scoped to user's department".
- **Upcoming PM Tasks unscoped:** Similarly, `upcomingPmTasks` is fetched company-wide via `serviceClient` with no department scope, revealing other departments' PM tasks to non-admin employees.

**Fixes Needed:**
- Add `.or('actor_id.eq.${user.id},entity_type.eq.sop,...')` or a join to filter `audit_log` entries by the user's department for non-admin employees.
- Scope `pm_tasks` query by department for non-admin/non-manager users.

## 10. Reports & Audit Log (Phase 10)
**Good:**
- All 5 report types are implemented: SOP Change History, Worker Acknowledgements, PM Completion Log, Pulse/Notice Log, and AI Risk Insights.
- CSV export is implemented on each report via a client-side `buildCsv()` function.
- Date range filtering (from/to) works across all reports via the shared `useReportStore`.
- Role-based access enforcement (`canAccess`) is implemented in `ReportsClient` to restrict report visibility.
- The Gemini AI risk insights route correctly gathers auditlog, pending CCs, and overdue PMs to form a contextual prompt.
- The AI route gracefully falls back to static insights when `GEMINI_API_KEY` is not configured.

**Bad/Deviations:**
- **Reports are fetched client-side via browser Supabase client:** All report data (e.g., `SopChangeHistoryReport`) queries Supabase directly from the browser using `createClient()`. This bypasses RLS since the client has user JWT-level access, but also means sensitive data (like `audit_log`) is fetched in the browser rather than server-side. This is a data-exposure risk.
- **No server-side access guard on `/reports` route:** The `ReportsPage` server component does check `isQa || isAdmin` (`canAccessReports`) but **does not redirect or gate access** if `canAccessReports` is `false`. It just passes the booleans to the client. A regular manager navigating to `/reports` would render the full `ReportsClient` with most reports disabled but the route itself is not protected.

**Fixes Needed:**
- Add a `if (!canAccessReports) { redirect('/dashboard') }` guard to `ReportsPage`.
- Move report data fetching to server-side API routes or server components, rather than querying Supabase directly from the browser.

---

## Overall Code Quality, Modularity & Architecture

### ✅ Strengths
- **Consistent Architecture:** All pages follow the server-component-fetches-then-passes-to-client pattern. Good separation of data loading and rendering.
- **Server Actions Pattern:** Heavy use of `'use server'` actions in `/actions/*.ts` files for mutations. This keeps mutation logic server-side and avoids exposing internals to the client.
- **Type Safety:** `types/app.types.ts` provides centralized TypeScript types used throughout the codebase.
- **Reusable UI Components:** `DeptBadge`, `StatusBadge`, `NumberTicker` are well-extracted and reused across multiple features.
- **Audit Logging:** Almost every meaningful mutation writes to `audit_log`, which is excellent for compliance.
- **Graceful Fallbacks:** Gemini API calls have fallback responses when the API key is missing.

### ⚠️ Issues & Technical Debt

| #   | Issue                                                       | Severity     | Location                                    |
| --- | ----------------------------------------------------------- | ------------ | ------------------------------------------- |
| 1   | Missing root `middleware.ts`                                | **Critical** | Project root                                |
| 2   | SOP documents bucket returns public URLs for private bucket | **Critical** | `/api/storage/sop-upload`                   |
| 3   | Equipment photos return public URLs for private bucket      | **High**     | `/api/storage/equipment-photo`              |
| 4   | Dashboard audit feed not scoped by department               | **High**     | `dashboard/page.tsx`                        |
| 5   | `createEvent` allows all roles to create events             | **High**     | `actions/events.ts`                         |
| 6   | `/reports` route has no server-side access gate             | **High**     | `reports/page.tsx`                          |
| 7   | `AcknowledgeButton` calls DB directly from client           | **Medium**   | `components/library/acknowledge-button.tsx` |
| 8   | Hardcoded `"QA"` string in library page                     | **Medium**   | `library/page.tsx`                          |
| 9   | `SetupPage` does not check `has_any_admin()` server-side    | **Medium**   | `app/(auth)/setup/page.tsx`                 |
| 10  | CRON job missing 3-day escalation to QA Manager             | **Medium**   | `/api/cron/overdue-check`                   |
| 11  | Notice threading (thread_depth) not implemented             | **Medium**   | `components/pulse/`                         |
| 12  | PulseItem type-specific renderers incomplete                | **Medium**   | `components/pulse/pulse-item.tsx`           |
| 13  | PM Task Upcoming list not scoped by department              | **Medium**   | `dashboard/page.tsx`                        |
| 14  | Widespread use of `any` type in component props             | **Low**      | Multiple files                              |
| 15  | TopNav notification bell is static (no real unread count)   | **Low**      | `components/shell/top-nav.tsx`              |

### 📊 Long-term Maintainability Assessment

**Overall: B+ (Good foundation, key security fixes needed)**

- **Modularity:** Good. Components are broken into logical folders. Server actions separate concerns well.
- **Scalability:** Medium. The client-side Supabase queries in report components will not scale well and should be replaced with API routes.
- **Security:** Needs improvement. The private bucket + public URL issue is a significant flaw that could expose confidential SOP documents. The missing middleware route guard is also a critical gap.
- **Test Coverage:** No tests detected. Zero test files found. For a compliance system this is a serious gap.
- **Documentation:** No JSDoc or inline documentation detected beyond standard variable names.
- **Error Handling:** Generally good in server actions. Client-side components have inconsistent error display — some suppress errors silently in catch blocks.

### 🔧 Priority Fix Order
1. Fix storage bucket configuration (public vs. signed URLs) — affects SOPs, equipment photos, signatures
2. Create root `middleware.ts` for routing guards
3. Add `has_any_admin()` check to `/setup` page
4. Scope dashboard audit log and PM tasks by department
5. Add role guard to `createEvent`
6. Add access gate redirect to `/reports` route
7. Refactor `AcknowledgeButton` to use server action
8. Remove hardcoded `"QA"` string from library page
9. Add 3-day QA escalation to overdue-check CRON
10. Implement Pulse notice threading

