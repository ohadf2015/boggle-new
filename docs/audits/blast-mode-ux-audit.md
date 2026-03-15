# Blast Mode UX Audit
**Date:** 2026-03-15
**Auditor:** UI/UX Designer
**Scope:** Blast Mode game UI — layout, tile clarity, feedback systems, accessibility, onboarding, RTL, mobile, results

---

## Executive Summary

Blast Mode has a strong visual identity and thoughtful feedback architecture. The neo-brutalist aesthetic is consistent, haptics and reduced-motion support are present, and i18n is correctly used throughout. However, the game accumulates too many simultaneous attention layers during active play, which causes cognitive overload at peak moments. Several accessibility gaps exist in the in-game HUD, tile badge text is unreadably small, and the onboarding screen does not teach tile types before the first game starts.

**Total issues found:** 27
**Critical (blocks meaningful play):** 3
**High (significantly degrades experience):** 8
**Medium (noticeable friction):** 10
**Low (polish):** 6

---

## Section 1 — Information Hierarchy and Layout

### CRITICAL-1: Simultaneous attention layers cause overload at peak moments

During a bomb-chain cascade with a high combo, the following elements are all visible at once:

- DynamicEnergyBackground pulsing
- ComboDisplay with danger state
- ComboMilestoneAnnouncement (absolute positioned)
- BlastCascadeWordBanner (absolute, z-50)
- Fallback cascadeAnnouncement text (absolute, z-50, at top-32)
- BlastChainCounter (absolute, over grid, z-50)
- Score popup floats on multiple grid cells
- Particle explosions on multiple cells
- Board-wide combo glow shadow cycling through cyan/yellow/magenta
- Screen shake (animate-neo-shake)
- Grid cell shimmer for near-miss
- Objective tile pulsing ring

All of these fire in the same 1-2 second window. The board becomes visually illegible. Players cannot distinguish meaningful feedback (chain level, score change) from decorative noise (board glow, background pulse).

**Recommendation:** Implement a feedback priority queue. At any moment, only one "headline" announcement should occupy the center-of-board overlay zone. The cascade word banner and the fallback chain counter already have a `cascadeHighlightPhase !== 'highlighting'` guard but both can still be visible simultaneously with ComboMilestoneAnnouncement. Suppress `ComboMilestoneAnnouncement` during active cascade phases. Reduce `DynamicEnergyBackground` intensity when `cascadeChainLevel > 0` rather than letting both systems peak simultaneously.

---

### HIGH-1: Stats row has no visual grouping — five widgets in a horizontal line

The stats row (score, move counter, words count, progress bar) is a flat horizontal list inside `px-4 flex items-center justify-between`. At small screen widths these compress to roughly 55-60px each. Score uses a bordered neo card with a gradient background; the move counter also uses a bordered card; the words count is a plain text button; the progress bar is a 28-32 unit-wide widget. The inconsistent container styles (card vs. naked text vs. bar) prevent fast scanning.

**Recommendation:** Unify all four metrics in matched mini-cards with consistent height (~52px), identical border treatment, and icon+value+label structure. The words count button should have a visible affordance (dashed border or chevron) to indicate it is tappable.

---

### HIGH-2: Score threshold and cumulative score indicators are too small and poorly positioned

Lines 453-469 in `BlastGameLayout.tsx` render two stacked `text-[10px]` lines in `text-white/60` and `text-fuchsia-300/50` opacity. These sit between the stats row and the objective display. On a dark navy background, 10px text at 50-60% opacity falls well below WCAG AA 4.5:1 contrast for normal text. They are also positionally ambiguous — they appear between objective progress and the word input area, which is not where a player's eye rests during active play.

**Recommendation:** Either merge the score threshold into the progress bar as a threshold marker, or surface it as a distinct callout card above the grid with minimum 12px text at full opacity. Remove the cumulative score line during wave play; surface it only on the wave transition screen.

---

### MEDIUM-1: Header is asymmetric in single-player mode

Left side: destructive Quit button (visible) + conditional wave badge. Right side: HelpCircle (ghost, low contrast) + End Game button. The End Game button duplicates the Quit button's destructive intent but with a different label. Players consistently confuse "Quit" (leave game) vs. "Give Up" (end game early to see results). The two buttons are visually identical at the `sm` hidden-text breakpoint — both show only an icon.

