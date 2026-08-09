# AdMob decline — diagnosis (2026-08-09)

Supersedes `2026-07-18-admob-revenue-drop-diagnosis.md`. Same verdict, more evidence.
**This is the third time this diagnosis has been paid for. Read this before re-investigating.**

## Verdict

No ad-serving regression. AdMob revenue = `activeUsers × impressions/user × eCPM`; only the
first term moved.

| Week | activeUsers | impressions | impressions/activeUser |
|---|---|---|---|
| W29 (Jul 13–19) | 68 | 442 | 6.50 |
| W30 (Jul 20–26) | 70 | 328 | 4.69 |
| W31 (Jul 27–Aug 2) | 61 | 331 | 5.43 |
| W32 (Aug 3–9) | **26** | 113 | 4.35 |

Impressions/activeUser sits inside its own historical band (W23 5.21 … W24 11.40) — the ad
surface did not shrink. **Policy centre: "No current issues"** (no enforcement, no serving
limit). Pool size: last month ₪4.40, this month tracking ~₪1.3.

Do **not** quote the console home's `-73% / 7d` — it compares against W31, the best week in
the series. Use the monthly figure.

### Format split (Jul 1 – Aug 9)
Banner 1775 imp · rewarded 143 · interstitial 5. Banner is ~92% of impressions, but rewarded
is **~20x banner per impression** (W31: 36 rewarded → ₪0.86 vs 294 banner → ₪0.36).
Interstitials are dead by design (tier gate); the magnitude was costed and rejected on COPPA
grounds on 2026-07-18 — do not reopen.

## Hypotheses tested and CLOSED

| Hypothesis | Result |
|---|---|
| Banner route gating regressed | **No.** `54c0ebe90` (07-19) *added* `/brain` + `/daily` to the allowlist. |
| `GAME_ROUTES` growth shrank inventory | **Real smell, ~₪0.** `/word-tower` + `/crossword` have no passive sub-routes; `/connections/community`, `/daily/archive`, `/brain/drills` are near-zero traffic. |
| AdMob policy enforcement | **No.** Policy centre clean. |
| Requests-per-pageview collapsed | **Artifact.** Wrong denominator — banner requests scale with on-screen seconds, and at 2–7 native DAU one long session swings the ratio. Use metric 83 (`impressionsPerActiveUser`). |
| Install-promo exposure shrank (shares the `isAllowedAdBannerRoute` predicate) | **Refuted.** Exposure is at an all-time high — see below. |
| Install funnel broken | **No.** CTRs are unremarkable — see below. |

### Acquisition funnel (45d) — not broken, just small
`android_install_pill_shown` 1199 (413 people) → `..._pill_click` **53** (43) = 4.4% CTR.
`android_install_promo_shown` 442 (405) → `..._promo_install_click` **40** (35) = 9.0% CTR.
Dismissals: promo 350, pill 182.

Weekly exposure is **rising**: promo_shown 81 → 91 → 98 → 124; pill_shown 224 → 244 → 273 →
337; people 83 → 92 → 105 → 130 — straight through the `/connections` + `/word-tower` +
`/crossword` blocklist additions.

So ~78 unique people reach the Play listing per 45 days (~1.7/day before Play's own install
conversion), against a 26–70 weekly-active base. **Exposure up ~50% while actives fell 68→26
⇒ the leak is conversion/retention, not acquisition.**

## The bigger structural fact: web earns nothing

Web carries ~5x native session volume (`properties.platform !== 'android'` in PostHog).
Measured on prod with advertising consent granted (`/en`, `/en/daily`, `/en/blog`):
`adsbygoogle.js` injects, `window.adsbygoogle` exists, and the only `<ins>` on every route is
Google's hidden `adsbygoogle-noablate` anchor stub. **Zero real placements, zero `/pagead/ads`
requests.** Web ad revenue history is unverifiable (no reachable AdSense console).

Cause is already documented in `../../docs/2026-07-18-game-portals-web-ads-application-status.md`
§5: **AdSense rejected this domain twice for "low value content."** Every other web path is
externally blocked too — CrazyGames rejected, Poki and GameDistribution both need a standalone
offline ZIP build, Mediavine needs ~50k sessions/mo. **ayeT is the only one unblocked by
product work (applied, awaiting placement IDs).**

