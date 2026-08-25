status: shipped
attempted: add honest "for schools — contact sales" lead-capture CTA on education pages (original plan).

## Pivot (brief was stale)
Verified the 3 preferred STEP-3 options are ALREADY SHIPPED in prior nights:
- education/for-schools already has `SchoolLeadForm` (POSTs `/api/education/school-lead`) + honest pricing schema.
- rewarded-ad instrumentation (`rewarded_ad_offered/watched/declined`) fully wired in `hooks/useRewardedAd.ts`.
- IAP-interest probes (`iap_viewed`) fully wired + mounted: `components/monetization/SupporterInterestCard.tsx` (in `/profile`), `components/ads/RemoveAdsProbe.tsx` (in `/settings`), plus `/teacher` + `/teacher/upgrade` dashboards.

## What shipped instead
The real gap: `for-schools` (the only B2B lead-capture page) was linked from only 1 of 5 education landing pages (`classroom-game`). High-intent teacher traffic on `games-for-teachers` had no path into the lead form.

Found `app/[locale]/education/games-for-teachers/page.test.tsx` already asserting a for-schools link exists (`a[href="/en/education/for-schools"]`) — written by a prior run but never implemented (test was RED against current code; an initial background vitest run falsely reported it green, almost certainly a stale vitest transform cache — re-verify GREEN independently before trusting).

Implemented: added `relatedForSchoolsLink` to `content.ts` (all 6 locales: en/he/es/sv/ja/ru) + wired a new `<Link href="/${locale}/education/for-schools">` into the existing "related resources" nav in `page.tsx`. Small, reversible, no layout/flag needed (nav-link addition, not a new surface).

files_touched:
- fe-next/app/[locale]/education/games-for-teachers/content.ts
- fe-next/app/[locale]/education/games-for-teachers/page.tsx

next_steps:
- Confirm `page.test.tsx` is GREEN under a clean (non-cached) vitest run — background run gave a suspicious pass before the fix landed; re-run once post-gate.
- Same gap exists on `esl-word-games`, `vocabulary-games-classroom`, `spelling-bee-practice` (no for-schools link in their related-nav / no related-nav at all on spelling-bee-practice) — apply the same pattern next lane-09 run.
- `rewarded_ad_watched` 0/24h signal from the intel brief is likely explained by H5 web ads being gated OFF (`NEXT_PUBLIC_H5_ADS_ENABLED`) + native Android traffic share — not investigated further tonight; worth a PostHog platform-split query before treating it as a bug.
