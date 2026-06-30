# Training Domain Audit

Scope: training modules, assignments, questionnaires, slides, certificates, AI generation, exports, CC training release.

Overall: the core take→grade→pass→certificate loop is genuinely wired (real scoring, real jsPDF certificate, real pptx/pdf export, real AI generation via `generateJson`). The serious problems are at the workflow boundaries: the SOP-change-control training gate is effectively a dead-end, the `needs_review` flag can never be cleared, and several status/UX details lie or don't reconcile.

---

## CRITICAL

### C1. CC "training-required" gate is a deadlock — you cannot create the training a SOP is waiting on
- Location: `actions/training.ts:60-68` (createTrainingModule) + `app/(dashboard)/training/page.tsx:39-44` (only `status='active'` SOPs offered) vs `supabase/migrations/053_cc_package_lifecycle.sql:167-176` / `052_cc_status_unification.sql:144-164` (CC sets SOP to `approved_pending_training`).
- What's wrong: When a Change Control reconciles a training-required SOP, the SOP goes to `status = 'approved_pending_training'` (NOT `active`) and `training_required = true`. The CC then sits at `pending_training` and can only be released once `training_completion_threshold` of assignments are `completed` (`actions/change-control.ts:444-465`, `actions/sop.ts:700-726`). But to create the module those trainees must complete, `createTrainingModule` hard-rejects any SOP whose `status !== 'active'` (`training.ts:66`), and the Create-Module SOP dropdown only loads `status='active'` SOPs (`page.tsx:41`). So for the *new revision* there is no way to author/assign training. The only training that can exist is one created against the *previous active* version — and `startAttempt` stamps `sop_version` from the module (`training.ts:379,418`), so trainees would be certified against the old revision while the gate waits forever.
- Real-world impact: A revised SOP that requires retraining can never go effective through the intended flow. The whole `pending_training` CC lifecycle stalls. This is the headline "looks finished, isn't wired" failure for this domain.
- One-line fix: Allow `createTrainingModule` and the SOP picker to accept `approved_pending_training` SOPs (and have `startAttempt` snapshot the pending revision), or auto-provision a module when a SOP enters `approved_pending_training`.

### C2. `needs_review` can be set but never cleared — permanent destructive badge, no review UI
- Location: set only in `supabase/migrations/037_training.sql:244-245` (trigger). Read in `components/app-sidebar.tsx:212-216`, `training-client.tsx:34,108`, `module-detail-client.tsx:79-81`. No code anywhere sets it back to `false` (grep of `needs_review` across repo confirms zero writes outside the trigger).
- What's wrong: When a linked SOP's version changes, every published module is flagged `needs_review = true` with a pulsing destructive "SOP Needs Review" badge and a manager/QA sidebar count. There is no "Mark Reviewed", no clear-on-regenerate, no action of any kind to turn it off. Regenerating slides/questionnaire (`generate-slides`/`generate-questionnaire`) does not touch the flag.
- Real-world impact: Once any SOP revises, the affected modules are permanently stuck showing "needs review" and the Training Hub sidebar badge never returns to zero. Managers learn to ignore a compliance signal — exactly the silent-failure pattern to avoid.
- One-line fix: Add a `markModuleReviewed(moduleId)` server action (creator/QA only) that sets `needs_review = false` + logs it, and surface a "Mark Reviewed" button on the flagged module; optionally clear it automatically when content is regenerated against the new version.

---

## HIGH

### H1. "Go to Certificate" button does not go to a certificate
- Location: `app/(dashboard)/training/[id]/questionnaire/[qid]/questionnaire-page-client.tsx:386-393` — on pass, the button labeled "Go to Certificate" calls `onReturn`, which is `() => router.push('/training/my-training')` (line 169).
- What's wrong: After passing, the prominent green "Go to Certificate" CTA just dumps the user on the My Training list. They then have to find the completed card and click a second "Certificate" button to actually open the cert modal. The label promises a destination it doesn't deliver.
- Real-world impact: Confusing dead-feeling success state; users think the certificate failed to generate.
- One-line fix: Either relabel to "Back to My Training", or push to the cert (e.g. deep-link that opens the certificate modal / `/api/training/certificate?attemptId=...`).

