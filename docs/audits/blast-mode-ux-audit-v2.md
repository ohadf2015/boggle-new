# Blast Mode UI/UX Audit — Version 2
**Date**: 2026-03-16
**Auditor**: UI/UX Design Agent (claude-sonnet-4-6)
**Prior audit**: blast-mode-ux-audit.md (2026-03-15)
**Scope**: All Blast Mode UI components and interaction design after the blast mode overhaul commit

---

## Executive Summary

Blast Mode has a strong mechanical foundation: 12 distinct tile types, cascade chains, combo synergies, wave objectives, Sugar Crush sequence, near-miss shimmer, and personal best tracking are all implemented with genuine depth. The visual feedback system (tiered explosions, score popup labels, haptic differentiation, adaptive motion) is more polished than most indie word games. The neo-brutalist design language is well-applied and consistently maintained.

However, five structural problems undercut the experience at its most critical moments:

1. No path-connector line means players lose spatial orientation on a 6x6 grid during long drags.
2. Screen shake ignores `prefers-reduced-motion` — a WCAG 2.3.3 violation that can cause harm.
3. The cascade interaction lockout is silent — players get no feedback that the board is processing.
4. Special tile badges use 8px icons and text — illegible at arm's length on mobile.
5. The bottom UI (cascade word banner, dead-end buttons) has no safe-area-inset-bottom protection and is hidden by home indicator bars on iPhone.

These five issues alone account for the majority of moment-to-moment friction. The top 15 improvements below address all of them plus the higher-impact polish gaps.

---

## 1. Visual Hierarchy

### Current State

The stats row in `BlastGameLayout.tsx:385-446` renders four metrics in one horizontal flex row:
- Score: neo-yellow gradient bordered card, `text-xl sm:text-2xl font-black` — highest visual weight
- Move counter (`BlastMoveCounter`): matched bordered card with color-coded urgency — correct weight
- Word count: bare text button, no border — **lowest visual weight despite being interactive**
- Progress bar: `w-28 sm:w-32` fixed width — **cramped, asymmetric with the other three widgets**

The combo display is a `h-6 compact` strip between the header and stats row. The combo timer is the most time-critical piece of information in the game but occupies the narrowest band of space.

The wave badge uses `text-fuchsia-300` on `bg-fuchsia-500/20` over `bg-neo-navy` — estimated contrast ratio approximately 2.0:1. WCAG AA requires 4.5:1 for small text. **Fails.**

The `personalBestScore` indicator uses `text-[9px]` which is below WCAG minimum text size and functionally invisible at arm's length on mobile.

The cumulative score line uses `text-fuchsia-300/50` — 50% opacity destroys contrast on any background. **Fails WCAG AA.**

### What Works
- The move counter's color-coded urgency (green → amber → red) and `animate-neo-shake` at ≤1 moves is effective — identical to how Candy Crush communicates urgency.
- The `BlastChainCounter` rendered above the grid with escalating color (white → gold → orange → rainbow) is spatially connected to the action.
- Personal best "NEW BEST" badge on score card is a well-executed loss aversion hook.

---

## 2. Interaction Design

### Tile Selection and Path Feedback

Selection is handled by `GridComponent` (shared singleplayer code) with `onSelectionChange` wired to `BlastGrid.tsx:114-120`. The `selectedPositions` set drives a `blast-tile-selected` CSS class applied per-tile in `BlastTileOverlay.tsx:226`.

**Critical gap**: There is no path connector between selected tiles. The only selection feedback is a per-tile glow on special tiles and whatever `GridComponent`'s own selection style is. On a 6x6 grid with 36 cells, players tracing a 6-letter word across non-adjacent cells have no spatial guide. SpellTower and every major swipe-to-spell game (Word Streak, Boggle With Friends, Spellspire) draw a line or arc between chained letters.

### Cascade Interaction Lockout

When `cascadePhase` is `'clearing'` or `'falling'`, `isInteractive` in `BlastGrid.tsx:110` is false. The grid silently ignores touch input. Players attempting a drag during cascade get no feedback that the board is temporarily locked.

The lockout lasts ~400ms during clearing + fall phases (based on `CASCADE_DETECTION_DELAY = 200` in `types.ts:182` plus tile animation time). On slow 3G devices or low-end hardware where the `AdaptiveMotion` degrades animations, players may not even see the cascade, making the lockout period feel like a bug.

### Hint Spatial Disconnect

The hint mascot (`BlastGameLayout.tsx:276`) appears at `top-4 end-4` (top-right corner). The hint path is highlighted on the grid below it. A player looking at the grid to follow the hint will not see the mascot; a player noticing the mascot needs to redirect attention to the grid. These two feedback elements point in different directions.

