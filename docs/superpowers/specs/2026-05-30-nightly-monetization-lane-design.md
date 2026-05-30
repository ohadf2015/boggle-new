# Nightly Monetization / Revenue — Cross-Cutting Goal + Lane 09 (design)

Status: **implementing** · Owner: ohadfisher · Date: 2026-05-30

## Why

Founder directive: **earning money must be a MAIN nightly goal** — ad revenue (web H5
/ Android AdMob) AND education-institution upsell. Today the nightly loop optimizes
error-rate / engagement / UX / content / SEO; revenue is implicit at best. Make it
first-class.

## Current monetization surface (audit, 2026-05-30)

| Lever | State | Note |
|---|---|---|
| **AdMob (Android native)** | ✅ ON — primary | rewarded (6 surfaces) + interstitial (6 results pages) + banner. `lib/admob-config.ts`, `useAdMob`/`useRewardedAd`. Daily cap 5 watches = 1250 coins. |
| **H5 ads (web)** | ❌ OFF (gated) | `NEXT_PUBLIC_H5_ADS_ENABLED` unset; triple-gated in `useRewardedAd.ts:208`. Code ready, blocked on AdSense domain approval. Client `ca-pub-1896836706464880`. |
| **AdSense (web)** | ⚠️ REJECTED 2026-05-11 "low value content" | Lane 08 works thinness/structure toward re-submit. `public/ads.txt` provisioned. |
| **CrazyGames (portal)** | ✅ ON | CG-managed payout, opaque to app. |
| **Subscriptions / IAP** | 🚫 ABSENT | No Stripe, no Play Billing, coins earn-only (cannot buy). |
| **Education upsell** | 🚫 ABSENT | `/education/*` + `/teacher/*` all free. No pricing, no lead capture, no contact-sales. **Biggest untapped lever.** |

Analytics already track `rewarded_ad_offered/watched/declined`, `iap_viewed/purchased`
(`utils/growthTracking.ts`) — so monetization events exist even though IAP doesn't.

## Design — two mechanisms, cleanly separated

### A. Cross-cutting "standing priority" (makes revenue a MAIN goal)

"Keep it in mind" = cross-cutting, not one more lane. Two edits make every lane weigh
revenue:

1. **Central goal line** — `docs/specs/nightly-loop.md` Goal: add monetization/revenue.
2. **Standing-priority preamble** — add a `REVENUE` line to `nightly_artifact_contract()`
   in `lib/headless.sh`. That function is prepended to **every** lane prompt
   unconditionally (verified `headless.sh:137`), so all 8 existing lanes inherit it.
   (NOT `active-directives.md` — that is the *ephemeral* founder-texted file consumed
   per-run; wrong place for a permanent goal.)

The preamble is advisory ("when a change you're already making has a revenue angle,
prefer it") — it must NOT push other lanes to mint coins or jam ads. Hard money-touching
work stays owned by Lane 09 under its guardrail.

### B. Lane 09 — dedicated monetization work

Mirror Lane 08 (shell launcher + prompt). Sonnet, 900s cap, `posthog` MCP only.

**Owns (08 vs 09 boundary — no file races):**
- **08 = AdSense-approval content depth** on informational pages.
- **09 = ad-UX/placement optimization · education-institution upsell · IAP/subscription
  experiments (behind flags) · revenue-data review.** Lane 09 must NOT edit the
  informational pages 08 owns.

**HARD GUARDRAIL (reward-neutrality — advisor #4, parallels triage payment ban):**
- **NEVER** change coin-award amounts, ad-reward values, `coinManager`/`/api/coins`
  economy logic, daily caps, or any payment/billing path → **human queue only**.
- Ad-UX / placement / new ad surfaces ship **behind a flag**, retention-safe, respect
  AdMob frequency policy. No ad that interrupts the core word-finding loop.
- Education upsell = **lead-capture / contact-sales / pricing-inquiry** scaffolding
  (honest, no fake testimonials/stats), NOT a paywall on existing free features.
- Truthful framing only (no "0 ads", no fake ratings) — inherits existing rules.

This is the reward-neutrality discipline from cozy-mode v2, applied to money.

### C. Revenue intelligence (Phase 0) — unattended collector + interactive snapshot

The nightly run is **unattended at 00:00**; Playwriter needs a live logged-in Chrome
+ extension, so it CANNOT be the run-time feed. Split:

1. **`lib/intel/collect-revenue.sh`** (unattended, registered in `registry.sh`):
   token-aware, degrades to `stale_fallback`, never errors. Sources, best-to-none:
   - **AdMob Management API** (REST) — *if* `ADMOB_API_TOKEN` present (user provisions
     GCP OAuth; emit a one-line "provision token → auto revenue" hint when absent).
   - **revenue snapshot file** `docs/nightly/intel/revenue-latest.json` — written by (2);
     read + staleness-checked here.
   - **PostHog ad events** — `rewarded_ad_watched/offered/declined` 24h vs 7d (already
     reachable via existing POSTHOG token) → ad-engagement signal even with zero revenue
     API.
   - Emits signals routed to lane `09-monetization` (revenue/ad-engagement) so the brief
     carries them; pure signal builder unit-tested without network.
   - Does NOT try to scrape Play *revenue* from the Play Developer API — it isn't exposed
     there.
2. **`lib/pull-revenue-snapshot.sh`** (interactive Playwriter — mirrors
   `bing-ai-perf-scrape.sh`): the founder's "automate via playwriter" ask, done right.
   Drives AdMob console + Play Console + AdSense console in the logged-in browser, writes
   `revenue-latest.json`. Skip-graceful when extension offline. Run by founder ad-hoc or
   a daytime cron when logged in — NOT wired into the 00:00 run.

## Files

```
docs/specs/nightly-loop.md                              # EDIT goal line + lane table
scripts/nightly/lib/headless.sh                         # EDIT artifact-contract preamble
scripts/nightly/run.sh                                  # EDIT LANES array (+09)
scripts/nightly/lib/mcp-config.sh                       # EDIT +09 → posthog
scripts/nightly/lanes/09-monetization.sh                # NEW launcher
scripts/nightly/prompts/09-monetization.md              # NEW prompt (+guardrail)
scripts/nightly/lib/intel/registry.sh                   # EDIT +revenue collector
scripts/nightly/lib/intel/collect-revenue.sh            # NEW collector
scripts/nightly/lib/pull-revenue-snapshot.sh            # NEW interactive Playwriter
scripts/nightly/test/collect-revenue.test.sh            # NEW TDD test (pure)
```

## Test plan (TDD)
- `collect-revenue.test.sh`: pure signal-builder + staleness logic with no network —
  no-token path degrades cleanly, snapshot file parses to signals, PostHog-event signal
  shape valid, fingerprints stable. RED → GREEN.
- `registry.test.sh` already asserts the new entry's shape once added.
- Lane/prompt/snapshot are shell+markdown outside `fe-next/` → gate-clean; verified by
  `bash <test>` + `bash -n` syntax check.

## Out of scope (queued for founder)
- Provisioning AdMob/AdSense Management API GCP OAuth (user-only).
- Actually building an IAP / subscription product (lane experiments only).
- Daytime cron for `pull-revenue-snapshot.sh`.
