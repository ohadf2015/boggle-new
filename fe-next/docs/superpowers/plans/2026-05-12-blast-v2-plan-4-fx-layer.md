# Blast v2 — Plan 4: FX Layer (Stream E) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire 18 FX moments from the spec into Pixi + GSAP + CSS, gated by reduced-motion preferences. Ship a single `useBlastFx` hook that `BlastGame` calls on every gameplay transition. **This is the visual polish milestone — first plan where Blast feels alive.**

**Architecture:** Two Pixi canvases overlaid on the board:
- **L1 Atmosphere** (`BlastAtmosphereOverlay`): spotlight breathing, ambient dust particles, dotted-grid, all gated by reduced-motion.
- **L4 Burst** (`BlastFxOverlay`): shatter, cascade sparkles, coin/gem arcs, bonus shockwaves, chest tiers.

A facade hook `useBlastFx({ boardRef, modeColor })` returns 14 typed methods. Plan 2's `data-cell-id` + `data-state="just-cleared"` + `data-shake-key` attrs are consumed as anchor points.

**Tech Stack:** Pixi 8+, GSAP 3.12+, Framer Motion (useReducedMotion), Capacitor Haptics API via existing `lib/haptics.ts` pattern.

**Spec reference:** `docs/superpowers/specs/2026-05-12-blast-mode-redesign-design.md` — sections "FX / Animation Catalog" (all 18 rows), "Visual Identity + Backgrounds" (L1 atmosphere details), "Reduced-motion" subsection.

**Out of scope:**
- Gameplay logic / board state → Plan 2 complete
- FTUE / tutorial overlays → Plan 5
- Content + asset authoring (PNG files) → Plan 6
- DB persistence / economy transactions → Plan 3
- PostHog events → Plan 7

**Integration corrections from spec (verified 2026-05-12):**
- `useReducedMotion()` imported directly from `framer-motion`, no local wrapper.
- Haptics: confirm existing `lib/haptics.ts` pattern (search codebase for `navigator.vibrate` usage); Plan 4 wraps vibration patterns per FX moment.
- Pixi access: prefer existing `SharedFxApp` pattern (used in Practice mode via `usePracticeJuice` hook). Fall back to local `new PIXI.Application()` only for layers not covered by SharedFxApp.
- Sprite sheets: manifest points to `/public/blast/v2/fx/` paths; Plan 6 produces actual PNGs. Plan 4 includes graceful missing-file handling (log warning, no crash).
- Screen shake: implement via CSS keyframe helper (`lib/blast/v2/fx/screen-shake.ts`) — apply via incrementing `data-shake-key` on board root (Plan 2 already emits this attr).

---

## File Structure

| File | Purpose |
|---|---|
| `fe-next/lib/blast/v2/fx/index.ts` | Main facade exporting `useBlastFx` hook |
| `fe-next/lib/blast/v2/fx/spritesheets.ts` | Manifest + loader for shatter, frozen-crack, gem/coin/chest sprites |
| `fe-next/lib/blast/v2/fx/screen-shake.ts` | CSS-keyframe screen-shake helper (4px / 8px / 12px intensities) |
| `fe-next/lib/blast/v2/fx/haptics.ts` | Vibration pattern wrappers for light/medium/heavy/success-chord |
| `fe-next/lib/blast/v2/fx/atmosphere.ts` | Spotlight glow, ambient particles, grid pattern (pure Pixi) |
| `fe-next/lib/blast/v2/fx/burst.ts` | Shatter, coin/gem arcs, sparkles, shockwaves (pure Pixi) |
| `fe-next/components/blast/v2/BlastAtmosphereOverlay.tsx` | Pixi L1 canvas mount + update loop |
| `fe-next/components/blast/v2/BlastFxOverlay.tsx` | Pixi L4 canvas mount + integration with `useBlastFx` |
| `fe-next/components/blast/v2/__tests__/useBlastFx.test.ts` | Hook integration test (mount, trigger 3 FX moments, verify Pixi calls) |
| `fe-next/components/blast/v2/__tests__/screen-shake.test.ts` | CSS keyframe + `data-shake-key` increment test |
| `fe-next/components/blast/v2/__tests__/haptics.test.ts` | Pattern wrappers + reduced-motion gate test |

Tests under `__tests__/` next to source files. Pixi/GSAP tests use `vitest` with canvas mocks (project pattern, see existing `components/practice/__tests__/usePracticeJuice.test.ts`).

---

### Task 0: Spritesheets manifest + loader

**Files:**
- Create: `fe-next/lib/blast/v2/fx/spritesheets.ts`
- Test: `fe-next/lib/blast/v2/fx/__tests__/spritesheets.test.ts`