### Proactive vs. Reactive Shuffle

The shuffle action is only visible when `noWordsRemaining` is true — buried in the dead-end notification. Players who have a hunch they want to shuffle (but are not technically stuck) have no affordance. The shuffle button would benefit from a persistent but secondary location, perhaps beneath the grid or in a collapsed action bar.

---

## 3. Information Architecture

### Header Structure

```
[Quit/Leave]  [Timer (MP) | Wave badge (SP)]  [Codex] [Help] [End Game (SP)]
```

In SP mode this is five elements across approximately 375px with `px-4` padding = 343px working width. At `size="sm"` each button is approximately 32px with `gap-1` (4px) between them. The right cluster (Codex + Help + End Game) has three controls in approximately 100px. Tap accuracy here will be poor on mobile.

The Quit button and End Game button have semantically overlapping destructive intent. At small breakpoints both show only icons (Quit = ArrowLeft, End Game = Bomb). Players must understand the distinction between "abandon game" and "end game to see results" — a distinction that is not visually communicated.

### Pre-Grid Stacked Notifications

Between the stats row and the grid, up to four separate elements can stack:
1. Score threshold pill (`blast.needScore` — `text-[10px]` at `bg-white/10`)
2. Cumulative score line (`text-fuchsia-300/50` — invisible)
3. Objective progress bars (`BlastObjectiveDisplay`)
4. Dead-end notification (when `noWordsRemaining` — takes significant height)

On an iPhone SE (667px height), these four elements plus header + combo strip + stats row + word-forming area consume approximately 220px, leaving 447px for the grid. At `max-w-[360px]` and `aspect-square` the grid needs 360px — leaving only 87px of margin. Dead-end notification adds ~80px, shrinking the visible area further. This is a layout pressure problem.

### Missing Affordance on Word Count Button

`BlastGameLayout.tsx:430-438`: The word count is a `<button>` with `cursor-pointer hover:scale-105` but no border, background, chevron, or any visual indicator that it is interactive. `hover:scale-105` is invisible on touch devices. Players will not discover the expandable word list.

---

## 4. Animation and Motion

### What Exists (Positive Assessment)
- `BlastComboFlash`: 3-tier radial gradient overlay with correct `useReducedMotion()` check — well implemented.
- Explosion particle layer: `MAX_VISIBLE_EXPLOSIONS = 6`, `MAX_VISIBLE_SCORE_POPUPS = 3` caps, timestamp-delta stagger for chain ripple — excellent engineering decisions.
- `BlastCascadeHighlight`: word glow before clearing, spatially connected to the action.
- `BlastChainCounter`: spring entrance/exit with progressive color escalation — information and spectacle unified.
- Score popup tier system: "AMAZING!" / "INCREDIBLE!" labels with burst ring at intensity 3 — creates genuine word length celebration that Wordle lacks.
- Near-miss shimmer (`nearMissPulse`) at `z-[13]`: psychologically effective, appropriately subtle.
- Screen shake queue depth = 1 prevents compound chaos during multi-bomb chains — a thoughtful constraint.
- `AdaptiveMotion` + `AdaptiveAnimatePresence` throughout — correct performance awareness.

### Problems

**Screen shake and `prefers-reduced-motion`**: The `shakeClass` effect in `BlastGameLayout.tsx:205-225` calls `setShakeClass('animate-neo-shake')` or `'animate-neo-wobble'` without checking `useShouldReduceMotion()`. These CSS animation classes bypass Framer Motion's reduced-motion handling. Players with vestibular conditions who set `prefers-reduced-motion: reduce` in their OS will still receive screen shake. This is a WCAG 2.3.3 (Animation from Interactions) violation.

**Cascade banner vs. chain counter spatial conflict**: `BlastCascadeWordBanner` is at `bottom-2 absolute` in the layout (`BlastGameLayout.tsx:376-382`) — below the grid. `BlastChainCounter` is at `top-2 absolute` inside the grid container (`BlastGameLayout.tsx:572-576`). A player receives cascade-related feedback from two opposite ends of the screen simultaneously.

**Score tier label positioning**: `BlastExplosionLayer.tsx:115-127` renders tier labels at `top: y - 28` in absolute pixel coordinates. For popups in grid row 0, this positions the label above the grid container, where it can be clipped by `overflow-hidden` on parent containers.

**Combo glow transition duration**: `transition-shadow duration-500` on the grid wrapper (`BlastGameLayout.tsx:570`) creates a 500ms shadow transition. This makes combo level changes feel disconnected from the instant tile feedback happening within the grid.

---

## 5. Accessibility

### WCAG Violations

