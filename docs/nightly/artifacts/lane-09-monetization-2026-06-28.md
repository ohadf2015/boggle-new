---
status: shipped
files_touched:
  - fe-next/components/education/SchoolLeadCta.tsx (new)
  - fe-next/components/education/__tests__/SchoolLeadCta.test.tsx (new, 4 tests)
  - fe-next/app/[locale]/education/for-schools/page.tsx (import + 2 anchor → SchoolLeadCta)
attempted: Add education upsell lead-gen CTA tracking on /education/for-schools
shipped: SchoolLeadCta client component tracks hero + closing CTAs. Fires landing_cta_clicked
  {cta:"for_schools_hero_contact"|"for_schools_closing_cta", source:"for_schools"}.
  Enables 3-step funnel: school_lead_form_viewed → CTA click → school_lead_submitted.
  4 tests green, eslint clean.
next_steps:
  - Check PostHog for for_schools_hero_contact / for_schools_closing_cta clicks after deploy;
    if click rate high + submission low → simplify form fields
  - If click rate low → page needs traffic; add blog post or education hub hero CTA
  - Revenue data: ADMOB_API_TOKEN not provisioned; founder should run Playwriter AdMob snapshot
  - Ad UX: rewarded_ad_watched ~2/day (7d avg); low DAU not a UX bug — no code change yet
  - Education upsell infra is COMPLETE (SchoolLeadForm + API + DistrictUpsellBanner wired)
---
