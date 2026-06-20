status: shipped
attempted: add click analytics to TeacherAccessCTA — closes teacher→lead funnel gap in PostHog

## What shipped

Added `trackGrowthEvent('education_cta_clicked', { cta: 'teacher_access' | 'district_upsell' })` to both
links in `components/education/TeacherAccessCTA.tsx`. This component is on the high-intent
`/education/games-for-teachers` page (targeting "word games for teachers" SEO cluster).

TDD: 2 new test cases added (RED → GREEN). All 5 tests pass. eslint clean.

files_touched:
  - fe-next/components/education/TeacherAccessCTA.tsx
  - fe-next/components/education/__tests__/TeacherAccessCTA.test.tsx

## Revenue context (orientation findings)

Education monetization stack is MORE built than the brief suggested:
- SchoolLeadForm: form → /api/education/school-lead → school_leads table + email to lexiclash.game@gmail.com
- DistrictUpsellStrip: wired in education/PageClient.tsx with impression events
- TeacherAccessCTA: on games-for-teachers — both CTAs present, was missing click analytics (now fixed)
- DistrictUpsellBanner: wired in teacher/PageClient.tsx

The for-schools lead pipeline is end-to-end. Tonight closed the telemetry gap.

## next_steps

1. Check PostHog for education_cta_clicked after first prod traffic — baseline the funnel:
   page_view → education_cta_clicked → school_lead_form_viewed → school_lead_submitted
2. Check school_leads table row count — if zero, pipeline may be silently broken (RLS).
   Query: SELECT count(*), max(created_at) FROM school_leads;
3. IAP interest probe (deferred) — wire iap_viewed event + "Remove ads / Support us" modal
   behind a PostHog flag to measure demand before building real billing. ~1h of work.
4. AdSense re-submit — structural quality bar cleared; manual op for founder.
