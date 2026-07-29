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
   - **AdMob + AdSense Management APIs (REST)** — the PRIMARY unattended feed. One bearer
     token (scopes `admob.readonly` + `adsense.readonly`) serves both:
     - AdMob: `GET /v1/accounts` → `POST /v1/{account}/networkReport:generate` with a
       7-day `NetworkReportSpec` (`ESTIMATED_EARNINGS`, `IMPRESSIONS`, `IMPRESSION_RPM`).
       **Money is in micros** (÷1e6 → USD). Response is a `[{header},{row}…,{footer}]`
       array; pure `admob_report_signals()` sums earnings/impressions, means eCPM.
     - AdSense v2: `GET /v2/accounts` → `GET /v2/{account}/reports:generate?…metrics=EARNINGS&metrics=IMPRESSIONS`.
       Earnings is a DECIMAL string (not micros); pure `adsense_report_signals()` maps
       columns by header name and reads the totals row.
     - Token: `ADMOB_API_TOKEN` env if set, else `gcloud auth application-default
       print-access-token`. **VERIFIED 2026-05-30:** the repo's existing ADC returns
       **403 `ACCESS_TOKEN_SCOPE_INSUFFICIENT`** (default scope = cloud-platform only), so
       a one-time re-scoped login is required (see Setup below). Until then the collector
       notes the scope gap and falls back to (2)/(3).
   - **revenue snapshot file** `docs/nightly/intel/revenue-latest.json` — written by the
     interactive scraper (2); read + staleness-checked. FALLBACK when no API token.
   - **PostHog ad events** — `rewarded_ad_watched` 24h vs 7d daily avg (existing POSTHOG
     token) → ad-engagement signal even with zero revenue API.
   - All signals route to lane `09-monetization`; pure builders unit-tested without
     network (26 cases). Does NOT scrape Play *revenue* — no API exposes it (Play only
     has installs/vitals; revenue is GCS `gs://pubsite_prod_rev_*/earnings/` export only).
2. **`lib/pull-revenue-snapshot.sh`** (interactive Playwriter — mirrors
   `bing-ai-perf-scrape.sh`): FALLBACK for when the API token isn't provisioned. Drives
   AdMob/AdSense/Play consoles in the logged-in browser, writes `revenue-latest.json`.
   Skip-graceful when extension offline. Founder runs ad-hoc — NOT in the 00:00 run.

### Setup — enable unattended revenue (one-time, founder-only)
- **STEP 1 — DONE (2026-05-30):** AdMob API + AdSense Management API are ENABLED on GCP
  project `lexiclash` (#921426916910), done via Service Usage REST `services:batchEnable`
  with the ADC token (the `:enable` colon-verb 404s on dotted service names — use
  `batchEnable`). Both report `state: ENABLED`.
- **STEP 2 — founder browser action (REQUIRED, interactive):** re-scope ADC. An existing
  refresh token can't self-broaden scopes, so this needs OAuth re-consent:
  ```bash
  gcloud auth application-default login \
    --scopes=https://www.googleapis.com/auth/admob.readonly,https://www.googleapis.com/auth/adsense.readonly,https://www.googleapis.com/auth/cloud-platform
  ```
  (keep `cloud-platform` so GSC/lane-06 keeps working).
- **STEP 3 — link AdMob/AdSense to the GCP project (likely required):** the AdMob
  Management API only returns an account if the AdMob account is linked to a GCP project
  (AdMob console → Settings → "Link to a Google Cloud project" → pick `lexiclash`). Same
  pattern for AdSense. If `GET /v1/accounts` returns `{}` after step 2, this is why.
- **Verify:** `curl -H "Authorization: Bearer $(gcloud auth application-default
  print-access-token)" https://admob.googleapis.com/v1/accounts` → 200 with an account.

Alternative to step 2: set `ADMOB_API_TOKEN` in `~/.config/lexi-nightly/env` to a token
from a dedicated service account carrying those scopes.

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