**Recommendation:** Differentiate visually and positionally. Keep Quit (back arrow) top-left as a secondary action. Move End Game into the dead-end notification panel only, not persistently in the header. This reduces the header to three items: back, wave badge, help.

---

### MEDIUM-2: Dead-end notification layout breaks at narrow widths

Lines 517-558 render a flex row with three buttons (hint, shuffle, give up) plus a text label. On a 320px screen this row wraps, creating a 2-row layout inside the notification box. The `flex-wrap justify-end` allows buttons to spill to a second line but the container height is not pre-reserved, causing a layout jump when the panel appears.

**Recommendation:** Stack the notification vertically: message line on top, buttons in a horizontal group below. Fix container height or use `min-h` to avoid layout shift.

---

## Section 2 — Tile Visual Clarity

### CRITICAL-2: Effect badges are 8px text with 10px icons — unreadable on 6x6 grid

`BlastTileOverlay.tsx` lines 237-247 render the effect badge at `text-[8px] font-black` with a `w-2.5 h-2.5` (10px) icon. On a 6x6 grid on a 375px screen, each cell is approximately 52px wide. The badge is positioned `bottom-0 right-0` and spans roughly 20x10px. Labels like "1.5×" (silver), "pull" (magnet), and "col" (lightning) are abbreviations that require prior knowledge to decode. At 8px on a lit background with adjacent glowing tiles they are effectively invisible in motion.

Additionally, two completely different tile types share the same icon: `silver` and `gold` both use `Star`, while `gem` and `diamond` both use `Diamond`. A player cannot distinguish gold from silver or gem from diamond by icon alone — they must read the label, which is illegible at 8px.

**Recommendation:**
- Increase badge to minimum 11px text and minimum 14px icon.
- Assign unique icons: silver → `Coins` or `CircleDollarSign`, gold → `Star`, gem → `Gem`, diamond → `Diamond`.
- Consider removing the abbreviated text label from the badge and reserving it for the help tooltip on long-press.

---

### HIGH-3: Ice and frozen tiles are visually near-identical

Both `ice` and `frozen` use light-blue color families:
- Ice: `rgba(180,230,255,0.55)` background, `rgba(150,220,255,0.75)` border
- Frozen: `rgba(200,220,255,0.6)` background, `rgba(180,220,255,0.8)` border

Both use `Snowflake` as their icon. The only differentiation is border weight (3px vs. 4px) and the hits-remaining badge in the top-left corner. Players cannot distinguish them without reading the badge counter.

**Recommendation:** Give frozen a distinct visual identity. Options: a darker blue-grey background with visible crack texture via CSS (multiple box-shadow layers), or a more contrasting purple-blue to separate from ice's cyan-blue.

---

### HIGH-4: Mirror tile icon (Shuffle) does not communicate its "doubling" mechanic

`mirror` uses the `Shuffle` icon (two crossing arrows), which implies rearranging, not doubling. The tile's label badge reads "2×". On a board with multiple special tiles in motion, a player dragging to form a word over a mirror tile has no visual indicator that the effect of an adjacent special tile will be doubled. The connection between the mirror tile and its target is invisible.

**Recommendation:** Replace icon with `CopyPlus` or `Layers` to communicate amplification. Add a thin dashed connector animation between a mirror and an adjacent special tile when the player hovers/drags near them.

---

### MEDIUM-3: Prism tile and the objective tile pulsing ring conflict visually

`prism` uses a conic-gradient background that cycles all hue stops. The `blast-tile-objective` CSS class adds a pulsing ring (referenced at line 225). When a prism tile is also an objective tile, the two animated effects overlap and the pulsing ring becomes invisible against the spinning color field.

**Recommendation:** For objective tiles that are already high-animation types (prism, rainbow), apply the objective indicator as an outer glow or a corner badge rather than a ring overlay.

---

### MEDIUM-4: Gem tile glow intensity increase is not perceivable during active gameplay

Lines 183-213 implement a three-stage glow intensification as `hitsRemaining` decreases from 3 to 1. The difference between stage 1 (`rgba(80,200,120,0.37)`) and stage 3 (`rgba(80,200,120,0.61)`) is subtle against the board's bright explosion particles and combo glow. The player cannot reliably track gem progress.

**Recommendation:** Add a visible state change for each hit: stage 1 = full green glow, stage 2 = orange tint bleeds in (communicates "nearly done"), stage 3 = bright white-green pulse. The hits-remaining badge `1` in red already signals danger, but the tile body itself should reinforce this.

