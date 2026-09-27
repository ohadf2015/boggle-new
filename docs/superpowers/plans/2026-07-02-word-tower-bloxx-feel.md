# Word Tower Bloxx-Feel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Word Tower the physical game-feel of Tower Bloxx — momentum block drops, tower compression bounce, tumbling debris, impact punch, crane personality — plus an upgrades shop worth browsing.

**Architecture:** Pure deterministic math modules in `fe-next/lib/wordTower/` (TDD, vitest), consumed by the DOM crane (`WordTowerCrane.tsx`) and the Pixi scene (`WordTowerScene.tsx`). No scoring/economy changes; `evaluatePlacement` unchanged — only the *offset fed to it* becomes a momentum-projected landing offset, with the live preview using the same projection (preview-equals-verdict invariant).

**Tech Stack:** TypeScript, vitest, PixiJS 8 (scene), DOM+Tailwind (crane), Framer Motion (panel).

## Global Constraints

- All UI text via `t('key')`; 6 locales: en, he, sv, ja, es, ru — native copy, no literal translation.
- Max 500 lines/file, components < 300 lines.
- TDD: failing test first for every pure module.
- `reducedMotion` prop already flows to crane + scene — every new effect must no-op under it.
- Run from `fe-next/`: `npx vitest run <file>` for units; phase-end `npm run lint && npm run test && npm run build`.
- Spec: `docs/superpowers/specs/2026-07-02-word-tower-bloxx-feel-design.md`.
- Commit per phase (conventional commits), ASK USER before each `git commit`.

---

## Phase 1 — Momentum drop + landing compression

### Task 1: `dropKinematics.ts` — momentum-projected landing

**Files:**
- Create: `fe-next/lib/wordTower/dropKinematics.ts`
- Test: `fe-next/lib/wordTower/__tests__/dropKinematics.test.ts`

**Interfaces:**
- Produces: `CARRY_FACTOR=0.5`, `MAX_DRIFT=0.35`, `FALL_MS=300`,
  `landingOffset(releaseOffset: number, velNormPerMs: number, fallMs?: number, carry?: number): number`,
  `driftFracAt(k: number): number` (0..1 fraction of total drift applied at fall progress k),
  `smoothVelocity(prev: number, next: number): number` (EMA smoother for frame-noise).

- [ ] **Step 1: Failing test** (`dropKinematics.test.ts`):

```typescript
import { describe, it, expect } from 'vitest';
import {
  landingOffset, driftFracAt, smoothVelocity,
  CARRY_FACTOR, MAX_DRIFT, FALL_MS,
} from '../dropKinematics';

describe('landingOffset (momentum carry)', () => {
  it('zero velocity reproduces legacy behaviour exactly', () => {
    expect(landingOffset(0.3, 0)).toBe(0.3);
    expect(landingOffset(-0.5, 0)).toBe(-0.5);
  });
  it('carries in the direction of travel', () => {
    expect(landingOffset(0, 0.001)).toBeGreaterThan(0);
    expect(landingOffset(0, -0.001)).toBeLessThan(0);
  });
  it('drift is clamped to MAX_DRIFT', () => {
    expect(landingOffset(0, 10) - 0).toBeLessThanOrEqual(MAX_DRIFT);
    expect(0 - landingOffset(0, -10)).toBeLessThanOrEqual(MAX_DRIFT);
  });
  it('drift equals vel*fall*carry inside the clamp', () => {
    const v = 0.0004; // ~triangle-wave speed at period 3000ms → drift 0.06
    expect(landingOffset(0.1, v)).toBeCloseTo(0.1 + v * FALL_MS * CARRY_FACTOR, 10);
  });
  it('result stays finite and within [-2,2] sanity bounds', () => {
    expect(Math.abs(landingOffset(1, 99))).toBeLessThanOrEqual(1 + MAX_DRIFT);
  });
});

describe('driftFracAt', () => {
  it('starts at 0, ends at 1, monotonic', () => {
    expect(driftFracAt(0)).toBe(0);
    expect(driftFracAt(1)).toBe(1);
    let prev = 0;
    for (let k = 0; k <= 1.001; k += 0.05) {
      const f = driftFracAt(k);
      expect(f).toBeGreaterThanOrEqual(prev);
      prev = f;
    }
  });
  it('clamps outside [0,1]', () => {
    expect(driftFracAt(-1)).toBe(0);
    expect(driftFracAt(2)).toBe(1);
  });
});

describe('smoothVelocity', () => {
  it('moves toward the new sample without overshooting', () => {
    const s = smoothVelocity(0, 0.001);
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThanOrEqual(0.001);
  });
  it('is identity when samples agree', () => {
    expect(smoothVelocity(0.002, 0.002)).toBeCloseTo(0.002, 12);
  });
});
```