**2.3.3 Animation from Interactions (Level AAA)**: Screen shake via `animate-neo-shake` CSS class is applied without checking `prefers-reduced-motion`. File: `BlastGameLayout.tsx:218`. Fix: read `useShouldReduceMotion()` and skip `setShakeClass` when true.

**1.4.3 Contrast (Minimum) — Level AA**: Multiple failing contrasts:
- Wave badge: `text-fuchsia-300` on `bg-fuchsia-500/20` over neo-navy ≈ 2.0:1 (need 4.5:1)
- Cumulative score: `text-fuchsia-300/50` on neo-navy ≈ 1.2:1 (functionally invisible)
- Personal best label: `text-neo-black/40` on neo-yellow ≈ 2.5:1 (need 4.5:1)
- Objective complete state: `text-green-400` on `bg-green-900/40` ≈ 3.2:1 (need 4.5:1)

**1.3.1 Info and Relationships — Level A**: `BlastProgressBar` has no `role="progressbar"` or `aria-valuenow/min/max`. `BlastObjectiveDisplay` objective progress bars have no ARIA roles. Neither is communicated semantically.

**4.1.2 Name, Role, Value — Level A**:
- Word count button has no `aria-label` and no `aria-expanded` for the collapsible it controls.
- Combo display area has no `aria-live` region — combo level changes are not announced.
- Score card has no `aria-live` — score updates are not announced to screen readers.

**2.5.5 Target Size (Level AAA)**: Header right cluster buttons are approximately 32x32px. Minimum recommended is 44x44px. Word count button: approximately 32x40px.

### What Works
- `BlastMoveCounter` has `aria-label` with moves remaining count — correct.
- Grid has `aria-label` from `t('blast.gridLabel')` — correct.
- `BlastComboFlash` uses `useReducedMotion()` and skips flash for reduced-motion users — correct.
- `AdaptiveMotion` checks `useShouldReduceMotion()` throughout — correct.

---

## 6. Mobile Experience

### Safe Area Handling

The header uses `env(safe-area-inset-top)` correctly at `BlastGameLayout.tsx:288`. **But** no bottom safe-area protection exists:
- Cascade word banner at `bottom-2` (`BlastGameLayout.tsx:376`) — occluded by iPhone home indicator (34px).
- Dead-end notification buttons at bottom of the `max-w-[360px]` container — can be partially obscured.

### Thumb Zone Analysis

On a 375px × 812px phone (iPhone X/11/12 class), the comfortable one-handed right-thumb zone is roughly the bottom 60% of the screen (approximately y > 320px). The layout stacks from top:

- Header at top (y: 44-80px) — outside comfortable reach
- Combo strip (y: 80-104px) — outside comfortable reach
- Stats row (y: 104-160px) — marginal reach
- Notifications (y: 160-220px) — borderline
- Word forming area (y: 220-260px) — reachable
- Grid (y: 260-620px) — in thumb zone

The header controls (Quit, Help, Codex, End Game) are all in the top 80px — unreachable without shifting grip. This is acceptable for infrequent actions like Quit and Help, but End Game (which a player may want to trigger mid-game) being header-only is a reach problem.

### Orientation

No landscape-specific layout is defined. The `flex flex-col` structure in a landscape orientation on a phone (568px width, 320px height) would stack all header/stats/word-area elements, leaving approximately 120-140px for the grid — far too small to interact with on a 6x6 grid. This orientation is likely unusable.

---

## 7. Emotional Design

### What Creates Delight
- Sugar Crush sequence converts leftover moves into a chain explosion — a genuine reward moment.
- Confetti on board complete with neo-brutalist colors is appropriately celebratory.
- Star reveal with staggered spring delays (0.3s, 0.45s, 0.6s) on board complete — satisfying.
- "NEW BEST" badge appearing on the score card is effective loss aversion.
- `BlastComboDiscovery` for first-time combo encounters — the "aha!" moment is real.
- Escalating chain counter color (white → gold → orange → rainbow) creates reward escalation.
- Score tier labels "AMAZING!" / "INCREDIBLE!" are well-calibrated — the 20pt and 30pt thresholds correspond to meaningful word accomplishments.
- Near-miss shimmer (`nearMissPulse`) after a near-combo creates gentle FOMO that encourages the next word.

### Missing Delight Moments

**No board drop-in on game start.** The grid appears instantly when `blast.modifiedGrid` is ready (`BlastGame.tsx:456`). Every top tile-puzzle game (Candy Crush, 1010!, Gardenscapes) animates the initial board into position — this gives the player a moment to scan the layout before committing to a first move, and sets the game's tone.

