# Web Monetization After Repeated AdSense Rejection — Research & Recommendation

**Date:** 2026-06-04
**Context:** AdSense rejected `lexiclash.live` again ("low value content" / low traffic). The web app serves **zero rewarded fill** today (Google H5 Games Ads wired but dark, 0 watches; AdMob is native-only; CrazyGames pays only inside its own portal). We need web monetization that (a) approves at our **current low traffic**, (b) delivers **rewarded** ads "and more," (c) pays on **our own domain**, and (d) doesn't break the Families/COPPA compliance we just shipped.

## The selection filter

AdSense rejected us on **approval**, not payout. At our volume the only metric that matters is *will it approve + fill at all* — not advertised eCPM. So every candidate is judged on: **no traffic minimum · web rewarded · pays on lexiclash.live · brand-safe/COPPA · self-serve approval.**

## Answer: ayeT-Studios (rewarded + offerwall), with Mediavine Journey for display

A word game with a **coin economy** has a better-fitting rewarded surface than banner ads: an **offerwall** — players earn in-game coins by watching a rewarded video *or* completing an offer/survey. This maps 1:1 onto our existing `awardWatchedAd` / `rewards.WATCH_AD` flow, has **no traffic minimum**, approves instantly, runs on web, and pays on our own domain — dodging every gate that's been blocking us.

### Candidate gate matrix (verified 2026-06-04, primary sources)

| Provider | No traffic min | Web rewarded | Pays on lexiclash.live | Brand-safe / COPPA | Approval | Verdict |
|---|---|---|---|---|---|---|
| **ayeT-Studios** | ✅ **T&C: no min** (verified) | ✅ HTML5 Rewarded Video SDK **+** web offerwall + surveywall | ✅ web iframe + **S2S postback** credits coins server-side | ⚠️ offer-category exclusions in dashboard; COPPA via our own `<13` suppression | ✅ open self-serve registration | **PRIMARY — rewarded video + offerwall in one relationship** |
| **Torox** (ex-OfferToro) | ✅ "no prepayment/commitment, start freely" | ✅ web offerwall (no-code/iframe/API) | ✅ built for "browser games with a virtual-currency economy" | ⚠️ same as ayeT | ✅ self-serve | **CO-PRIMARY offerwall — apply in parallel** |
| **Mediavine Journey** | ✅ **1,000 sessions/mo** (new tier, eff 2026-01-15) | display/video (not in-game rewarded) | ✅ own site, 70% rev-share | ✅ Google demand, brand-safe | ⚠️ content review (wants original, advertiser-friendly content) | **DISPLAY "and more" — the realistic Ezoic replacement at our size** |
| **GameDistribution / GameMonetize** | ✅ | ✅ `showAd('rewarded')` | ⚠️ self-host mechanism; own-domain payout unconfirmed | ⚠️ game-ad demand | ⚠️ per-game **Activation review** | **ALTERNATE — code built (dark adapter); use if we want game-portal demand** |
| **Google AdSense H5 Games Ads** | ✅ | ✅ `adBreak({type:'reward'})` | ✅ own domain | ✅ Google, brand-safe | ❌ needs AdSense approval (rejected; reapply after recrawl) | **FUTURE — already coded; flip when AdSense re-approves (~4–6 wk)** |
| **Ezoic** | ❌ **250k MAU** (new gate, eff 2026-02-19) | ✅ | ✅ | ✅ | ❌ we don't qualify | **DROP — revisit at 250k MAU** |
| **Monetag** | ✅ | ❌ web = pop/push/vignette only | ✅ | ❌ aggressive demand vs Families | ✅ | **DROP** |
| **NitroPay / Snigel / AdinPlay / Playwire / Mediavine main / Raptive / Media.net** | ❌ traffic minimums (100k–500k) or manual quality review | — | — | — | — | **DROP at our traffic** |

### Why ayeT-Studios is the standout
One relationship covers **both** surfaces the question asks for, with none of the gates that sank the others:
- **Rewarded video** via its HTML5 Rewarded Video SDK → drops into the existing `useRewardedAd` web slot, using the *same dark-adapter template* already committed for GameDistribution. No game-catalog Activation gate, no own-domain-payout question (the two things that made GD uncertain).
- **Offerwall + surveywall** → an "Earn coins" modal (iframe). For a coin economy this is the **highest-value** rewarded surface — an offer completion (signup/trial) pays dollars vs. fractions of a cent for a video CPM.
- **No traffic minimum** (publisher T&C, primary-source verified — not a blog claim), self-serve, own-domain, secure S2S crediting.

ayeT (rewarded + offerwall) and Mediavine Journey (display) are **complementary surfaces, not competing primaries** — run both. Torox is the offerwall backup so approval isn't single-threaded.

## Critical constraints