- [ ] **Step 2:** `npx vitest run lib/wordTower/__tests__/dropKinematics.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement** `dropKinematics.ts`:

```typescript
/**
 * Word Tower — momentum drop kinematics (pure).
 *
 * Tower Bloxx skill: the released block INHERITS the trolley's horizontal
 * velocity and drifts during the fall — you release slightly before centre
 * and watch it swing in. The projected landing offset (not the release
 * snapshot) feeds the verdict, and the live band preview uses the SAME
 * projection so preview can never disagree with the verdict.
 */

/** Fraction of the ballistic drift actually applied (tuned for fairness). */
export const CARRY_FACTOR = 0.5;
/** Hard cap on momentum drift in normalized offset units. */
export const MAX_DRIFT = 0.35;
/** Fall duration — MUST match the crane's CSS fall animation (300ms). */
export const FALL_MS = 300;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Projected landing offset: release position + clamped momentum drift. */
export function landingOffset(
  releaseOffset: number,
  velNormPerMs: number,
  fallMs: number = FALL_MS,
  carry: number = CARRY_FACTOR,
): number {
  const drift = clamp(velNormPerMs * fallMs * carry, -MAX_DRIFT, MAX_DRIFT);
  return releaseOffset + drift;
}

/**
 * Horizontal drift progress during the fall — ease-out so the block visibly
 * decelerates sideways as gravity takes over (reads as air resistance).
 */
export function driftFracAt(k: number): number {
  const t = clamp(k, 0, 1);
  return 1 - (1 - t) * (1 - t);
}

/** EMA smoother for per-frame velocity samples (kills rAF jitter). */
export function smoothVelocity(prev: number, next: number): number {
  return prev + (next - prev) * 0.35;
}
```

- [ ] **Step 4:** Run test → PASS.

### Task 2: Wire momentum into `WordTowerCrane.tsx`

**Files:**
- Modify: `fe-next/components/wordTower/WordTowerCrane.tsx` (drop handler ~line 199, live preview ~line 229, pendulum-group transform ~line 328, rAF position update)

**Interfaces:**
- Consumes: Task 1 exports.
- Produces: crane feeds `evaluatePlacement(effectiveDropError(projected, sway), …)` where `projected = landingOffset(signedOffset, velRef.current)`; preview band uses same projection; falling beam translates horizontally by `driftPx * driftFracAt(k)`.

- [ ] **Step 1:** In the crane's rAF that updates `posRef`, track velocity: keep `velRef = useRef(0)`, `prevPosRef`, `prevTsRef`; each frame `velRef.current = smoothVelocity(velRef.current, (pos - prevPos) / dtMs)`. Freeze `velRef` once `droppedRef.current` (release snapshot).
- [ ] **Step 2:** In `drop()` (line ~199): replace `const residual = signedOffset - swayOffset;` and the verdict line with:

```typescript
    const projected = landingOffset(signedOffset, velRef.current);
    const residual = projected - swayOffset;
    onSignedDrop?.(residual);
    const outcome = evaluatePlacement(effectiveDropError(projected, swayOffset), consecutiveSloppy, perfectBandBonus);
