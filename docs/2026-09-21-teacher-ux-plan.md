# Teacher module UX: vetted improvement plan (2026-09-21)

Source: three parallel audits (code walk of all 5 teacher tabs, PostHog behaviour with a `$host` filter,
and external practice from Blooket, Kahoot, Wordwall, Gimkit and Quizlet Live), then merged and ranked.
Raw output: `/tmp/edu-gauntlet/teacher-ux/PLAN.raw.md`. This file keeps only the claims that survived checking.

## Numbers that did NOT survive checking (do not cite)
- **"94% drop from onboarding step 0 to step 1."** This is how the event is instrumented, not real
  behaviour. `TeacherOnboarding` fires `edu_teacher_onboarding_step` only for step 0 (view/skip) and step 4
  (complete). There is no step-1 event, so every teacher "drops" at step 1.
- **"Teachers bypass the module 33×" (classroom-game 1,151 vs /teacher 35).** `/education/classroom-game`
  also serves the guest demo that the old "PLAY NOW — NO SIGN-UP" hero sent every visitor to. That traffic
  is guests and students, not teachers skipping the dashboard.
- **"100% instant bounce" and "20% Hebrew rageclick rate."** A 0-second session everywhere points to a
  tracking artifact. With 35 teachers in total, per-language percentages come from a handful of people.

## Solid numbers
- 35 distinct users reached `/teacher` routes in 60 days. Reports was opened by 2 of them.
- The closed Tools `<details>` drawer hides features. Impressions went 54 → 12 → 3 → 0 (memory:
  teacher-tools-drawer-phantom-paywall-2026-09-17).

## Do now (small, verified against source by the builder before changing anything)
1. The **"Last game"** shortcut renders when no game exists, and clicking it does nothing (a silent no-op).
2. **Icon-only buttons with no label** (copy/share/edit/delete code, show/hide words): add aria-label and title.
3. **Empty classroom card**: show "No students yet — share the join code" instead of a bare 0.
4. **One name for the Lessons tab**: the nav label, the page title and the browser title currently differ.
5. **Plain teacher words**: the first-run "Activate your class" wording implies students can't join yet.
   *Go Live → Start Game* is a product copy call and is listed under Later.

## Next (medium)
- Move **Past games** (LastGameInsights, already built) out of the closed Tools drawer and onto Reports.
- **Play these words now** on Reports and the digest, next to the 14-day reteach: reuse
  `writeQuickLaunchIntent` + the express lobby.
- **Student report actions**: "Assign practice" and "Copy words" on a struggling student's word list.
- **Mobile classroom card**: 4 cramped action buttons become one ⋮ menu below 640px (44px targets).
- **Onboarding instrumentation**: emit a real per-step event before anyone optimises that funnel again.

## Later / needs a product decision
- Rename GO LIVE → Start Game (brand voice vs. teacher vocabulary).
- Adoption tracking for Reports, Lessons and Classes once the items above ship.
- A proper Hebrew RTL walkthrough of the teacher tabs (small sample, but worth a manual pass).
