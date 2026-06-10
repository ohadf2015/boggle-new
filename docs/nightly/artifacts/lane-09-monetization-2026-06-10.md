status: shipped
attempted: add district upsell banner to teacher dashboard (5 locales, TDD, links to existing for-schools lead form)

files_touched:
  - fe-next/components/teacher/DistrictUpsellBanner.tsx (new — pure presentational banner)
  - fe-next/components/teacher/__tests__/DistrictUpsellBanner.test.tsx (new — 4 TDD tests)
  - fe-next/app/[locale]/teacher/PageClient.tsx (wired banner above TeacherDashboard)
  - fe-next/translations/en.js (teacher.districtBanner.text/cta)
  - fe-next/translations/he.js (teacher.districtBanner.text/cta — Hebrew RTL)
  - fe-next/translations/sv.js (teacher.districtBanner.text/cta — Swedish)
  - fe-next/translations/ja.js (teacher.districtBanner.text/cta — Japanese)
  - fe-next/translations/es.js (teacher.districtBanner.text/cta — Spanish)

what_shipped:
  - Neo-lime banner strip above TeacherDashboard for authenticated teachers
  - Text: "Managing multiple classrooms or a whole school?"
  - CTA links to /{locale}/education/for-schools (existing SchoolLeadForm)
  - PostHog autocapture attribute: data-ph-capture-attribute-source="teacher_district_banner"
  - 4 unit tests (text renders, link href locale-aware, PostHog attribute)

revenue_rationale:
  - for-schools page has SchoolLeadForm but teacher/* had zero upsell path
  - Teachers who reached the dashboard are the highest-intent district leads
  - CTA funnels to existing lead form — no new backend needed
  - PostHog will surface teacher_district_banner click rate in next brief

next_steps:
  - Monitor PostHog for teacher_district_banner click events in next 7d
  - If click rate >5%, consider adding same CTA to teacher/curriculum and teacher/reports pages
  - Revenue data snapshot stale — founder should run scripts/nightly/lib/pull-revenue-snapshot.sh
  - AdSense E-E-A-T gap (no author bylines) blocks web ad approval — Lane 08 owns this
  - rewarded_ad_watched = 0/24h per brief — investigate Android rewarded ad surface triggering
  - offerwalls (ayeT/CPX) still dark; zero offerwall PostHog events — no action (economy guardrail)