**Dead-end state is punishing in tone.** `noWordsRemaining` shows a `bg-indigo-900/80` box with a terse "stuck" label (`t('blast.stuck')`). This is a low moment in the emotional arc — the player has failed to find a word — and the design does nothing to soften or reframe it. A mascot expression change, a gentle animation, and encouraging copy ("Try a different angle!") would maintain motivation.

**No "new combo unlocked" persistence.** After `BlastComboDiscovery` banner dismisses, there is no persistent indicator that the codex has new content. The `BookOpen` icon shows no badge. Players who dismissed the discovery banner quickly may never look in the codex.

**Word count stat has no micro-celebration.** Every time a word is added to `wordsFound`, the count increments with no animation on the stat itself. A brief `scale(1.2) → scale(1)` pop would reinforce the accumulation and make the stat feel alive.

**No wave "victory lap" before transition.** Between waves there is a transition screen, but the previous wave's score and best moments (best word, max combo) are not shown before the next wave starts. The player has no moment to feel proud of what they accomplished.

---

## 8. Comparison to Top Games

### vs. Wordle
Wordle's feedback (green/yellow/gray) is unambiguous from any distance at any speed. Blast's equivalent — tile type color + small icon badge — requires the player to parse an 8px label at a glance. Wordle also has zero in-game navigation during a game (no help button, no quit button). Blast's header has 4-5 controls competing for the player's peripheral attention. Wordle's constraint is not always possible in a longer-session game, but Blast could reduce the header to 3 elements (Back, Wave badge, Help) by moving End Game out of the header.

### vs. SpellTower
SpellTower draws a clear bezier path between selected letters — solving the "where is my word?" problem that Blast does not address. SpellTower's mechanics create persistent upward pressure (tiles rise, game ends if they reach the top), which makes every word consequential. Blast's cascade system creates positive pressure (clearing tiles creates cascades) but lacks the persistent threat that SpellTower uses to create tension even during easy words.

SpellTower's minimal UI (score, level, one small button row) contrasts with Blast's dense header + combo + stats row + notifications + word-area + grid stack. SpellTower's simplicity directs 100% of attention to the board.

### vs. Candy Crush Saga
Candy Crush's special tile communication works at glance speed because each type has a unique oversized center icon that fills most of the cell. Blast's special tiles use a 10px corner icon — the type is communicated by the corner, not the center. On a 6x6 board with 8+ specials, the player must actively inspect each tile.

Candy Crush's wave intro shows the objectives with a brief animation — players know what to do before touching the board. Blast's wave intro exists (`BlastWaveIntro`) but this audit confirms it is there in the code; however, the ready screen and wave intro do not display tile icons for the specific objectives (just text descriptions).

Candy Crush's move counter is centrally positioned with large typography — the dominant UI element. In Blast the move counter shares equal visual weight with score, word count, and progress bar.

### vs. Boggle / Word Streak
Word Streak (now defunct) drew an arc between selected letters and showed the path in the accent color — the interaction paradigm Blast currently lacks. Standard Boggle on any platform highlights a path with colored cells, not just the endpoint tiles.

---

## 9. Top 15 UI/UX Improvements Ranked by Impact

---

### 1 — Add a Path Connector Line Between Selected Tiles
**Severity**: Critical | **Effort**: Medium | **Files**: `BlastGrid.tsx`, new `BlastSelectionPath.tsx`

**Problem**: No visual connector between selected letters during word tracing. Players lose their path orientation on a 6x6 grid, especially during long words crossing non-adjacent tiles.

**Solution**: Render a new `BlastSelectionPath` SVG overlay at `z-[12]` (above `BlastTileOverlay` at z-[11], below cascade overlay). The overlay draws a `polyline` or series of connected bezier curves between the center points of `selectedCells`. Path color:
- During formation: `rgba(255,255,255,0.5)` stroke, 2px
- When word is valid length: `rgba(191,255,0,0.7)` (neo-lime), 2px
- On submission: flash to acceptance/rejection color, then dissolve over 200ms via `opacity: 0` transition

**Wireframe**: An SVG element absolutely positioned over the grid, `pointer-events-none`, `inset-0`. Each selected cell contributes a center point. A `<polyline>` connects them. The line dissolves on word submission.

The `selectedCells` state is already tracked in `BlastGrid.tsx:113` and the container width in `BlastGrid.tsx:86-103` provides the sizing math. Cell centers = `col * cellSize + cellSize/2`, `row * cellSize + cellSize/2` using the existing `cellSize` computation at line 105.

---

### 2 — Fix Screen Shake for prefers-reduced-motion
**Severity**: Critical (WCAG 2.3.3) | **Effort**: Low | **Files**: `BlastGameLayout.tsx`

