## Overview
The landscape experience has been refined for responsiveness, readability, accessible touch targets, navigation parity, media scaling, and input behavior across phones, tablets, and desktops.

## Key Changes
- Layout responsiveness
  - `fe-next/app/globals.css`: `.landscape-side-panel` now uses `width: clamp(120px, 18vw, 180px)`; ultra-short heights allow `.game-layout-landscape` wrapping.
- Text readability
  - `fe-next/app/globals.css`: `.text-landscape-sm`/`.text-landscape-xs` use `clamp()`; increased line-height on `.landscape-stat-*`.
- Touch target sizes
  - `fe-next/app/globals.css`: Enforced `min-height/min-width: 48px` for `button`, `a[role="button"]`, and inputs across landscape, including desktop heights; grid cells raised towards `48px`.
- Navigation consistency
  - `fe-next/components/landing/LandingView.tsx`: `Header` is rendered in both orientations; compact sizing handled via CSS.
- Content scaling
  - Board remains square via `aspect-ratio: 1/1` using `min(dvh, vw)` constraints; avatars/images use `object-fit` to avoid distortion.
  - `fe-next/components/Avatar.tsx`: `sizes` hints updated for mobile widths.
- Input accessibility
  - `fe-next/app/globals.css`: Inputs in landscape use `font-size: 16px` and `min-height: 48px`; `keyboard-scroll-target` uses `scroll-margin-bottom: clamp(...)` with safe-area.

## Testing
- Extended landscape viewports and assertions in Playwright:
  - `fe-next/e2e/ui-buttons-scrolling-test.spec.ts`: added devices including `736x414`, `896x414`, `1024x600`, `1280x800`, `1366x768`, `1920x1080`.
  - Verifies header visibility on landing, no horizontal scroll, hover/active feedback, and touch target sizes `>= 48px`.
- Screenshots
  - Saved under `fe-next/test-results/` (e.g., `landing-*.png`, `singleplayer-lobby-*.png`, `multiplayer-lobby-*.png`).

## Before/After Highlights
- Landing (phones, tablets, desktop landscape)
  - Before: header hidden in landscape on landing; smaller 40–44px controls.
  - After: compact header present; controls meet `48x48`; content fits without horizontal scroll.
- Multiplayer lobby
  - Before: some buttons at `44px` height on desktop landscape.
  - After: landscape rule enforces `48px` minimums; consistent focus-visible rings.
- Game board
  - Before: risk of overlap on very short landscape heights.
  - After: side panel clamp and layout wrap prevent overlap; grid remains square.

## Files Touched
- `fe-next/app/globals.css`
- `fe-next/components/landing/LandingView.tsx`
- `fe-next/components/Avatar.tsx`
- `fe-next/e2e/ui-buttons-scrolling-test.spec.ts`

## Accessibility Notes
- Touch targets follow the `48x48` recommendation across landscape.
- Focus indicators use `:focus-visible` with high-contrast support.
- Inputs avoid iOS zoom (`>=16px`) and remain visible when the keyboard opens.
