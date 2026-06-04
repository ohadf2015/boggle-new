# AdMob Banner — Bottom Positioning, Drawer Occlusion & CTA Clearance

**Date:** 2026-06-05
**Status:** spec → implementing

## Problem (user reports)
1. Banner should stick to the bottom when there is **no** mobile bottom tab.
2. When the side menu (header hamburger) opens, the banner should go **behind it / disappear**.
3. The banner must **never cover** UI elements / CTAs on game screens, results pages, or anywhere.

## Investigation findings
- The native AdMob banner is a `SurfaceView` composited **above** the WebView — CSS `z-index`
  can never cover it. The WebView must (a) **reserve** space (`--admob-banner-height`) and
  (b) **suppress** (hide) the banner, not paint over it.
- **Build state (decisive):** device build **5713** was built 2026-06-04 ~00:49 CEST. The single
  banner coordinator landed in `cb207b629` at 2026-06-04 21:49 — **~21h after the build**. The
  user's device runs the *pre-coordinator* per-component banner logic (the two-owner race that
  `cb207b629` fixed). **Much of what they see is fixed in the working tree but not in any shipped
  build — a new release is required to observe it.**
- Gameplay is already safe: `isAllowedAdBannerRoute` withdraws the banner on all `GAME_ROUTES`.

### Root theme
Bottom positioning / reservation / suppression are wrongly keyed off **"is the bottom-nav
present"** instead of **"is the banner present."**

| # | Symptom | Cause | Verdict |
|---|---------|-------|---------|
| 1 | lifts when no nav | `computeMargin` fallback reads the nav-height **CSS default** (`calc(64px+safe)`) | hardening (no named in-app route; nav writes `0px` when hidden) |
| 2 | banner over open side menu | drawer-suppress wired **per-owner (anchor only)**; the `slot` owner (`InlineBannerAd`, shown on results pages under the global `Header`) never suppresses | **real current-code bug** |
| 3 | covers bottom CTAs when nav hidden | clearance rule `html.has-global-bottom-nav body.screen-fit{padding-bottom}` is **nav-gated** | hardening (`--bottom-stack-height` self-zeros) |

## Design — key off banner presence, not nav presence
- **#2 (real):** add `setSuppressed(bool)` to `BannerController`; `reconcile` hides while suppressed
  and force-reshows on release. A **single** MutationObserver in `BannerCoordinatorMount`
  (always mounted on native, route-independent) maps `<html>.mobile-drawer-open` →
  `setSuppressed`. Covers anchor **and** slot uniformly. Remove the redundant per-owner block
  from `AnchoredNativeBanner` (move its test coverage to the controller/coordinator).
  `hideBanner()` is non-destructive (no `Closed`) → no content reflow behind the open drawer.
- **#1 (hardening):** trust the CSS-default fallback only on the **initial synchronous** margin
  call (the first-paint over-paint guard); the rAF re-eval + observer use **inline-or-zero** →
  "no nav signal ⇒ banner sticks to bottom."
- **#3 (hardening):** `AnchoredNativeBanner` toggles `<html>.has-admob-banner` when its height
  var is > 0; extend the clearance rule to fire for `has-admob-banner` too, so the banner band is
  reserved even when the nav is hidden.

## Out of scope
- Per-page CTA audits (the only banner-shown + nav-hidden surfaces are `/adventure` — already
  reserves its own `--admob-banner-height` — and internal `/admin`).
- Native plugin behavior / iOS patch (not built; see prior memory).

## Tests (TDD)
- `bannerController`: suppressed→hide; unsuppress→reshow active; suppress with no active = no-op.
- `BannerCoordinatorMount`: `mobile-drawer-open` add/remove → `setSuppressed(true/false)`.
- `AnchoredNativeBanner`: settled (rAF/observer) path ignores CSS fallback → margin 0 (Android: safeBottom) with no inline var; `has-admob-banner` toggled on SizeChanged >0 / reset on 0.