**Problem**: `animate-neo-shake` and `animate-neo-wobble` CSS classes are applied in `BlastGameLayout.tsx:205-225` without checking `useShouldReduceMotion()`. CSS animations bypass Framer Motion's reduced-motion handling.

**Solution**: Import `useShouldReduceMotion` from `@/contexts/AccessibilityContext` at the top of `BlastGameLayout.tsx`. In the shake `useEffect`, add an early return:

```tsx
const shouldReduceMotion = useShouldReduceMotion();
// inside the shake useEffect, before setShakeClass:
if (shouldReduceMotion) {
  // Still fire haptics — they are opt-in and separate from motion
  if (hasPrism) vibrateBlastPrism();
  else if (hasBomb) vibrateBlastBomb();
  else if (hasLightning) vibrateBlastLightning();
  return;
}
```

This is a one-line fix that resolves a WCAG 2.3.3 violation affecting users with vestibular disorders.

---

### 3 — Add Safe-Area-Inset-Bottom to Bottom UI
**Severity**: Critical on modern iOS | **Effort**: Low | **Files**: `BlastGameLayout.tsx`

**Problem**: Cascade word banner at `bottom-2` (`BlastGameLayout.tsx:376`) and dead-end notification action buttons have no `env(safe-area-inset-bottom)` protection. On iPhones with 34px home indicator inset, these elements are visually behind the system UI.

**Solution**: Two targeted changes:

For the cascade banner wrapper (line 377):
```tsx
className="absolute bottom-2 sm:bottom-4 start-1/2 -translate-x-1/2 z-50 pointer-events-none"
style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
```

For the dead-end notification (line 524):
```tsx
className="... pb-[env(safe-area-inset-bottom,0px)]"
```

---

### 4 — Increase Special Tile Badge Size for Glance-Speed Reading
**Severity**: High | **Effort**: Medium | **Files**: `BlastTileOverlay.tsx`

**Problem**: Effect badges use `w-2.5 h-2.5` (10px) icons and `text-[8px]` labels. On a 6x6 grid at max-w-[360px], each cell is ~55px. A 10px icon in the corner is unreadable at arm's length. Two tile pairs share identical icons (gold/silver both use `Star`; gem/diamond both use `Diamond`).

**Solution**:
1. Increase badge icon to `w-4 h-4` and label text to `text-[10px]`. Increase badge padding from `px-1 py-0.5` to `px-1.5 py-0.5`.
2. Assign unique icons for conflicting pairs:
   - `silver`: change from `Star` to `Coins` (if available) or `CircleDollarSign`
   - `gem`: keep `Diamond`, change `diamond` tile to use `Gem` (the Lucide `Gem` icon exists — it is currently used in `BlastHelpModal.tsx` and `BlastObjectiveDisplay.tsx`)
3. For the hits-remaining badge, increase from `w-3.5 h-3.5 text-[8px]` to `w-4.5 h-4.5 text-[10px]`.
4. Consider adding a large semi-transparent centered icon (at ~40% opacity, `w-6 h-6`) behind the letter text as a "watermark" identifier, similar to how Candy Crush centers its candy symbol. This requires the overlay to render at z-[10] with the icon behind the letter at z-[11].

---

### 5 — Add Visual Indicator During Cascade Interaction Lockout
**Severity**: High | **Effort**: Low | **Files**: `BlastGrid.tsx`

**Problem**: When `cascadePhase === 'clearing'` or `'falling'`, the grid is non-interactive but shows no indication of this. Players attempting a drag during cascade get a silent failure.

**Solution**: When `isInteractive` is false AND the game is not complete, render a lightweight overlay on the grid:

```tsx
{!isInteractive && !interactive && (
  <div
    className="absolute inset-0 z-[25] pointer-events-none rounded-neo"
    style={{
      border: '2px solid rgba(255,255,255,0.15)',
      animation: 'pulse 1s ease-in-out infinite',
    }}
  />
)}
```

The 2px pulsing border communicates "the board is processing" without obscuring tile visibility. This visual is only ~3px wide so it does not interfere with reading tile letters. Duration is short (cascade typically completes in 400-800ms), so the UX cost is low.

---

### 6 — Add ARIA Roles to All Progress Elements
**Severity**: High (WCAG 1.3.1) | **Effort**: Low | **Files**: `BlastProgressBar.tsx`, `BlastObjectiveDisplay.tsx`, `BlastGameLayout.tsx`

**Problem**: Three progress-communicating elements have no ARIA semantics: `BlastProgressBar`, the objective mini-bars in `BlastObjectiveDisplay`, and the word count collapsible button.

**Solution**:

`BlastProgressBar.tsx` — wrap the bar fill container:
```tsx
<div
  role="progressbar"
  aria-valuenow={percentage}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label={t('blast.progress') ?? 'Board progress'}
  className="relative h-4 bg-white/10 rounded-neo..."
>
```

