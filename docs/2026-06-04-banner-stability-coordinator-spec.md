# Banner Ad Stability — Single-Owner Coordinator + Recovery

**Date:** 2026-06-04
**Status:** spec → implement
**Symptom (user):** "banner sometimes hides after refresh or screen changed."

## Root causes (investigated, not guessed)

The native refresh-no-fill destroy bug was already patched (`bannerHasLoaded` guard,
commit `92d6ed032`, Android prod `versionCode 5713`). User still sees disappearance →
distinct remaining causes:

1. **Two-owner race (screen change).** One native banner instance, two uncoordinated
   JS owners:
   - `AnchoredNativeBanner` — mounted **globally** (`app/essential-providers.tsx:226`),
     active on every allowed (non-game) route, shows `variant:'content'` anchored above
     the bottom nav.
   - `InlineBannerAd` — rendered on ~50 content routes (blog, words, leaderboard, guides,
     faq, glossary, landing, results) **and** game-route results pages, shows over an
     in-flow slot. Defaults `variant:'game'` (omitted on every content call site).

   On any allowed route that renders an `InlineBannerAd`, **both** drive the single
   plugin banner with different margins *and* different ad-unit variants. `InlineBannerAd`
   does `hideBanner()`→`showBanner()` on mount/scroll/resize and `hideBanner()` on unmount;
   if `AnchoredNativeBanner` does not re-assert (its `margin === lastMargin` early-return
   usually skips), the banner stays hidden → "disappears on screen change."

   Latent corollary: on results pages (game routes) `AnchoredNativeBanner`'s game-route
   branch calls a **global** `hideBanner()` that can clobber `InlineBannerAd`'s banner.

2. **No recovery after a transient initial no-fill (after refresh / cold show).** The
   native patch only suppresses `FailedToLoad` *after* a successful load (`bannerHasLoaded`).
   The **initial** no-fill still destroys the AdView and emits `FailedToLoad`; JS handles it
   by collapsing the reservation and **never retries**. A single transient no-fill → banner
   gone until the next navigation. External/probabilistic; cannot reproduce in dev (test ads
   fill 100%).

3. **iOS native patch never built/shipped** (Android-only pipeline). iOS still destroys the
   banner on *every* refresh no-fill. Native — out of scope for this JS change; a JS retry
   (below) partially compensates. **Required follow-up: trigger an iOS build.**

## Design — single coordinator (`lib/native/bannerController.ts`)

A module-singleton coordinator owns the one native banner. Components declare *intent*
instead of calling show/hide directly.

### Pure core (unit-tested in isolation)
```ts
type BannerVariant = 'game' | 'content';
interface BannerRequest { margin: number; variant: BannerVariant; priority: number }
// Highest priority wins; null when no owner wants it visible.
function selectActiveBannerRequest(reqs: Record<string, BannerRequest>): BannerRequest | null
```
Priorities: `SLOT` (InlineBannerAd) = 2 > `ANCHOR` (AnchoredNativeBanner) = 1.
→ When both present, the in-flow slot wins. When the slot owner releases (navigation/unmount),
the coordinator **falls back to the anchor request** and re-shows — banner never goes blank.

### Stateful coordinator (injected ops, serialized, testable with fake timers)
- `setRequest(key, req | null)` / `clearRequest(key)` — owners push intent; triggers reconcile.
- `reconcile()` — **serialized** via a promise chain (no overlapping show/hide). Computes the
  active request, diffs against last-applied `{visible,margin,variant}`; only calls
  `ops.hide()` / `ops.show(margin,variant)` when the applied state actually changes (coalesces
  rapid scroll/mutation churn).
- `notifyLoaded()` — clears retry budget (healthy).
- `notifyFailed()` — initial no-fill: if active request is still visible, schedule a **bounded
  backoff retry** (`retryDelaysMs = [1500, 4000, 10000]`), forcing a reconcile that re-shows.
  Budget resets on `notifyLoaded`, new `setRequest`, or `reassert` (so it never permanently
  gives up and never loops past the cap).
- `reassert()` — app foreground / WebView visible: re-run reconcile if active request is visible.

### Wiring (`components/ads/BannerCoordinatorMount.tsx`, rendered once next to AnchoredNativeBanner)
- Injects `ops = { show: showBanner, hide: hideBanner }` (existing `useAdMob` fns — preserves
  all current repaint-kick / race / height-cap behavior).
- Attaches once: `BannerAdPluginEvents.Loaded`→`notifyLoaded`, `FailedToLoad`→`notifyFailed`,
  Capacitor `App` `resume`→`reassert`, `document` `visibilitychange`(visible)→`reassert`.

### Component changes (keep all margin/drawer/collapse logic; swap only the show/hide calls)
- `AnchoredNativeBanner`: allowed route → `setRequest('anchor', {margin, variant:'content', priority:1})`;
  game route / drawer-open → `clearRequest('anchor')` (NOT a global hide). Keeps `--admob-banner-height`
  management via the existing SizeChanged listener.
- `InlineBannerAd`: mount/scroll/resize → `setRequest('slot', {margin, variant, priority:2})`;
  unmount → `clearRequest('slot')` (anchor takes over instead of blanking).

## Out of scope
- Changing content-page ad-unit variant economics (the `'game'` default mismatch) — stability
  fix only; coordinator just makes the active owner's chosen variant authoritative.
- iOS native build (separate release task).

## Verification
- TDD: pure selector + coordinator (fake ops + fake timers) — priority, fallback-on-release,
  coalescing, bounded retry + reset, reassert.
- `npm run lint && npm run test:frontend && npm run build`.
- **Cannot device-verify** real-fill/native behavior locally (test ads = 100% fill). JS logic
  unit-verified only; do not claim live-verified.
```