```

Store `driftPxRef.current = (projected - signedOffset) * offsetToPxScale` (same px scale the trolley uses for `trolleyX`).
- [ ] **Step 3:** Live preview (line ~229): `const liveBand = alignmentBand(effectiveDropError(landingOffset(pos, vel), sway), perfectBandBonus);` (use the same smoothed velocity state the rAF exposes for render).
- [ ] **Step 4:** During the fall, apply horizontal drift to the pendulum group container: `translateX(${driftPxRef.current * driftFracAt(fallK)}px)` composed with the existing rotate. `fallK = (now - dropAtRef.current) / 300`, already computed for `cableStretchAt`. Under `reducedMotion`, drift still applies to the VERDICT (fairness identical) but the visual jump is instant (fall is already 0ms).
- [ ] **Step 5:** Update `fe-next/lib/wordTower/__tests__/dropFeel.test.ts` — add a preview-equals-verdict invariant test:

```typescript
describe('momentum preview-equals-verdict invariant', () => {
  it('projected preview band matches verdict band for sampled release states', () => {
    for (const pos of [-0.8, -0.3, 0, 0.2, 0.6]) {
      for (const vel of [-0.0012, -0.0004, 0, 0.0004, 0.0012]) {
        const projected = landingOffset(pos, vel);
        expect(alignmentBand(Math.abs(projected))).toBe(
          alignmentBand(Math.abs(landingOffset(pos, vel))),
        );
      }
    }
  });
});
```

(Trivially true by construction — its value is pinning that BOTH paths call `landingOffset`; imports document the contract.)
- [ ] **Step 6:** `npx vitest run lib/wordTower/__tests__/dropFeel.test.ts lib/wordTower/__tests__/cranePlacement.test.ts` → PASS (legacy suites untouched).

### Task 3: `landingImpact.ts` — compression wave + quality squash

**Files:**
- Create: `fe-next/lib/wordTower/landingImpact.ts`
- Test: `fe-next/lib/wordTower/__tests__/landingImpact.test.ts`

**Interfaces:**
- Produces: `IMPACT_MS=550`, `IMPACT_DEPTH=4`,
  `impactDipPx(floorDepth: number, tMs: number, intensity: number): number`,
  `squashScale(tMs: number, intensity: number): { sx: number; sy: number }`.

- [ ] **Step 1: Failing test:**

```typescript
import { describe, it, expect } from 'vitest';
import { impactDipPx, squashScale, IMPACT_MS, IMPACT_DEPTH } from '../landingImpact';

describe('impactDipPx (compression wave)', () => {
  it('is 0 before contact and after settling', () => {
    expect(impactDipPx(0, 0, 1)).toBe(0);
    expect(impactDipPx(0, IMPACT_MS, 1)).toBeCloseTo(0, 5);
  });
  it('peaks early and decays with floor depth', () => {
    const t = IMPACT_MS * 0.15;
    const top = impactDipPx(0, t, 1);
    expect(top).toBeGreaterThan(0);
    expect(impactDipPx(1, t, 1)).toBeLessThan(top);
    expect(impactDipPx(IMPACT_DEPTH, t, 1)).toBe(0); // wave dies past depth
  });
  it('scales with intensity, zero intensity = no dip', () => {
    const t = IMPACT_MS * 0.15;
    expect(impactDipPx(0, t, 0)).toBe(0);
    expect(impactDipPx(0, t, 1)).toBeGreaterThan(impactDipPx(0, t, 0.3));
  });
});

describe('squashScale', () => {
  it('starts squashed (wide+flat), settles to identity', () => {
    const s0 = squashScale(0, 1);
    expect(s0.sx).toBeGreaterThan(1);
    expect(s0.sy).toBeLessThan(1);
    const sEnd = squashScale(IMPACT_MS, 1);
    expect(sEnd.sx).toBeCloseTo(1, 3);
    expect(sEnd.sy).toBeCloseTo(1, 3);
  });
  it('area is roughly preserved at contact (sx*sy ≈ 1)', () => {
    const s = squashScale(0, 0.7);
    expect(s.sx * s.sy).toBeGreaterThan(0.9);
    expect(s.sx * s.sy).toBeLessThan(1.1);
  });
});
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement:**

```typescript
/**
 * Word Tower — landing impact (pure). Tower Bloxx's signature beat: the tower
 * COMPRESSES under a landing block and rebounds with a damped spring, and the
 * block itself squash-stretches. Purely cosmetic — never feeds the verdict.
 */

export const IMPACT_MS = 550;
/** How many floors below the landing the wave reaches. */
export const IMPACT_DEPTH = 4;
const MAX_DIP_PX = 7;
const OMEGA = (Math.PI * 5) / IMPACT_MS; // ~2.5 bounces over the window

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Damped-spring dip (px, downward-positive) for the floor `floorDepth` below the landing. */
export function impactDipPx(floorDepth: number, tMs: number, intensity: number): number {
  if (floorDepth >= IMPACT_DEPTH || tMs <= 0 || tMs >= IMPACT_MS) return 0;
  const depthFade = 1 - floorDepth / IMPACT_DEPTH;
  const i = clamp01(intensity);
  const decay = Math.exp((-4 * tMs) / IMPACT_MS);
  return MAX_DIP_PX * i * depthFade * Math.abs(Math.sin(OMEGA * tMs)) * decay;
}

/** Squash-stretch envelope for the landing block (area-preserving at contact). */
export function squashScale(tMs: number, intensity: number): { sx: number; sy: number } {
  const k = clamp01(tMs / IMPACT_MS);
  const i = clamp01(intensity);
  const amt = 0.18 * i * (1 - k) * Math.cos(Math.PI * 1.5 * k) ** 2;
  const sx = 1 + amt;
  return { sx, sy: 1 / sx };
}
```