`BlastObjectiveDisplay.tsx` — each objective's progress bar div:
```tsx
<div
  role="progressbar"
  aria-valuenow={displayCurrent}
  aria-valuemin={0}
  aria-valuemax={displayTarget}
  aria-label={`Objective progress: ${displayCurrent} of ${displayTarget}`}
  className="h-1.5 rounded-full..."
>
```

`BlastGameLayout.tsx` word count button:
```tsx
<button
  aria-label={`${wordsFound.length} ${t('common.words') ?? 'words'}, tap to expand`}
  aria-expanded={showFoundWords}
  ...
>
```

Score card — add live region:
```tsx
<div aria-live="polite" aria-atomic="true" className="font-black text-neo-black text-xl...">
  {score.toLocaleString()}
</div>
```

---

### 7 — Unify Cascade Feedback to Top-of-Grid Zone
**Severity**: High | **Effort**: Medium | **Files**: `BlastGameLayout.tsx`

**Problem**: `BlastCascadeWordBanner` is at `bottom-2 absolute` in the layout. `BlastChainCounter` is at `top-2 absolute` inside the grid. These communicate the same cascade event from opposite ends of the screen.

**Solution**: Remove the layout-level absolute positioning from the cascade banner. Instead, place both the chain counter and cascade word banner inside the grid's top-overlay zone as a stacked mini-panel, rendered within `BlastGrid.tsx` or via a new `BlastCascadeInfoPanel` component:

```
[CHAIN x2]           ← BlastChainCounter (large, centered)
["STORM" +14 pts]    ← BlastCascadeWordBanner (smaller, below)
```

Both elements appear at `top-2` in the grid area and fade together when `cascadeHighlightPhase === 'idle'`. The bottom of the layout recovers the space previously used by the absolute-positioned banner, reducing pressure on the iPhone SE layout.

**Wireframe**: A `div` at `absolute top-2 start-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-0.5 pointer-events-none` inside the grid container, containing `BlastChainCounter` and `BlastCascadeWordBanner` stacked vertically.

---

### 8 — Add Combo Display Prominence — Remove Compact Mode
**Severity**: Medium-High | **Effort**: Low | **Files**: `BlastGameLayout.tsx`

**Problem**: Combo display is `h-6 compact` — the time-critical combo timer and level are in the narrowest band of the entire layout. Players let combos expire because the indicator has less visual weight than the static progress bar.

**Solution**: Increase the combo strip height to `h-10` (40px). Remove the `compact` prop. When `comboLevel >= 3`, add a `border-b border-neo-yellow/30` separator below the combo strip and apply `bg-neo-yellow/5` to the strip background to distinguish it from the neutral navy background.

This change does not resize any other element — it only allocates 16px more to the combo strip, which falls within the available height budget on all target screen sizes.

---

### 9 — Add Wave Intro Screen with Objective Preview
**Severity**: Medium | **Effort**: Medium | **Files**: New `BlastWaveIntro.tsx`, `BlastGame.tsx`

**Problem**: Players start each wave with objectives visible in a small progress bar but no "setup moment" before interactivity begins. There is no priming for what to prioritize.

**Solution**: Before the board becomes interactive on wave start, show a 2-second blocking intro overlay (dismissable on tap):

**Layout** (full-screen neo-navy overlay):
```
Wave 2 of 3
──────────────────
[Snowflake icon] Clear 3 Ice tiles
[Target icon]    Score 500 points
──────────────────
[TAP TO START]
```

The overlay uses the existing `TileCard` component pattern from `BlastHelpModal.tsx` for the objective rows. The objective icons use the same mapping from `BlastObjectiveDisplay.tsx:ObjectiveIcon`. Auto-advances after 2.5s with a thin progress bar showing countdown.

This primes the player and reduces first-move cognitive load. It is the standard pattern in Candy Crush, Gardenscapes, and all wave-based puzzle games.

---

### 10 — Fix Touch Targets in Header to WCAG 2.5.5 Minimum
**Severity**: Medium (WCAG 2.5.5) | **Effort**: Low | **Files**: `BlastGameLayout.tsx`

**Problem**: Header right cluster (Codex + Help + End Game) has three `size="sm"` buttons with `gap-1` — each approximately 32x32px. WCAG 2.5.5 recommends 44x44px minimum.

**Solution**:
1. Change icon-only buttons (Codex `BookOpen`, Help `HelpCircle`) from `size="sm"` to `size="icon"` (the Radix `size="icon"` variant is 40x40px).
2. Add `min-h-[44px] min-w-[44px]` to all header action buttons.
3. Increase `gap-1` to `gap-2` in the right cluster container.
4. On screens < 375px, consider hiding the Codex button (it is conditional on `discoveredCombos` being non-null anyway) to reduce header pressure.

