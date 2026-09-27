# Word Tower Crane Truth + Word-Building Juice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the crane drop score the visible swinging load (not the invisible trolley), fix the broken hang/fall geometry so the girder lands ON its shadow, link placement wobble to drop quality, and add per-letter escalation to word building.

**Architecture:** Pure geometry/physics modules in `fe-next/lib/wordTower/` (TDD), thin wiring in `WordTowerCrane.tsx` / `WordTowerWheel.tsx` / `WordTowerScene.tsx` / `WordTowerPlay.tsx`. Verdict pipeline (`evaluatePlacement`, `effectiveDropError`, `landingOffset`) unchanged — only its *input* changes from trolley offset to load offset.

**Tech Stack:** Next.js 16, TypeScript, Vitest, Tailwind v4 `@utility` keyframes, Howler (rate = pitch).

## Global Constraints

- All UI text via `t()` — the only new visible string is `formatHeightGain()` output ("+3m", already language-neutral, reused).
- Max 500 lines/file — `WordTowerCrane.tsx` is 528; Task 3 must bring it ≤500 via the geometry extraction.
- TDD: failing test first for every pure module.
- Run from `fe-next/`: `npx vitest run <file>` per task; full `npm run lint && npm run test:frontend && npm run build` at the end.
- WYSIWYG invariant: live band preview, landing shadow, and verdict MUST all derive from the same `loadOffsetNorm` + `landingOffset` projection.

---

### Task 1: `craneGeometry.ts` — adaptive hang + fall-to-shadow (pure)

**Files:**
- Create: `fe-next/lib/wordTower/craneGeometry.ts`
- Test: `fe-next/lib/wordTower/__tests__/craneGeometry.test.ts`

**Interfaces:**
- Produces: `CRANE_CHROME_H_PX=210`, `CRANE_SHADOW_Y_PX=190`, `CRANE_CARRIAGE_H_PX=12`, `CRANE_HOOK_H_PX=12`, `craneCableLenPx(beamH: number): number`, `craneBeamBottomPx(beamH: number): number`, `craneFallPx(beamH: number): number`, `craneArmPx(beamH: number): number`.

- [ ] **Step 1: failing test** — invariants for beamH of words len 3..10 (`craneBeamTilePx(len)*len`):
  - `craneBeamBottomPx(h) + craneFallPx(h) === CRANE_SHADOW_Y_PX` (girder lands exactly on the shadow)
  - `craneFallPx(h) >= 44` (always a readable fall)
  - `craneCableLenPx(h)` clamped to `[18, 64]`, monotonically non-increasing in beamH
  - `craneArmPx(h) === craneCableLenPx(h) + CRANE_HOOK_H_PX + h/2`
- [ ] **Step 2: run** `npx vitest run lib/wordTower/__tests__/craneGeometry.test.ts` → FAIL (module missing)
- [ ] **Step 3: implement**

```ts
// beam bottom = carriage + cable + hook + beamH; cable shrinks so bottom ≤ SHADOW_Y - MIN_FALL
export const CRANE_CHROME_H_PX = 210;
export const CRANE_SHADOW_Y_PX = 190;
export const CRANE_CARRIAGE_H_PX = 12;
export const CRANE_HOOK_H_PX = 12;
const CABLE_MIN_PX = 18, CABLE_MAX_PX = 64, MIN_FALL_PX = 44;
export function craneCableLenPx(beamH: number): number {
  const free = CRANE_SHADOW_Y_PX - MIN_FALL_PX - CRANE_CARRIAGE_H_PX - CRANE_HOOK_H_PX - Math.max(0, beamH);
  return Math.round(Math.max(CABLE_MIN_PX, Math.min(CABLE_MAX_PX, free)));
}
export function craneBeamBottomPx(beamH: number): number {
  return CRANE_CARRIAGE_H_PX + craneCableLenPx(beamH) + CRANE_HOOK_H_PX + Math.max(0, beamH);
}
export function craneFallPx(beamH: number): number {
  return CRANE_SHADOW_Y_PX - craneBeamBottomPx(beamH);
}
export function craneArmPx(beamH: number): number {
  return craneCableLenPx(beamH) + CRANE_HOOK_H_PX + Math.max(0, beamH) / 2;
}
```
  (Note: with min cable 18 a 10-brick 160px beam bottom = 202 > 190 → fall negative. Test drives the fix: clamp `craneFallPx` to ≥ MIN_FALL by *letting SHADOW_Y give way*? No — instead beam budget 150 + 18 + 24 + 12 = 204. So set `CRANE_SHADOW_Y_PX = 204 + 44 = 248`? Chrome grows. Decision locked here: `CRANE_SHADOW_Y_PX = 190` with `CRANE_BEAM_BUDGET_PX` reduced is NOT allowed (founder wants full word shown). Instead cable min 18 holds and `craneFallPx` clamps to `Math.max(MIN_FALL_PX, ...)` while SHADOW stays the landing render anchor — WRONG, breaks land-on-shadow. Correct resolution: `CRANE_CHROME_H_PX = 260`, `CRANE_SHADOW_Y_PX = 250`. Then worst beam bottom = 12+18+12+150 = 192, fall = 58 ≥ 44. All invariants hold with pure clamp-free arithmetic. Use 260/250.)
