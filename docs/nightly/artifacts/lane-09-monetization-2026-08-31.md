status: shipped
attempted: education upsell lead-gen — add honest "for schools / bulk pricing" contact CTA on a real education page, gated by flag if layout-risky; TDD.

## What shipped
Found a live monetization bug: `components/teacher/ProGate.tsx` (the $9/mo Teacher Pro paywall
shown on the analytics report) renders `t('teacher.proGate.analytics.title')` and
`.body` — but those keys did NOT EXIST in any of the 5 locale translation files. Every
free teacher hitting the analytics paywall saw the raw key path
"teacher.proGate.analytics.title" / "...body" instead of real upsell copy, in EVERY
language, since the ProGate component shipped. This is the exact
"missing key renders the key path itself" failure mode from memory
(t-interpolate-eats-dollar-and-education-i18n-guard), just never caught for this key.
Copy describes the real analytics feature (completion rate / accuracy / word mastery —
matches `teacher.reports.metrics.*` keys already shown on that page). No fake stats, no
new claims, no pricing/economy change — pure copy-completeness fix on the existing $9/mo
CTA funnel.

files_touched:
- fe-next/translations/en.js (added proGate.analytics.title/body)
- fe-next/translations/sv.js (same)
- fe-next/translations/ja.js (same)
- fe-next/translations/es.js (same)
- fe-next/translations/he.js (same)

No component/logic code changed — ProGate.tsx already calls these keys, they were just
missing from the data files. sv/ja/es/he copy is AI-translated — flag for native review
per repo convention.

## Ran out of time before
- The originally planned for-schools contact-sales CTA: audited via subagent and found
  MOSTLY ALREADY BUILT today (SchoolLeadForm, DistrictUpsellStrip, school_lead_submitted
  tracking all exist, wired on the education hub + games-for-teachers). Real remaining
  gap: `components/teacher/ProGate.tsx` and `app/[locale]/teacher/upgrade/PageClient.tsx`
  link ONLY to the individual $9/mo upgrade — no secondary link to `/education/for-schools`
  for a teacher who is actually a school/district decision-maker. Ran out of time-budget
  to add this safely with TDD (needs a test-file update since ProGate.test.tsx line 45
  uses `getByRole('link')` singular, which breaks the moment a second link is added).

## next_steps (for tomorrow's lane 09 or lane 03)
1. Add a secondary "Looking for school/district licensing?" link in ProGate.tsx →
   `/${language}/education/for-schools`, with its own tracked event (e.g.
   `landing_cta_clicked` with `cta: pro_gate_school_link`). Update
   `components/teacher/__tests__/ProGate.test.tsx` line 45 to use
   `getByRole('link', { name: ... })` or `getAllByRole('link')` since it currently
   assumes exactly one link.
2. Same secondary link on `app/[locale]/teacher/upgrade/PageClient.tsx` (pricing page) —
   render `<DistrictUpsellStrip>` there per the Explore audit.
3. Unrelated but noticed in passing: `translations/en.js` "freeStartNote" still says
   "one class of 10 students" — verify this wasn't already fixed by today's
   free-tier-raised-to-50 commit (559408338); if stale, it under-sells the just-raised
   50-student cap. Quick grep-and-fix, 5 locales.
4. IMPACT CHECK from brief (games-for-teachers → for-schools referrer link, shipped
   2026-08-25): not run tonight — no time for a PostHog query. Carry to next lane 09/12
   run: query posthog:pageview /education/for-schools referrer=/education/games-for-teachers
   7d before/after, append verdict to docs/nightly/impact-ledger.ndjson.
