# Blast Mode Audit — Ghost Tiles, Objective Overload, Completion Feedback

**Date:** 2026-07-03
**Scope:** LexiClash legacy blast (`/blast`, live). Fix the persistent letterless-tile bug, cap objective overload, and make objective completion legible + celebrated.

---

## Problem statement

Three player-reported issues, verified in code:

1. **Ghost tiles** — after explosions/cascades, a tile cell keeps rendering with **no letter**. Persistent, not transient.
2. **Objective overload** — some waves show up to 6 goals (base 3 + `target_word` + `color_power` + cc-mechanic), with no cap.
3. **No "done" indication** — players don't perceive when a goal completes. (A lime `<Check>` *does* render, but it's weak and scrolls off the persistent banner; goals never appear on the wave-intro or wave-clear screens.)

---

## Root causes (traced, confirmed)

> **Update (post-implementation):** the reachable trigger is a **double-submit re-entrancy race**. `handleWordAccepted` had no in-flight lock; the board's input-disable (`BlastGame.tsx:681`, gated on `!isCascading && !isAnimating`) is React state that lags a render, so a fast double-tap fires a second submission in the lag window. That both double-counts score/moves and skips the second cascade's grid commit (below). Fixed at the source with a `processingRef` guard **and** the commit belt below. Reachability proven by a RED test (`submitWord` fired 2×). Wave-intro goal preview was implemented (not deferred).

### 1. Ghost tile = skipped grid commit (Class-4 silent no-op × Class-3 asymmetric path)

The pure logic is correct. `computeGravityResult` (`blastGravity.ts:254-268`) has a **repair loop** that backfills any non-cleared cell with an empty letter, and there are passing unit tests asserting "no live blank." `startCascade` (`useBlastEngine.ts:466-468`) advances the engine **refs** to that repaired grid immediately, but the **React-state commit** is deferred to a callback:

```
startCascade() returns commit: () => { setCurrentGrid(refs); setTileStates(refs); }
runCascade → sequencer.animateCascade(gravity, chainLevel, () => cascadeResult.commit?.())
```

Inside `animateCascade` (`useBlastSequencer.ts:157-190`), the commit fires at **line 190**, but a **concurrency guard at line 162** returns *before* it:

```js
if (runningRef.current) return;   // ← skips commitFn() at line 190
runningRef.current = true;
...
if (commitFn) commitFn();          // line 190
```

`handleWordAccepted` (`useBlastWordHandler.ts:89`) is an async, **re-entrant** handler with no in-flight lock; `runningRef` is **shared** between `animateWordClear` and `animateCascade`. When a second word is submitted while a cascade is still animating, `animateCascade` hits the guard and **returns without committing**. Engine refs move forward (gameplay logic stays correct), but `currentGrid` state stays frozen on the **stale pre-gravity grid** — which can hold a blank stranded by a prior vortex/shuffle/explosion. Result: a persistent letterless tile that disagrees with engine state until a *later* cascade happens to commit.

**Fix:** the grid commit must not be gated behind the animation. On the concurrency early-return, still call `commitFn()` (snap the board to correct state; forgo the fall animation). Repairs state, never hides a tile.

### 2. Objective overload = uncapped bonus seeding

`getWaveObjectives` (`blastWaveConfig.ts:336-374`) builds 3 base objectives, then appends up to three **bonus** objectives (`seedTargetWordObjective` 25%, `seedColorPowerObjective` 25%, `seedCcMechanicObjective`) with **no total cap**. Seeding is deterministic per wave number, so specific waves *always* overflow.

**Fix:** clamp total objectives to a max after seeding. Keep all base objectives; trim **bonus** objectives (target_word / color_power / cc) to fit the cap. FTUE waves (1–2) already ≤3 and are untouched.

### 3. Completion feedback = present but weak, and absent from wave screens

`BlastObjectiveBanner.tsx` renders `data-complete` + lime text + a small `<Check>`, but: `color_power` gets **no** check (line 88 skips it); there's **no moment-of-completion pop** (the state just quietly changes); and neither `BlastWaveIntro` nor `BlastResultsSummary` shows the full objective set (intro shows none; results show only `target_word`).

