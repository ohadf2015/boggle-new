# Web Ad Provider After Repeated AdSense Rejection — Research & Recommendation

**Date:** 2026-06-04
**Context:** AdSense rejected `lexiclash.live` again ("low value content" / low traffic — see `docs/2026-06-04-adsense-approval-plan.md`). The web app currently serves **zero rewarded fill** (Google H5 Games Ads is wired but dark, 0 watches; AdMob is native-only; CrazyGames only pays inside its own portal). We need a provider that (a) accepts our current low traffic, (b) offers **web rewarded** ads, (c) pays on **our own domain** (`lexiclash.live`), and (d) supports the Families/COPPA gate we just shipped.

## The selection filter (why eCPM is irrelevant here)

AdSense rejected us on **approval**, not payout. So the discriminating filter is: self-serve, instant/no-content-review approval, **no traffic minimum**. At our volume (≈6 native rewarded watches/30d, web 0 fill) the only metric that matters is *will it fill at all* — H5's 0% fill is the failure mode to avoid, not low CPM. We rank by **approval + fill + own-domain + brand-safety**, never by advertised CPM.

**Dropped immediately** (same/worse gate — they manually quality-review, the exact thing we just failed): Mediavine, Raptive/AdThrive, Playwire, Media.net.

## Candidate gate matrix (verified 2026-06-04, live)

| Provider | No traffic min | Web rewarded | Pays on lexiclash.live | Brand-safe / COPPA | Approval | Verdict |
|---|---|---|---|---|---|---|
| **Ezoic** | ✅ "Access Now" tier (pageview minimum removed) | ✅ `requestAndShow()` / `contentLocker()` | ✅ own-site JS integration | ✅ Google MCM Certified Publishing Partner | ✅ self-serve, light *automated* review (no editorial content gate) | **PRIMARY — lowest approval risk; covers rewarded + display** |
| **GameDistribution** | ✅ | ✅ `gdsdk.showAd('rewarded')` | ⚠️ self-host mechanism exists (`GD_SDK_REFERRER_URL`) — own-domain payout **unconfirmed** (see constraint 1) | ⚠️ game-ad demand; COPPA flag set in dashboard | ⚠️ self-serve signup **+ per-game "Request Activation" review** before ads pay | **UPSIDE — best game-native rewarded fill IF the two open items confirm** |
| **GameMonetize** | ✅ | ✅ | ⚠️ own-site embed, same payout question as GD | ✅ "agesafe" certified | ⚠️ manual game review (same gate class as GD) | Alternative to GD if GD payout fails |
| **Monetag** (ex-PropellerAds) | ✅ | ❌ web gets pop/push/vignette only (rewarded is Telegram-Mini-App only) | ✅ | ❌ aggressive/adult demand — violates Families policy | ✅ instant | **DROP** |
| **AdinPlay / Venatus** | ❌ has traffic minimums | ✅ | ✅ | ✅ premium | ❌ sales-led onboarding, not instant | Revisit at scale |

### Honest correction (vs. the first draft of this doc)
The first draft asserted GameDistribution's own-domain payout was "confirmed" and gave it a no-review pass. On reading the sources (Defold self-host writeup; GD publisher terms) that is **not supported**: GD requires a per-game **"Request Activation"** step (a review gate, the same *class* of gate that demotes GameMonetize), and neither the terms excerpt nor the tutorial states you earn on `lexiclash.live` plays **without the game being accepted into GD's catalog**. So GD is reclassified from "primary" to "upside, pending verification." This does not change the *code* we ship (a harmless dark adapter, valuable if GD checks out) — only the confidence of the business recommendation.

### Why Ezoic and GameDistribution don't conflict
Ezoic is a **page-level display/interstitial mediation** layer; GameDistribution is an **in-game rewarded-video SDK**. Different surfaces, so they coexist:
- **Ezoic → the safe floor.** The textbook "AdSense rejected me" replacement: no traffic minimum, no editorial content review, brand-safe Google MCM demand, and you do **not** need AdSense approval (only AdSense-*policy* compliance, which we have). It also offers rewarded (`requestAndShow`/`contentLocker`) + interstitial + banner — so it can cover the rewarded ask *and* "and more" if GD doesn't pan out.
- **GameDistribution → the upside rewarded bet.** For a *word game*, a game-native rewarded SDK should out-fill Ezoic's content-locker rewarded — but only if (a) the game passes Activation and (b) own-domain plays actually pay. Both are open items below.

## Critical constraints we must honor