---

### 11 — Make Word Count Widget Visually Interactive
**Severity**: Medium | **Effort**: Low | **Files**: `BlastGameLayout.tsx`

**Problem**: The word count button has no visual affordance indicating it is interactive. On mobile, `hover:scale-105` is invisible. Users will not discover the expandable word list.

**Solution**:
```tsx
<button
  onClick={() => setShowFoundWords(prev => !prev)}
  className="text-center cursor-pointer border border-white/20 rounded-neo px-2 py-1 flex flex-col items-center min-h-[44px] justify-center"
  aria-label={`${wordsFound.length} words found. Tap to ${showFoundWords ? 'hide' : 'show'} list.`}
  aria-expanded={showFoundWords}
>
  <div className="font-black text-white text-xl sm:text-2xl">{wordsFound.length}</div>
  <div className="flex items-center gap-0.5">
    <span className="font-bold uppercase tracking-wider text-white/70 text-[10px] sm:text-xs">
      {t('common.words')}
    </span>
    <ChevronDown className={cn(
      'h-3 w-3 text-white/50 transition-transform duration-200',
      showFoundWords && 'rotate-180'
    )} />
  </div>
</button>
```

The `border border-white/20 rounded-neo` gives the button a defined bounding box visible on dark backgrounds. The `ChevronDown` rotates to indicate expand/collapse state.

---

### 12 — Empathetic Dead-End State with Mascot
**Severity**: Medium | **Effort**: Medium | **Files**: `BlastGameLayout.tsx`, new `BlastDeadEndPanel.tsx`

**Problem**: Dead-end notification is a purely functional dark box. This is a low-energy moment in the emotional arc — the player has failed to find a word — and the design treats it as an error state rather than a coaching opportunity.

**Solution**: Replace the flat notification with a dedicated `BlastDeadEndPanel.tsx`:
- Mascot (`<Mascot variant="thinking" size="sm" animated />`) on the left
- Encouraging copy in a speech-bubble style div: "Hmm, try shuffling the tiles!" (translated)
- Primary CTA: Shuffle (large, `bg-neo-lime`, full-width on narrow screens)
- Secondary CTAs: Hint (if available) and Give Up (smaller, less prominent)
- Entrance animation: mascot bounces in from left with `initial={{ x: -20, opacity: 0 }}`

This turns a failure moment into a coaching moment — the design language shifts from "error" to "let me help you."

---

### 13 — Add Board Drop-In Intro Animation
**Severity**: Medium | **Effort**: Low-Medium | **Files**: `BlastGrid.tsx`

**Problem**: The board appears instantly when `blast.modifiedGrid` is ready. There is no transition from the loading state to the playable state.

**Solution**: On the first render of `BlastGrid`, animate the grid container in with a staggered column drop:

```tsx
// In BlastGrid.tsx, track firstRender with useRef
const hasAnimated = useRef(false);
// Pass to GridComponent as initialAnimation prop or wrap BlastGrid in:
<motion.div
  ref={containerRef}
  initial={!hasAnimated.current ? { opacity: 0, y: -12 } : false}
  animate={{ opacity: 1, y: 0 }}
  transition={{ type: 'spring', stiffness: 200, damping: 20, duration: 0.4 }}
  onAnimationComplete={() => { hasAnimated.current = true; }}
  className="blast-game blast-grid-frame ..."
>
```

For reduced-motion users, the `AdaptiveMotion.div` equivalent would skip this animation. Duration is short (0.4s) so it does not delay the player.

---

### 14 — Add Codex Notification Badge After New Discovery
**Severity**: Low-Medium | **Effort**: Low | **Files**: `BlastGameLayout.tsx`

**Problem**: After `BlastComboDiscovery` banner dismisses, there is no indicator that the codex has new content. The `BookOpen` icon shows no badge.

**Solution**: Track `hasNewCodexEntry` in local state within `BlastGameLayout`:

```tsx
const [hasNewCodexEntry, setHasNewCodexEntry] = useState(false);

// When a new discovery is acknowledged:
// In the effect watching pendingDiscovery changes — when it transitions from non-null to null:
useEffect(() => {
  if (pendingDiscovery == null) return;
  setHasNewCodexEntry(true); // set badge when discovery becomes pending
}, [pendingDiscovery]);

// Clear when codex is opened:
onClick={() => { setShowCodex(true); setHasNewCodexEntry(false); }}
```

