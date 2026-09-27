# Spec — Classic Multiplayer Board: Lean Visual Profile

**Date:** 2026-06-16
**Goal:** Classic MP board "feels super heavy and stuck"; graphics no better than Word Hunt (which is snappier). Make MP classic feel as light as Word Hunt without a rebuild.

## Diagnosis (verified against source)

Word Hunt and classic MP render the **same** `GridComponent`. Word Hunt feels lighter purely because of the *props it passes* (combo 0, fewer effects) and because it uses a purpose-built lean layout (`WordHuntGameLayout`), while classic MP uses the heavyweight `PortraitLayout`.

The team has already done substantial board perf work (drag-suppressed glow/particles/chromatic, `suppressAnimations` gate killing infinite repaints during selection, ref-cached escalation objects, Set-based O(1) cell lookups). Cheap wins are mostly taken. What **remains heavy during the live drag** and does NOT beat Word Hunt visually:

1. **Tier-flash radial-gradient overlay** (`GridComponent.tsx:611-627`) — fires on every tier transition *as the word grows mid-drag*; not drag-gated.
2. **Per-letter static repaints** — each added letter changes selected-cell `background` + `box-shadow` + `scale` (non-composited → main-thread raster) once per letter, escalating in cost as the gradient/glow grow.
3. **Chromatic-aberration `drop-shadow` filter** (`GridComponent.tsx:516-518`) — tier-3 full-board composite; invisible value.
4. **4× `CircularTimer` mounts** (`PortraitLayout.tsx:443-454`) — all re-render every 1s tick; only CSS hides 3.

`InGameScreen` is rendered only by `MultiplayerInGameView`, and `PortraitLayout` only by `InGameScreen` → **`PortraitLayout` is the MP-classic board host.** Single-player classic uses a separate component. So gating at `PortraitLayout`'s `GridComponent` call targets MP classic exactly, zero SP blast radius.

## Approach — converge, don't rebuild

Add an opt-in **lean visual profile** to `GridComponent`; enable it for MP classic. Keep all combo *scoring* (handled by backend + `ComboDisplay`, which read the real combo independently of the board visuals). Keep the word-submit celebration — juice moves from the continuous drag decoration to the submit moment.

### Changes (final — combo-0 lever)

The lever is **force the board's visual combo to 0** — exactly what Word Hunt passes
(`comboLevel={0}`). This is more faithful and strictly safer than zeroing escalation:
a SELECTED cell still gets a non-null length-driven `baseTier` escalation (Word Hunt
does too), so we never create the novel `selected + escalation=null` state that would
flow unguarded into `GridCellEffects`. The dominant heaviness delta vs Word Hunt is the
**combo amplification** (between-word streaks → faster tier climbs + ×1.6 particle/glow +
more frequent tier-flash + chromatic on shorter words) — combo-0 removes exactly that.

1. **`GridComponent`** gains `effectsProfile?: 'full' | 'lean'` (default `'full'` → SP / practice / daily unchanged).
2. **Pure resolver** `resolveGridEffects(profile, { comboLevel, effectiveCombo })` → `{ visualComboLevel, visualEffectiveCombo }`:
   - `lean` → both `0`
   - `full` → `comboLevel`, `effectiveCombo` (value-identical to today)
3. `GridComponent` consumes the resolver:
   - `comboColors` from `visualComboLevel`; `currentTier` + per-cell `getSelectionEscalation(...)` + `GridCell comboLevel/escalationCombo` + connector combo all use `visualEffectiveCombo`
   - the **real** `comboLevel` still flows to `useGridInteraction` (selection/scoring untouched)
   - tier-flash + chromatic now fire on the **length-driven** tier (combo-0), i.e. Word-Hunt frequency — no special-case suppression needed
4. **`PortraitLayout`** passes `effectsProfile={gameMode === 'classic' ? 'lean' : 'full'}` (blast uses ghost-cell overlay; word-hunt MP uses its own layout).
5. **Collapse 4 `CircularTimer` → 1** responsive instance — **DONE** (user-approved). The 4 CSS-hidden mounts all re-rendered every 1s tick; now one timer ticks (per-second churn −75%). New pure `resolveTimerSize(w,h)` (`components/game/in-game/timerSize.ts`) faithfully reproduces the prior 4-div breakpoint sizing (mobile→sm; tablet→md if h>850 else sm; desktop→md if h≥1024 else sm), driven by `useTimerSize()` (resize-based, SSR-safe 'sm' default). `onTimerState` now ALWAYS forwarded — fixes a latent bug where 2 of the 4 old mounts omitted it, so the urgency vignette silently died on the breakpoints they served. TDD: 11 size cases + 3 collapse tests (one timer / onTimerState forwarded / desktop-shell suppression). In-game timer visual needs user playtest verification across screen sizes.

### Lean selected-tile look
Length-driven escalation at combo 0 — identical to Word Hunt: clean base color, subtle
scale, soft glow that grows only with word length, no combo rainbow/gradient/flicker, no
combo-amplified particles. Juice stays in the word-submit celebration.

### Connector line centering (user-reported) — separate fix, verified

First hypothesis (combo-amplified `liftY`) was **wrong** — proven by measurement: `liftY` caps
at `MIN_LIFT_Y=−5`, so full vs lean connector offset was ~identical (−4.6 vs −4.0px). Combo-0
does not fix it.

Real cause: **stale mount-time centers.** `GridConnectorOverlay` measures cell centers once at
mount + 1 rAF + on `ResizeObserver`. Centers are measured RELATIVE to the grid (so a chrome
push-down is shift-invariant — not the bug), but the board frame plays a mount entrance
`scale 0.9→1` animation: the mount/rAF measurement lands mid-scale → compressed centers baked
into an unscaled viewBox → lines ride toward the top for the whole game. `ResizeObserver`
doesn't fire on the scale settle.

Fix (`GridConnectorOverlay.tsx`): `measure` extracted to `useCallback`; **re-measure once at
each selection start** (length 0→≥1) via rAF — runs long after the 0.6s entrance settles,
one measure per word-build, no per-drag layout reads. Shared component → also benefits SP /
Word Hunt (strictly fresher centers, no regression; 8/8 connector tests green).

**Browser-verified** (dev-only harness, both profiles): measure-at-rest → toggle selection →
re-measure drops the line offset to **−1.2px (full) / −1.05px (lean)** ≈ centered, vs −4.6px
when centers were stale. Lean board also visually confirmed lighter (no combo cyan fire-glow
halo) vs full.

### Preserved
Combo scoring · `ComboDisplay` · submit celebration (`ScreenFlashOverlay` / `FloatingScore` / `ComboMilestone`) · round-event tiles (frozen/charged/meteor/rush) · earthquake · accessibility / reduce-motion.

## Tests (TDD)
- `resolveGridEffects`: lean zeroes visual inputs + suppresses overlays; full preserves today's values. (pure, fast)
- `GridComponent` lean: no tier-flash overlay node, no chromatic `filter` style; combo scoring path untouched (selection still submits).
- Regression: existing `selectionEscalation` / `GridComponent` suites stay green.

Perf is verified by inspection + dev browser, not by timing assertions.
