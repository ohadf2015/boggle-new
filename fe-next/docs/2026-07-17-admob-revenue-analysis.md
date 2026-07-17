# AdMob Revenue Analysis & Monetization Levers — 2026-07-17

Source: live AdMob console (ohadf2015@gmail.com), 7-day window. One app: **LexiClash Android (Free)**.

## The numbers

| Metric | Value | Read |
|---|---|---|
| Estimated earnings (last month) | ₪3.31 (~$0.90) | Revenue is a rounding error today |
| **Active users (7d)** | **27** | The binding constraint on everything |
| Sessions / AU | 5.52 | — |
| Avg session | 4m 56s | Engagement is genuinely good |
| **Ad exposure / session** | **14.8%** | ~6 of 7 sessions serve zero ads |
| Requests / Impressions (7d) | 939 / 413 | — |
| Match rate | 55% | 45% unfilled — tunable, but noise at this volume |
| eCPM | ₪1.46 (~$0.40) | Normal for a word game — NOT the problem |
| app-ads.txt | 100% verified | Healthy |

### Earnings by ad unit (7d)
Banner-Content ₪0.30 · Rewarded-Retry ₪0.23 · Rewarded-Hint ₪0.04 · **Interstitial ₪0.02** · Rewarded-DoubleGold ₪0.02

## Diagnosis: this is a traffic problem, not an ad-tuning problem

Revenue ≈ `AU × sessions × ad-exposure% × impressions × eCPM × fill`. The leak is in the **top two multipliers** (27 users, 14.8% exposure), not eCPM or fill. Tuning eCPM/fill here is polishing a faucet with no water pressure.

**Key structural fact:** AdMob **interstitials are native-only** (Capacitor SDK) — a web/desktop player can *never* serve one. Rewarded ads DO run on web (CrazyGames→AdMob→H5→ayeT→GameDistribution) and banners run on web (AdMob→AdSense). So converting a web player to a native install is the single highest-value monetization move: it unlocks the interstitial inventory + higher-value AdMob rewarded + higher retention.

⇒ **Growing installs = the #1 AdMob lever.** That's why the shipped work widens app promotion.

## Shipped this session

1. **Android app promo now reaches desktop + mobile-web** (was Android-browser-only). Hidden on iPhone/iPad (no Android app to install there) and in-app webviews. One central UA helper (`isAndroidInstallPromoUA`) routes both promo gates → no asymmetric-path drift. Desktop players are now funneled toward the native install (interstitial/rewarded-reachable).
2. **iOS Safari "Add to Home Screen" hint** — iPhone can't fire `beforeinstallprompt`, so iPhone users previously got *no* install path at all. Added an instructional A2HS banner (engaged users, 6 langs) so iPhone players can install the PWA → more sessions → more web banner/rewarded impressions.

## Direct AdMob lever — needs your OK (outward-facing)

**sellers.json → "Transparent".** The console recommends it. Transparent seller info draws more programmatic demand → higher eCPM, zero UX change. **Caveat:** it publishes your seller *name* publicly. Confirm it's a business name, not a personal legal name, before flipping. Not auto-toggled.

## Deferred direct levers (deliberately NOT changed — documented)

- **Interstitial cadence** (warmup 3 games, then every 3rd, max 4/session): defensible at game-end, but blind-tuning at N=27 is statistical noise and risks a Google interstitial-policy flag. Revisit once installs grow.
- **`tier === 'unknown'` suppresses interstitials** (`lib/families/adPolicy.ts`): this is the real interstitial gate, but the fix is **age-gate completion**, not removing a COPPA child-safety guard. New users sit at `unknown` until they pass the gate → no interstitials. Worth measuring age-gate completion before acting.
- **Web-rewarded fill** (ayeT / GameDistribution / H5): earnings live in *separate* dashboards, not AdMob — so "web = low value" is unverified. If those providers are no-filling, that's a real leak on existing web traffic. Verify before chasing.

## Bottom line
At 27 users, the fastest path to real AdMob revenue is more installs, then native conversion. Ad-cadence micro-tuning pays nothing until the user base is 5–10×.
