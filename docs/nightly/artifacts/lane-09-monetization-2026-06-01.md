---
status: shipped
attempted: add education upsell lead-capture CTA on teacher/education page (contact-sales mailto + 5 locales, TDD)
files_touched:
  - fe-next/components/education/DistrictUpsellStrip.tsx (new)
  - fe-next/components/education/__tests__/DistrictUpsellStrip.test.tsx (new, 3/3)
  - fe-next/app/[locale]/education/PageClient.tsx (import + render)
  - fe-next/translations/en.js (education.landing.districtCta.*)
  - fe-next/translations/es.js (education.landing.districtCta.*)
  - fe-next/translations/he.js (education.landing.districtCta.*)
  - fe-next/translations/sv.js (education.landing.districtCta.*)
  - fe-next/translations/ja.js (education.landing.districtCta.*)
next_steps: |
  - Monitor landing_cta_clicked { cta: district_upsell } events in PostHog for demand signal
  - Add a simple Supabase-backed inquiry form (name/email/school/classrooms) at /education/district
    so leads are captured server-side, not just mailto-clicked (current mailto = zero data if
    user's email client doesn't open)
  - Consider A/B test: mailto vs. embedded mini-form with Supabase write
  - Revenue data: founder should run pull-revenue-snapshot.sh + provision ADMOB_API_TOKEN
    for unattended revenue collection (AdMob brief was stale this run)
  - es/sv/he/ja strings are AI-generated — flag for native review before scaling traffic
---

## What shipped

New `DistrictUpsellStrip` component rendered at the bottom of the education landing page
(unauthenticated / non-teacher view only, after `TeacherAccessCTA`).

Shows: "For schools & districts — Running 5+ classrooms? Ask us about bulk & district pricing."
with a mailto CTA to lexiclash.game@gmail.com, subject "District Pricing Inquiry".

Fires `landing_cta_clicked { cta: 'district_upsell' }` PostHog event on click, so
tomorrow's brief can measure demand without any backend.

TDD: RED (import fail) → GREEN (3/3). tsc0. No build gate run (orchestrator does that).
No coin economy / ad frequency / payment logic touched. No existing free features paywalled.
