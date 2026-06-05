# Banner Occlusion — Structural Redesign (2026-06-05)

Follow-up to `2026-06-05-admob-banner-positioning-and-occlusion.md`. That round
added drawer-suppress + `--admob-banner-height` reservation. This round fixes the
**occlusion that survived it**, reported with three device screenshots:

1. **Single-player results** — native banner pinned at viewport bottom covering the
   "play"/next-step CTA bar.
2. **WordCraft** (`/word-craft`) gameplay — banner over the bottom action buttons.
3. **Stream/WordTower** (`/word-tower`) gameplay — banner over the letter tray + token button.

Plus: opening/closing the side menu a few times leaves the banner permanently hidden.

## Root causes (verified, not guessed)

| Symptom | Root cause | File |
|---|---|---|
| Banner over in-game UI (word-craft, word-tower) | Suppression is an **opt-out route blocklist** (`GAME_ROUTES`). These routes were never added → anchor banner shows over gameplay. Fragile by construction — every new game must be remembered. | `lib/admob-routes.ts` |
| Banner over results CTA | The **in-flow slot** owns it (anchor is route-suppressed on `/singleplayer`). `InlineBannerAd` computes `margin = max(0, innerHeight − slotBottom)`; when the slot is **below the fold** the distance clamps to **0**, so the "in-flow" banner degrades to a viewport-bottom overlay over the `fixed bottom-0` CTA bar. | `components/ads/InlineBannerAd.tsx:47` |
| Side menu → banner stays hidden | Native `@capacitor-community/admob` `showBanner()`/`resumeBanner()` does not restore visibility on the re-show path (returns without `call.resolve()`). JS `opTimeoutMs` already mitigates the chain-freeze; full fix is **native, release-gated (AAB)**. | native plugin |

Key correlation fact: `screen-fit-locked` (set by `NavigationContext` when `isInGame`)
is on **`document.body`**; `mobile-drawer-open` is on **`document.documentElement`**.
Adventure (`/adventure`) intentionally shows a banner during play (commit `c0451a6ff`,
reserves `--admob-banner-height`) and is the **only** intentional in-game banner.

## Design — two structural rules (replace per-route / per-CTA patching)

### Rule 1 — In-game suppression is opt-out, with one opt-in
Pure decision (unit-testable, mirrors `selectActiveBannerRequest`):

```ts
shouldSuppressBanner({ drawerOpen, inGame, allowInGame }) =
  drawerOpen || (inGame && !allowInGame)
```

`BannerCoordinatorMount` observes `<html>` (`mobile-drawer-open`, `banner-allow-in-game`)
**and** `<body>` (`screen-fit-locked`), recomputes on any class mutation, and calls
`bannerController.setSuppressed(shouldSuppressBanner(...))`. Global suppress is correct
here — during gameplay we want **no** banner regardless of owner.

The lone opt-in `banner-allow-in-game` is set by the component that actually **reserves**
banner space — `AdventureWheelGame` (mount → add class on `<html>`, unmount → remove).
Colocating the opt-in with the reservation keeps them honest: a screen may keep the
in-game banner **iff** it reserves room for it.

Result: word-craft, word-tower, and every future fullscreen game are occlusion-safe by
default with zero list maintenance. The `GAME_ROUTES` blocklist stays as a complementary
route-level gate (handles non-`screen-fit` game routes like lobbies); we no longer rely on
it to prevent in-game occlusion.

### Rule 2 — In-flow slot withdraws when off-screen (no bottom-pin)
`InlineBannerAd.apply()`: a native banner sits on the slot's footprint **only** when the
slot is fully within the viewport. So:

- slot footprint within viewport (`reservedHeight ≤ rect.bottom ≤ innerHeight`) → `setRequest(margin)`
- otherwise (below the fold / scrolled above) → `clearRequest`

The banner shows where it genuinely reserves space and never degrades to a viewport-bottom
overlay. Fixes all 5 results screens (they share `ResultsBannerSlot → InlineBannerAd`):
single-player, multiplayer, daily-challenge, daily-word-hunt, challenge, practice.

On `/singleplayer` results the slot starts below the fold → no banner → CTA fully visible.
Scrolling brings the slot into view → banner appears on the slot (mid-screen, above the
`pb-28` tail) → never reaches the `fixed bottom-0` CTA.

### Side-menu freeze — scoped, not claimed fixed
`opTimeoutMs` (live JS) already keeps the serialization chain flowing. The residual
"stays hidden after a few toggles" is the native re-show visibility bug → needs the native
patch in the next AAB. Documented here; not addressed by Rules 1–2.

## Files
- `lib/native/bannerController.ts` — add pure `shouldSuppressBanner` (+ tests).
- `components/ads/BannerCoordinatorMount.tsx` — observe body+html, compute suppression.
- `components/ads/InlineBannerAd.tsx` — off-screen withdrawal.
- `components/adventure/AdventureWheelGame.tsx` — set/clear `banner-allow-in-game`.

## Verification
Unit tests (pure fn + components). **Device-verify mandatory** post-deploy via Playwriter —
banner fixes have false-greened in vitest before; on-device observation is the source of
truth. Remote-URL app pulls JS from prod, so all four edits ship on web deploy (no AAB).