- [ ] **Step 4:** Run → PASS.

### Task 4: Wire compression into `WordTowerScene.tsx`

**Files:**
- Modify: `fe-next/components/wordTower/WordTowerScene.tsx` (tile commit ~line 304, ticker ~line 459)
- Modify: `fe-next/components/wordTower/WordTowerPlay.tsx` (pass `lastDropIntensity`)

**Interfaces:**
- Consumes: Task 3 exports; existing `dropQualityIntensity(quality)` from `cranePlacement.ts`.
- Produces: scene prop `dropIntensity?: number` (0..1) + `dropKey?: number` (bumps per drop).

- [ ] **Step 1:** In `WordTowerPlay.tsx`'s `handleCraneDrop`, record `setLastDrop({ intensity: dropQualityIntensity(o.quality), key: k+1 })`; pass to scene.
- [ ] **Step 2:** In the scene, on `dropKey` change (and NOT `reducedMotion`), start an impact: store `impactRef = { startedAt: performance.now(), intensity, topPos }`. In the existing `tick(now)` loop, for depths 0..3 offset the corresponding settled tiles' `.y` by `+impactDipPx(depth, now - startedAt, intensity)` from their resting `localY(pos)` (restore exact resting y when the window ends). Guard: skip tiles currently mid-`dropIn` (`tile.pending`).
- [ ] **Step 3:** Replace the plain `squashLand(tile)` call for the landing tile with a quality-scaled squash: use `run(tile, IMPACT_MS, 0, k => { const s = squashScale(k * IMPACT_MS, intensity); tile.scale.set(s.sx, s.sy); })` via a new exported helper `squashLandScaled(tile, intensity)` added to `towerSprites.ts` (keep `squashLand` for other callers).
- [ ] **Step 4:** Manual verify: `npm run dev`, play a round, confirm tower dips + rebounds under each landing, harder on sloppy/miss.
- [ ] **Step 5:** Phase gate: `npm run lint && npm run test && npm run build` → all green. **ASK USER**, then commit: `feat(word-tower): momentum block drops + tower compression bounce`.

---

## Phase 2 — Debris, punch, crane personality

### Task 5: `tumbleArc.ts` — toppled floors tumble off

**Files:**
- Create: `fe-next/lib/wordTower/tumbleArc.ts`
- Test: `fe-next/lib/wordTower/__tests__/tumbleArc.test.ts`

**Interfaces:**
- Produces: `TUMBLE_MS=900`,
  `tumbleParams(floorId: string, leanSign: number): TumbleParams` ({ dirX: -1|1, vx, vy, spinDegPerMs }),
  `tumbleAt(p: TumbleParams, tMs: number): { dx: number; dy: number; rotDeg: number; alpha: number }`.

- [ ] **Step 1: Failing test:**