**Manifest structure:**

```ts
export type SpriteSheet = {
  path: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  tintable: boolean; // shatter, frozen-crack are mode-color tintable
};

export const SPRITESHEETS: Record<string, SpriteSheet> = {
  shatter: {
    path: '/public/blast/v2/fx/shatter-8frame.png',
    frameWidth: 128,
    frameHeight: 128,
    frameCount: 8,
    tintable: true,
  },
  frozen_crack: {
    path: '/public/blast/v2/fx/frozen-crack-6frame.png',
    frameWidth: 96,
    frameHeight: 96,
    frameCount: 6,
    tintable: false,
  },
  coin: {
    path: '/public/blast/v2/fx/coin-overlay.png',
    frameWidth: 20,
    frameHeight: 20,
    frameCount: 1,
    tintable: false,
  },
  gem: {
    path: '/public/blast/v2/fx/gem-overlay.png',
    frameWidth: 20,
    frameHeight: 20,
    frameCount: 1,
    tintable: false,
  },
  chest_wood: {
    path: '/public/blast/v2/fx/chest-wood-closed.png',
    frameWidth: 160,
    frameHeight: 120,
    frameCount: 1,
    tintable: false,
  },
  chest_silver: {
    path: '/public/blast/v2/fx/chest-silver-closed.png',
    frameWidth: 160,
    frameHeight: 120,
    frameCount: 1,
    tintable: false,
  },
  chest_gold: {
    path: '/public/blast/v2/fx/chest-gold-closed.png',
    frameWidth: 160,
    frameHeight: 120,
    frameCount: 1,
    tintable: false,
  },
  chest_legendary: {
    path: '/public/blast/v2/fx/chest-legendary-closed.png',
    frameWidth: 160,
    frameHeight: 120,
    frameCount: 1,
    tintable: false,
  },
};

export async function loadTexture(name: keyof typeof SPRITESHEETS): Promise<PIXI.Texture | null> {
  const sheet = SPRITESHEETS[name];
  if (!sheet) { console.warn(`Unknown spritesheet: ${name}`); return null; }
  try {
    const tex = await PIXI.Assets.load(sheet.path);
    return tex;
  } catch (e) {
    console.warn(`Failed to load spritesheet ${name} from ${sheet.path}:`, e);
    return null;
  }
}
```

- [ ] Step 1: Failing test — `loadTexture('shatter')` returns a Pixi Texture; `loadTexture('missing')` returns null + logs warning.
- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement (mock Pixi.Assets in test via `vi.mock`).
- [ ] Step 4: Run, expect PASS (2 tests).
- [ ] Step 5: Commit `feat(blast-v2): spritesheets manifest + loader (Plan 4 Task 0)`.

---

### Task 1: Screen-shake CSS helper

**Files:**
- Create: `fe-next/lib/blast/v2/fx/screen-shake.ts`
- Create: `fe-next/lib/blast/v2/fx/screen-shake.module.css`
- Test: `fe-next/lib/blast/v2/fx/__tests__/screen-shake.test.ts`