### H2. Failed attempt resets assignment to `not_started` — destroys in-progress signal and corrupts manager metrics
- Location: `actions/training.ts:513-516` (submitAttempt fail branch sets status `not_started`).
- What's wrong: On a failing submission the assignment goes back to `not_started`, not `in_progress`. The manager module view (`module-detail-client.tsx:52-55`) computes "In Progress" / "Not Started" / "Completion Rate" straight off `status`, so a trainee who has actively attempted and failed is indistinguishable from someone who never opened the module. The My Training card also then shows "Not Started" / "Start" (0%) for someone who already tried (`my-training-client.tsx:29-38,119`).
- Real-world impact: Managers and the CC training-completion gate (which counts `status='completed'` over total) can't see who is stuck failing. A persistent failer looks like a no-show. Progress %/counts don't reconcile with reality.
- One-line fix: On fail, set status to `in_progress` (or a dedicated `failed`) rather than `not_started`.

### H3. Manager assignment stats reconcile only against the loaded page, and the CC gate counts unfiltered statuses
- Location: `module-detail-client.tsx:52-55`; gate math in `actions/change-control.ts:454-463` and `actions/sop.ts:712-720`.
- What's wrong: The completion-rate gate is `completed / total assignments` with no exclusion of inactive/soft-deleted users or stale assignments, and (combined with H2) `completed` is the only terminal state. Because offboarding only flips `profiles.is_active=false` (per CLAUDE.md soft-delete), assignments for deactivated users still count in the denominator, so the threshold can become permanently unreachable (e.g. an assignee who left mid-cycle keeps the rate below 80%).
- Real-world impact: CC training gate may be impossible to satisfy after any assignee is offboarded; "Completion Rate" card overstates the outstanding pool.
- One-line fix: Filter assignments to active assignees when computing completion (`join profiles … is_active = true`) in both gate checks and the stat cards.

---

## MEDIUM

### M1. Demo-mode mock AI silently produces a fake, all-identical questionnaire that can be published & graded
- Location: `app/api/training/generate-questionnaire/route.ts:48-53,134-146` and `generate-slides/route.ts:50-55,129-147`.
- What's wrong: If `NEXT_PUBLIC_DEMO_MODE === 'true'`, generation returns canned questions ("Demo Question N: What is the primary safety protocol…", correct answer always "Wear PPE") and a 2-slide deck — with no UI indication it's mock. The toast still says "Generated N questions!". These can be published and trainees graded against them.
- Real-world impact: If demo mode is ever left on in a real environment, people get certified on garbage with no visible warning. It's a `NEXT_PUBLIC_` flag, so it's client-exposed and easy to misconfigure.
- One-line fix: Surface a clear "DEMO CONTENT" banner when `mode==='demo'` is returned, and/or block publish on demo-generated questionnaires.

### M2. Short-answer / fill-blank questions are never graded but count toward nothing — silent partial assessment
- Location: `actions/training.ts:489-501` — non-MC/TF questions get `is_correct = null`, are excluded from `mcTfTotal`, and never enter the score; there is no manual-review queue.
- What's wrong: A questionnaire can be published with short-answer questions (the editor offers them, `questionnaire-editor.tsx:91-92`). A trainee answers them, but they contribute zero to scoring and no reviewer is ever prompted to mark them. If a questionnaire were *all* short-answer, `mcTfTotal===0` → score 0, auto-fail forever (handled at `training.ts:500-501`, but the trainee can never pass).
- Real-world impact: Free-text questions are decorative; assessment silently ignores them. An all-free-text quiz is unpassable with no explanation.
- One-line fix: Either block publishing questionnaires that lack ≥1 auto-gradable question, or build the promised manual-review/marking flow.

