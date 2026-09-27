---
status: shipped
attempted: Replace TeacherAccessCTA with DistrictUpsellStrip on spelling-bee-practice — prominent district lead-gen with PostHog analytics tracking
files_touched:
  - fe-next/app/[locale]/education/spelling-bee-practice/page.tsx
  - fe-next/app/[locale]/education/spelling-bee-practice/__tests__/content.test.ts (new)
next_steps: |
  Revenue signals this run:
  - rewarded_ad_watched: 0/24h — EXPECTED (H5 gated off pending AdSense; AdMob Android-only).
  - Education upsell funnel complete (SchoolLeadForm, school_leads table, admin queue).
    Gap was: DistrictUpsellStrip fires `education_upsell_impression` PostHog events;
    TeacherAccessCTA did NOT. Now spelling-bee-practice has analytics-tracked district CTA.

  Tomorrow priority:
  1. Check PostHog `education_upsell_impression` + `landing_cta_clicked {cta: district_upsell}`
     for spelling-bee-practice signal after this ships.
  2. Same swap on vocabulary-games-classroom + esl-word-games (still on TeacherAccessCTA).
  3. feat/monetization-scaffold-2026-06-08 branch (remove-ads IAP spine + Play Billing server
     verify) — built but NEVER merged to master. Review + merge when founder ready.
  4. PostHog flags: exp-mp-quickplay-wait-v1 + exp-invite-arrival-clarity-v1 still dark.
---