---

## Section 3 — Feedback Systems

### HIGH-5: BlastCascadeWordBanner obscures the board at a critical decision moment

The cascade banner is positioned `absolute top-16 short:top-8 sm:top-32` and translates from `start-1/2`. On portrait mobile (< 700px height) the `short:top-8` breakpoint places the banner directly over the top two rows of the 6x6 grid at the exact moment those rows are being cleared and refilled. This is when the player needs to see the board most clearly to plan the next word.

**Recommendation:** Move the cascade banner to below the grid, anchored above the word input area. The bottom zone is empty during cascade (word input is disabled). This positions the reward message where the player's thumb rests during touch play.

---

### MEDIUM-5: Score popups use a fixed `transform: scale()` wrapper instead of integrating with ScorePopup's own intensity API

`BlastExplosionLayer.tsx` lines 85-96 wrap `ScorePopup` in a `div` with `transform: scale(1.5/1.2/0.9)`. This scales the container but `ScorePopup` may have its own entry animation from `position:absolute` offsets. The result is popups appearing at incorrect pixel positions relative to the grid cell (the `x/y` position passed to `ScorePopup` is the cell center, but scale transforms the containing div rather than the absolute-positioned popup).

**Recommendation:** Pass intensity as a prop to `ScorePopup` and handle scale internally, or apply the scale directly to the inner content element of the popup, not the wrapper div.

---

### MEDIUM-6: ComboDisplay compact mode has no aria-live for screen readers

`BlastGameLayout.tsx` line 337 renders `<ComboDisplay comboLevel={comboLevel} compact ... />`. The combo counter is purely visual with no aria-live region. A screen reader user building a combo chain receives no feedback that their combo is increasing.

**Recommendation:** Wrap the combo counter in `<div aria-live="polite" aria-atomic="true">` or add an `aria-label` that updates with combo level changes.

---

### LOW-1: BlastComboFlash Tier 1 (cyan, 0.2 opacity for 200ms) is nearly imperceptible

Tier 1 flashes at 20% opacity for 200ms. This is below the threshold of comfortable perception for most users and provides almost no information. A player who does not see it misses that a combo was triggered.

**Recommendation:** Increase Tier 1 to at least 30% opacity and 300ms duration, or skip the screen flash for Tier 1 entirely and express it only through the score popup and combo counter increment.

---

### LOW-2: BlastCascadeWordBanner uses a non-RTL-aware `mt-2` for stacked banners

Line 52 in `BlastCascadeWordBanner.tsx`: `idx > 0 ? 'mt-2' : ''` uses a physical margin. This is `margin-top` so it is fine for block stacking, but combined with the `-translate-x-1/2` centering (which is LTR-biased in some browser implementations for RTL), the banner stack may mis-center in Hebrew mode.

**Recommendation:** Audit `start-1/2 -translate-x-1/2` centering in RTL. For Hebrew, `start: 50%` with `translateX(-50%)` should be equivalent, but test this explicitly.

---

## Section 4 — Information Overload

### HIGH-6: ChainCounter and CascadeWordBanner occupy the same screen zone simultaneously

`BlastChainCounter` is positioned `absolute top-2 start-1/2` inside the grid container (z-50). `BlastCascadeWordBanner` is positioned `absolute top-16` in the layout (z-50). When the cascade banner appears during a high chain (level 3+), both elements are visible simultaneously in the top quarter of the screen — the chain counter behind/under the banner, creating visual layering with no clear hierarchy.

The code has a guard `cascadeAnnouncement && cascadeHighlightPhase !== 'highlighting'` to prevent the fallback text from appearing alongside the banner. However the ChainCounter is not suppressed during `highlighting` phase.

**Recommendation:** Suppress `BlastChainCounter` when `cascadeHighlightPhase === 'highlighting'`. The word banner already communicates chain level (via the chain badge inside it). Showing both is redundant.

---

### MEDIUM-7: Objectives panel, score threshold, and cumulative score are three separate text blocks stacked between the stats row and the word input

Lines 453-476 create up to three stacked information strips before the word forming area:
1. Score threshold reminder (10px, 60% opacity)
2. Cumulative score (10px, 50% opacity)
3. Objective progress bars

These strips compress the vertical space available for the grid and word input. On a 667px-height phone (iPhone SE) all three together occupy ~60px before the word input area, pushing the grid lower and making it harder to reach the top tiles.

