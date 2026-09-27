---
status: shipped
attempted: Fix broken education upsell funnel — teacher role card on /education hub had no link (dead end); added CTA button to /education/access with click tracking
files_touched:
  - fe-next/app/[locale]/education/PageClient.tsx
  - fe-next/app/[locale]/education/__tests__/EducationLanding.redesign.test.tsx
next_steps: |
  - Monitor growth:landing_cta_clicked {cta: teacher_card_access} in PostHog (baseline: 0)
  - Move DistrictUpsellStrip higher on page (currently last after FAQ — invisible to most users)
  - Add equivalent link to student card
  - Revenue hygiene: founder run scripts/nightly/lib/pull-revenue-snapshot.sh for fresh AdMob data
  - Investigate rewarded ad lifecycle days with 0 events (07-03, 07-07) — possible timezone gap
---

## Intelligence findings

### Rewarded ads: brief was misleading
Brief showed rewarded_ad_watched: 0/24h (7d avg 0) — early-day snapshot, not 7-day trend.
Real PostHog (last 7 days):
- growth:rewarded_ad_offered: ~19/day avg
- rewarded_ad_watched: ~2-3/day avg (~15% offer→watch conversion)
No immediate code fix needed here; conversion rate is thin but non-zero.

### Education upsell: broken funnel (ROOT CAUSE FOUND + FIXED)
- growth:school_lead_form_viewed = 0 for 30 days
- growth:school_lead_submitted = 0 for 30 days
- growth:landing_cta_clicked CTA values: mode_card, daily_banner, avatar_builder_teaser, bottom_cta — NO teacher/district values ever appeared
- ROOT CAUSE: Teacher role card on /education hub had compelling text but NO link — a dead end
- DistrictUpsellStrip (with proper CTAs) buried as last element after FAQ, never scrolled to

### Fix shipped
Added Link button to teacher role card → /${language}/education/access:
- data-testid="teacher-card-access-link" for test specificity
- onClick: growth:landing_cta_clicked {cta: teacher_card_access}
- Reuses education.landing.teacherLeadCta.button key (all 5 locales pre-translated)
- TDD: test written first, confirmed multiple-elements error, fixed with testid query
- ESLint: clean (no output)