### M3. Module can be published, assigned, then orphaned of its questionnaire — "Questionnaire Missing" dead card
- Location: `my-training-client.tsx:114-116,189-194` (`latestQ` may be undefined → "Questionnaire Missing", no Start button).
- What's wrong: Publishing requires ≥1 published questionnaire (`training.ts:135-137`), but nothing prevents later states where the assignee's module has no *published* questionnaire surfaced (e.g. only drafts visible, or version filtering). The trainee just sees a red "Questionnaire Missing" with no path forward and no way to flag it.
- Real-world impact: Assigned trainee is stuck with a mandatory item they cannot start; no self-serve recourse.
- One-line fix: Guarantee at least the published questionnaire is always returned for assignees, and show a "report issue"/contact action instead of a dead end. (needs verification of exact trigger conditions)

### M4. `assignTrainees` upserts with `ignoreDuplicates` but reports the full requested count as "assigned"
- Location: `actions/training.ts:236-292` (returns `assigned: validAssigneeIds.length`); pulses/log rows are generated for *all* valid ids even those already assigned.
- What's wrong: Re-assigning a set that overlaps existing assignees re-sends "New Training Assigned" pulses and writes duplicate `trainee_assigned` log rows for people who were already assigned, and the success toast count includes them.
- Real-world impact: Trainees get duplicate notifications; audit log over-counts assignments; QA "X assigned Y trainees" pulse is inflated.
- One-line fix: Diff against existing assignments first (or use the upsert return rows) and only notify/log/count genuinely new assignees.

---

## LOW

### L1. Fake progress simulation implies real AI progress
- Location: `questionnaire-editor.tsx:157-167`, `slide-deck-editor.tsx:73-90` — `startProgressSim` animates a bar to 92% on a timer unrelated to actual generation.
- What's wrong: The "AI is analyzing the SOP… 47%" bar is purely cosmetic; it advances even if the request has stalled. Minor honesty issue.
- One-line fix: Label it indeterminate, or drive it from real streaming progress.

### L2. Comment vs behavior drift in `CertificateModal`
- Location: `my-training-client.tsx:292-296,57-60` — comments reference `html2canvas` DOM capture; the actual download is the server jsPDF route. The on-screen `CertificateContent` is a separate render that can drift from the PDF layout.
- What's wrong: Two independent certificate renderers (DOM preview vs jsPDF) with no shared source; "Authorized System / SOP Manager" signature is a placeholder, not a real signatory. Stale comments mislead maintainers.
- One-line fix: Remove dead html2canvas comments; note the preview is illustrative; consider a real signing authority field.

### L3. `recordPaperCompletion` always writes score 100
- Location: `actions/training.ts:587-591` — paper-recorded completions are hardcoded `score: 100, passed: true`.
- What's wrong: A paper completion may have a real (passing-but-not-perfect) score; the certificate then prints "100.0%" for everyone recorded on paper.
- One-line fix: Accept an optional recorded score, default to the passing threshold rather than 100.

---

## Verified-OK (not findings)
- Scoring is real and graded against the canonical question set, not the submitted answers (`training.ts:468-501`) — the obvious "answer 1/10 = 100%" bug is explicitly guarded.
- Certificate is a real branded jsPDF, gated to the owner and to passed attempts (`api/training/certificate/route.ts:56-61`).
- Questionnaire PDF and PPTX exports are real (jsPDF / pptxgenjs).
- AI generation is real via `generateJson` (Gemini), with demo mock behind a flag.
- Retake path works: partial unique index only blocks concurrent open attempts (`038_training_retakes.sql`); `startAttempt` reuses in-progress, blocks after a pass, allows retake after fail (`training.ts:393-410`).
- Published questionnaires are locked draft-only for edits (server + RLS).