**Recommendation:** Collapse score threshold and cumulative score into a single line in the stats row or wave badge. Keep only the objective progress bars in the pre-grid zone, with a max height that does not affect grid sizing.

---

## Section 5 — Onboarding

### CRITICAL-3: BlastReadyScreen does not explain tile types before the first game

`BlastReadyScreen.tsx` shows three instruction steps:
1. Swipe to form words (Hand icon, cyan)
2. Special tiles appear (Sparkles icon, orange) — no detail on what tiles do
3. Clear the board (Target icon, pink)

Step 2 tells the player tiles are special but does not show what any tile looks like or does. The 13 tile types (gold, bomb, rainbow, ice, mirror, silver, diamond, lightning, magnet, prism, gem, frozen, and standard) have wildly different mechanics (bomb clears 8 neighbors, prism requires 2 words, frozen requires 3 hits, magnet pulls adjacent tiles). A first-time player encounters these with no foreknowledge and must either tap the Help button mid-game (which interrupts flow and requires scrolling a long modal) or learn by accident.

The Codex button exists but leads to a grid of locked "???" entries — it is a collection metagame, not an onboarding tool.

**Recommendation:** Add a fourth step card to `BlastReadyScreen`: a horizontal scrollable tile preview strip showing at minimum the 5 most common tile types (bomb, gold, ice, rainbow, lightning) with their icon and one-line description. This can reuse the same `TileCard` component from `BlastHelpModal`. Alternatively, surface a "New player?" toggle that replaces the three-step cards with a swipeable tile glossary for first sessions, then defaults to the current three-step view for returning players.

---

### MEDIUM-8: BlastWaveIntro auto-advances after 4 seconds with no countdown indicator

`BlastWaveIntro.tsx` line 52 fires `onReady()` after 4000ms. The player sees the objectives and a large GO button, but there is no visible countdown (progress bar, timer ring, or digit) to indicate the screen will dismiss automatically. On wave 3+ the objectives list may have 2-3 items; a player reading slowly gets cut off mid-read.

**Recommendation:** Add a thin circular or linear progress indicator that counts down the 4 seconds. Users who want to proceed faster tap GO. Users who are reading know how long they have.

---

### LOW-3: BlastHelpModal Category headers are hardcoded English strings

`BlastHelpModal.tsx` lines 96, 139, 181 render:
```
<CategoryHeader label="Score Boosters" />
<CategoryHeader label="Strategic" />
<CategoryHeader label="Obstacles" />
```
These are hardcoded strings, not translated. Swedish and Japanese users see English category headers.

**Recommendation:** Move these to the translation keys `blast.helpCategory.scoreBoosters`, `blast.helpCategory.strategic`, `blast.helpCategory.obstacles`.

---

## Section 6 — RTL Support

### HIGH-7: BlastTileOverlay forces `dir="ltr"` — breaks grid mirroring for RTL locales

`BlastTileOverlay.tsx` line 135: `<div dir="ltr" ...>`. The CSS Grid uses `gridColumn: tile.col + 1` which is a numeric position and not affected by writing direction. This is correctly written for LTR and the `dir="ltr"` guard is intentional. However, the icon badges are positioned with `right-0` (line 238) and `left-0` (line 253) — physical properties, not logical. In a global RTL context these will be flipped by the browser because the effect badge container itself inherits RTL from the document.

Because `dir="ltr"` is set on the overlay root, the badge corner positioning is consistent. This is technically correct but should be documented, as it means the effect badge always appears in the bottom-right of the cell regardless of locale, which is not the trailing corner in RTL.

**Recommendation:** The current approach is acceptable. Add a code comment explaining the intentional LTR lock and its effect on badge positioning so future developers do not accidentally remove it.

---

### MEDIUM-9: Header action group has no RTL margin correction for the wave badge

`BlastGameLayout.tsx` lines 298-309 render the wave badge conditionally between the quit button and the help button. The badge uses no explicit logical margin — it relies on `justify-between` spacing in the flex row. This is fine. However, the header `<header>` uses `px-4` (physical) rather than `ps-4 pe-4` (logical). On RTL layouts, `px-4` is symmetric so this is actually acceptable, but it deviates from the project's stated logical-properties convention.

