---
status: research-only
files_touched: docs/nightly/impact-ledger.ndjson
next_steps: |
  **#1 (HIGH REVENUE IMPACT): Fix rewarded ad 0% surfaces on Android**
  64% of rewarded ad offers (58+/90) get 0 completions.
  Root cause: useRewardedFeatureUnlock fires trackRewardedAdOffered without platform →
  device enrichment tags as platform='android'. The underlying useRewardedAd never
  completes for these surfaces (no rewarded_ad_watched OR rewarded_ad_declined = silent fail).
  Affected: daily_retry(26 offers), connections_reveal_hint(11), connections_reveal_answer(11),
  daily_survival_extra_life(9), profile_coins(4), blast_wave_retry(3), blast_wave_continue(3).
  Working surfaces (via useRewardedAd directly): catchup (100%), retry (54%), hint (100%).
  
  Investigate: does useRewardedFeatureUnlock.offer() actually trigger ad load+show?
  Grep useRewardedFeatureUnlock for canShowAd check — if isPlaceholder=true on these
  surfaces (no ad unit configured), the CTA shows but no ad loads → silent fail.
  Fix path A: ensure ad unit is configured for each surface in lib/admob-config.ts.
  Fix path B: hide CTA when isPlaceholder=true (already has `isPlaceholder` export).
  
  Fixing this could 3-5x rewarded_ad_watched events.

  **#2 (LOW): Education traffic — not CTA problem**
  District upsell strip: 2 impressions, 0 clicks in 3 days. 11 education pageviews total.
  SchoolLeadForm is solid (submits to /api/education/school-lead, tracks events).
  0 school_lead_submitted events in 30 days (event name = 'growth:school_lead_submitted').
  Root issue: education hub has negligible traffic. Fix = Lane 06 (SEO).

  **#3: Revenue snapshot stale**
  Brief had no AdMob revenue data. Founder should run
  scripts/nightly/lib/pull-revenue-snapshot.sh (interactive Playwriter) or
  provision ADMOB_API_TOKEN for unattended revenue.
---

## Impact ledger verdicts appended
- `district_upsell` strip move (07-10): **neutral** — 2 impressions, 0 clicks, traffic too thin
- Rewarded ad funnel gap: **research** — 64% offer completion gap documented

## Key finding: rewarded ad funnel
Offered: ~90/7d | Watched: 17 (19%) | Declined: 6 (7%) | **Unaccounted: 67 (74%)**

Surface breakdown:
| Surface | Platform tag | Offered | Watched | CVR |
|---|---|---|---|---|
| daily_retry | android | 26 | 0 | 0% |
| connections_reveal_hint | android | 11 | 0 | 0% |
| connections_reveal_answer | android | 11 | 0 | 0% |
| daily_survival_extra_life | android | 9 | 0 | 0% |
| retry | admob | 13 | 7 | 54% |
| catchup | admob | 9 | 9 | 100% |
| hint | admob | 1 | 1 | 100% |

`platform='android'` = useRewardedFeatureUnlock path (no explicit platform → device enrichment).
`platform='admob'` = useRewardedAd direct path (explicit platform from ad network detection).
0% CVR surfaces: likely isPlaceholder=true (no ad unit configured). CTA shows, no ad loads.
