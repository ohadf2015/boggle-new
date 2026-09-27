# Spec — SSR-fast experiment variants via client cookie seed (fixes slow homepage cube images)

**Date:** 2026-06-13
**Trigger:** "the images on the homepage in the cube take too long to load … if you have a solution for all make something more generic."

## Problem (measured, not assumed)

Live measurement on `www.lexiclash.live` (logged out):

| Fact | Value |
|---|---|
| Cube image format served | AVIF ✓ (optimizer working) |
| Transfer size per cube | 6.5–27 KB (15 cubes ≈ 175 KB total) |
| **First cube request fires at** | **t = 8334 ms** |
| FCP | 2644 ms |
| Raw SSR HTML occurrences of `cubes` | **0** |

So payload is a non-issue. The cube grid (`LandingModeCubes`, `/modes/cubes/*.png`) is gated behind the
**client-side** experiment `landing-modes-cubes-v1`. Until the flag resolves, the page renders `control`
(old `/modes/*.png` cards, which the SSR HTML *does* preload). The flag resolves via PostHog ~8 s into load
(`usePostHogFlag` → `posthog.getFeatureFlag` in a `useEffect`), so the variant flips control→cubes at 8 s and
cube images only then start fetching.

Note: experiment is at **0 % rollout**, forced for dev emails only — but the same client-flag delay will hit
every consented user once it rolls out, and the dev (the user) hits it on every visit to their own site today.

## Constraints that shape the fix

- **Consent model:** PostHog inits `opt_out_capturing_by_default: true` → flags don't load until consent.
  Cannot server-*evaluate* flags for non-consented (esp. first-time) users, and shouldn't bucket them.
- **ISR:** the homepage server component is ISR-cached. Reading `cookies()` server-side de-opts it to dynamic
  rendering → slower TTFB for ALL users (the control majority) to fix timing for a subset. Rejected.
- `cardsReady` is `true` on SSR, so the grid already renders server-side — the only late thing is the variant.

## Approach — client cookie "variant replay" (consent-safe, generic, contained)

Do not server-evaluate flags. Instead **replay the variant the client already legitimately resolved**, via a
cookie, seeding the hook's `useState` initial value so the **first client render** uses the bucketed variant
instead of waiting ~8 s for PostHog.

1. Once `useExperiment` resolves a **non-default** variant (PostHog OR email override), persist it to a cookie
   `exp_<key>=<variant>` (30 d, path=/, SameSite=Lax).
2. On every render, `useExperiment` reads that cookie synchronously (client-only) and passes it as the
   `initialValue` of `usePostHogFlag`'s `useState`.

Result for a returning, already-bucketed visitor:
- First client paint (~hydration, ~2.6 s) renders cubes — no 8 s wait, no jarring control→cubes flash.
- Cube AVIFs fetch at ~2.6 s instead of 8.3 s (~5.5 s faster).

First-time / non-consented visitor: cookie absent → `control` → unchanged, already fast, consent-respecting.

This is generic: every `useExperiment` consumer gets first-paint-correct variants + no flash, with zero
PostHog/consent/SSR changes.

### Why not put images in SSR HTML (true preload, ~1 s)?
Would require knowing the variant server-side = `cookies()` = ISR de-opt for all users. Not worth it for a 0 %
experiment. The client seed captures the bulk of the win (8.3 s → 2.6 s) with no collateral cost.

## Files

**New**
- `fe-next/lib/experiments/variantCookie.ts` — `variantCookieName(key)`, `persistVariant(key, variant)`
  (client-only, SSR-guarded, skips redundant writes), `readVariantCookie(key)` (client-only, validates value
  via `isValidVariant`, returns `undefined` for junk/unknown).

**Edit**
- `fe-next/hooks/usePostHogFlag.ts` — add optional 3rd param `initialValue?: T`; `useState(initialValue ?? defaultValue)`.
- `fe-next/hooks/useExperiment.ts` — seed `usePostHogFlag` initial from `readVariantCookie(key)`; add effect that
  calls `persistVariant(key, variant)` when `variant !== fallback`.

## Tests (TDD, written first)

- `variantCookie.test.ts`: name format; `readVariantCookie` returns valid variant, `undefined` for junk/unknown
  variant/missing/ SSR (no document); `persistVariant` writes cookie, no-ops on SSR, skips redundant write.
- `usePostHogFlag.test.ts` (new): uses `initialValue` as initial state; falls back to `defaultValue` when omitted.
- `useExperiment.test.ts` (extend): seeded cookie → passed as initial to `usePostHogFlag`; persist effect writes
  cookie when variant non-default; does NOT write when variant equals default.

## Out of scope (documented follow-ups)
- Animated mascot WebPs (256×256, 180–560 KB, `unoptimized`, shown ~64 px) — broad payload win, but `unoptimized`
  is deliberate (sharp flattens animated WebP to frame 1). Needs static-poster-then-animate or downscale. Separate effort.
- Reducing the ~2.6 s hydration floor (JS bundle) — not image-specific.
- Promoting cubes to SSR default / ending the experiment — product decision, not a perf fix.