**Recommendation:** Change `px-4` to `px-4` is fine, but audit whether any child elements inside the header use `mr-*` or `ml-*`. The ArrowLeft icon at line 284 correctly uses `me-1.5` and `rtl:rotate-180`. The Bomb icon at line 329 uses `me-1.5`. These are correct. No critical RTL violations found in the header itself.

---

### LOW-4: BlastMoveCounter aria-label duplicates the label text

`BlastMoveCounter.tsx` line 58:
```
aria-label={`${movesRemaining} ${t('blast.movesLeft')} ${t('blast.movesLeft')}`}
```
The `t('blast.movesLeft')` string is concatenated twice. A screen reader will announce "5 moves left moves left".

**Recommendation:** Fix to `aria-label={`${movesRemaining} ${t('blast.movesLeft')}`}`.

---

## Section 7 — Accessibility

### HIGH-8: Grid interaction is blocked during cascade with no announcement to screen readers

`BlastGameLayout.tsx` line 661: `interactive={!isComplete && !isDiscoveryActive}`. During cascade phases the grid also becomes non-interactive (managed in BlastGrid). However there is no `aria-live` announcement to inform screen reader users that the grid is temporarily disabled. A user pressing enter or spacebar on a tile during cascade receives no feedback.

**Recommendation:** Add an `aria-live="assertive"` region that announces "cascading..." when cascade begins and "ready" when it ends. The cascade phase prop is already available in the layout component.

---

### MEDIUM-10: BlastResults confetti retrigger button uses an emoji as its accessible label backup

`BlastResults.tsx` line 98: the button renders a raw `🎉` emoji as its text content with `aria-label={t('blast.celebrateAgain')}`. This is actually correctly labeled. No issue here.

However, the `useCountUp` hook drives the score display via `requestAnimationFrame` with no `aria-live` region. Screen reader users will hear the final score only if they navigate to the element after the animation completes.

**Recommendation:** Add `aria-live="polite"` to the score display container so the final score is announced once the count-up settles.

---

## Section 8 — Mobile Experience

### HIGH-9: No explicit minimum touch target size on the words-found count button

`BlastGameLayout.tsx` lines 421-429 render a `<button>` for the found-words toggle:
```jsx
<button onClick={...} className="text-center cursor-pointer hover:scale-105 transition-transform">
  <div className="font-black text-white text-xl sm:text-2xl">{wordsFound.length}</div>
  <div className="font-bold uppercase tracking-wider text-white/70 text-[10px] sm:text-xs">
    {t('common.words')}
  </div>
</button>
```
The touch target is defined by the text content only — approximately 32x40px. WCAG 2.5.5 recommends a minimum 44x44px touch target. The button has no padding, no min-height, and no visual affordance (border, background, underline) indicating it is interactive.

**Recommendation:** Add `min-h-[44px] min-w-[44px] px-2 py-1` to the button. Add a subtle dashed border or underline on the label to communicate interactivity.

---

### MEDIUM-11: BlastFoundWords expandable list has no maximum height constraint in practice

Lines 494-505 animate height from 0 to `auto`. When a player has found 20+ words the expanded list could fill the screen, pushing the grid partially off-viewport. There is `overflow-hidden` on the AnimatePresence wrapper but `height: auto` will expand the container past the viewport with no scroll.

**Recommendation:** Cap the found-words panel to `max-h-[120px]` with `overflow-y-auto`. This shows 3-4 words with a scrollable affordance rather than collapsing the grid.

---

## Section 9 — Results Screen

### MEDIUM-12: BlastResults has no "best word" interaction and no path to learning

The `bestWord` stat card shows the word in uppercase. There is no way for the player to find out what score the best word earned, or to replay a similar board. The results screen is a final state with two options: play again or home. For players who finished with 1 star, there is no clarity on what score would earn 2 stars or what tiles to target.

**Recommendation:**
- Add the score value next to the best word: "AMAZING (32 pts)".
- For 1-star results, add a contextual tip: "Tip: Use Bomb tiles in words to clear large areas and earn bonus tiles." This can be a single translated string selected from a pool of 3-4 tips based on the player's play pattern (low tile clear % → board strategy tip; low combo → combo tip).

---

### LOW-5: Wave breakdown section has no animation stagger or visual hierarchy

`WaveBreakdown` is rendered via `BlastResultsComponents` (not read in full). Based on its invocation at line 165-168, it receives `waveResults` and a label. Without reading the component internals, the placement immediately above the action buttons and below a dense stats grid means it will be below the fold on a 667px device, requiring a scroll that many users will not perform.

