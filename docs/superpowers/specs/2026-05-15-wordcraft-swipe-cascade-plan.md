# WordCraft Swipe-Chain Cascade — Implementation Plan

**Spec:** `2026-05-15-wordcraft-swipe-cascade-design.md`
**Worktree:** `.claude/worktrees/wordcraft-swipe-cascade` on `worktree-wordcraft-swipe-cascade`
**TDD:** Strict RED-GREEN-REFACTOR per `.claude/rules/22-tdd-strict.md`

## Reused (no change)

- `lib/word-craft/run/cardEffects.ts` — `applyCardEffects(ctx, cards) → WordScore` works as-is for cascade context
- `lib/word-craft/run/tileBag.ts` — `createBag / draw / remaining / SupportedLocale`
- `lib/word-craft/run/tileBag.scaler.ts` — locale scaling
- Pixi scenes (`ambientSparkles`, `tilePlaceRipple` → reskin as burn, `wordCommitWave`, `scoreConfetti`)
- `usePostHogFlag` (clone existing pattern from `useWordCraftRunFlag.ts`)
- `useWordCraftJuice` (extend with `playBurn`, `playCascade`, `playFireWarning`)

## Phases & commit gates

Commit after each phase. Ask user before each `git commit` per `.claude/rules/10-git.md`.

---

### **P1 — Cascade engine (pure TS)**
Goal: headless engine playable from tests. No UI yet.

**TDD order (one RED-GREEN-REFACTOR per file):**

1. `lib/word-craft/cascade/boardGrid.ts`
   - `createGrid(rows, cols, bag) → CascadeGrid` (cells with id + letter)
   - `neighborsOf(grid, cellId, diagonal=false) → CellId[]`
   - `cellAt(grid, row, col)`, `coordsOf(grid, cellId)`
   - RTL handled at render layer, NOT here. Grid coords are logical.
   - Tests: 7×7 grid shape, neighbor 4-dir vs 8-dir, oob safe, deterministic with seeded bag

2. `lib/word-craft/cascade/swipePath.ts`
   - `validatePath(grid, path, opts={ diagonal:false, minLength:3 }) → { ok, reason?, word? }`
   - Rules: contiguous (each step in neighbors of previous), no reuse, length ≥3
   - Tests: contiguous-ok, reuse-rejected, non-adjacent-rejected, too-short-rejected, diagonal flag

3. `lib/word-craft/cascade/burnAndGravity.ts`
   - `burnCells(grid, cellIds) → grid'` (cells marked empty)
   - `applyGravity(grid, bag) → { grid', spawnedCells }` (per-column collapse + spawn from top)
   - Tests: column-collapse keeps order, mid-column gap fills, top-row spawn deterministic with seed

4. `lib/word-craft/cascade/cascadeResolver.ts`
   - `findAutoWords(grid, isValidWord) → CascadeMatch[]` (scan rows/cols for ≥4-contig valid words)
   - `resolveCascade(grid, bag, isValidWord, maxDepth=10) → { finalGrid, chains: CascadeMatch[][] }`
   - Tests: single-row match, multi-row match, depth cap, no-match terminates

5. `lib/word-craft/cascade/fireRow.ts`
   - `createFireState(rows)`, `tickFire(state, deltaMs, riseEveryMs) → state'`
   - `resetFire(state, rowsToPushDown)`
   - `isGameOver(state) → boolean`
   - Tests: tick math, push-down on big word, frost-card pause hook, game-over threshold

6. `lib/word-craft/cascade/scoring.ts`
   - `scoreCascadeWord(word, path, chainCount, activeCards) → number`
   - Length bonus table + chainMult + delegates to `applyCardEffects`
   - Tests: length bonus boundaries (3/4/5/6/7/8+), chainMult cap 5×, card-effect integration

**P1 acceptance:**
- All cascade modules >90% coverage
- Engine plays a full headless round via test harness (submit → burn → gravity → resolve → score)
- `npm run test -- lib/word-craft/cascade` green

**Commit:** `feat(word-craft): cascade engine (P1)` — ask before commit.

---

### **P2 — Run integration + reducer extension**

1. Extend `runReducer.ts` with cascade phase variant
   - New state slice: `cascade?: { grid, fireState, comboCount, lastBurned }`
   - New actions: `START_CASCADE_RUN`, `SUBMIT_PATH`, `FIRE_TICK`, `CASCADE_RESOLVED`
   - Keep legacy actions intact (still behind run flag)
   - Tests: state transitions per action; no regression on legacy actions

2. New hook `lib/word-craft/cascade/useCascadeRun.ts`
   - Mirror `useWordCraftRun` surface but for cascade
   - Returns: `{ state, submitPath, tick, pickCard, restart }`
   - Wires fireRow ticker via `requestAnimationFrame` + visibility guard (per memory `429-storm-rate-limit-fix` pattern)
   - Tests: tick pauses on hidden tab, RESTART resets all

3. Add 6 cascade-native cards to `cardEffects.ts` pool
   - Pyro, Frost, Diagonal, Echo, Ember Boost, Bag Cheat
   - Each: scoreEffect or side-effect hook (Pyro/Frost/Diagonal need engine awareness — pass card flags through `submitPath` context)
   - Tests: per-card behavior at score level + side-effect level