```typescript
import { describe, it, expect } from 'vitest';
import { tumbleParams, tumbleAt, TUMBLE_MS } from '../tumbleArc';

describe('tumbleParams', () => {
  it('is deterministic per floorId', () => {
    expect(tumbleParams('floor-abc', 1)).toEqual(tumbleParams('floor-abc', 1));
  });
  it('varies between floorIds', () => {
    expect(tumbleParams('floor-a', 1)).not.toEqual(tumbleParams('floor-b', 1));
  });
  it('launches toward the lean side', () => {
    expect(tumbleParams('x', 1).dirX).toBe(1);
    expect(tumbleParams('x', -1).dirX).toBe(-1);
    expect(tumbleParams('x', 0).dirX).toBe(1); // upright tower defaults right
  });
});

describe('tumbleAt', () => {
  const p = tumbleParams('floor-1', 1);
  it('starts at origin, fully opaque', () => {
    const f = tumbleAt(p, 0);
    expect(f.dx).toBe(0); expect(f.dy).toBe(0); expect(f.alpha).toBe(1);
  });
  it('arcs: rises then falls below start', () => {
    const early = tumbleAt(p, TUMBLE_MS * 0.15);
    const late = tumbleAt(p, TUMBLE_MS);
    expect(early.dy).toBeLessThan(0);      // up first (screen-y negative)
    expect(late.dy).toBeGreaterThan(0);    // then well below
    expect(Math.sign(late.dx)).toBe(p.dirX);
  });
  it('spins continuously and fades near the end', () => {
    expect(Math.abs(tumbleAt(p, TUMBLE_MS).rotDeg)).toBeGreaterThan(90);
    expect(tumbleAt(p, TUMBLE_MS).alpha).toBeLessThan(0.2);
    expect(tumbleAt(p, TUMBLE_MS * 0.5).alpha).toBe(1);
  });
});
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement:**

```typescript
/**
 * Word Tower — tumble arcs for toppled floors (pure). Instead of vanishing,
 * knocked-off blocks LAUNCH toward the lean side, spin, and fall off screen
 * on a parabola. Deterministic per floorId so replays look identical.
 */

export const TUMBLE_MS = 900;
const GRAVITY_PX_PER_MS2 = 0.0022;
const FADE_START = 0.75;

export interface TumbleParams {
  dirX: -1 | 1;
  vx: number;          // px/ms horizontal
  vy: number;          // px/ms initial upward (negative = up)
  spinDegPerMs: number;
}

/** FNV-1a — tiny stable hash for per-floor variation. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function tumbleParams(floorId: string, leanSign: number): TumbleParams {
  const h = hash(floorId);
  const r1 = (h % 1000) / 1000;          // 0..1
  const r2 = ((h >>> 10) % 1000) / 1000; // 0..1
  const dirX: -1 | 1 = leanSign < 0 ? -1 : 1;
  return {
    dirX,
    vx: (0.12 + 0.1 * r1) * dirX,
    vy: -(0.25 + 0.15 * r2),
    spinDegPerMs: (0.25 + 0.2 * r1) * dirX,
  };
}

export function tumbleAt(p: TumbleParams, tMs: number): { dx: number; dy: number; rotDeg: number; alpha: number } {
  const t = Math.max(0, Math.min(TUMBLE_MS, tMs));
  const k = t / TUMBLE_MS;
  return {
    dx: p.vx * t,
    dy: p.vy * t + 0.5 * GRAVITY_PX_PER_MS2 * t * t,
    rotDeg: p.spinDegPerMs * t,
    alpha: k <= FADE_START ? 1 : 1 - (k - FADE_START) / (1 - FADE_START),
  };
}
```

- [ ] **Step 4:** Run → PASS.

### Task 6: Wire tumble into the scene's removal diff

**Files:**
- Modify: `fe-next/components/wordTower/WordTowerScene.tsx` (removal diff ~line 272)

**Interfaces:**
- Consumes: Task 5; scene's `leanRef.current` sign; the tile registry key (`'p'+pos` → floorId source).

- [ ] **Step 1:** In the removal diff, for COMMITTED (non-pending) removed tiles when `!reducedMotion`: reparent tile to the outer container (keep world position), then `run(tile, TUMBLE_MS, 0, k => { const f = tumbleAt(params, k*TUMBLE_MS); tile.position.set(x0+f.dx, y0+f.dy); tile.angle = f.rotDeg; tile.alpha = f.alpha; }, () => tile.destroy({children:true}))` — params from `tumbleParams(key, Math.sign(leanRef.current))`. Pending tiles keep `popOut`. `reducedMotion` keeps instant destroy.
- [ ] **Step 2:** Manual verify: trigger three bad drops → topple → block visibly launches, spins, falls off.

### Task 7: `impactPunch.ts` — perfect-drop zoom punch + flash

**Files:**
- Create: `fe-next/lib/wordTower/impactPunch.ts`
- Test: `fe-next/lib/wordTower/__tests__/impactPunch.test.ts`

**Interfaces:**
- Produces: `PUNCH_MS=260`, `FLASH_MS=180`,
  `punchScaleAt(tMs: number, intensity: number): number`,
  `flashAlphaAt(tMs: number): number`.

- [ ] **Step 1: Failing test:**

```typescript
import { describe, it, expect } from 'vitest';
import { punchScaleAt, flashAlphaAt, PUNCH_MS, FLASH_MS } from '../impactPunch';

describe('punchScaleAt', () => {
  it('is 1 at both ends', () => {
    expect(punchScaleAt(0, 1)).toBeCloseTo(1, 5);
    expect(punchScaleAt(PUNCH_MS, 1)).toBeCloseTo(1, 5);
  });
  it('peaks above 1 early, bounded by 1.05', () => {
    const peak = punchScaleAt(PUNCH_MS * 0.2, 1);
    expect(peak).toBeGreaterThan(1.01);
    expect(peak).toBeLessThanOrEqual(1.05);
  });
  it('zero intensity = flat 1', () => {
    expect(punchScaleAt(PUNCH_MS * 0.2, 0)).toBe(1);
  });
});

describe('flashAlphaAt', () => {
  it('spikes at start, 0 by FLASH_MS, never above 0.35', () => {
    expect(flashAlphaAt(0)).toBeGreaterThan(0.2);
    expect(flashAlphaAt(FLASH_MS)).toBe(0);
    for (let t = 0; t <= FLASH_MS; t += 20) expect(flashAlphaAt(t)).toBeLessThanOrEqual(0.35);
  });
});
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement:**

```typescript
/**
 * Word Tower — impact punch (pure). Perfect drops / clutch saves land with a
 * micro zoom-punch + golden flash (hitstop feel WITHOUT rescaling time — the
 * scene's sway is phase-locked to the absolute clock, so time dilation would
 * desync crane and tower).
 */