The `BookOpen` button gains a small indicator dot:
```tsx
<div className="relative">
  <BookOpen className="h-5 w-5" />
  {hasNewCodexEntry && (
    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-neo-yellow border border-neo-black" />
  )}
</div>
```

This notification pattern is standard on mobile — Instagram stories, YouTube notifications, App Store update badges all use this pattern.

---

### 15 — Fix Stats Row Progress Bar Width and Add ARIA
**Severity**: Low | **Effort**: Low | **Files**: `BlastGameLayout.tsx`, `BlastProgressBar.tsx`

**Problem**: `BlastProgressBar` is wrapped in `w-28 sm:w-32` at `BlastGameLayout.tsx:442-445`. This is a fixed width in a flex row that also contains a score card, move counter, and word count button. The fixed width creates uneven distribution on screens narrower than 375px and does not use available space on wider screens.

Additionally, `BlastProgressBar` has no `role="progressbar"` (see improvement #6, which covers this in more detail).

**Solution**: Replace `w-28 sm:w-32` wrapper with `flex-1 min-w-[72px] max-w-[140px]`:

```tsx
<div className="flex-1 min-w-[72px] max-w-[140px]">
  <BlastProgressBar cleared={tilesCleared} total={totalTiles} t={t} />
</div>
```

This allows the progress bar to scale proportionally with the stats row, filling available space up to a cap that prevents it from dominating the row. The `ARIA` progressbar role should be added to `BlastProgressBar.tsx` per improvement #6.

---

## Summary Table

| Rank | Improvement | Severity | Effort | WCAG | Primary File |
|------|-------------|----------|--------|------|--------------|
| 1 | Path connector line between selected tiles | Critical | Medium | — | BlastGrid.tsx |
| 2 | Screen shake respects prefers-reduced-motion | Critical | Low | 2.3.3 | BlastGameLayout.tsx |
| 3 | Safe-area-inset-bottom for bottom UI | Critical | Low | — | BlastGameLayout.tsx |
| 4 | Increase special tile badge size and fix icon conflicts | High | Medium | — | BlastTileOverlay.tsx |
| 5 | Visual indicator during cascade lockout | High | Low | — | BlastGrid.tsx |
| 6 | ARIA roles on all progress/interactive elements | High | Low | 1.3.1, 4.1.2 | BlastProgressBar.tsx, BlastObjectiveDisplay.tsx, BlastGameLayout.tsx |
| 7 | Unify cascade feedback to single screen location | High | Medium | — | BlastGameLayout.tsx |
| 8 | Promote combo display — remove compact mode | Med-High | Low | — | BlastGameLayout.tsx |
| 9 | Wave intro screen with objective preview | Medium | Medium | — | New BlastWaveIntro.tsx |
| 10 | Fix header touch targets to WCAG minimum | Medium | Low | 2.5.5 | BlastGameLayout.tsx |
| 11 | Make word count button visually interactive | Medium | Low | — | BlastGameLayout.tsx |
| 12 | Empathetic dead-end state with mascot | Medium | Medium | — | BlastGameLayout.tsx |
| 13 | Board drop-in intro animation on game start | Medium | Low | — | BlastGrid.tsx |
| 14 | Codex notification badge after discovery | Low-Med | Low | — | BlastGameLayout.tsx |
| 15 | Progress bar flexible width and ARIA | Low | Low | 1.3.1 | BlastGameLayout.tsx |

---

## Preserved Strengths — Do Not Change

These are correct decisions that should be maintained:

- Timestamp-delta stagger on chain bomb explosions (`BlastExplosionLayer.tsx:77`) — creates ripple without extra code.
- `MAX_VISIBLE_EXPLOSIONS = 6` cap — correct GPU management.
- `BlastComboFlash` with `useReducedMotion()` — the only animation in Blast that currently handles reduced-motion at the CSS level.
- Distinct haptic patterns (`vibrateBlastBomb`, `vibrateBlastPrism`, `vibrateBlastLightning`, `vibrateBlastCascade`) — rare and valuable sensory design.
- Score popup intensity tiers (0.9x/1.2x/1.5x scale with labels) — semantically meaningful reward hierarchy.
- Hits-remaining badge traffic light (white/amber/red) — immediately learnable.
- Symmetric `0 0 Xpx` combo glow shadows — RTL-safe by design.
- `AdaptiveMotion` + `AdaptiveAnimatePresence` throughout — correct performance architecture.
- `dir="ltr"` on `BlastTileOverlay` with numeric `gridColumn` — intentional and correct, needs a code comment to clarify intent.
- Near-miss shimmer `nearMissPulse` — psychologically effective, appropriately subtle.
- Sugar Crush sequence as move-exhaustion response — borrowed intelligently from Candy Crush, creates a reward moment from a failure state.