1. **Families/COPPA — the decisive lever is a gate we already have.** The Android app is a **Capacitor WebView onto `www.lexiclash.live`**, so anything web-facing also renders inside the Families-program app. Offerwall *offers* (incentivized installs, surveys) are exactly the category Play Families + COPPA restrict. **Resolution:** our web ad paths are gated `!Capacitor.isNativePlatform() && !isOnCrazyGamesPlatform`. Inside the WebView `isNativePlatform()` is `true`, so a correctly-gated offerwall renders **only in real web browsers, never in the Families Android app** — which moots the Play concern entirely. The committed GD adapter already enforces this; the ayeT paths MUST inherit the same gate. (Defense-in-depth: dashboard offer-category exclusions for 13–17 web users not caught by our `<13` `shouldSuppressAdsForTier`; GDPR-K for EU minors.)
2. **S2S postback is security-critical (and an upgrade).** Coins are minted by *ayeT's* server calling *ours* (`transaction_id`, `currency_amount`, `external_identifier`, `payout_usd`, `adslot_id`). ayeT's docs do **not** document an HMAC signature — its security model is **(a) idempotency on `transaction_id`** (mandatory — ayeT resends up to 12× over an hour until it gets HTTP 200, so duplicate credits are a real risk), **(b) a shared-secret token embedded in the callback URL** configured in the dashboard, and **(c) optional IP allowlisting**. The callback endpoint must verify the URL secret, dedup on `transaction_id` (persist consumed ids), credit via the existing coin path under the `/api/coins` daily cap, and return 200. This is *more* secure than today's client-driven `awardWatchedAd` (which the client triggers) — frame it as a hardening upgrade, build it carefully.
3. **No publisher-account conflict.** ayeT/Torox/Mediavine are independent of our AdSense/AdMob `ca-pub-1896836706464880` — no exclusivity clash with AdMob on native.

## Recommendation (locked)

1. **Primary — ayeT-Studios:** self-serve signup → integrate (a) the HTML5 Rewarded Video SDK into the existing `useRewardedAd` web slot (mirror the committed GD adapter, gated `!isNative && !isCG`), and (b) the web offerwall as an "Earn coins" modal. Build the **secure S2S callback** (HMAC + idempotency) into the backend coin path. No traffic gate; pays own-domain.
2. **Co-primary — Torox:** apply in parallel (non-exclusive) as the offerwall backup.
3. **Display — Mediavine Journey:** apply (1k sessions, Grow plugin, 70% rev-share) for banner/display revenue — the realistic low-traffic Ezoic replacement.
4. **Alternates / future:** GameDistribution + GameMonetize (dark adapter already committed) if we want game-portal demand; AdSense H5 (already coded) once the site re-approves post-recrawl (~4–6 weeks).
5. **Not Ezoic / not AdSense (now):** both gate on the site (250k traffic / "low value content"). Revisit Ezoic only above 250k MAU.

## What's already shipped (this session)
Two **dark rewarded-video adapters**, env-gated, TDD, build/lint/tsc green — both off by default, harmless until their env flag + ids are provisioned:
- **ayeT-Studios** (PRIMARY): `lib/ads/ayetVideoAds.ts` + `hooks/useAyetVideoAds.ts` + a `shouldUseAyet` branch in `useRewardedAd` at the **top** of the web priority (above GD/H5), gated `NEXT_PUBLIC_AYET_ADS_ENABLED` + `NEXT_PUBLIC_AYET_PLACEMENT_ID` + `?ayet_test=1` + `!isNative && !isCG`. Reward iff `callbackRewarded` fires (post fraud-check). Howler muted around the fullscreen video.
- **GameDistribution** (alternate): `lib/ads/gameDistributionAds.ts` + `hooks/useGameDistributionAds.ts` + `shouldUseGd` branch, gated `NEXT_PUBLIC_GD_ADS_ENABLED` + `NEXT_PUBLIC_GD_GAME_ID` + `?gdads_test=1`.

Both follow the same waterfall slot + settle-once + `!isNative && !isCG` template.

## Next steps
**Code (gated on the ayeT account existing — needs `placementId` + offerwall link + callback secret):**
- `EarnCoinsOfferwall` modal (iframe to the ayeT/Torox offerwall link with our stable user id as `external_identifier`).
- **Secure backend callback** `/api/offerwall/ayet` — verify the URL secret, **dedup on `transaction_id`** (persist consumed ids), credit via the existing coin path + `/api/coins` daily cap, return HTTP 200. (ayeT has no HMAC; see constraint 2.)
- Flip `NEXT_PUBLIC_AYET_ADS_ENABLED` + set `NEXT_PUBLIC_AYET_PLACEMENT_ID` once the account is approved.

**Account/ops:**
- Sign up ayeT-Studios + Torox (offerwall), configure currency + S2S callback URL + offer-category exclusions. Apply to Mediavine Journey (install Grow plugin).
- COPPA mitigated by `shouldSuppressAdsForTier` (`<13` no ads); set dashboard child-directed/category flags as defense-in-depth.
- After integration: watch `growth:rewarded_ad_*` + new offerwall-conversion events for first real web revenue (today: 0).

---
*Research log (honest trail): initial draft named Ezoic "safe primary" on a no-minimum tier — that was **stale 2025 info**; Ezoic's own KB + 2026-02-19 press release now require 250k MAU. GameDistribution was briefly called "confirmed own-domain payout" — corrected to unverified (Activation review + catalog-acceptance question). The offerwall direction (ayeT/Torox) emerged last and is the best fit because it matches the coin economy and dodges every approval gate; "no minimum" was verified from ayeT's publisher T&C (primary source), not a blog.*