1. **Own-domain payout (the trap) — UNCONFIRMED for GD:** CrazyGames/Poki rewarded SDKs only pay when the game is played *on their portal* — that's why our existing CrazyGames integration earns nothing on `lexiclash.live`. GameDistribution provides a self-host *mechanism* (zip an `index.html` with an iframe carrying `GD_SDK_REFERRER_URL`, or set the referrer in `GD_OPTIONS`), **but the public terms/tutorial do not state whether you earn on your-domain plays without catalog acceptance.** This must be confirmed with GD support before treating GD as a revenue path — the SDK *running* on our domain is not evidence it *pays* for our-domain plays. Ezoic, by contrast, unambiguously monetizes any site you add + verify via `ads.txt`.
2. **Families / COPPA — unverified per-provider, but mitigated:** Per-provider COPPA support could not be confirmed from public docs (searches returned nothing specific). It is adequately mitigated regardless: we already ship age-gating + ad suppression for under-13 (`shouldSuppressAdsForTier`), so any new provider only ever serves to 13+ users where ads already show. Still set the child-directed/COPPA flag in each dashboard as defense-in-depth.
3. **No publisher-account conflict:** AdSense + AdMob share `ca-pub-1896836706464880`. Ezoic and GameDistribution are independent third-party networks with no exclusivity clause against running AdMob on native — no conflict.

## Recommendation

1. **Primary — Ezoic Access Now (account-led, lowest risk):** Sign up, add `lexiclash.live`, integrate the Ezoic script + `ads.txt`. This is the de-risked AdSense replacement: it *will* approve us, has no traffic minimum, and covers display/interstitial **and** rewarded. Start here so monetization isn't blocked on GD's unknowns.
2. **Upside — GameDistribution rewarded (code-ready, pending 2 confirmations):** The dark adapter is built and slotted into `useRewardedAd` behind `NEXT_PUBLIC_GD_ADS_ENABLED` + `NEXT_PUBLIC_GD_GAME_ID` (mirrors the dark H5 path). **Before flipping the env, confirm with GD support: (a) the game passes Activation, and (b) self-hosted own-domain plays pay out.** If both hold, GD becomes the best rewarded path for a game; if either fails, leave the flag off and lean on Ezoic's rewarded.
3. **Alternative — GameMonetize:** Same game-ad category as GD; use only if GD's Activation or payout fails. Same review-gate class, so no approval advantage over GD.

## Implementation scope (this PR)

A **dark GameDistribution rewarded adapter**, env-gated, TDD, mirroring `lib/ads/h5GamesAds.ts` + `hooks/useH5GamesAds.ts`:
- `lib/ads/gameDistributionAds.ts` — idempotent SDK loader (`GD_OPTIONS` + `main.min.js`) + `showRewardedGd()` promise wrapper. Reward iff `SDK_REWARDED_WATCH_COMPLETE` fired before `gdsdk.showAd('rewarded')` resolves.
- `hooks/useGameDistributionAds.ts` — `{ initialize, showRewarded(onReward, onError, opts), isAvailable }`, same shape as `useH5GamesAds`.
- Wire one `else if (shouldUseGd)` branch into `useRewardedAd`, gated `!CG && !native && NEXT_PUBLIC_GD_ADS_ENABLED && getGdGameId() && (isProd || ?gdads_test=1)`. Sits **above** the dead H5 path in priority. Mutes Howler around the video (GD forbids audible background during ads).
- No multi-provider mediation layer — the traffic doesn't justify it. One adapter, one env flag, off by default.

**Known limitation to fix at activation (not now):** the hook **lazy-inits the GD script on first click**, mirroring H5. GD's docs are explicit that the SDK must be loaded *before* gameplay, "especially not by clicking a button," or the first ad no-fills (too slow to load). When flipping the flag, add a `gdAds.initialize()` effect on a game surface so the first watch preloads — otherwise first-fill testing will misread as "GD is broken." Deferred because there's no account/game-id yet.

## Open items
**Blocking the GD revenue claim (must verify before flipping the env):**
- ❗ Confirm with GameDistribution support: do **self-hosted own-domain plays on `lexiclash.live` pay out without catalog acceptance**? Public terms/tutorial don't say. If no → GD is not a viable own-domain path; use Ezoic rewarded instead.
- ❗ Confirm the game passes GD's per-game **"Request Activation"** review (a content/integration gate, same class as the one that demotes GameMonetize).

**Account/ops:**
- Ezoic Access Now signup + `ads.txt` + `lexiclash.live` verification (primary path — start here).
- If GD confirms: provision publisher account → game ID, enable "Rewarded Ads" flag, set COPPA/child-directed; then add the preload `initialize()` effect above and flip `NEXT_PUBLIC_GD_ADS_ENABLED`.
- COPPA per-provider support is unverified from public docs but mitigated by `shouldSuppressAdsForTier` (ads reach 13+ only); set each dashboard's child-directed flag as defense-in-depth.
- After any env flip: watch `growth:rewarded_ad_*` PostHog events for first real web fill (today: 0).