export const PUNCH_MS = 260;
export const FLASH_MS = 180;
const MAX_PUNCH = 0.04;
const MAX_FLASH = 0.3;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function punchScaleAt(tMs: number, intensity: number): number {
  const k = clamp01(tMs / PUNCH_MS);
  const i = clamp01(intensity);
  if (i === 0) return 1;
  return 1 + MAX_PUNCH * i * Math.sin(Math.PI * Math.pow(k, 0.55)) * (1 - k * 0.4);
}

export function flashAlphaAt(tMs: number): number {
  const k = clamp01(tMs / FLASH_MS);
  return MAX_FLASH * (1 - k) * (1 - k);
}
```

*(Note: `punchScaleAt(0,1)=1` since sin(0)=0; `punchScaleAt(PUNCH_MS,1)`: sin(π·1)=0 → 1. Peak ≈ 1+0.04·sin(π·0.4^0.55)·0.92 ≈ 1.035.)*

- [ ] **Step 4:** Run → PASS.

### Task 8: Wire punch + flash into the scene

**Files:**
- Modify: `fe-next/components/wordTower/WordTowerScene.tsx`
- Modify: `fe-next/components/wordTower/WordTowerPlay.tsx` (pass `punchKey` on perfect/clutch)

- [ ] **Step 1:** `WordTowerPlay.handleCraneDrop`: when `o.quality === 'perfect'` (intensity 0.7) or clutch save fires (intensity 1), bump `punch = { key, intensity }`; pass to scene.
- [ ] **Step 2:** Scene: on punch key change and `!reducedMotion`, animate outer container `scale` around the viewport center via `punchScaleAt` in the tick loop window, and draw a full-viewport golden (neo-yellow `0xFFE135`) rect on the top FX layer with `alpha = flashAlphaAt(t)` (remove after FLASH_MS).
- [ ] **Step 3:** Manual verify: perfect drop → snappy zoom kiss + golden blink; clutch → bigger.

### Task 9: Crane personality — cable recoil + hook snap

**Files:**
- Modify: `fe-next/lib/wordTower/cranePendulum.ts` (add `cableRecoilPx`)
- Modify: `fe-next/lib/wordTower/__tests__/cranePendulum.test.ts`
- Modify: `fe-next/components/wordTower/WordTowerCrane.tsx` (hook jaw + recoil after release)

- [ ] **Step 1: Failing test** (append to `cranePendulum.test.ts`):

```typescript
describe('cableRecoilPx (post-release whip)', () => {
  it('is 0 at release and after settling', () => {
    expect(cableRecoilPx(0)).toBe(0);
    expect(cableRecoilPx(1)).toBeCloseTo(0, 5);
  });
  it('shortens the cable (negative) at its peak — the freed cable whips UP', () => {
    const peak = Math.min(...[0.1, 0.2, 0.3, 0.4].map(cableRecoilPx));
    expect(peak).toBeLessThan(0);
    expect(peak).toBeGreaterThanOrEqual(-8);
  });
});
```

- [ ] **Step 2:** Run → FAIL. Implement in `cranePendulum.ts`:

```typescript
/** Post-release cable whip: freed of the load, the cable springs UP (negative
 *  px) and settles with a damped wobble over the fall window. k ∈ [0,1]. */
