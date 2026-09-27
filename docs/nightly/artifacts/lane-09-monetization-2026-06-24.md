---
status: shipped
attempted: Add impression + click telemetry to TeacherAccessCTA (education upsell funnel blind spot)
files_touched:
  - fe-next/components/education/TeacherAccessCTA.tsx
  - fe-next/components/education/__tests__/TeacherAccessCTA.test.tsx
---

## What shipped

Added PostHog telemetry to `TeacherAccessCTA`, which appears on 3 high-intent
education landing pages (`esl-word-games`, `vocabulary-games-classroom`,
`games-for-teachers`) — previously a complete analytics blind spot.

**Events added (match `DistrictUpsellStrip` parity):**
- `education_upsell_impression` `{ cta: 'teacher_individual' }` — fires on mount
- `landing_cta_clicked` `{ cta: 'teacher_individual' }` — teacher access link click
- `landing_cta_clicked` `{ cta: 'district_upsell' }` — for-schools link click

TDD: 3 RED tests written first, then GREEN implementation. ESLint clean.

## Why this matters

The education lead funnel is fully built (SchoolLeadForm, API, for-schools page,
TeacherAccessCTA on 3 pages) but had ZERO telemetry on the CTA component used
across the highest-intent teacher pages. Without impression/click data, there's no
way to know if teachers are finding and engaging with the district upsell path.
Now the PostHog funnel will show: impression -> click -> form view -> submit.

## Revenue posture at time of audit

- AdMob earnings low but live (Android only, low DAU)
- H5 ads still gated off (AdSense pending re-approval)
- rewarded_ad_watched ~2/day — low but structural (DAU constraint)
- Education lead funnel: complete infra, missing analytics until tonight

## Next steps for tomorrow

1. Revenue snapshot: run pull-revenue-snapshot.sh (Playwriter interactive) for fresh AdMob eCPM trend
2. IAP/supporter probe: add iap_viewed-instrumented "remove ads" interest card behind a flag on
   results pages — pure demand measurement, no billing
3. Funnel audit: after 2-3 days of education_upsell_impression data, compare impression->click CTR
   vs DistrictUpsellStrip CTR to decide if TeacherAccessCTA needs a visual upgrade
4. Dead flags retire: share-prompt-timing, show-signup-after-first-win, mp-signup-nudge-copy-v1
   — all 0 converts; human queue