Consent gotcha when testing: `hasConsent('advertising')` is read once on MOUNT — set
`localStorage['cookie-consent-v2']` and then **reload**, and restore the original value after.

## Shipped in this session

1. **Rewarded daily cap was a coin budget enforced as an ad budget.** `MAX_DAILY_AD_VIEWS = 10`
   counted every rewarded view, including `rewardKind: 'feature'` (retry / extra life / hint
   reveal / streak freeze — 23 call sites, and the surfaces that dominate real offers). Those
   mint no coins. Now two budgets in one record: `count` (coins, 10) and `featureCount`
   (features, 40 — an abuse ceiling, since `blast_wave_continue` / `daily_retry` are
   per-wave/per-attempt, not per-day).
   **Honest magnitude: recovers ~0 impressions in the measured window** — all 26
   `daily_limit_reached` declines were coins-kind. A latent defect fix, not the cause.
2. **Two env-name drifts** that would have silently no-op'd the eventual web fix:
   `NEXT_PUBLIC_ADSENSE_CLIENT_ID` (what Railway sets) and `NEXT_PUBLIC_H5_GAMES_*` (what the
   runbook's cheat sheet documents). Both spellings now accepted.
3. **27 generated `/words/*` list pages retired** from `app/sitemap.ts` **and** set
   `robots:{index:false, follow:true}` — sitemap removal alone is not enough, an already
   indexed page still counts toward the site review. The doc's "71% thin sitemap" figure was
   **stale** (the 06-08 round already cleaned `/anagram/[letters]` and `/daily/archive/[date]`);
   the live sitemap is 463 URLs and its 162 blog URLs are **genuinely translated per locale**
   (he 11k chars, ru 12.8k), so blog is real content — left alone. The 27 word pages drew
   **zero measured pageviews in 60d** (PostHog, consent-gated) out of 7,673 site-wide.
4. **`growth:web_ads_fill_audit {units, filled, unfilled, client, path}`** — fires 12s after
   injection. `units: 0` means Auto-Ads placed nothing. Web ads earning zero was previously
   unobservable; `path` is required to tell "AdSense is dead" from "no placement on this route."

Post-deploy check for (3): `curl -s https://www.lexiclash.live/en/words/5-letter-words | grep 'name="robots"'`
should report `noindex`.

## Actions that actually move the number (not code)

1. **Reapply to AdSense.** The specific thin-page family it named is gone. Whether that
   satisfies the reviewer is unknown — the reapply is the test. This is the only route back to
   monetizing ~5x the session volume.
2. **Set `NEXT_PUBLIC_ADSENSE_ENABLED=false` in Railway until it lands.** Today it ships a dead
   third-party script to every consenting web user for guaranteed zero revenue.
3. **Grow and retain native players.** The 82% install-promo dismissal and first-session
   retention are the leak. The CrazyGames relaunch thumbnail is the other named lever.

## Reusable: pulling arbitrary AdMob data

The console is an Angular SPA — **Playwright locators time out**; use `page.evaluate` +
`getBoundingClientRect` + `page.mouse.click`. Better, skip the UI and replay its RPC from the
page context:

```
POST https://admob.google.com/v2/reporting/_/rpc/AnjiReportingService/GetReportData?authuser=0&f.sid=<sid>
body:    f.req=<urlencoded JSON>
headers: x-framework-xsrf-token, x-same-domain: 1, appname: tlc   (capture off any live request)
```

```json
{"1":{"1":"ILS","2":"en_GB","3":false},
 "2":[{"1":[dims],"2":[metrics],"3":[filters],"4":[],"7":false}]}
```

- **dims:** 1=date, 3=month, 8=appId, 9=appName, 10/11=platform, 14=adSourceId,
  15=adSourceName, 16=adUnitId, **21=Format**
- **metrics:** 11=earnings, 12=eCPM, 15=requests, 17=matchRate, 16=matchedRequests,
  18=showRate, 2=impressions, 19=ctr, 1=clicks, **78=activeUsers, 79=adViewers,
  83=impressionsPerActiveUser**
- **filters:** date `{"1":1,"2":{"2":{"1":"YYYYMMDD","2":"YYYYMMDD"}},"3":1}` ·
  AdMob Network `{"1":24,"2":{"1":{"1":["1"]}},"3":1}`

PostHog note: native = `properties.platform === 'android'` (NOT `$browser = 'Chrome WebView'`).