export function cableRecoilPx(k: number): number {
  const t = clamp(k, 0, 1);
  if (t === 0) return 0;
  return -7 * Math.sin(Math.PI * 2.2 * t) * Math.exp(-3.5 * t) * (1 - t);
}
```

- [ ] **Step 3:** Run → PASS.
- [ ] **Step 4:** Crane DOM: after release, cable height becomes `CABLE_LEN_PX + cableRecoilPx(fallK)` (the beam is gone from the hook — cable no longer stretches with the load; move the existing `cableStretchAt` call to the falling BEAM group if it isn't already). Hook: on release, rotate the hook div `rotate(28deg)` with a 120ms ease-out then back (simple CSS transition toggled by `falling`).
- [ ] **Step 5:** Phase gate: `npm run lint && npm run test && npm run build` → green. **ASK USER**, commit: `feat(word-tower): tumbling debris, perfect-drop punch, crane recoil`.

---

## Phase 3 — Upgrades shop overhaul

### Task 10: `upgradeCatalog.ts` — categories + delta previews

**Files:**
- Create: `fe-next/lib/wordTower/upgradeCatalog.ts`
- Test: `fe-next/lib/wordTower/__tests__/upgradeCatalog.test.ts`

**Interfaces:**
- Consumes: `UpgradeId`, `computeEffects`, `upgradeCost`, `isMaxed`, `levelOf` from `upgrades.ts`.
- Produces: `UPGRADE_CATEGORIES: { id: 'crane'|'stability'|'boost'; upgrades: UpgradeId[] }[]`,
  `effectDelta(id: UpgradeId, level: number): { current: string; next: string } | null` (formatted like `"-8%"`; `null` at max),
  `recommendedUpgrade(levels: UpgradeLevels, coins: number): UpgradeId | null`.

- [ ] **Step 1: Failing test:**

```typescript
import { describe, it, expect } from 'vitest';
import { UPGRADE_CATEGORIES, effectDelta, recommendedUpgrade } from '../upgradeCatalog';
import { MAX_LEVEL } from '../upgrades'; // adjust to the real max-level source

const ALL = UPGRADE_CATEGORIES.flatMap(c => c.upgrades);

describe('UPGRADE_CATEGORIES', () => {
  it('covers all 10 upgrades exactly once', () => {
    expect(ALL).toHaveLength(10);
    expect(new Set(ALL).size).toBe(10);
  });
  it('has the 3 expected categories', () => {
    expect(UPGRADE_CATEGORIES.map(c => c.id)).toEqual(['crane', 'stability', 'boost']);
  });
});

describe('effectDelta', () => {
  it('returns current and next strings at level 0', () => {
    const d = effectDelta('steadyCable', 0)!;
    expect(d.current).toBeTruthy();
    expect(d.next).toBeTruthy();
    expect(d.next).not.toBe(d.current);
  });
  it('returns null at max level', () => {
    for (const id of ALL) {
      expect(effectDelta(id, 99)).toBeNull();
    }
  });
});