- [ ] **Step 4: run** → PASS

### Task 2: `loadOffsetNorm` — the load is the scored object (pure)

**Files:**
- Modify: `fe-next/lib/wordTower/cranePendulum.ts`
- Test: `fe-next/lib/wordTower/__tests__/cranePendulum.test.ts` (extend)

**Interfaces:**
- Produces: `loadOffsetNorm(trolleyNorm: number, angleDeg: number, armPx: number, rangePx: number): number`; `PENDULUM_MAX_DEG` becomes 10.

- [ ] **Step 1: failing tests**
  - angle 0 → returns trolleyNorm exactly
  - positive angle displaces positive: `loadOffsetNorm(0, 10, 110, 110) ≈ sin(10°)`
  - arm scales linearly; rangePx=0 guarded (returns trolleyNorm)
- [ ] **Step 2: run** → FAIL
- [ ] **Step 3: implement** + rewrite the module doc comment: pendulum is now MECHANICAL; the invariant is "preview and verdict read the same `loadOffsetNorm`". Bump `PENDULUM_MAX_DEG` 8→10.

```ts
export function loadOffsetNorm(trolleyNorm: number, angleDeg: number, armPx: number, rangePx: number): number {
  if (!(rangePx > 0)) return trolleyNorm;
  const v = trolleyNorm + Math.sin((angleDeg * Math.PI) / 180) * (armPx / rangePx);
  return v === 0 ? 0 : v;
}
```
- [ ] **Step 4: run** (existing pendulum tests must stay green) → PASS

### Task 3: Wire crane component to load-truth + real fall

**Files:**
- Modify: `fe-next/components/wordTower/WordTowerCrane.tsx`
- Test: existing `WordTowerCrane.sofit.test.tsx` must stay green; add `fe-next/components/wordTower/__tests__/WordTowerCrane.geometry.test.tsx`

**Interfaces:**
- Consumes: Task 1 geometry fns, Task 2 `loadOffsetNorm`.

- [ ] **Step 1: failing component test** — render crane with a 3-letter and an 8-letter word; assert the cable div height equals `craneCableLenPx(beamH)` and chrome container height is `CRANE_CHROME_H_PX` (via inline style), proving adaptive hang.
- [ ] **Step 2: wiring changes** (all inside `WordTowerCrane.tsx`):
  - Delete local `CABLE_LEN_PX`; compute `beamH` first, then `cableLen = craneCableLenPx(beamH)`, `fallPx = craneFallPx(beamH)`, `armPx = craneArmPx(beamH)`.
  - Chrome `style={{ height: CRANE_CHROME_H_PX }}`; shadow `top` = `CRANE_SHADOW_Y_PX - 2`; keep reticle at bottom.
  - Fall transform: `translateY(${falling ? fallPx : 0}px)` (same 300ms curve).
  - rAF loop: track `loadRef.current = loadOffsetNorm(x, p.angleDeg, armPx, TROLLEY_RANGE_PX)`; smooth **load** velocity (`velPerMsRef` from load deltas, not trolley deltas).
  - `drop()`: `signedOffset = getOffset ? getOffset() : loadRef.current` (test seam unchanged).
  - Preview: `previewProjected = landingOffset(loadNow, velPerMsRef.current)`; shadow drift px = `(previewProjected - pos) * TROLLEY_RANGE_PX` (relative to the trolley wrapper it lives in).
  - Fall drift: `driftPxRef.current = (projected - pos) * TROLLEY_RANGE_PX` — beam visually travels from where it hangs to the scored landing spot.
  - Keep component ≤500 lines (geometry constants now imported).
