status: research-only
attempted: full audit of education upsell pipeline + rewarded ad surfaces + revenue gaps

files_touched: none

## Findings

### Education pipeline — COMPLETE (no code gaps)
- SchoolLeadForm.tsx → POST /api/education/school-lead (validates, rate-limits, DB insert, admin email)
- DistrictUpsellStrip.tsx on education hub tracks education_upsell_impression + landing_cta_clicked
- DistrictUpsellBanner.tsx on teacher dashboard links to for-schools
- for-schools/page.tsx has hero, comparison table, $149/yr pricing, lead form, FAQ
- All 5 locales have districtCta/teacherLeadCta/districtBanner keys (used by DistrictUpsellStrip)

### Rewarded ads — COMPLETE for Android (5 surfaces)
- RewardedAdGoldButton, TimeLowAdPrompt, DoubleGoldAdButton, RetryAssistModal, BossRushResults
- Web gated off (NEXT_PUBLIC_H5_ADS_ENABLED=false), AdSense pending
- rewarded_ad_watched 0/24h (7d avg 2) is expected with ~470 reach — not a code gap

### Revenue gap 1 — Word Tower has NO rewarded ad surface
- Word Tower is the most-active mode (founder directive 2 nights running)
- No useRewardedAd anywhere in components/wordTower/ or lib/wordTower/
- WordTowerPerkDraft.tsx (71L) and WordTowerRewardReveal.tsx (54L) are post-milestone hooks
- Wiring blocked tonight: WordTowerPlay.tsx (1249L) + WordTowerScene.tsx (792L) also targeted by lanes 05/11

### Revenue gap 2 — for-schools hero CTAs have no PostHog tracking
- app/[locale]/education/for-schools/page.tsx lines 112+115: hardcoded EN strings, no data-ph-capture
- "Tell us about your school" scroll-anchor = highest-intent click on the page, invisible to analytics
- Fix: add data-ph-capture-attribute-cta to both <a> tags (server component, no 'use client' needed)

### Revenue gap 3 — no admin visibility into lead volume
- school_lead_submitted fires on success but no dashboard shows count
- Query to check: SELECT count(*), max(created_at) FROM school_leads;

next_steps: |
  PRIORITY 1 (5 min, no risk): Add PostHog data-attributes to for-schools hero CTAs
    fe-next/app/[locale]/education/for-schools/page.tsx lines 111-116
    - line 112 <Link>: add data-ph-capture-attribute-cta="for_schools_hero_play"
    - line 114 <a>: add data-ph-capture-attribute-cta="for_schools_hero_lead"
    - Fix hardcoded strings: add heroPlayCta/heroLeadCta fields to content.ts

  PRIORITY 2 (30 min, medium risk): Word Tower rewarded ad coins boost
    - New file: fe-next/components/wordTower/WordTowerAdBoostButton.tsx
    - Pattern: existing RewardedAdGoldButton + useRewardedAd hook
    - Wire into WordTowerPlay.tsx at between-round pause (check lane 05/11 diff first)
    - Flag: posthog 'wordtower-rewarded-ad-boost-v1', surface 'wordtower_coins_boost'
    - TDD: __tests__/WordTowerAdBoostButton.test.tsx

  PRIORITY 3 (human, 2 min): Run school_leads count query in Supabase to see real lead volume