Screen-shake via CSS keyframes + data attr increment (Plan 2's board already emits `data-shake-key`). Intensities: 4px (light), 8px (medium), 12px (heavy). Gate on reduced-motion.

- [ ] Step 1: Failing test — `shake(intensity='light')` increments `data-shake-key` counter; reduced-motion returns early without shake.
- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement:

```ts
import { useReducedMotion } from 'framer-motion';

export type ShakeIntensity = 'light' | 'medium' | 'heavy';

const SHAKE_PX: Record<ShakeIntensity, number> = { light: 4, medium: 8, heavy: 12 };

export function useScreenShake(boardRef: React.RefObject<HTMLDivElement>) {
  const prefersReducedMotion = useReducedMotion();
  return (intensity: ShakeIntensity) => {
    if (prefersReducedMotion) return;
    const el = boardRef.current;
    if (!el) return;
    const key = el.getAttribute('data-shake-key') ?? '0';
    el.setAttribute('data-shake-key', String(Number(key) + 1));
  };
}
```

`screen-shake.module.css`:

```css
[data-shake-key] {
  animation: shake-light 300ms cubic-bezier(0.36, 0, 0.66, 0.33);
}
[data-shake-key*="1"],
[data-shake-key*="3"],
[data-shake-key*="5"],
[data-shake-key*="7"],
[data-shake-key*="9"] {
  animation: shake-light 300ms cubic-bezier(0.36, 0, 0.66, 0.33);
}

@keyframes shake-light {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}
@keyframes shake-medium {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  75% { transform: translateX(8px); }
}
@keyframes shake-heavy {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-12px); }
  75% { transform: translateX(12px); }
}
```

- [ ] Step 4: Run, expect PASS (2 tests).
- [ ] Step 5: Commit `feat(blast-v2): screen-shake CSS helper (Plan 4 Task 1)`.

---

### Task 2: Haptics pattern helpers

**Files:**
- Create: `fe-next/lib/blast/v2/fx/haptics.ts`
- Test: `fe-next/lib/blast/v2/fx/__tests__/haptics.test.ts`

Wrap `navigator.vibrate` with pattern presets. Respect user pref + reduced-motion.

- [ ] Step 1: Failing test — 4 cases:
  - `vibrateLight()` calls `navigator.vibrate([20, 10])` (20ms vibrate, 10ms pause)
  - `vibrateMedium()` calls `[40, 20, 40]`
  - `vibrateHeavy()` calls `[60, 30, 60, 30, 60]`
  - `vibrateSuccessChord()` calls `[100, 50, 50, 50]`
  - All respect reduced-motion (no-op if true)
  - Check for user pref (localStorage key `haptics-enabled`, default true)
- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement:

```ts
import { useReducedMotion } from 'framer-motion';

export function useHaptics() {
  const prefersReducedMotion = useReducedMotion();
  const isEnabled = typeof window !== 'undefined' && localStorage.getItem('haptics-enabled') !== 'false';

  const vibrate = (pattern: number[]) => {
    if (prefersReducedMotion || !isEnabled) return;
    if (!navigator.vibrate) return;
    navigator.vibrate(pattern);
  };

  return {
    vibrateLight: () => vibrate([20, 10]),
    vibrateMedium: () => vibrate([40, 20, 40]),
    vibrateHeavy: () => vibrate([60, 30, 60, 30, 60]),
    vibrateSuccessChord: () => vibrate([100, 50, 50, 50]),
  };
}
```

- [ ] Step 4: Run, expect PASS (4 tests).
- [ ] Step 5: Commit `feat(blast-v2): haptics patterns (Plan 4 Task 2)`.

---

### Task 3: BlastAtmosphereOverlay — L1 ambient layer

**Files:**
- Create: `fe-next/components/blast/v2/BlastAtmosphereOverlay.tsx`
- Test: `fe-next/components/blast/v2/__tests__/BlastAtmosphereOverlay.test.tsx`

Pixi canvas rendering:
1. Spotlight glow (radial gradient, mode-color, breathes 3s opacity 0.4↔0.55)
2. Ambient dust particles (3-4 floating particles, slow drift, 100% opacity → fade at edges)
3. Dotted-grid pattern overlay (opacity 0.08)

All animations gated by reduced-motion (spotlight static, particles off, grid static).

- [ ] Step 1: Failing test — mount `<BlastAtmosphereOverlay modeColor="#ec4899" />`, verify canvas exists + `data-testid="blast-atmosphere"`.
- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement:

```tsx
'use client';
import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { useReducedMotion } from 'framer-motion';

type Props = { modeColor: string };

export function BlastAtmosphereOverlay({ modeColor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const app = new PIXI.Application({
      view: canvasRef.current,
      width: 400,
      height: 600,
      backgroundColor: 'transparent',
      antialias: true,
    });
    appRef.current = app;

    // Spotlight glow (radial gradient)
    const spotLight = new PIXI.Graphics();
    spotLight.beginFill(parseInt(modeColor.replace('#', '0x')), 0.5);
    spotLight.drawCircle(200, 300, 200);
    spotLight.endFill();
    spotLight.filters = [new PIXI.BlurFilter(80)];
    app.stage.addChild(spotLight);

    // Ambient particles
    if (!prefersReducedMotion) {
      for (let i = 0; i < 4; i++) {
        const particle = new PIXI.Graphics();
        particle.beginFill(0xffffff, 0.3);
        particle.drawCircle(0, 0, 3);
        particle.endFill();
        particle.x = Math.random() * 400;
        particle.y = Math.random() * 600;
        app.stage.addChild(particle);
      }
    }

    // Breathing animation (spotlight opacity)
    let time = 0;
    const tick = () => {
      time += 0.016;
      if (!prefersReducedMotion) {
        spotLight.alpha = 0.4 + Math.sin(time * 2 * Math.PI / 3) * 0.075;
      }
    };
    app.ticker.add(tick);

    return () => {
      app.destroy();
    };
  }, [modeColor, prefersReducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="blast-atmosphere"
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}
```

- [ ] Step 4: Run, expect PASS (1 test).
- [ ] Step 5: Commit `feat(blast-v2): BlastAtmosphereOverlay L1 (Plan 4 Task 3)`.

---

### Task 4: useBlastFx facade hook

**Files:**
- Create: `fe-next/lib/blast/v2/fx/index.ts`
- Test: `fe-next/lib/blast/v2/fx/__tests__/index.test.ts`

Single-point entry for all FX. Returns 14 typed methods matching spec FX moments.

- [ ] Step 1: Failing test — `useBlastFx({ boardRef, modeColor })` returns object with methods: `playWordFound`, `playCascade`, `playBonus`, `playDoubleBonus`, `playGemCollected`, `playInvalid`, `playFrozenThaw`, `playGravityCollapse`, `playLateralSlide`, `playLevelComplete`, `playChestProgressFill`, `playChestUnlock`, `playChestOpen`, `playAvatarPartDrop`, `playHintShuffle`, `playHintRevealLetter`, `playHintRevealWord`. Each is callable and returns void (FX fires in background).
- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement facade (can be minimalist stubs for now, Task 5-13 fills in the Pixi details):

```ts
import type { CellId } from '../types';

export type BlastFxApi = {
  playWordFound: (cells: CellId[]) => void;
  playCascade: (cells: CellId[]) => void;
  playBonus: (cells: CellId[]) => void;
  playDoubleBonus: (cells: CellId[]) => void;
  playGemCollected: (cells: CellId[]) => void;
  playInvalid: (boardEl: Element) => void;
  playFrozenThaw: (cells: CellId[]) => void;
  playGravityCollapse: (staggerMs: number) => void;
  playLateralSlide: (from: CellId, to: CellId) => void;
  playLevelComplete: () => void;
  playChestProgressFill: () => void;
  playChestUnlock: () => void;
  playChestOpen: (tier: 'wood' | 'silver' | 'gold' | 'legendary') => void;
  playAvatarPartDrop: () => void;
  playHintShuffle: () => void;
  playHintRevealLetter: (cell: CellId) => void;
  playHintRevealWord: (cells: CellId[]) => void;
};

export function useBlastFx({ boardRef, modeColor }: { boardRef: React.RefObject<HTMLDivElement>; modeColor: string }): BlastFxApi {
  return {
    playWordFound: () => {},
    playCascade: () => {},
    playBonus: () => {},
    playDoubleBonus: () => {},
    playGemCollected: () => {},
    playInvalid: () => {},
    playFrozenThaw: () => {},
    playGravityCollapse: () => {},
    playLateralSlide: () => {},
    playLevelComplete: () => {},
    playChestProgressFill: () => {},
    playChestUnlock: () => {},
    playChestOpen: () => {},
    playAvatarPartDrop: () => {},
    playHintShuffle: () => {},
    playHintRevealLetter: () => {},
    playHintRevealWord: () => {},
  };
}
```

- [ ] Step 4: Run, expect PASS (1 test).
- [ ] Step 5: Commit `feat(blast-v2): useBlastFx facade hook (Plan 4 Task 4)`.

---

### Task 5: Shatter + coin arc FX

**Files:**
- Create: `fe-next/lib/blast/v2/fx/burst.ts`
- Extend: `fe-next/lib/blast/v2/fx/index.ts` (wire `playWordFound`)
- Test: `fe-next/lib/blast/v2/fx/__tests__/burst.test.ts`

`playWordFound(cells)`:
1. Load shatter spritesheet (or skip if missing)
2. For each cell, spawn shatter sprite at `[data-cell-id]` position
3. Play spritesheet animation 200ms (8 frames, 25ms each)
4. Coin/gem overlay tiles: arc to HUD over 600ms (easing-out)
5. Haptic: medium single pulse
6. Reduced-motion: skip shatter, coins still arc

- [ ] Step 1: Failing test — mock board with 3 tiles, call `playWordFound([c0r0, c0r1, c0r2])`, verify Pixi sprites spawned + haptic fired.
- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement in `burst.ts`:

```ts
import * as PIXI from 'pixi.js';
import gsap from 'gsap';
import { loadTexture, SPRITESHEETS } from './spritesheets';
import { useHaptics } from './haptics';
import { useReducedMotion } from 'framer-motion';
import type { CellId } from '../types';

export async function playWordFoundFx(
  boardRef: React.RefObject<HTMLDivElement>,
  pixiStage: PIXI.Container,
  cells: CellId[],
  modeColor: string
) {
  const { vibrateMedium } = useHaptics();
  vibrateMedium();

  const board = boardRef.current;
  if (!board) return;

  for (const id of cells) {
    const el = board.querySelector(`[data-cell-id="${id}"]`) as HTMLElement | null;
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();
    const x = rect.left - boardRect.left + rect.width / 2;
    const y = rect.top - boardRect.top + rect.height / 2;

    // Shatter sprite animation
    const tex = await loadTexture('shatter');
    if (tex) {
      const sprite = new PIXI.Sprite(tex);
      sprite.x = x;
      sprite.y = y;
      sprite.tint = parseInt(modeColor.replace('#', '0x'));
      pixiStage.addChild(sprite);

      let frameIndex = 0;
      const interval = setInterval(() => {
        frameIndex = (frameIndex + 1) % 8;
        if (frameIndex === 7) {
          clearInterval(interval);
          pixiStage.removeChild(sprite);
        }
      }, 25);
    }

    // Coin/gem arc (skipped in this task, handled in separate task)
  }
}
```

- [ ] Step 4: Run, expect PASS (2 tests).
- [ ] Step 5: Commit `feat(blast-v2): shatter spritesheet FX (Plan 4 Task 5)`.

---

### Task 6: Cascade + double-bonus FX

**Files:**
- Extend: `fe-next/lib/blast/v2/fx/burst.ts`
- Extend: `fe-next/lib/blast/v2/fx/index.ts` (wire `playCascade`, `playDoubleBonus`)
- Test: update `burst.test.ts`

`playCascade(cells)`:
1. Shatter (same as Task 5)
2. Radial pulse + screen shake (medium, 4px)
3. "CASCADE!" callout (GSAP scale-pop 400ms)
4. Haptic: heavy double-pulse (60ms pause between)
5. Reduced-motion: skip pulse/callout, skip shake

`playDoubleBonus(cells)`:
1. Above (cascade FX) + 400ms extension
2. Rainbow shockwave (ring expanding from center, 5 colors cycling)
3. "×2" callout (bold, yellow)
4. Haptic: medium triple (20ms pause between)
5. Reduced-motion: skip shockwave, skip callout scale anims

- [ ] Step 1: Failing test — 4 cases covering each FX moment above.
- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement (uses existing `useScreenShake` + `useHaptics` from Tasks 1-2).
- [ ] Step 4: Run, expect PASS.
- [ ] Step 5: Commit `feat(blast-v2): cascade + double-bonus FX (Plan 4 Task 6)`.

---

### Task 7: Gem + frozen thaw FX

**Files:**
- Extend: `fe-next/lib/blast/v2/fx/burst.ts`
- Extend: `fe-next/lib/blast/v2/fx/index.ts` (wire `playGemCollected`, `playFrozenThaw`)
- Test: update `burst.test.ts`

`playGemCollected(cells)`:
1. Gem overlay arc to chest badge (similar to coin arc, Task 5)
2. Prismatic burst (7 rays of gem-colored light expanding + fading)
3. Chest progress bar surge (scale-up 100% → 120% then back, 200ms)
4. Haptic: distinct heavy ping (80ms vibrate)
5. Reduced-motion: skip prismatic rays, skip surge scale, gem arc still plays

`playFrozenThaw(cells)`:
1. Load frozen-crack spritesheet (6-frame animation)
2. For each cell, spawn ice-crack sprite + ice particles (5-6 small particles burst upward)
3. Play 700ms
4. Haptic: medium single (40ms)
5. Reduced-motion: skip particles, sprite animation still plays (gameplay-essential indicator)

- [ ] Step 1: Failing test — 2 cases.
- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement.
- [ ] Step 4: Run, expect PASS.
- [ ] Step 5: Commit `feat(blast-v2): gem + frozen-thaw FX (Plan 4 Task 7)`.

---

### Task 8: Invalid + gravity + lateral-slide FX

**Files:**
- Extend: `fe-next/lib/blast/v2/fx/burst.ts`
- Extend: `fe-next/lib/blast/v2/fx/index.ts` (wire `playInvalid`, `playGravityCollapse`, `playLateralSlide`)
- Test: update `burst.test.ts`

`playInvalid(boardEl)`:
1. Screen shake (light, 4px, 400ms)
2. SVG selection path (Plan 2's BlastSelectionPath) flash red 200ms
3. Haptic: error tick (10ms vibrate, 10ms pause, 10ms vibrate)
4. Reduced-motion: skip shake, path still flashes

`playGravityCollapse(staggerMs)`:
1. No Pixi FX — Plan 2's Framer Motion `layout` prop animates tiles
2. Haptic: none (natural gravity feel, no feedback needed)
3. Reduced-motion: animations stay enabled (not a "luxury" effect)

`playLateralSlide(from, to)`:
1. Small visual feedback: tile brightens + slight wobble (8° rotation, 220ms)
2. Haptic: light tick (20ms)
3. Reduced-motion: skip wobble, no haptic

- [ ] Step 1: Failing test — 3 cases.
- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement.
- [ ] Step 4: Run, expect PASS.
- [ ] Step 5: Commit `feat(blast-v2): invalid + gravity + slide FX (Plan 4 Task 8)`.

---

### Task 9: Bonus dict word FX

**Files:**
- Extend: `fe-next/lib/blast/v2/fx/burst.ts`
- Extend: `fe-next/lib/blast/v2/fx/index.ts` (wire `playBonus`)
- Test: update `burst.test.ts`

`playBonus(cells)`:
1. No shatter (shimmer instead: tiles brighten + scale 1.05 for 250ms)
2. Gold sparkles scattered across cells (3-4 particle traces, each 500ms fade-out)
3. "+10 coins" callout (gold text, scale-pop 400ms)
4. Haptic: light single
5. Reduced-motion: skip shimmer scale, skip sparkle particles, skip callout scale

- [ ] Step 1: Failing test — 1 case.
- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement.
- [ ] Step 4: Run, expect PASS.
- [ ] Step 5: Commit `feat(blast-v2): bonus dict FX (Plan 4 Task 9)`.

---

### Task 10: Level-complete + chest progress FX

**Files:**
- Extend: `fe-next/lib/blast/v2/fx/burst.ts`
- Extend: `fe-next/lib/blast/v2/fx/index.ts` (wire `playLevelComplete`, `playChestProgressFill`, `playChestUnlock`)
- Test: update `burst.test.ts`

`playLevelComplete()`:
1. L1 spotlight bloom (scale to 1.5× over 1s, then back to normal)
2. Confetti particles (20-30 burst from center, random colors from mode-color palette, fall over 2.5s)
3. Star animations (scale-pop staggered 100ms apart)
4. Haptic: success chord (100ms, 50ms pause, 50ms, 50ms)
5. Reduced-motion: skip bloom, skip confetti, skip star scale (cards still appear via Framer Motion)

`playChestProgressFill()`:
1. Chest progress bar segment fills (smooth width expand 600ms)
2. Shimmer overlay (bright flash swept L→R, 400ms)
3. Haptic: light pulse (30ms)
4. Reduced-motion: skip shimmer, bar still animates

`playChestUnlock()`:
1. Chest badge scales (1.0 → 1.2 → 1.0, 1s total)
2. Glow halo pulsing (opacity 0.5 → 1.0, 1s loop)
3. "Chest ready!" callout (pop-in)
4. Haptic: medium pulse (40ms)
5. Reduced-motion: skip glow/scale, callout still appears

- [ ] Step 1: Failing test — 3 cases.
- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement.
- [ ] Step 4: Run, expect PASS.
- [ ] Step 5: Commit `feat(blast-v2): level-complete + chest progress + unlock FX (Plan 4 Task 10)`.

---

### Task 11: Chest-open FX by tier

**Files:**
- Extend: `fe-next/lib/blast/v2/fx/burst.ts`
- Extend: `fe-next/lib/blast/v2/fx/index.ts` (wire `playChestOpen`)
- Test: update `burst.test.ts`

`playChestOpen(tier: 'wood' | 'silver' | 'gold' | 'legendary')`:

| Tier | Duration | VFX | Screen Shake | Slow-mo | Haptic |
|---|---|---|---|---|---|
| Wood | 3500ms | Soft burst, lid lift, staggered reveal | none | none | medium |
| Silver | 4500ms | Above + larger burst | light (4px) | none | heavy |
| Gold | 4500ms | Above + light flash | medium (8px) | none | heavy |
| Legendary | 6000ms | Above + particle storm + rainbow rim | heavy (12px) | 0.5× (spec says "slow-mo") | heavy + continuation |

All:
1. Load chest spritesheet matching tier
2. Render chest sprite + animate lid rotation + zoom
3. Stagger coin/boost/avatar-part reveals (100ms apart)
4. Haptic respects reduced-motion; screen-shake gates accordingly

- [ ] Step 1: Failing test — 4 cases (wood / silver / gold / legendary).
- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement using GSAP timelines + screen-shake hook.
- [ ] Step 4: Run, expect PASS.
- [ ] Step 5: Commit `feat(blast-v2): chest-open FX by tier (Plan 4 Task 11)`.

---

### Task 12: Avatar part drop + hint FX

**Files:**
- Extend: `fe-next/lib/blast/v2/fx/burst.ts`
- Extend: `fe-next/lib/blast/v2/fx/index.ts` (wire `playAvatarPartDrop`, `playHintShuffle`, `playHintRevealLetter`, `playHintRevealWord`)
- Test: update `burst.test.ts`

`playAvatarPartDrop()`:
1. Item zoom from chest sprite to profile avatar (or toast location if off-screen)
2. Collection toast appears (1500ms total)
3. Haptic: distinct triple (60ms, 20ms, 60ms, 20ms, 60ms)

`playHintShuffle()`:
1. Tiles cross-fade swap (staggered 30ms apart, 800ms total)
2. Each tile: opacity 0.5 → 0 → 1.0, slide position, back
3. Haptic: light pulse (30ms)
4. Reduced-motion: skip cross-fade visual, instant swap

`playHintRevealLetter(cell)`:
1. Tile at `cell` pulses gold + arrow points downward (2s animation)
2. Haptic: medium ping (40ms)
3. Reduced-motion: skip pulse, tile just displays letter

`playHintRevealWord(cells)`:
1. For each cell in order: tile pulses gold (staggered 100ms)
2. SVG path highlights the word path (slow trace, 1800ms)
3. Then auto-select (countdown state triggers validation)
4. Haptic: medium success (40ms, 20ms, 40ms)
5. Reduced-motion: skip pulse/path animations, word still selects

- [ ] Step 1: Failing test — 4 cases.
- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement.
- [ ] Step 4: Run, expect PASS.
- [ ] Step 5: Commit `feat(blast-v2): avatar part drop + hint FX (Plan 4 Task 12)`.

---

### Task 13: BlastFxOverlay — L4 burst canvas

**Files:**
- Create: `fe-next/components/blast/v2/BlastFxOverlay.tsx`
- Extend: `fe-next/lib/blast/v2/fx/index.ts` (update `useBlastFx` to create/return active Pixi stage)
- Test: `fe-next/components/blast/v2/__tests__/BlastFxOverlay.test.tsx`

React component mounting Pixi L4 canvas + passing its stage to `useBlastFx` so all FX methods can render sprites.

- [ ] Step 1: Failing test — mount `<BlastFxOverlay />`, verify canvas exists + `data-testid="blast-fx"`.
- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement:

```tsx
'use client';
import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

export function BlastFxOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const app = new PIXI.Application({
      view: canvasRef.current,
      width: 400,
      height: 600,
      backgroundColor: 'transparent',
      antialias: true,
    });
    appRef.current = app;
    return () => { app.destroy(); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="blast-fx"
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
}
```

- [ ] Step 4: Run, expect PASS (1 test).
- [ ] Step 5: Commit `feat(blast-v2): BlastFxOverlay L4 canvas (Plan 4 Task 13)`.

---

### Task 14: Wire FX into BlastGame + integration

**Files:**
- Modify: `fe-next/components/blast/v2/BlastGame.tsx`
- Create: `fe-next/components/blast/v2/__tests__/BlastGame-fx.test.tsx`

Call `useBlastFx` hook at mount, pass `boardRef` + `modeColor`. Wire reducer events to FX methods:
- On `validation.kind === 'theme_match'` → `playWordFound(cells)`
- On cascade detected → `playCascade(cells)`
- On `validation.kind === 'bonus'` → `playBonus(cells)`
- On double-bonus in path → `playDoubleBonus(cells)`
- On gem overlay collected → `playGemCollected(cells)`
- On `validation.kind === 'reject'` → `playInvalid(boardEl)`
- On frozen-thaw detected → `playFrozenThaw(cells)`
- On level-complete → `playLevelComplete()`

- [ ] Step 1: Failing test — render `<BlastGame>`, complete a level via drag events, verify `playWordFound` called.
- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Integrate `useBlastFx` into `BlastGame` component:

```tsx
const boardRef = useRef<HTMLDivElement>(null);
const fx = useBlastFx({ boardRef, modeColor: '#ec4899' });

// In useEffect or reducer, wire events:
useEffect(() => {
  if (state.lastValidation?.kind === 'theme_match') {
    fx.playWordFound(state.selection.cells); // from last validation
  }
}, [state.lastValidation]);
```

- [ ] Step 4: Run, expect PASS.
- [ ] Step 5: Commit `feat(blast-v2): wire FX into BlastGame (Plan 4 Task 14)`.

---

### Task 15: Reduced-motion gates audit + validation

**Files:** None new; audit existing FX implementations.

Verify every animation:
- [ ] Particle effects gated → `if (!prefersReducedMotion) { ... }`
- [ ] Screen shakes gated → `if (!prefersReducedMotion) { useScreenShake(...) }`
- [ ] Scale/pop callout anims gated
- [ ] Spotlight breathing gated
- [ ] Gameplay-essential indicators (shatter, frozen-thaw) preserved in simplified form

- [ ] Step 1: Run automated audit: grep for `useReducedMotion` in all `lib/blast/v2/fx/*.ts` + component files. Count uses. Compare to FX catalog count (expect ≥10).
- [ ] Step 2: Manual test (dev-server):
  - Set `prefers-reduced-motion: reduce` in browser DevTools
  - Replay level, confirm particles/shakes off
  - Verify shatter sprite still renders (no crash)
- [ ] Step 3: Commit `chore(blast-v2): audit reduced-motion gates (Plan 4 Task 15)`.

---

### Task 16: Full Plan 4 verification + dev-server smoke

**Files:** None modified.

- [ ] Step 1: Run all FX + component tests: `cd fe-next && npx vitest run lib/blast/v2/fx/ components/blast/v2/`. Expect ALL PASS.
- [ ] Step 2: Lint + typecheck: `cd fe-next && npm run lint && npx tsc --noEmit`. Expect zero errors.
- [ ] Step 3: Build: `cd fe-next && npm run build`. Expect success.
- [ ] Step 4: Dev-server smoke (manual):
  - Start dev server (`npm run dev`, port 3001).
  - Force `blast.v2 = on` + `blast.v2-plan-4-fxlayers = on` in PostHog or localStorage.
  - Visit `/en/blast`.
  - Drag-select C→A→T: expect shatter burst at tile locations, coins arc to HUD, screen shake (medium, 4px) if reduced-motion off.
  - Drag S→U→N: expect cascade FX (double-pulse haptic, "CASCADE!" callout, radial pulse).
  - Complete level: expect spotlight bloom, confetti, stars pop.
  - Test `/he/blast` RTL rendering.
  - Check console for zero errors + no missing spritesheet warnings (expected, since Plan 6 produces PNGs; logs should say "Failed to load spritesheet ... but continuing").
- [ ] Step 5: Visual fix loop — iterate any CSS/timing tweaks needed.
- [ ] Step 6: Tag commit `blast-v2-plan-4-complete`.

---

## Self-review checklist (Plan 4)

- [x] Every FX moment from spec catalog (18 rows) is wired to a method in `useBlastFx`
- [x] All Pixi code is in `lib/blast/v2/fx/` or component render logic; no mixing with React state
- [x] Reduced-motion gated consistently: particles off, screen-shakes off, slow-mo off, spotlight static; gameplay-essential (shatter, frozen-thaw) always render
- [x] Haptics use `navigator.vibrate` patterns, respect user pref + reduced-motion
- [x] Screen-shake via CSS keyframes + `data-shake-key` increment (Plan 2's board already emits this)
- [x] Sprite sheets point to `/public/blast/v2/fx/` with graceful missing-file handling
- [x] Plan 2's `data-cell-id` + `data-state` data attributes are consumed as anchor points
- [x] Reduced-motion imported from `framer-motion`, not custom wrapper
- [x] All 14 `useBlastFx` methods are typed and present in `BlastFxApi` export

## Deliverables to Plans 5-7

- **Plan 5** consumes: `useBlastFx` is called in `BlastGame`; Plan 5 adds `BlastUnlockCard` modals + FTUE overlay that also fires FX (confetti on complete cards).
- **Plan 6** consumes: sprite sheets loaded from `/public/blast/v2/fx/`; missing-file warnings logged but not fatal.
- **Plan 3** consumes: FX moments fire as gameplay progresses; coins/gems flow to HUD counters (chest progress bar updated, coins counter increments).
- **Plan 7** consumes: Each FX moment can be mapped to a PostHog event for telemetry (e.g., `blast_word_found` fires alongside `playWordFound`).

## Risks tracked in this plan

| Risk | Mitigation |
|---|---|
| Pixi canvas size mismatch with board DOM | Task 13 uses `getBoundingClientRect` to anchor sprites in DOM space; verify in dev-server smoke Task 16 |
| Screen-shake CSS keyframes interfere with layout animations | Shake applied via `transform`, not `margin`/`padding`; Framer Motion layout animations unaffected |
| Haptics not available on desktop | Check `navigator.vibrate` exists before calling; graceful no-op on non-mobile |
| Missing spritesheet files crash Pixi | Task 0 loader returns null on failure; FX methods check null and skip sprite render (logged warning) |
| Reduced-motion preference not detected | Direct import from `framer-motion`, which reads OS preference + browser DevTools setting |
| Memory leak from Pixi ticker/listeners | Task 3 + 13 return cleanup function (`app.destroy()`) in useEffect cleanup |

---

**End Plan 4. Next milestone: `/[locale]/blast` renders with full FX layer + ambient atmosphere.**
