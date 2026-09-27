status: shipped
files_touched:
  - fe-next/app/[locale]/teacher/PageClient.tsx
  - fe-next/app/[locale]/teacher/__tests__/PageClient.test.tsx
  - fe-next/translations/en.js
  - fe-next/translations/es.js
  - fe-next/translations/he.js
  - fe-next/translations/sv.js
  - fe-next/translations/ja.js

impact_check: 09-monetization-2026-07-18-upgrade-page-iap-viewed
  verdict: neutral
  measured: 0 (product=teacher_pro filter); 4 events from /profile (product='' — SupporterInterestCard)
  root_cause: /teacher/upgrade had ZERO inbound links anywhere in the app → 0 page visits
  fix_shipped: upgrade CTA banner added to teacher dashboard for non-admin teachers

change_summary: >
  Added "Upgrade to Pro" / "Unlock unlimited classes & students" CTA banner in
  TeacherDashboardInner (teacher PageClient) visible to non-admin teachers.
  Links to /{locale}/teacher/upgrade (Lemon Squeezy checkout). Fires
  iap_viewed{product:teacher_pro, source:dashboard_banner} on click.
  Translations in all 5 locales. TDD: test file at
  app/[locale]/teacher/__tests__/PageClient.test.tsx (2 cases: teacher sees
  link, admin does not).

revenue_research:
  - school_lead_form_viewed: 2 events in 30d (extremely low — discovery problem not broken infra)
  - school_lead_submitted: 0 (never submitted; API+email+DB all fully built)
  - teacher/upgrade inbound links before tonight: ZERO
  - for-schools page visits: 2/30d — same discovery problem

next_steps: >
  1. Verify iap_viewed with source=dashboard_banner appears in PostHog after next teacher login
  2. Consider adding "Get school pricing" CTA on the main /education page above the fold (Lane 08 territory)
  3. If /teacher/upgrade visits still 0 after 3d, check teacher user count is nonzero
  4. school_lead_form_viewed baseline: 2/30d — tomorrow verify traffic came from new CTA path