**Fix:** (a) stronger "done" row — filled check chip + strikethrough for every completed type incl. `color_power`; (b) a moment-of-completion pop (scale/flash + light sound) when an objective flips to complete; (c) preview objectives on the wave-intro; (d) per-objective ✓/✗ summary on wave-clear.

---

## Design

### P0 — Ghost tile fix
- `useBlastSequencer.animateCascade`: on the `runningRef.current` early-return, call `commitFn?.()` before returning. Same treatment is not needed for `animateWordClear` (it carries no grid commit).
- **Regression test (RED first):** pure sequencer test — invoke `animateCascade` twice without awaiting the first; assert the second invocation still calls its `commitFn`. Locks the invariant "a grid commit is never skipped."
- Belt check: confirm no other `animateCascade`/commit caller relies on the skip.

### P1 — Objective cap
- Add `MAX_WAVE_OBJECTIVES` (proposed **4** total, i.e. `clear_percent` + 3 visible in the banner). Rationale: 3 banner rows is the comfortable mobile ceiling; the HUD already renders `clear_percent` separately.
- New helper `capWaveObjectives(objectives, max)` — preserves base objectives (everything seeded before the bonus block), drops **bonus** objectives from the end until length ≤ max. Applied at the tail of `getWaveObjectives`.
- Unit test: a wave that seeds all bonuses returns ≤ max; base objectives always retained.

### P1 — Completion feedback
- **Banner** (`BlastObjectiveBanner.tsx`): completed rows get a filled check chip + strikethrough label; add the check to `color_power` too. Keep it lightweight (no layout reflow).
- **Moment-of-completion pop:** derive newly-completed objectives (diff previous `isComplete` set vs current) in the objectives hook / banner, and pulse the row (`animate-neo-pop`) + optional light sfx once per completion. No new persistent state machine — a `useRef<Set>` of already-celebrated objective keys.
- **Wave intro** (`BlastWaveIntro.tsx`): render a compact objective preview (reuse `formatObjectiveLabel` + `ObjectiveTilePreview`) so players know the goals before play.
- **Wave clear** (`BlastResultsSummary.tsx`): per-objective ✓ (lime) / ✗ (muted) list, not just `target_word`.

> **Status (2026-07-03, session 2):** ALL items implemented. Added on top of session 1: results-screen per-objective ✓/✗ summary (`finalObjectives` snapshot threaded through `handleGameEnd`), wave-intro hold extended to 2600ms when goals are previewed (1.5s was an unreadable flash). Verified: `completedObjRef`/`waveClearPlayedRef` are safe across waves (BlastGame remounts via `key={game-N}` on every wave advance/retry/replay). 1699 legacy blast tests green, tsc0, lint0.

### i18n
All new copy via `t()` across en/he/sv/ja/es. Existing `blast.objective.*` keys cover labels; add keys only for new UI (e.g. wave-intro "Goals" header if not reused, wave-clear objective summary header). Native translations, not literal (use ux-writer conventions).

---

## Testing
- Sequencer commit-skip regression test (RED→GREEN).
- `capWaveObjectives` unit tests.
- Banner completion-state render test (check + strikethrough incl. color_power).
- Existing blast gravity/objective tests must stay green.
- Manual/live verify on `/blast`: rapid successive submits (the overlap path) show no lingering blank; Hebrew RTL banner + wave screens.

## Non-goals / deferred
- Broader "fun factor" redesign beyond objective clarity + closure.
- v2 admin blast.
- Full bug sweep of every special-tile effect (separate pass if wanted).
- Server-authoritative MP grid reconciliation (the fix is client-render correctness; MP already seeds refills deterministically).

## Risk
- Committing the grid on the animation-skip path may cause a one-frame positional snap instead of a fall tween on the (rare) overlap. Acceptable: a correct board beats a pretty stale one. No gameplay-logic change (refs were already advanced).
