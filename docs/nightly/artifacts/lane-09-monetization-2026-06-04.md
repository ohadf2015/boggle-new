status: shipped
attempted: Add DistrictUpsellStrip education upsell CTA to teacher-facing SEO sub-pages

files_touched:
  - fe-next/app/[locale]/education/games-for-teachers/page.tsx (import + render DistrictUpsellStrip)
  - fe-next/app/[locale]/education/esl-word-games/page.tsx (import + render DistrictUpsellStrip)
  - fe-next/app/[locale]/education/vocabulary-games-classroom/page.tsx (import + render DistrictUpsellStrip)
  - fe-next/app/[locale]/education/games-for-teachers/__tests__/district-upsell.test.tsx (TDD, 3 assertions)

summary: |
  DistrictUpsellStrip was built + tested + wired on /education hub only.
  Missing from 3 high-traffic teacher SEO sub-pages teachers reach directly from Google.
  Those pages had TeacherAccessCTA (internal flow) but no school pricing CTA.

  Added DistrictUpsellStrip above TeacherAccessCTA on:
    - /education/games-for-teachers
    - /education/esl-word-games
    - /education/vocabulary-games-classroom

  Strip fires education_upsell_impression on mount + landing_cta_clicked on click.
  Mailto: lexiclash.game@gmail.com?subject=District%20Pricing%20Inquiry.
  5-locale copy already in all translation files. No flag needed (non-interrupting aside).

next_steps: |
  - Monitor education_upsell_impression + landing_cta_clicked in PostHog for these 3 routes
  - Add DistrictUpsellStrip to /education/spelling-bee-practice (same 2-line pattern)
  - Provision ADMOB_API_TOKEN for unattended AdMob data in intelligence brief
  - Founder: run scripts/nightly/lib/pull-revenue-snapshot.sh for fresh revenue data