4. New flag `lib/word-craft/useWordCraftCascadeFlag.ts`
   - Clone `useWordCraftRunFlag` shape: `usePostHogFlag('wordcraft-cascade-mode', false)` + `NEXT_PUBLIC_WORDCRAFT_CASCADE_DEV` override

**P2 acceptance:** `useCascadeRun` drives a headless playthrough via test harness. All cards tested.

**Commit:** `feat(word-craft): cascade run integration + cards (P2)` — ask before commit.

---

### **P3 — UI**

1. `components/word-craft/cascade/useSwipeGesture.ts`
   - Pointer/touch handler, hit-tests cells via `data-cell-id`
   - Builds path live; emits `onPathChange` + `onPathSubmit`
   - RTL-safe (logical coords, render rotates)
   - Tests: simulated PointerEvents — happy path, drag-off-board, reverse, RTL

2. `components/word-craft/cascade/CascadeBoard.tsx`
   - Renders `CascadeGrid` as grid of cells (Tailwind neo-brutalist)
   - Mounts `useSwipeGesture`
   - Calls `submitPath` on commit
   - Tests: renders 7×7, swipe e2e via Testing Library simulated pointer

3. `components/word-craft/cascade/SwipePathOverlay.tsx`
   - SVG path connecting selected cell centers, electric-lime glow
   - Reacts to `pathState`

4. `components/word-craft/cascade/FireRowOverlay.tsx`
   - Ember row with warning shake when `fireRow > threshold`
   - Audio sting (reuse existing SFX util)

5. `components/word-craft/cascade/useCascadeJuice.ts`
   - Burn, cascade, fire-warning, combo-shout (DOUBLE/TRIPLE/ELECTRIC)
   - Delegates to existing Pixi scenes + `useWordCraftJuice`

6. Extend `RunHUD.tsx`
   - Add `fireRow` indicator + `comboCount` chip
   - i18n keys: `wordcraft.cascade.fireWarning`, `wordcraft.cascade.combo.{double,triple,electric}`

**P3 acceptance:** Manual playthrough on `/word-craft` with `NEXT_PUBLIC_WORDCRAFT_CASCADE_DEV=1` works on desktop + 360×640 mobile sim. Reduced-motion respected.

**Commit:** `feat(word-craft): cascade UI + swipe (P3)` — ask before commit.

---

### **P4 — i18n + routing + telemetry**

1. Add `wordcraft.cascade.*` keys to all 5 locale files (en, he, sv, ja, es)
   - ~12 keys: FTUE copy, fire warning, combo names, instructions
   - Flag "needs native review" in commit body per memory `feedback-ai-hebrew-translation`

2. Mount cascade flag in route
   - `app/[locale]/word-craft/page.tsx` checks both flags; cascade wins if both true (preview path)
   - New `CascadePageClient.tsx` parallel to `RunPageClient.tsx`

3. PostHog events (canonical-only emitter per memory `posthog-weakness-fixes-2026-05-15`)
   - `wordcraft_cascade_word_submitted`
   - `wordcraft_cascade_combo`
   - `wordcraft_cascade_fire_warning`
   - `wordcraft_cascade_fire_gameover`
   - Tests: each event fires exactly once per action

**P4 acceptance:** All 5 locales render; 4 PostHog events single-fire; flag routing manual-tested in dev.

**Commit:** `feat(word-craft): cascade i18n + telemetry + flag wiring (P4)` — ask before commit.

---

### **P5 — Legacy cleanup (gated on production rollout)**

Defer until cascade flag at 100%. Separate commit later.

- Delete `useWordCraftGame.ts`, `WordCraftRack.tsx`, `useWordCraftDrag.ts`, `WordCraftZoomShell.tsx`, `WordCraftBoard.tsx`
- Strip Scrabble path from `PageClient.tsx` (or delete file, route directly to `CascadePageClient`)
- Strip premium-square logic from `scoring.ts`
- Remove `useWordCraftRunFlag` if cascade fully replaces run

Not in this implementation window.

---

## Test harness pattern (P1 + P2)

```ts
// __tests__/cascade.harness.test.ts
const bag = createBag('en', { seed: 42 });
const grid = createGrid(7, 7, bag);
const dict = makeMockDict(['ART', 'STAR', 'STARE']);

const submit = (cellIds) => {
  const v = validatePath(grid, cellIds);
  expect(v.ok).toBe(true);
  const burned = burnCells(grid, cellIds);
  const { grid: g2 } = applyGravity(burned, bag);
  const { finalGrid, chains } = resolveCascade(g2, bag, w => dict.has(w));
  return { finalGrid, chains, score: scoreCascadeWord(v.word, cellIds, 1, []) };
};
```

## Risks & mitigations (delta from spec)

- **Cascade resolver false-positives in HE/JA** — dictionary check is the gate; reuse existing `isValidWord(locale)` from `useWordCraftRun`
- **Pointer events on iOS Safari** — use `pointer-events: none` on overlay SVG; test on real device after P3
- **Fire ticker eats battery** — `rAF + document.visibilityState` guard; pause on `hidden`
- **Card pool inflation** — cap active cards at 4 per run (existing limit), tier rarity unchanged

## Order of attack

1. **Now:** P1 file 1 (`boardGrid.ts`) RED → GREEN → REFACTOR
2. Then files 2–6 in order
3. Stop at P1 acceptance, ask to commit
4. Then P2 → commit → P3 → commit → P4 → commit
