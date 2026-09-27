status: research-only
attempted: audited full revenue stack — education upsell pipeline, rewarded ad surfaces, DoubleGoldAdButton coverage
files_touched: none

## Findings — Revenue Stack Audit

### Education Upsell — Complete End-to-End
The pipeline is fully built. Nothing was missing:
- `/education` hub → `DistrictUpsellStrip` (teacher + district CTAs, tracked)
- `/education/for-schools` → `SchoolLeadForm` (real POST API, not mailto)
- Form tracks `school_lead_form_viewed` + `school_lead_submitted` via PostHog
- Teacher dashboard → `DistrictUpsellBanner` (always-on lime bar → for-schools, tracked)
- Teacher dashboard → `TrialUrgencyBanner` (conditional on trial state)

**Gap**: he/sv/ja/es locales default to EN content on the for-schools page (content.ts only has EN+RU variants). Non-English teachers see English copy = conversion drag.

### Rewarded Ads — 6 Live Surfaces, All Tracked
1. `DailyChallenge.tsx` — retry gate (×2: surface:'retry' + second surface)
2. `WordTowerHud.tsx` — clue gate (surface:'hint')
3. `WordWheelChallenge.tsx` — wheel surface
4. `WatchAdForFreezeButton.tsx` — freeze surface
5. `DoubleGoldAdButton` in `DailyChallengeResults.tsx` — post-game double
6. `DoubleGoldAdButton` in `SinglePlayerResults.tsx` — post-game double (×2 paths)

All surfaces call `trackRewardedAdOffered` on visible + `trackRewardedAdWatched/Declined` via `useRewardedAd`. The 2/day watch rate reflects **Android user count** (few users, not missing surfaces).

**Not applicable**: Blast uses gems (not coins), so `DoubleGoldAdButton` doesn't fit there.

### Revenue Ceiling Analysis
| Lever | Current | Gap |
|---|---|---|
| Android installs | Low | #1 lever — user acquisition |
| Rewarded surfaces | 6 | Complete for current modes |
| Education leads | 0 confirmed | Conversion rate unknown (no leads visible in brief) |
| DoubleGold coverage | SP + Daily results | Missing: WordCraft results, Connections results |

## Ranked Next Steps (for tomorrow's run)

### High Priority
1. **`for-schools` locale translations** (he/sv/ja/es) — content.ts has EN+RU; four locales default to English. Add translated sections to content.ts. CONSTRAINT: he needs founder/native review per learnings. SV/ES/JA can be AI-drafted with flag. Effort: M. Files: `app/[locale]/education/for-schools/content.ts`.

2. **DoubleGold on WordCraft results** — WordCraft awards coins at game end; `WordCraftResults` (or equivalent) likely has a coin reward. Check `components/wordCraft/` for results screen + `coinReward` prop, add `<DoubleGoldAdButton earnedAmount={coins} surface="wordcraft_results" />`. Pattern already established, no flag needed (self-gating). Effort: S. Verify WordCraft coins path first.

3. **`rewarded_ad_offered` gap in useAdMob.ts** — the file has a comment: "rewarded_ad_offered events with ZERO downstream prepare/watched/declined" — investigate whether any ad-show path in useAdMob fires the offer event without a matching outcome event, which would inflate the "offered" count and mask the true watch rate. Effort: M. Files: `hooks/useAdMob.ts`.

### Low Priority
4. **Education lead event funnel check** — query PostHog for `school_lead_form_viewed` + `school_lead_submitted` counts. If viewed>0 but submitted=0, the form has a conversion problem. If viewed=0, no teachers are reaching the page (acquisition problem). Run: PostHog → Events → filter `school_lead_form_viewed` last 30d.

5. **`iap_viewed` demand probe** — `growthTracking.ts` has `iap_viewed`/`iap_purchased` events typed but no live call site. A "Remove Ads (Mobile)" interest probe behind a PostHog flag on the teacher or results screen would measure IAP appetite without any billing changes. Effort: S, needs flag.

## What Changed
None — research night. Gate-clean output only.

next_steps: >
  1. Add for-schools he/sv/ja/es locale translations (content.ts, founder reviews he).
  2. Verify WordCraft results has coin reward → add DoubleGoldAdButton.
  3. Investigate useAdMob.ts "offered with zero downstream" comment.
  4. Query PostHog: school_lead_form_viewed 30d to check if teachers reach the form.