- [ ] **Step 3: run** geometry + sofit tests → PASS
- [ ] **Step 4: run** `npx vitest run lib/wordTower components/wordTower` → all green

### Task 4: Quality-linked swivel

**Files:**
- Modify: `fe-next/lib/wordTower/swivelDrop.ts`, `fe-next/components/wordTower/WordTowerScene.tsx:361`
- Test: `fe-next/lib/wordTower/__tests__/swivelDrop.test.ts` (extend)

**Interfaces:**
- Produces: `swivelStartDeg(lean: number, topDy: number, quality?: PlacementQuality)` — default keeps legacy magnitude.

- [ ] **Step 1: failing tests** — `|perfect| < |undefined/good| < |sloppy|` at same lean/topDy; arc cap still binds for tall runs; `miss` matches `sloppy`.
- [ ] **Step 2: implement** — quality multiplier `{ perfect: 0.6, good: 1, sloppy: 1.5, miss: 1.5 }` applied to the magnitude BEFORE the cap; import type from `cranePlacement`.
- [ ] **Step 3: scene wiring** — `swivelStartDeg(leanRef.current, topDy, impactQualityRef.current)`.
- [ ] **Step 4: run swivel tests + scene-adjacent tests** → PASS

### Task 5: Word-building juice — letter tick + tile pop + reward preview

**Files:**
- Modify: `fe-next/lib/wordTower/placementFx.ts` (add `letterTickRate`), `fe-next/components/wordTower/WordTowerPlay.tsx` (tick + gain preview), `fe-next/components/wordTower/WordTowerHud.tsx` (pass-through), `fe-next/components/wordTower/WordTowerWheel.tsx` (pop class + preview), `fe-next/app/globals.css` (`wt-tile-pop` utility)
- Test: `fe-next/lib/wordTower/__tests__/placementFx.test.ts` (extend or create), `fe-next/components/wordTower/__tests__/WordTowerWheel.juice.test.tsx`

**Interfaces:**
- Produces: `letterTickRate(index: number): number` (1.0 base, +0.07/letter, clamp ≤1.6); `WordTowerWheelProps.gainPreview?: string`; `WordTowerHudProps.gainPreview?: string`.

- [ ] **Step 1: failing tests**
  - `letterTickRate(0)===1`, monotonic, `letterTickRate(20)===1.6`
  - Wheel: `canBuild` + `gainPreview="+3m"` renders the text on the BUILD hub; last-selected tile has class `wt-tile-pop`
- [ ] **Step 2: implement**
  - `placementFx.ts`: `export function letterTickRate(index: number): number { return Math.min(1.6, 1 + Math.max(0, index) * 0.07); }`
  - `WordTowerPlay.tsx`: `selectTileHaptic` also fires `playSound('tileSelect', { rate: letterTickRate(tower.state.selected.length) })` (needs `playSound` from `useSoundEffects()`); compute `gainPreview = tower.word.length >= WORD_TOWER_MIN_WORD_LEN ? formatHeightGain(floorMeters(tower.word.length, game.combo)) : undefined` and pass to Hud.
  - `WordTowerHud.tsx`: forward `gainPreview` to Wheel.
  - `WordTowerWheel.tsx`: BUILD hub renders `{gainPreview}` in a `text-[10px] text-black/70 tabular-nums` line under the word; tile gets `wt-tile-pop` keyed by `selected[selected.length-1] === i` (re-triggered via `key={selected.length}` on an inner span or animation reset).
  - `globals.css`: `@utility wt-tile-pop { animation: wt-tile-pop 240ms cubic-bezier(0.34,1.56,0.64,1); } @keyframes wt-tile-pop { 0%{transform:scale(1)} 40%{transform:scale(1.22)} 100%{transform:scale(1)} }` — note tiles already carry `translate(-50%,-50%)` on the button; apply pop to an inner wrapper so transforms don't fight.
- [ ] **Step 3: run new tests** → PASS

### Task 6: Full gate + single implementation commit

- [ ] `cd fe-next && npm run lint && npx tsc --noEmit`
- [ ] `npm run test:frontend` (known pre-existing OOM flake on blast/legacy mpGrid teardown — rerun that shard if hit)
- [ ] `npm run build` → RC=0 (verify by state: `.next/BUILD_ID` mtime)
- [ ] ASK USER, then commit: `feat(word-tower): crane scores the visible load, real fall-to-shadow geometry, quality-linked swivel, per-letter build juice`