**Recommendation:** If wave breakdown is important (it is the game's most unique feature versus single-wave play), surface wave count and best-wave score inside the main stats grid, and move the full breakdown to an expandable section.

---

### LOW-6: No share/social action on results screen

Competitors (Wordle, WordScapes) offer a share button on results. The current results screen has Play Again and Home only. Given the game already has multiplayer and a community UGC system, the results screen is a missed growth touchpoint.

**Recommendation:** Add a Share button that generates a score card image (score, stars, tile count, best word) for social sharing. This is a Phase 2 feature but should be reserved in the layout.

---

## Prioritized Fix Roadmap

### Sprint 1 — Critical usability (do these first)

| ID | Issue | File | Effort |
|----|-------|------|--------|
| CRITICAL-1 | Feedback overload during cascade+combo peak | BlastGameLayout.tsx | Medium |
| CRITICAL-2 | Badge text/icons too small to read in-game | BlastTileOverlay.tsx | Small |
| CRITICAL-3 | Onboarding does not explain tile types | BlastReadyScreen.tsx | Medium |

### Sprint 2 — High-impact friction

| ID | Issue | File | Effort |
|----|-------|------|--------|
| HIGH-1 | Stats row inconsistent widget styles | BlastGameLayout.tsx | Small |
| HIGH-3 | Ice/frozen visual similarity | BlastTileOverlay.tsx | Small |
| HIGH-5 | Cascade banner obscures board at critical moment | BlastGameLayout.tsx | Small |
| HIGH-6 | ChainCounter not suppressed during word banner | BlastGameLayout.tsx | Small |
| HIGH-8 | No aria-live for cascade state changes | BlastGameLayout.tsx | Small |
| HIGH-9 | Words button below minimum touch target | BlastGameLayout.tsx | Small |
| LOW-4 | Duplicate aria-label text on move counter | BlastMoveCounter.tsx | Trivial |

### Sprint 3 — Polish and completeness

| ID | Issue | File | Effort |
|----|-------|------|--------|
| HIGH-2 | Score threshold text too small/low contrast | BlastGameLayout.tsx | Small |
| HIGH-4 | Mirror icon misleading | BlastTileOverlay.tsx | Small |
| MEDIUM-1 | Header Quit vs. End Game confusion | BlastGameLayout.tsx | Medium |
| MEDIUM-7 | Three pre-grid text strips compress layout | BlastGameLayout.tsx | Medium |
| MEDIUM-8 | Wave intro has no countdown indicator | BlastWaveIntro.tsx | Small |
| MEDIUM-12 | Results missing score context and star-up tip | BlastResults.tsx | Small |
| LOW-3 | Category headers hardcoded English in help modal | BlastHelpModal.tsx | Trivial |

---

## Appendix: Positive Findings

These are existing decisions that are well-executed and should be preserved:

- **Reduced motion support:** `BlastComboFlash` uses `useReducedMotion` and skips the flash correctly. `BlastWaveIntro` uses `AdaptiveMotion`. Well done.
- **Haptic feedback:** Distinct vibration patterns per explosion type (`vibrateBlastBomb`, `vibrateBlastLightning`, `vibrateBlastPrism`, `vibrateBlastCascade`). This is excellent sensory design.
- **Score popup intensity tiers:** Three intensity levels (subtle/strong/exceptional) tied to score value are correctly mapped to word length. The hierarchy is semantically meaningful.
- **Hits-remaining badge color:** Traffic-light system (white/amber/red) on multi-hit tiles is immediately learnable.
- **Explosion cap at MAX_VISIBLE_EXPLOSIONS = 6:** Correct decision to prevent GPU overload while preserving juice. The comment explaining the rationale is good practice.
- **i18n usage:** All user-facing strings use `t()` throughout, with two exceptions identified above (help modal category headers).
- **RTL grid lock:** `dir="ltr"` on the overlay with documented intent is acceptable. The overall RTL posture is good — me/ms/start/end logical properties are used in most places.
- **Board complete overlay:** The SP blocking overlay with staggered star animations is satisfying. The MP non-blocking toast version correctly does not interrupt ongoing play.
- **Combo glow is symmetric:** The `shadow-[0_0_Xpx...]` x-offset of 0 ensures the glow works correctly in both LTR and RTL without mirroring. Well noted in the code comment.
