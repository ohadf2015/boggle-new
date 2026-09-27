status: shipped
attempted: Wire DistrictUpsellStrip (dual teacher+district lead CTA) onto esl-word-games and vocabulary-games-classroom pages — both had TeacherAccessCTA (individual-only) with no path to the qualified school lead form
files_touched:
  - fe-next/app/[locale]/education/esl-word-games/page.tsx
  - fe-next/app/[locale]/education/vocabulary-games-classroom/page.tsx
change_summary: >
  Swapped TeacherAccessCTA (individual only, /education/access) for DistrictUpsellStrip
  (dual CTA: teacher + district, links to /education/access AND /education/for-schools) on
  two high-SEO education sub-pages. spelling-bee-practice already had it; all three now consistent.
  Fires education_upsell_impression{cta:district_upsell} + landing_cta_clicked{cta:district_upsell}
  PostHog events. No new components, i18n keys, or API — pure wire-up of existing infrastructure.
revenue_angle: >
  for-schools lead form -> admin email notify -> school plan ($149/yr) is highest-value conversion.
  esl-word-games and vocabulary-games-classroom are the highest-SEO landing pages for school-intent
  users. Adding the district CTA surfaces the conversion path to the audience most likely to convert.
next_steps: >
  - Check PostHog: education_upsell_impression{cta:district_upsell} baseline vs +3d
  - Check landing_cta_clicked{cta:district_upsell} conversion rate
  - Revenue snapshot stale: founder should run scripts/nightly/lib/pull-revenue-snapshot.sh
    or provision ADMOB_API_TOKEN for unattended revenue pulls
  - Rewarded ad avg 2.857/day is low — consider surfacing rewarded_ad_offered on more
    natural pause points in education classroom-game flow
