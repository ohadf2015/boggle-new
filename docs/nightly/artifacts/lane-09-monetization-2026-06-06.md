---
status: shipped
attempted: Education upsell lead-gen — add individual teacher mailto CTA above district strip on /education page
files_touched:
  - fe-next/components/education/DistrictUpsellStrip.tsx
  - fe-next/components/education/__tests__/DistrictUpsellStrip.test.tsx
  - fe-next/translations/en.js
  - fe-next/translations/es.js
  - fe-next/translations/he.js
  - fe-next/translations/sv.js
  - fe-next/translations/ja.js
next_steps: |
  Monitor PostHog education_upsell_impression{cta:teacher_individual} + landing_cta_clicked{cta:teacher_individual}.
  Consider Supabase-backed email-capture form to replace mailto (higher conversion).
  Provision ADMOB_API_TOKEN for richer revenue briefs.
---

Upgraded DistrictUpsellStrip from single district-only CTA to dual-CTA strip.
Teacher individual (lime): free access path for any teacher via mailto.
District/bulk (purple): existing CTA unchanged.
All 5 locales. TDD: 4 new tests.
