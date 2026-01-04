## Current State
- Framework: `Next.js` App Router, `TailwindCSS`, `shadcn/ui` with Radix.
- Orientation handling: CSS media queries in `fe-next/app/globals.css` and runtime hook `fe-next/hooks/useMobileLandscape.ts`.
- Key gaps:
  - Touch targets in landscape often `40–44px` (< `48px` target).
  - `LandingView` hides `Header` in landscape, reducing navigation consistency.
  - Very short landscape (≤450–600px height) compresses panels/buttons.

## Goals
- Layout responsiveness: preserve structure and spacing across landscape heights and widths.
- Text readability: consistent font sizes/line heights and contrast in landscape.
- Touch target sizes: minimum `48x48` for interactive elements.
- Navigation consistency: same access patterns and functionality in both orientations.
- Content scaling: square game board and non-distorting media.
- Input accessibility: visible focus, safe-area padding, >=16px font, `>=48px` height.

## Implementation Plan
### 1) Layout Responsiveness
- Update landscape CSS tiers in `fe-next/app/globals.css`:
  - Use `clamp()` for side panel width: `min-width`/`max-width` → `width: clamp(120px, 18vw, 180px)` on `.landscape-side-panel`.
  - Allow wrapping on ultra-short heights: add `.game-layout-landscape { flex-wrap: wrap; }` when `max-height: 450px` to prevent overlap.
  - Ensure `main/header/footer` maintain `position: relative` and `overflow-x` hidden in landscape tiers.
- Harmonize landscape spacing utilities:
  - Tighten `.p-landscape-compact`, `.gap-landscape-compact`, and `.ultra-compact-landscape` to trigger at `<=600px` and `<=450px` consistently.
- Keep square grid with `aspect-ratio: 1/1` and `min(vw,dvh)` sizing; preserve scrollable lists via `.word-list-landscape`/`.leaderboard-landscape`.

### 2) Text Readability
- Define landscape text scales using `clamp()` in `globals.css`:
  - `.text-landscape-sm`: `font-size: clamp(0.9rem, 1.2vw, 1rem)`; `.text-landscape-xs`: `clamp(0.75rem, 1.1vw, 0.875rem)`.
  - Stats: `.landscape-stat-primary`/`secondary` keep strong weights; ensure `line-height` ≥ `1.15` outside ultra-compact tier.
- Confirm contrast:
  - Retain `prefers-contrast: high` overrides; audit `--foreground`/`--background` contrast against WCAG AA in landscape screenshots.

### 3) Touch Target Sizes
- Raise landscape minimums to `48px`:
  - `button, a[role="button"], input, select, textarea`: `min-height/min-width: 48px` in `@media (orientation: landscape)`.
  - Header controls: ensure `min-width/min-height: 48px` (replace existing `40px`).
  - Grid cells: target `min(48px, calc(availableWidth / N))`; keep graceful fallback when space is insufficient but bias to `48px`.
- Expand padding for non-icon buttons to maintain comfortable hit areas.

### 4) Navigation Consistency
- Render compact `Header` in landscape where it’s currently hidden:
  - In `fe-next/components/landing/LandingView.tsx`, show `Header` with compact classes (`landscape` variants) or add a floating menu button that opens the existing mobile drawer.
- Ensure equivalent links exist in both orientations (Settings, Rules, Leaderboard, Profile, Daily, Multiplayer/Singleplayer).
- Respect RTL with existing `rtl:` classes and locale-aware paths (`/${language}/...`).

### 5) Content Scaling
- Keep `aspect-ratio: 1/1` for the game board and use `min(…dvh, …vw)` bounds to avoid distortion.
- Standardize media fit:
  - `Avatar`/thumbs remain `object-cover` within masks; decorative/illustrations use `object-contain`.
  - Verify `next/image` `sizes` attributes include landscape cases to minimize CLS.

### 6) Input Field Accessibility
- Enforce `font-size: 16px` and `min-height: 48px` for inputs in landscape.
- Confirm `focus-visible` rings across input/button components (`fe-next/components/ui/input.tsx`, `FormField.tsx`).
- Add `scroll-margin-bottom: clamp(64px, env(safe-area-inset-bottom, 16px), 96px)` to inputs to avoid keyboard overlap in landscape.
- Ensure safe-area utilities are applied on forms shown near screen edges via `GamePageWrapper` or page containers.

## Testing Plan
- Extend Playwright E2E specs:
  - Viewports: `736x414`, `812x375`, `844x390`, `896x414`, `1024x600`, `1280x800`, `1366x768`, `1920x1080`.
  - Assertions:
    - Layout: no horizontal scroll; panels wrap appropriately on `<=450px` height.
    - Text: computed font sizes within `clamp` ranges; contrast via pixel checks (optional) and visual review.
    - Touch targets: bounding boxes for buttons/inputs/grid cells `>=48px` both dimensions.
    - Navigation: `Header` or menu button present; links resolve to locale paths; RTL alignment checks.
    - Content scaling: game board bounding box maintains `width ≈ height` within tolerance; media `object-fit` avoids distortion.
    - Inputs: `focus-visible` outline visible; `font-size >= 16px`; safe-area padding not overlapping.
  - Capture screenshots before/after per viewport; store under `test-screenshots/landscape/*` and use `toHaveScreenshot` where practical.
- Reuse existing files:
  - `fe-next/e2e/ui-buttons-scrolling-test.spec.ts`, `game-types-ui-verification.spec.ts`, `game-bugs-and-ui-issues.spec.ts`, `landscape-ux-improvements.spec.ts`.
  - Add parameterized viewport matrices and new assertions.

## Documentation
- Create `docs/landscape-ux.md`:
  - Summary of changes by category (layout, text, touch, nav, media, inputs).
  - File references (e.g., `fe-next/app/globals.css`, `fe-next/components/landing/LandingView.tsx`, `fe-next/components/ui/input.tsx`).
  - Before/after screenshots for key components at `phone`, `tablet`, `desktop` landscape sizes.
  - Accessibility notes (WCAG touch target and contrast).

## Deliverables
- Updated CSS and component tweaks implementing the six areas above.
- Playwright tests covering landscape across multiple devices/resolutions with screenshots.
- Documentation with before/after comparisons and precise file references.

## Rollout & Verification
- Implement changes in small PRs grouped by category (layout/touch targets/nav).
- Run `npm run test:e2e` across all projects, review screenshots and fix regressions.
- Optional: add a temporary experimental feature flag to toggle compact header in landscape on landing, remove after validation.
