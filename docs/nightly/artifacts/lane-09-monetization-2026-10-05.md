status: research-only
attempted: education upsell lead-gen CTA on /education hub (schools/bulk pricing contact)
files_touched: none

## Correction to lane brief
The brief's "known surface" claimed education pages have NO pricing/lead-capture
anywhere. FALSE as of tonight — verified a complete, already-shipped pipeline:
- `components/education/landing/LandingSchoolLead.tsx` rendered directly on the
  `/education` hub (`app/[locale]/education/PageClient.tsx`) with inline
  `SchoolLeadForm` (expand-on-click, tracked via `landing_cta_clicked`).
- `components/education/DistrictUpsellStrip.tsx` also rendered on `/education/access`
  and via `EducationLandingTemplate` across SEO landing pages.
- `/education/for-schools` page.tsx has explicit pricing copy (Teacher Pro $9/mo,
  Classroom $39/term, school/district contact).
- Submit path: `POST /api/education/school-lead` → `school_leads` table → instant
  notify + `app/api/cron/school-leads-digest` (weekly Mon 07:00 UTC digest email to
  founder). Checked the cron route end-to-end: errors are logged, Sentry-captured,
  and surfaced in the response — not a Class-4 silent failure.
- `lib/education/pro/askSchool.ts` + `app/api/admin/school-leads` admin view also exist.

Building a new CTA tonight would have duplicated this shipped work (see memory
`parallel-proposal-worktrees-duplicate-work-2026-10-04` — same failure mode).

## Ranked backlog for tomorrow (not done tonight — time budget)
1. **Verify the lead pipe is actually healthy, not just well-coded.** Query
   `school_leads` row count (last 30d) + confirm the Monday digest cron has fired
   recently (cron logs / Sentry). A perfectly-written pipeline with zero real
   submissions is a discoverability problem, not a code problem — check funnel
   volume into the hub's `#school-quote` section via PostHog
   (`landing_cta_clicked` cta=education_school_quote) before building anything new.
2. **Ad-UX**: brief shows `rewarded_ad_watched` 0/24h (7d avg also 0) — before
   touching ad placement, confirm `rewarded_ad_offered` is actually firing anywhere
   (grep `trackGrowthEvent('rewarded_ad_offered'`). If offered=0 too, this is an
   instrumentation gap, not a demand problem — cheap, safe fix for a future lane.
3. **IAP/subscription IAP interest-probe experiment** (from brief's option 3) —
   still untried; genuinely novel vs tonight's findings, good candidate for next run.
4. Revenue snapshot (`revenue-latest.json`) + AdMob API token: still absent per
   brief note — founder action, not autonomous.

next_steps: tomorrow's lane 09 should start from item 1 (verify pipe health via
PostHog/Supabase query) instead of re-proposing lead-gen UI — the UI is done.
