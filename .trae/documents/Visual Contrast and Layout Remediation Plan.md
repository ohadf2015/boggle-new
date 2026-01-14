## Current Findings (From Codebase Audit)
- **Theme system**: Class-based `html.light` / `html.dark` with CSS variables in [globals.css](file:///Users/ohadfisher/git/boggle-new/fe-next/app/globals.css) and Tailwind mappings in [tailwind.config.js](file:///Users/ohadfisher/git/boggle-new/fe-next/tailwind.config.js).
- **High-likelihood contrast failures**:
  - Buttons: `secondary`/`destructive` use `text-neo-white` on `bg-neo-pink` / `bg-neo-red` in [button.tsx](file:///Users/ohadfisher/git/boggle-new/fe-next/components/ui/button.tsx#L30-L62) and token CSS vars in [globals.css](file:///Users/ohadfisher/git/boggle-new/fe-next/app/globals.css#L224-L240).
  - Dialog title/description are hardcoded to black (`text-neo-black`) inside a dark-mode dialog (`dark:bg-neo-navy`) in [dialog.tsx](file:///Users/ohadfisher/git/boggle-new/fe-next/components/ui/dialog.tsx#L169-L200).
  - Link buttons use `text-neo-cyan` (low contrast on light backgrounds) in [button.tsx](file:///Users/ohadfisher/git/boggle-new/fe-next/components/ui/button.tsx#L49-L55).
- **High-likelihood overlap bugs**:
  - Radix dialogs are `z-50` while the sticky header is `z-[60]`, so modals can appear behind the header ([dialog.tsx](file:///Users/ohadfisher/git/boggle-new/fe-next/components/ui/dialog.tsx#L20-L83), [Header.tsx](file:///Users/ohadfisher/git/boggle-new/fe-next/components/Header.tsx#L101-L110)).
  - Multiple independent z-index “scales” exist (50/60/100/9999+), raising the chance of unpredictable stacking.
- **High-likelihood responsive issues**:
  - Several touch targets are <44px: e.g. dismiss `w-7 h-7` ([ModeDiscoveryBanner.tsx](file:///Users/ohadfisher/git/boggle-new/fe-next/components/landing/ModeDiscoveryBanner.tsx#L56-L64)), small icon controls in header, and some 36px minima.
  - Landscape game layouts use absolute side-panels + large inline padding clamps, called out as critical in [UI_UX_AUDIT_REPORT.md](file:///Users/ohadfisher/git/boggle-new/fe-next/docs/UI_UX_AUDIT_REPORT.md#L64-L112).
  - Potential horizontal overflow sources include `100vw` calculations + thick borders/shadows (e.g. `.game-board-frame`) in [globals.css](file:///Users/ohadfisher/git/boggle-new/fe-next/app/globals.css#L733-L802).
- **Automation already exists**: A Playwright suite checks contrast/touch targets/layout and captures screenshots in [ui-issues-detection.spec.ts](file:///Users/ohadfisher/git/boggle-new/fe-next/e2e/ui-issues-detection.spec.ts).

## Scope and Principles
- Fix **all confirmed AA contrast failures** (4.5:1 normal text) in both light and dark modes.
- Establish a **single layering contract** (z-index tiers) so dialogs, drawers, menus, toasts, tooltips, and FABs never stack unpredictably.
- Resolve **overlaps/clipping/overflow** by preferring layout (grid/flex) over absolute positioning where feasible.
- Enforce **touch target minimums** (44px minimum; use 48px where consistent with existing button sizing).

## Implementation Plan
### 1) Instrumentation and Issue Discovery (DevTools + Automated)
- Run the app locally and use browser devtools to:
  - Inspect computed `color`/`background` pairs for failing text.
  - Use the rendering/scrolling overlays to find overflow sources.
  - Inspect stacking contexts (positioned parents, transforms, portals) for overlap.
- Expand the existing Playwright checks to reduce false negatives:
  - Improve contrast evaluation by computing **effective background** (walk up DOM to first non-transparent background) and handle `rgba()` alpha.
  - Add coverage for key routes beyond landing + singleplayer (game, daily, auth modal flows) and capture per-viewport screenshots.
  - Run tests in **chromium + webkit** to cover Chrome/Safari behavior.

### 2) Contrast Fixes (Tokens First, Then Components)
- **Normalize semantic tokens** in [globals.css](file:///Users/ohadfisher/git/boggle-new/fe-next/app/globals.css):
  - Update button/badge text tokens for saturated backgrounds (e.g., pink/red) to use `neo-black` where required for AA.
  - Add missing/insufficient light-mode overrides for interactive tokens so `light` mode never yields light-on-light.
- **Update core UI primitives** to be theme-aware:
  - Buttons: adjust `secondary`, `destructive`, `ghost`, and `link` variants in [button.tsx](file:///Users/ohadfisher/git/boggle-new/fe-next/components/ui/button.tsx) to ensure AA in both modes.
  - Dialog: make `DialogTitle`/`DialogDescription` respect dark mode in [dialog.tsx](file:///Users/ohadfisher/git/boggle-new/fe-next/components/ui/dialog.tsx), and ensure header variants choose appropriate foreground colors.
- Sweep for localized hardcoded contrast issues and migrate to tokens:
  - Example: “white on pink” CTA in [DailyChallengeInlineSignup.tsx](file:///Users/ohadfisher/git/boggle-new/fe-next/components/auth/DailyChallengeInlineSignup.tsx#L449-L463).

### 3) Layering / Overlap Fixes (Z-Index Contract)
- Define a simple layering scale (example):
  - base content < sticky header/nav < drawers/menus < dialogs < tooltips/toasts/tutorial.
- Apply it consistently:
  - Raise Radix dialog overlay/content above sticky header by updating [dialog.tsx](file:///Users/ohadfisher/git/boggle-new/fe-next/components/ui/dialog.tsx).
  - Align `MobileDrawer`, bottom nav, header menu portal, auth dropdown, and tutorial tooltip to the same scale (reduce arbitrary 9999+ where safe).
  - Fix known overlap hot spots from [UI_UX_AUDIT_REPORT.md](file:///Users/ohadfisher/git/boggle-new/fe-next/docs/UI_UX_AUDIT_REPORT.md) (Tutorial FAB vs mobile menu, safe-area insets).

### 4) Responsiveness + Touch Targets + Overflow
- Touch targets:
  - Raise all interactive controls below 44px to 44–48px (header icons, dismiss buttons, small arrows) and validate via the Playwright suite.
- Landscape game layout:
  - Replace “reserve side space via padding clamps” with a grid/flex layout that guarantees non-overlap.
  - For extremely short landscape, progressively collapse/stack side panels or allow scrolling within panels instead of overlapping center grid.
- Horizontal overflow:
  - Fix `100vw`/border/shadow overflow sources (e.g., `.game-board-frame`), and ensure containers use `box-sizing: border-box` and `max-width` constraints.
  - Remove/avoid relying on `overflow-x: hidden` as a mask; fix the element causing overflow.

## Verification (Required by Your Spec)
- **Before/after screenshots**:
  - Use Playwright to generate deterministic screenshots per page + viewport, saved under a `docs/visual-fixes/` folder (or `test-results/` mirrored into docs).
  - Capture at least: Landing, Singleplayer, In-game (portrait/landscape), Auth modal, Daily results.
- **Multi-device/breakpoint**:
  - Validate with the existing “critical viewports” set in [ui-issues-detection.spec.ts](file:///Users/ohadfisher/git/boggle-new/fe-next/e2e/ui-issues-detection.spec.ts#L395-L402) plus one tablet breakpoint.
- **Multi-browser**:
  - Run Playwright in `chromium` and `webkit`.
- **Accessibility automation**:
  - Use the improved Playwright contrast checker as a baseline gate.
  - (Optional enhancement) add an axe-based audit only if the repo already adopts it; otherwise keep checks Playwright-native.

## Deliverables (What I Will Produce)
- **Comprehensive issue report**: new markdown doc summarizing each issue, route/component, root cause, and linked screenshots.
- **Implemented fixes**:
  - Updated theme tokens and core UI primitives.
  - Z-index contract applied across overlays.
  - Responsive layout + touch-target fixes in identified hotspots.
- **Updated style guide documentation**:
  - Extend [design-tokens.md](file:///Users/ohadfisher/git/boggle-new/fe-next/docs/design-tokens.md) with a “contrast-safe pairs” section and a “layering scale” section.
- **Regression test plan**:
  - Document how to run the UI issue suite, what viewports/browsers are covered, and how failures are triaged.
  - Enhance Playwright checks so contrast/overflow/touch-target regressions fail CI reliably.

## First Fix Set (Order)
1) Dialog z-index + dialog title/description dark-mode contrast (high-impact, low-risk).
2) Button variants (secondary/destructive/ghost/link) + token corrections.
3) Touch target violations in header + landing dismiss/CTA hotspots.
4) Landscape side panel overlap + board overflow fixes.
5) Sweep remaining contrast/overflow issues found by updated automated scans.
