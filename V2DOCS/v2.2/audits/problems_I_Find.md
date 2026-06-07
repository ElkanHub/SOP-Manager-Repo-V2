Architectural, design-critical, or security-sensitive tasks
These require deeper reasoning, schema changes, new flows, or decisions that affect the integrity of the system. Do not give these to Flash.

1. Change Control traceability — CC numbering system
Every Change Control needs a unique, human-readable reference number in the format CC-1.1, CC-1.2, CC-2.1 etc. This is not cosmetic — it is the audit trail backbone. Requires a schema addition, a number generation function, and updates to every place a CC is referenced or displayed.

2. CC draft versioning with CC numbers not version numbers
When a Manager submits multiple drafts before QA approves, each draft round should be tracked under the CC number (CC-1.1 first submission, CC-1.2 resubmission after changes requested, etc.) rather than version numbers. This clarifies the review thread and makes the audit trail unambiguous. Requires changes to sop_approval_requests, the approval view, and the Change History report.

3. [x] Specimen tab in Settings — signatures and initials (Admin only)
A new tab in Settings showing every active user's full name, their stored signature image, and their initials signature. Admin only. Requires a new tab, a query across all active profiles with signature URLs, and a clean display layout. Security consideration: ensure the RLS on this view is tight — only Admins can access this data.

4. Approval locking — one reviewer at a time
When a QA Manager opens an approval, it should be locked to them. Other QA Managers see "Being reviewed by [name]" and can view details but cannot take action. The lock releases when the reviewer closes the page, approves, or requests changes. Requires a review_lock mechanism on sop_approval_requests (reviewer_id, locked_at columns), a presence/heartbeat system to release stale locks, and RLS/server action enforcement. The full lock history is visible in Reports. This is a concurrency control problem and needs careful thought.

5. [x] Waiting room between signup and onboarding
A new approval layer between account creation and onboarding access. After signup the user lands on a waiting room page — they cannot proceed to onboarding until an Admin explicitly grants them access. The user sees a clear message that their access is pending and that they will receive an email when approved. Admins see pending signups in a new section of Settings → Users. Granting access sends the email and allows the user through to onboarding. Requires a new signup_status field on profiles (pending / approved), middleware updates, a new waiting room page, Admin UI for the pending list, and an email trigger. This sits across auth, middleware, settings, and email — it touches many parts of the system simultaneously.

6. [x] PM scheduling fix — tasks and calendar alignment
The PM planner is incorrectly scheduling tasks and the dates are not reflecting accurately on the calendar. This needs a careful audit of calculate_next_due(), the trigger that creates subsequent tasks after completion, the next_due computation logic, and how the calendar reads equipment dates. A debugging and logic correction task that requires reading the DB functions carefully and tracing the data through the system.