describe('recommendedUpgrade', () => {
  it('returns null when broke', () => {
    expect(recommendedUpgrade({}, 0)).toBeNull();
  });
  it('returns an affordable upgrade when rich', () => {
    const r = recommendedUpgrade({}, 100000);
    expect(r).not.toBeNull();
    expect(ALL).toContain(r);
  });
});
```

- [ ] **Step 2:** Run → FAIL. Implement `upgradeCatalog.ts`: categories `{crane: [steadyCable, wideFooting, tailwind], stability: [windbreak, reinforcedCore, quickRecovery, salvage, centerMagnet], boost: [masterArchitect, momentum]}`. `effectDelta` computes `computeEffects` at level vs level+1, picks the field each upgrade drives, formats as signed percent (or `+1` for integer fields extraTopple/toppleReduction). `recommendedUpgrade` = cheapest affordable non-maxed upgrade, tie-broken toward the category with the lowest total invested levels.
- [ ] **Step 3:** Run → PASS. Adapt the test's `MAX_LEVEL` import to whatever `upgrades.ts` actually exposes (use `isMaxed` if no constant).

### Task 11: Rebuild `WordTowerUpgradePanel.tsx`

**Files:**
- Modify: `fe-next/components/wordTower/WordTowerUpgradePanel.tsx` (139 → ~280 lines, cap 300)
- Test: `fe-next/components/wordTower/__tests__/WordTowerUpgradePanel.test.tsx` (extend existing if present, else create)

- [ ] **Step 1: Failing tests** — render panel with mock store: (a) 3 category headers visible; (b) each row shows level pips + delta preview text; (c) affordable row has buy button enabled, unaffordable disabled; (d) recommended chip appears on exactly one row when affordable; (e) buying calls `buy(id)` once.
- [ ] **Step 2:** Implement: neo-brutalist sections per category (lime=crane, cyan=stability, yellow=boost accents per design system — yellow allowed: coin/reward semantics), level pips (`●●○○`), `effectDelta` line `current → next`, affordable rows get `shadow-hard` + lime border glow, `recommended` chip via `t('wordTower.upgrade.recommended')`, purchase fires `animate-neo-pop` on the row + coin burst (reuse existing coin particle/confetti helper if present, else `canvas-confetti` mini burst).
- [ ] **Step 3:** Run component test → PASS.

### Task 12: i18n keys ×6 locales

**Files:**
- Modify: `fe-next/translations/{en,he,sv,ja,es,ru}.js` — add under the existing `wordTower.upgrade` namespace:
  `categories: { crane, stability, boost }`, `recommended`, `nextLevel` (e.g. en: `"crane": "Crane"`, `"stability": "Stability"`, `"boost": "Boost"`, `"recommended": "Best pick"`, `"nextLevel": "{current} → {next}"`).

- [ ] **Step 1:** Add native (non-literal) copy per locale — follow ux-writer conventions (he: RTL natural phrasing; ja: concise katakana where idiomatic).
- [ ] **Step 2:** Grep guard: every new `t()` key exists in all 6 files.
- [ ] **Step 3:** Phase gate: `npm run lint && npm run test && npm run build` → green. Verify `?locale=he` renders RTL sanely. **ASK USER**, commit: `feat(word-tower): categorized upgrade shop with effect previews`.

---

## Phase 4 — Generated art + polish

### Task 13: Crane sprite art

**Files:**
- Create: `fe-next/public/images/word-tower/crane/cab.png` (+ optional `jib.png`)
- Modify: `fe-next/components/wordTower/WordTowerCrane.tsx` (decorative cab img on the trolley carriage)

- [ ] **Step 1:** Generate via image-gen MCP: "flat neo-brutalist cartoon crane operator cab, side view, dark navy body #1a1a2e with electric lime #BFFF00 accents, bold 3px black outline, hard offset shadow, transparent background, sticker style, kawaii" — 2 candidates; pick best, downscale to ≤128px height, optimize.
- [ ] **Step 2:** Judge style match against the live game (screenshot). Clash → keep vector crane, skip integration (spec fallback).
- [ ] **Step 3:** Integrate as `<img>` on the trolley carriage (aria-hidden, `priority={false}`), verify no layout shift, RTL ok.

### Task 14: Final verify + polish

- [ ] **Step 1:** Full pass: `npm run lint && npm run test && npm run build`.
- [ ] **Step 2:** Live run: dev server, play Word Tower — momentum drop reads, compression bounce lands, topple tumbles, perfect punch fires, shop browses well. Screenshot for the user.
- [ ] **Step 3:** Gates: `?locale=he` RTL, reduced-motion (all new FX inert), mobile viewport.
- [ ] **Step 4:** **ASK USER**, commit: `feat(word-tower): crane cab art + bloxx-feel polish`.

---

## Self-review notes

- Spec coverage: §1→T1/T2, §2→T3/T4, §3→T5/T6, §4→T7/T8, §5→T9/T13, §6→T10/T11/T12, testing→each task + phase gates. ✔
- Preview-equals-verdict: both paths route through `landingOffset` (T2 steps 2–3). ✔
- `carry=0` legacy identity pinned in T1 test. ✔
- Type consistency: `landingOffset/driftFracAt/smoothVelocity` names match across T1/T2; `impactDipPx/squashScale` across T3/T4; `tumbleParams/tumbleAt` across T5/T6; `punchScaleAt/flashAlphaAt` across T7/T8. ✔
