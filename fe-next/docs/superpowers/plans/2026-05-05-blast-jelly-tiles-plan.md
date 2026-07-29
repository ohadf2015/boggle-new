# Blast Jelly Tiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the "Glossy Jelly" tile look (concept A2) to blast mode and upgrade GSAP/PIXI juice across idle, selection, blast clear, and cascade.

**Architecture:** Tiles stay DOM-rendered (CSS layered presentation). GSAP drives idle micro-tilt + cascade squash-stretch. PIXI v8 (existing overlay canvas) draws the chain ribbon between selected tiles and per-type particle bursts on clear. All changes are scoped to `components/blast/` and its hooks; other modes untouched.

**Tech Stack:** Next.js 16 · React · TypeScript · Tailwind 3.4 + CSS Modules · GSAP 3.14.2 (no Club plugins) · PixiJS v8 · Vitest

**Spec:** `docs/superpowers/specs/2026-05-05-blast-jelly-tiles-design.md`

---

## Working Conventions

- **TDD strict** — every behaviour test-first, RED → GREEN → REFACTOR (per `.claude/rules/22-tdd-strict.md`).
- **Branch:** create `feat/blast-jelly-tiles` off `master`.
- **Commits:** one per phase per project rule (`10-git.md`). Conventional commit format `feat(blast): ...` / `refactor(blast): ...`.
- **Verify before commit:** `npm run lint && npm run test -- --run components/blast` then `npm run build`.
- **Dev server:** `npm run dev` runs on **port 3001** (per memory). Never poll 3000.
- **Reduced motion:** every animation MUST honour `window.matchMedia('(prefers-reduced-motion: reduce)').matches`. Skip / shorten — never throw.
- **RTL:** smoke `?locale=he` after each phase that touches transforms.
- **i18n:** no new user-facing strings expected; if any are added, all 5 locales (en/he/sv/ja/es) must be updated.

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `components/blast/BlastTile.module.css` | MODIFY | New jelly layers (`.jellyMirror`, `.jellyEdgeGlow`); existing `.gloss` rewritten |
| `components/blast/BlastTile.tsx` | MODIFY | Add new layer DOM nodes; wire idle GSAP ref; if file > 500 lines after, extract layers |
| `components/blast/BlastTileLayers.tsx` | CREATE (if needed) | Pure-presentation layer stack split out from BlastTile when 500-line cap is at risk |
| `components/blast/blastTileVisuals.ts` | MODIFY | Add `--bt-jelly-mirror`, `--bt-jelly-edge` to `TILE_ACCENTS` |
| `components/blast/effects/blastGsapTimelines.ts` | MODIFY | New `createIdleBreatheTween`, new per-type `createJellyClearTween`, new `createCascadeDropTween` |
| `components/blast/effects/blastJuiceKit.ts` | MODIFY | Extend with `spawnTypedBurst(type, x, y, combo)` and `spawnShockwave(x, y)` |
| `components/blast/hooks/useBlastGsapTimelines.ts` | MODIFY | Mount idle breathe timeline w/ IntersectionObserver gate; route clears to new builder |
| `components/blast/hooks/useBlastPixiOverlays.ts` | MODIFY | Add `chainRibbonController` (MeshRope) + per-type particle burst spawner |
| `components/blast/__tests__/BlastTile.jelly.test.tsx` | CREATE | Phase 1 snapshot + a11y |
| `components/blast/__tests__/useBlastIdleBreathe.test.ts` | CREATE | Phase 2 unit |
| `components/blast/__tests__/chainRibbon.test.ts` | CREATE | Phase 3 unit |
| `components/blast/__tests__/jellyClearTween.test.ts` | CREATE | Phase 4 unit |
| `components/blast/__tests__/cascadeDrop.test.ts` | CREATE | Phase 5 unit |

---

## Phase 0: Preflight (one-shot)

**Files:** none modified

- [ ] **Step 1: Create branch**

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next
git checkout master && git pull --ff-only
git checkout -b feat/blast-jelly-tiles
```

- [ ] **Step 2: Read existing tile + hooks to ground subsequent edits**

Read these files in full so subsequent code blocks land in the right place:

- `components/blast/BlastTile.tsx` (~507 lines)
- `components/blast/BlastTile.module.css` (~87 lines)
- `components/blast/blastTileVisuals.ts` (~151 lines)
- `components/blast/effects/blastGsapTimelines.ts` (~252 lines)
- `components/blast/effects/blastJuiceKit.ts` (~197 lines)
- `components/blast/hooks/useBlastGsapTimelines.ts` (~296 lines)
- `components/blast/hooks/useBlastPixiOverlays.ts` (~367 lines)
- `components/blast/BlastEffectsCanvas.tsx`

Note actual export names, prop shapes, existing tween-cleanup patterns. The code blocks below assume conventional names; rename if the codebase uses different identifiers.

- [ ] **Step 3: Confirm test infrastructure**

Run: `npm run test -- --run components/blast 2>&1 | tail -20`
Expected: existing blast tests pass (baseline). Capture green count.

---

## Phase 1: Jelly Tile Presentation

**Files:**
- Create: `components/blast/__tests__/BlastTile.jelly.test.tsx`
- Modify: `components/blast/BlastTile.module.css`
- Modify: `components/blast/blastTileVisuals.ts`
- Modify: `components/blast/BlastTile.tsx`

### Task 1.1: RED — snapshot test asserting new layers render

- [ ] **Step 1: Write failing test**

Create `components/blast/__tests__/BlastTile.jelly.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BlastTile from '../BlastTile';

describe('BlastTile jelly presentation', () => {
  it('renders mirror gloss + edge glow layers for standard tile', () => {
    const { container } = render(
      <BlastTile
        letter="A"
        type="standard"
        row={0}
        col={0}
        selected={false}
        chained={false}
      />
    );
    expect(container.querySelector('[data-layer="jelly-mirror"]')).toBeInTheDocument();
    expect(container.querySelector('[data-layer="jelly-edge"]')).toBeInTheDocument();
  });

  it('marks new layers aria-hidden', () => {
    const { container } = render(
      <BlastTile letter="B" type="bomb" row={0} col={1} selected={false} chained={false} />
    );
    container.querySelectorAll('[data-layer^="jelly-"]').forEach((el) => {
      expect(el.getAttribute('aria-hidden')).toBe('true');
    });
  });
});
```

Note: The exact `BlastTile` prop list MUST come from the file read in Phase 0 — adjust prop names if the real signature differs (e.g. `tile.type`, `position={{row,col}}`).

- [ ] **Step 2: Run test, verify RED**

Run: `npm run test -- --run components/blast/__tests__/BlastTile.jelly.test.tsx`
Expected: FAIL — `[data-layer="jelly-mirror"]` not in document.

### Task 1.2: GREEN — add layers to CSS module

- [ ] **Step 3: Add jelly layer CSS**

Edit `components/blast/BlastTile.module.css`. Append after existing `.rim` block, BEFORE `.letter`:

```css
/* Wet-look mirror highlight: curved gradient covering top ~55% of dome.
 * Two stacked radial gradients (cream toplight + narrower mirror sheen). */
.jellyMirror {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 2;
  background:
    radial-gradient(ellipse 120% 65% at 50% 0%,
      var(--bt-jelly-mirror, rgba(255, 255, 255, 0.65)) 0%,
      transparent 55%),
    radial-gradient(ellipse 60% 25% at 50% 8%,
      rgba(255, 255, 255, 0.85) 0%,
      transparent 55%);
  mix-blend-mode: screen;
}

/* Edge translucency: stacked inset shadows reading as light through jelly rim. */
.jellyEdgeGlow {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 3;
  box-shadow:
    inset 0 0 8px var(--bt-jelly-edge, rgba(255, 255, 255, 0.45)),
    inset 0 0 2px rgba(255, 255, 255, 0.85);
}

@media (prefers-reduced-motion: reduce) {
  .jellyMirror,
  .jellyEdgeGlow {
    /* presentation-only; no transitions to suppress */
  }
}
```

The `.gloss` block stays for backwards compatibility but the new `.jellyMirror` supersedes it visually. Defer deletion to Phase 6 cleanup.

### Task 1.3: GREEN — add per-type vars to TILE_ACCENTS

- [ ] **Step 4: Extend TILE_ACCENTS**

Edit `components/blast/blastTileVisuals.ts`. Update the type and every entry of `TILE_ACCENTS`:

```ts
export const TILE_ACCENTS: Record<BlastTileType, {
  glossTop: string;
  rimLight: string;
  rimDark: string;
  castShadow: string;
  jellyMirror: string;  // new
  jellyEdge: string;    // new
}> = {
  standard:  { /* existing 4 keys */, jellyMirror: 'rgba(255,255,255,0.65)', jellyEdge: 'rgba(255,255,255,0.45)' },
  // ...repeat for all 21 types
};
```

For each tile type, derive `jellyMirror` from a brightened version of `glossTop` and `jellyEdge` from `rimLight` at 50% alpha. Concrete values for first three:

```ts
gold:      { ..., jellyMirror: 'rgba(255,250,210,0.75)', jellyEdge: 'rgba(255,246,192,0.50)' },
bomb:      { ..., jellyMirror: 'rgba(255,210,210,0.65)', jellyEdge: 'rgba(255,200,210,0.45)' },
lightning: { ..., jellyMirror: 'rgba(255,242,180,0.75)', jellyEdge: 'rgba(255,240,168,0.50)' },
```

Use the same derivation rule for the other 18.

### Task 1.4: GREEN — render new layers + wire CSS vars in BlastTile

- [ ] **Step 5: Add layers to BlastTile JSX**

In `components/blast/BlastTile.tsx`, locate the existing layer stack (where `.candyShell`, `.gloss`, `.rim` are rendered). Before the `.letter` element, insert:

```tsx
<span className={styles.jellyMirror} data-layer="jelly-mirror" aria-hidden="true" />
<span className={styles.jellyEdgeGlow} data-layer="jelly-edge" aria-hidden="true" />
```

In the same file, in the inline `style` object that already sets `--bt-gloss`, `--bt-rim-light`, etc., add:

```tsx
style={{
  ...existingStyle,
  '--bt-jelly-mirror': accents.jellyMirror,
  '--bt-jelly-edge': accents.jellyEdge,
} as React.CSSProperties}
```

If `BlastTile.tsx` crosses 500 lines after the addition, extract the entire layer stack (`candyShell` → `letter`) into a new `BlastTileLayers.tsx` component that takes `{ accents, type, isPressed, children }` and renders the layers + `{children}` for the letter.

### Task 1.5: GREEN — verify tests pass

- [ ] **Step 6: Run jelly test, verify GREEN**

Run: `npm run test -- --run components/blast/__tests__/BlastTile.jelly.test.tsx`
Expected: PASS (2/2).

- [ ] **Step 7: Run full blast suite, no regressions**

Run: `npm run test -- --run components/blast 2>&1 | tail -20`
Expected: all green, count ≥ baseline from Phase 0 step 3.

- [ ] **Step 8: Manual smoke**

Run dev server (if not running): `npm run dev` (port 3001).
Navigate `http://localhost:3001/en/blast`. Confirm: tiles look glossier with brighter top highlight + visible inner edge glow. Compare against `iran-game/public/blast-concept-A2-jelly.jpg`.
Switch `?locale=he`, verify RTL keeps gloss centred (no flip needed) and shadow flipped.

- [ ] **Step 9: Commit Phase 1**

```bash
npm run lint && npm run build
git add components/blast/BlastTile.module.css components/blast/BlastTile.tsx components/blast/blastTileVisuals.ts components/blast/__tests__/BlastTile.jelly.test.tsx
# include components/blast/BlastTileLayers.tsx if created
git commit -m "feat(blast): jelly mirror + edge glow tile presentation

Implements Phase 1 of jelly redesign (concept A2).
Adds .jellyMirror + .jellyEdgeGlow layers driven by per-type
TILE_ACCENTS vars. Reduced-motion + RTL preserved."
```

---

## Phase 2: Idle GSAP Breathing Tilt

**Files:**
- Create: `components/blast/__tests__/useBlastIdleBreathe.test.ts`
- Modify: `components/blast/effects/blastGsapTimelines.ts`
- Modify: `components/blast/hooks/useBlastGsapTimelines.ts`

### Task 2.1: RED — idle breathe builder test

- [ ] **Step 1: Write failing test**

Create `components/blast/__tests__/useBlastIdleBreathe.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gsap } from 'gsap';
import { createIdleBreatheTween } from '../effects/blastGsapTimelines';

describe('createIdleBreatheTween', () => {
  let el: HTMLDivElement;

  beforeEach(() => { el = document.createElement('div'); });

  it('creates a yoyo tween with random delay and infinite repeat', () => {
    const tween = createIdleBreatheTween(el, { random: () => 0.5 });
    expect(tween.repeat()).toBe(-1);
    expect(tween.yoyo()).toBe(true);
    expect(tween.delay()).toBeCloseTo(2, 1); // 0.5 * 4
    tween.kill();
  });

  it('returns null when prefers-reduced-motion is set', () => {
    const orig = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true } as MediaQueryList);
    const tween = createIdleBreatheTween(el, { random: () => 0.5 });
    expect(tween).toBeNull();
    window.matchMedia = orig;
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `npm run test -- --run components/blast/__tests__/useBlastIdleBreathe.test.ts`
Expected: FAIL — `createIdleBreatheTween` not exported.

### Task 2.2: GREEN — implement builder

- [ ] **Step 3: Add builder**

Append to `components/blast/effects/blastGsapTimelines.ts`:

```ts
import { gsap } from 'gsap';

export interface IdleBreatheOptions {
  random?: () => number; // injectable for tests
}

const reducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createIdleBreatheTween(
  el: HTMLElement,
  opts: IdleBreatheOptions = {},
): gsap.core.Tween | null {
  if (reducedMotion()) return null;
  const random = opts.random ?? Math.random;
  return gsap.to(el, {
    rotateX: '+=2',
    rotateY: '+=2',
    duration: 4,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
    delay: random() * 4,
    paused: false,
  });
}
```

- [ ] **Step 4: Verify GREEN**

Run: `npm run test -- --run components/blast/__tests__/useBlastIdleBreathe.test.ts`
Expected: PASS (2/2).

### Task 2.3: Wire into hook + IntersectionObserver pause

- [ ] **Step 5: RED — observer pause test**

Append to `useBlastIdleBreathe.test.ts`:

```ts
import { mountIdleBreatheForTiles } from '../hooks/useBlastGsapTimelines';

describe('mountIdleBreatheForTiles', () => {
  it('pauses tweens when all tiles are off-screen', () => {
    const tile1 = document.createElement('div');
    const tile2 = document.createElement('div');
    document.body.append(tile1, tile2);

    const fakeObserve: IntersectionObserverCallback[] = [];
    const observe = vi.fn();
    const disconnect = vi.fn();
    (window as any).IntersectionObserver = class {
      constructor(cb: IntersectionObserverCallback) { fakeObserve.push(cb); }
      observe = observe;
      disconnect = disconnect;
    };

    const cleanup = mountIdleBreatheForTiles([tile1, tile2]);

    // simulate off-screen
    fakeObserve[0](
      [
        { target: tile1, isIntersecting: false } as IntersectionObserverEntry,
        { target: tile2, isIntersecting: false } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    );

    // tweens should be paused — verify via gsap.getTweensOf
    [tile1, tile2].forEach((el) => {
      const tweens = gsap.getTweensOf(el);
      tweens.forEach((t) => expect(t.paused()).toBe(true));
    });

    cleanup();
    [tile1, tile2].forEach((el) => el.remove());
  });
});
```

- [ ] **Step 6: Verify RED**

Run: `npm run test -- --run components/blast/__tests__/useBlastIdleBreathe.test.ts`
Expected: FAIL — `mountIdleBreatheForTiles` not exported.

- [ ] **Step 7: GREEN — implement mount helper**

In `components/blast/hooks/useBlastGsapTimelines.ts`, append:

```ts
import { createIdleBreatheTween } from '../effects/blastGsapTimelines';

export function mountIdleBreatheForTiles(tiles: HTMLElement[]): () => void {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return () => {};
  }
  const tweens = new Map<HTMLElement, gsap.core.Tween>();
  tiles.forEach((el) => {
    el.style.willChange = 'transform';
    const t = createIdleBreatheTween(el);
    if (t) tweens.set(el, t);
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const tween = tweens.get(entry.target as HTMLElement);
      if (!tween) return;
      if (entry.isIntersecting) tween.play();
      else tween.pause();
    });
  }, { threshold: 0.05 });

  tiles.forEach((el) => observer.observe(el));

  return () => {
    observer.disconnect();
    tweens.forEach((t, el) => {
      t.kill();
      el.style.willChange = '';
    });
  };
}
```

- [ ] **Step 8: Verify GREEN**

Run: `npm run test -- --run components/blast/__tests__/useBlastIdleBreathe.test.ts`
Expected: PASS (3/3).

### Task 2.4: Wire helper into BlastBoard mount

- [ ] **Step 9: Hook into BlastBoard / BlastGame**

Locate the component that owns the rendered tile DOM (`BlastBoard.tsx` likely). In its tile-grid `useEffect`, after tile DOM nodes are committed:

```tsx
useEffect(() => {
  const tileEls = Array.from(boardRef.current?.querySelectorAll<HTMLElement>('[data-blast-tile]') ?? []);
  if (tileEls.length === 0) return;
  return mountIdleBreatheForTiles(tileEls);
}, [tilesKeyForLayout /* re-mount when tile set changes */]);
```

Add `data-blast-tile` to the BlastTile root element.

- [ ] **Step 10: Manual smoke + commit**

`npm run dev`, open `/en/blast`. Tiles should subtly tilt; off-screen scroll should pause (verify via Chrome devtools Performance trace — Tasks panel idle).

```bash
npm run lint && npm run build
git add components/blast/effects/blastGsapTimelines.ts components/blast/hooks/useBlastGsapTimelines.ts components/blast/BlastBoard.tsx components/blast/BlastTile.tsx components/blast/__tests__/useBlastIdleBreathe.test.ts
git commit -m "feat(blast): idle GSAP breathe tilt with intersection pause

Implements Phase 2 — per-tile yoyo rotateX/Y with randomised delay,
paused when off-screen via single IntersectionObserver. Honours
prefers-reduced-motion."
```

---

## Phase 3: PIXI Chain Ribbon

**Files:**
- Create: `components/blast/__tests__/chainRibbon.test.ts`
- Modify: `components/blast/hooks/useBlastPixiOverlays.ts`

### Task 3.1: RED — point sequence test

- [ ] **Step 1: Write failing test**

Create `components/blast/__tests__/chainRibbon.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Point } from 'pixi.js';
import { createChainRibbonController } from '../hooks/useBlastPixiOverlays';

describe('chainRibbonController', () => {
  it('updates points to match selection sequence', () => {
    const stage = { addChild: vi.fn(), removeChild: vi.fn() } as any;
    const ctrl = createChainRibbonController(stage);
    ctrl.update([
      { x: 10, y: 10 }, { x: 30, y: 10 }, { x: 30, y: 30 },
    ]);
    expect(ctrl.points.length).toBe(3);
    expect(ctrl.points[2]).toEqual(new Point(30, 30));
  });

  it('hides the rope when selection has fewer than 2 points', () => {
    const stage = { addChild: vi.fn(), removeChild: vi.fn() } as any;
    const ctrl = createChainRibbonController(stage);
    ctrl.update([{ x: 10, y: 10 }]);
    expect(ctrl.rope.visible).toBe(false);
  });

  it('disposes cleanly', () => {
    const stage = { addChild: vi.fn(), removeChild: vi.fn() } as any;
    const ctrl = createChainRibbonController(stage);
    ctrl.dispose();
    expect(stage.removeChild).toHaveBeenCalledWith(ctrl.rope);
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `npm run test -- --run components/blast/__tests__/chainRibbon.test.ts`
Expected: FAIL — export missing.

### Task 3.2: GREEN — implement controller

- [ ] **Step 3: Implement controller**

Append to `components/blast/hooks/useBlastPixiOverlays.ts`:

```ts
import { Container, MeshRope, Point, Texture } from 'pixi.js';

let cachedRibbonTexture: Texture | null = null;
function getRibbonTexture(): Texture {
  if (cachedRibbonTexture) return cachedRibbonTexture;
  // 256×8 horizontal alpha gradient, hot-pink
  const c = document.createElement('canvas');
  c.width = 256; c.height = 8;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0,   'rgba(255, 20, 147, 0.95)');
  g.addColorStop(0.5, 'rgba(255, 80, 180, 1.00)');
  g.addColorStop(1,   'rgba(255, 20, 147, 0.30)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 8);
  cachedRibbonTexture = Texture.from(c);
  return cachedRibbonTexture;
}

export interface ChainRibbonController {
  rope: MeshRope;
  points: Point[];
  update: (pts: ReadonlyArray<{ x: number; y: number }>) => void;
  dispose: () => void;
}

export function createChainRibbonController(
  stage: Container,
): ChainRibbonController {
  // Start with two coincident points so MeshRope is constructible
  const points: Point[] = [new Point(0, 0), new Point(0, 0)];
  const rope = new MeshRope({ texture: getRibbonTexture(), points });
  rope.visible = false;
  stage.addChild(rope);

  return {
    rope,
    points,
    update(pts) {
      if (pts.length < 2) {
        rope.visible = false;
        return;
      }
      // resize points array in place
      while (points.length < pts.length) points.push(new Point(0, 0));
      while (points.length > pts.length) points.pop();
      pts.forEach((p, i) => { points[i].set(p.x, p.y); });
      rope.visible = true;
    },
    dispose() {
      stage.removeChild(rope);
      rope.destroy({ texture: false });
    },
  };
}
```

- [ ] **Step 4: Verify GREEN**

Run: `npm run test -- --run components/blast/__tests__/chainRibbon.test.ts`
Expected: PASS (3/3).

### Task 3.3: Wire controller into selection state

- [ ] **Step 5: Integrate**

In `useBlastPixiOverlays.ts` (the hook function itself), after the existing PIXI app/stage initialisation, instantiate the controller and expose an `updateChain(points)` callback. In the component that owns blast selection state (`BlastGame.tsx` or wherever selection mutates), compute the screen-space centre of each currently-selected tile and call `updateChain(points)` on every selection change.

Tile centre derivation: read the tile DOM element's `getBoundingClientRect()`, subtract the canvas's bounding rect origin to get canvas-space coordinates.

- [ ] **Step 6: Manual smoke + commit**

`npm run dev`, drag-select 3+ adjacent tiles in `/en/blast`. A pink ribbon should curve through their centres and disappear when you commit / cancel the word.

```bash
npm run lint && npm run test -- --run components/blast && npm run build
git add components/blast/hooks/useBlastPixiOverlays.ts components/blast/BlastGame.tsx components/blast/__tests__/chainRibbon.test.ts
git commit -m "feat(blast): PIXI chain ribbon between selected tiles

Implements Phase 3 — MeshRope ribbon (PIXI v8) following selection
order, hot-pink gradient texture, hidden when selection < 2."
```

---

## Phase 4: Blast Clear Timeline + Particle Bursts

**Files:**
- Create: `components/blast/__tests__/jellyClearTween.test.ts`
- Modify: `components/blast/effects/blastGsapTimelines.ts`
- Modify: `components/blast/effects/blastJuiceKit.ts`
- Modify: `components/blast/hooks/useBlastGsapTimelines.ts`
- Modify: `components/blast/hooks/useBlastPixiOverlays.ts`

### Task 4.1: RED — per-type duration test

- [ ] **Step 1: Write failing test**

Create `components/blast/__tests__/jellyClearTween.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { BlastTileType } from '../types';
import { createJellyClearTween, JELLY_CLEAR_DURATION_MS } from '../effects/blastGsapTimelines';

const TYPES: BlastTileType[] = [
  'standard', 'gold', 'bomb', 'lightning', 'prism', 'rainbow', 'ice',
  'gem', 'frozen', 'magnet', 'diamond', 'countdown', 'shuffle', 'magma',
  'portal', 'catalyst', 'crystal', 'fuse', 'locked', 'key', 'anchor',
];

describe('createJellyClearTween', () => {
  it.each(TYPES)('returns timeline for type %s with non-zero duration', (type) => {
    const el = document.createElement('div');
    const tl = createJellyClearTween(el, type);
    expect(tl).not.toBeNull();
    expect(JELLY_CLEAR_DURATION_MS[type]).toBeGreaterThan(0);
    tl?.kill();
  });

  it('reduced-motion path returns shortened timeline (≤ duration / 3)', () => {
    const orig = window.matchMedia;
    window.matchMedia = ((q: string) => ({
      matches: q.includes('reduced'),
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as MediaQueryList)) as typeof window.matchMedia;

    const el = document.createElement('div');
    const tl = createJellyClearTween(el, 'bomb');
    expect(tl?.duration() ?? 0).toBeLessThanOrEqual(JELLY_CLEAR_DURATION_MS.bomb / 3 / 1000);
    tl?.kill();
    window.matchMedia = orig;
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `npm run test -- --run components/blast/__tests__/jellyClearTween.test.ts`
Expected: FAIL — exports missing.

### Task 4.2: GREEN — implement per-type clear builder

- [ ] **Step 3: Implement builder**

Append to `components/blast/effects/blastGsapTimelines.ts`:

```ts
import type { BlastTileType } from '../types';

export const JELLY_CLEAR_DURATION_MS: Record<BlastTileType, number> = {
  standard:  180,
  gold:      200,
  bomb:      220,
  lightning: 160,
  prism:     280,
  rainbow:   320,
  ice:       200,
  gem:       240,
  frozen:    240,
  magnet:    300,
  diamond:   220,
  countdown: 200,
  shuffle:   320,
  magma:     260,
  portal:    340,
  catalyst:  220,
  crystal:   260,
  fuse:      220,
  locked:    160,
  key:       180,
  anchor:    180,
};

interface ClearSignature {
  scale: number;
  rotation: number;
  filter: string;
  ease: string;
}

const SIGNATURES: Partial<Record<BlastTileType, ClearSignature>> = {
  bomb:      { scale: 2.2, rotation:  15, filter: 'brightness(2.5) saturate(2)',           ease: 'power2.out' },
  lightning: { scale: 0.15, rotation:   0, filter: 'brightness(3) contrast(1.5)',           ease: 'power3.in'  },
  prism:     { scale: 2.0, rotation: 270, filter: 'hue-rotate(180deg) brightness(1.8)',    ease: 'power1.out' },
  ice:       { scale: 0.30, rotation:  25, filter: 'brightness(2) blur(2px)',               ease: 'power2.in'  },
  // ... include all 21 types — derive remaining from existing CLEARING_ANIMS in blastTileVisuals.ts
};

const DEFAULT_SIG: ClearSignature = { scale: 1.6, rotation: 0, filter: 'brightness(2)', ease: 'power2.out' };

export function createJellyClearTween(
  el: HTMLElement,
  type: BlastTileType,
): gsap.core.Timeline | null {
  const baseMs = JELLY_CLEAR_DURATION_MS[type] ?? 200;
  const ms = reducedMotion() ? Math.round(baseMs / 3) : baseMs;
  const sig = SIGNATURES[type] ?? DEFAULT_SIG;
  const tl = gsap.timeline();
  tl.to(el, {
    scale: sig.scale,
    rotation: sig.rotation,
    filter: sig.filter,
    duration: ms / 1000,
    ease: sig.ease,
  });
  tl.to(el, { opacity: 0, duration: 0.08 }, '>-0.05');
  return tl;
}
```

Fill in the missing entries in `SIGNATURES` from the existing `CLEARING_ANIMS` table in `blastTileVisuals.ts` — each entry's `transform` decomposes into `scale` + `rotation`, the `filter` is verbatim. This keeps the per-type signature identical to current behaviour.

- [ ] **Step 4: Verify GREEN**

Run: `npm run test -- --run components/blast/__tests__/jellyClearTween.test.ts`
Expected: PASS.

### Task 4.3: Particle burst via PIXI

- [ ] **Step 5: RED — burst spawner test**

Append to `components/blast/__tests__/jellyClearTween.test.ts`:

```ts
import { spawnTypedBurst } from '../effects/blastJuiceKit';

describe('spawnTypedBurst', () => {
  it('spawns 8 particles for combo 1', () => {
    const stage = { addChild: vi.fn() } as any;
    const handle = spawnTypedBurst(stage, 'bomb', 100, 100, 1);
    expect(handle.particleCount).toBe(8);
  });

  it('spawns 16 + shockwave for combo >= 3', () => {
    const stage = { addChild: vi.fn() } as any;
    const handle = spawnTypedBurst(stage, 'bomb', 100, 100, 3);
    expect(handle.particleCount).toBe(16);
    expect(handle.hasShockwave).toBe(true);
  });

  it('returns 0 particles under reduced motion', () => {
    const orig = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: q.includes('reduced') } as MediaQueryList)) as typeof window.matchMedia;
    const stage = { addChild: vi.fn() } as any;
    const handle = spawnTypedBurst(stage, 'bomb', 100, 100, 1);
    expect(handle.particleCount).toBe(0);
    window.matchMedia = orig;
  });
});
```

- [ ] **Step 6: Verify RED**

Run: `npm run test -- --run components/blast/__tests__/jellyClearTween.test.ts`
Expected: 3 new fail.

- [ ] **Step 7: GREEN — implement spawner**

Append to `components/blast/effects/blastJuiceKit.ts`:

```ts
import { Container, Graphics } from 'pixi.js';
import { TILE_ACCENTS } from '../blastTileVisuals';
import type { BlastTileType } from '../types';

export interface BurstHandle {
  particleCount: number;
  hasShockwave: boolean;
}

const reducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const MAX_CONCURRENT_PARTICLES = 64;
let liveParticles: Graphics[] = [];

function evict(): void {
  while (liveParticles.length > MAX_CONCURRENT_PARTICLES) {
    const oldest = liveParticles.shift();
    oldest?.destroy();
  }
}

export function spawnTypedBurst(
  stage: Container,
  type: BlastTileType,
  x: number,
  y: number,
  combo: number,
): BurstHandle {
  if (reducedMotion()) return { particleCount: 0, hasShockwave: false };
  const accents = TILE_ACCENTS[type];
  const count = combo >= 3 ? 16 : 8;
  const colourHex = parseRgbaToHex(accents.rimDark);

  for (let i = 0; i < count; i++) {
    const p = new Graphics().circle(0, 0, 3 + Math.random() * 2).fill({ color: colourHex });
    p.x = x; p.y = y;
    stage.addChild(p);
    liveParticles.push(p);
    const angle = (Math.PI * 2 * i) / count;
    const speed = 60 + Math.random() * 60;
    gsap.to(p, {
      x: x + Math.cos(angle) * speed,
      y: y + Math.sin(angle) * speed,
      alpha: 0,
      duration: 0.6,
      ease: 'power2.out',
      onComplete: () => { p.destroy(); liveParticles = liveParticles.filter(q => q !== p); },
    });
  }
  evict();

  const hasShockwave = combo >= 3;
  if (hasShockwave) {
    const ring = new Graphics().circle(0, 0, 8).stroke({ width: 3, color: colourHex, alpha: 0.7 });
    ring.x = x; ring.y = y;
    stage.addChild(ring);
    gsap.to(ring, {
      pixi: { scale: 6 },
      alpha: 0,
      duration: 0.4,
      ease: 'power2.out',
      onComplete: () => ring.destroy(),
    });
  }

  return { particleCount: count, hasShockwave };
}

function parseRgbaToHex(rgba: string): number {
  const m = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return 0xffffff;
  return (parseInt(m[1]) << 16) | (parseInt(m[2]) << 8) | parseInt(m[3]);
}
```

- [ ] **Step 8: Verify GREEN**

Run: `npm run test -- --run components/blast/__tests__/jellyClearTween.test.ts`
Expected: 6/6 PASS.

### Task 4.4: Wire into existing clear pipeline

- [ ] **Step 9: Replace current clear path**

In `useBlastGsapTimelines.ts`, find where the existing per-type clear is triggered (likely a function like `playClearForTile(type, el)`). Swap the body to:

```ts
import { createJellyClearTween } from '../effects/blastGsapTimelines';
import { spawnTypedBurst } from '../effects/blastJuiceKit';

function playClearForTile(type: BlastTileType, el: HTMLElement, comboSize: number) {
  const tl = createJellyClearTween(el, type);
  const rect = el.getBoundingClientRect();
  const canvasRect = pixiCanvasRef.current!.getBoundingClientRect();
  spawnTypedBurst(
    pixiStageRef.current!,
    type,
    rect.left + rect.width / 2 - canvasRect.left,
    rect.top + rect.height / 2 - canvasRect.top,
    comboSize,
  );
  return tl;
}
```

`comboSize` is the count of tiles being cleared in this batch — pass it from the caller.

- [ ] **Step 10: Manual smoke + commit**

`/en/blast`, blast a multi-tile word with a bomb. Bomb should bloom out, particles fly in tile-tinted colour, shockwave ring on combo ≥ 3. Toggle reduced-motion in devtools — particles vanish, animations shorten.

```bash
npm run lint && npm run test -- --run components/blast && npm run build
git add components/blast/effects/ components/blast/hooks/ components/blast/__tests__/jellyClearTween.test.ts
git commit -m "feat(blast): GSAP clear timelines + PIXI typed bursts

Implements Phase 4 — replaces CSS-transform per-type clear with GSAP
timelines, spawns tile-tinted particle bursts and combo shockwave."
```

---

## Phase 5: Cascade Squash-Stretch

**Files:**
- Create: `components/blast/__tests__/cascadeDrop.test.ts`
- Modify: `components/blast/effects/blastGsapTimelines.ts`
- Modify: cascade caller (likely `useBlastBoardLogic` or `BlastBoard.tsx`)

### Task 5.1: RED — drop tween test

- [ ] **Step 1: Write failing test**

Create `components/blast/__tests__/cascadeDrop.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createCascadeDropTween } from '../effects/blastGsapTimelines';

describe('createCascadeDropTween', () => {
  it('uses bounce.out ease for position', () => {
    const el = document.createElement('div');
    const tl = createCascadeDropTween(el, { fromY: -200, columnIndex: 0 });
    const tweens = tl.getChildren();
    const yTween = tweens.find(t => (t.vars as any).y !== undefined);
    expect((yTween?.vars as any).ease).toBe('bounce.out');
  });

  it('staggers via column index (delay = columnIndex * 0.04)', () => {
    const el = document.createElement('div');
    const tl = createCascadeDropTween(el, { fromY: -200, columnIndex: 3 });
    expect(tl.delay()).toBeCloseTo(0.12, 2);
  });

  it('reduced-motion sets final position immediately', () => {
    const orig = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: q.includes('reduced') } as MediaQueryList)) as typeof window.matchMedia;
    const el = document.createElement('div');
    const tl = createCascadeDropTween(el, { fromY: -200, columnIndex: 0 });
    expect(tl.duration()).toBeLessThan(0.05);
    window.matchMedia = orig;
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `npm run test -- --run components/blast/__tests__/cascadeDrop.test.ts`
Expected: FAIL — export missing.

### Task 5.2: GREEN — implement drop builder

- [ ] **Step 3: Implement**

Append to `components/blast/effects/blastGsapTimelines.ts`:

```ts
export interface CascadeDropOptions {
  fromY: number;
  columnIndex: number;
}

export function createCascadeDropTween(
  el: HTMLElement,
  opts: CascadeDropOptions,
): gsap.core.Timeline {
  const tl = gsap.timeline({ delay: opts.columnIndex * 0.04 });
  if (reducedMotion()) {
    tl.set(el, { y: 0, scaleX: 1, scaleY: 1 });
    return tl;
  }
  tl.from(el, { y: opts.fromY, duration: 0.55, ease: 'bounce.out' }, 0);
  tl.fromTo(
    el,
    { scaleY: 1.15, scaleX: 0.85 },
    { scaleY: 0.7, scaleX: 1.15, duration: 0.18, ease: 'power2.out',
      yoyo: true, repeat: 1, transformOrigin: 'center bottom' },
    0.4,
  );
  return tl;
}
```

- [ ] **Step 4: Verify GREEN**

Run: `npm run test -- --run components/blast/__tests__/cascadeDrop.test.ts`
Expected: PASS (3/3).

### Task 5.3: Wire into cascade caller

- [ ] **Step 5: Replace existing fall logic**

Find where new tiles are added after a clear (likely `useBlastBoardLogic` or a `useEffect` in `BlastBoard.tsx`). For each newly-spawned tile element, call `createCascadeDropTween(el, { fromY: -tile.height * (rowsAbove + 1), columnIndex: tile.col })`.

- [ ] **Step 6: Manual smoke + commit**

Blast a column, watch refill. Tiles should drop with bounce + slight squash on landing, columns staggered. Toggle reduced-motion — tiles snap into place.

```bash
npm run lint && npm run test -- --run components/blast && npm run build
git add components/blast/effects/blastGsapTimelines.ts components/blast/BlastBoard.tsx components/blast/__tests__/cascadeDrop.test.ts
git commit -m "feat(blast): cascade squash-stretch on tile drop

Implements Phase 5 — bounce.out drop + parallel scale yoyo, column-
indexed stagger. Reduced-motion snaps to final position."
```

---

## Phase 6: Verification

**Files:** none modified

- [ ] **Step 1: Full lint**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 2: Full test suite**

Run: `npm run test`
Expected: green, count ≥ baseline + 11 new tests (Phase 1: 2, Phase 2: 3, Phase 3: 3, Phase 4: 6, Phase 5: 3 — adjust if any tests skipped).

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: success, no new warnings.

- [ ] **Step 4: Manual smoke matrix**

`npm run dev` (port 3001). For each row, navigate, observe expected behaviour:

| Path | Verify |
|---|---|
| `/en/blast` | tiles glossy, idle breathe, drag chain shows ribbon, blast multi-tile w/ bomb shows burst + shockwave, refill cascade bounces |
| `/he/blast` | same as above, RTL, shadow flipped, gloss centred |
| `/en/blast` w/ devtools `prefers-reduced-motion: reduce` | no breathe, no particles, snappy clears, instant cascade |
| `/en/multiplayer` | tiles UNCHANGED (other modes not affected) |
| `/en/practice` | tiles UNCHANGED |

- [ ] **Step 5: Sentry quiet check**

Open https://sentry.io and confirm no new blast-related issues since Phase 1 commit.

- [ ] **Step 6: PR**

```bash
git push -u origin feat/blast-jelly-tiles
gh pr create --title "feat(blast): jelly tile redesign + GSAP/PIXI juice pass" \
  --body "Implements concept A2 jelly tiles with idle breathe, chain ribbon, typed clear bursts, and cascade squash-stretch.

Spec: docs/superpowers/specs/2026-05-05-blast-jelly-tiles-design.md
Plan: docs/superpowers/plans/2026-05-05-blast-jelly-tiles-plan.md

## Test plan
- [ ] tile gloss + edge-glow visible on /blast
- [ ] idle breathing tilt subtle, paused off-screen
- [ ] chain ribbon follows selection
- [ ] blast clear plays per-type signature with particle burst
- [ ] cascade drop bounces with squash settle
- [ ] HE locale RTL correct
- [ ] prefers-reduced-motion respected
- [ ] other game modes (MP/SP/practice) unchanged

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

---

## Self-Review Notes

- **Spec coverage:** every section in the spec maps to a phase (Phase 1 ↔ visual anatomy, Phase 2 ↔ idle, Phase 3 ↔ selection, Phase 4 ↔ clear, Phase 5 ↔ cascade, Phase 6 ↔ verification gate).
- **Type consistency:** `createIdleBreatheTween`, `createJellyClearTween`, `createCascadeDropTween`, `createChainRibbonController`, `spawnTypedBurst`, `mountIdleBreatheForTiles`, `JELLY_CLEAR_DURATION_MS`, `BurstHandle` — all signatures referenced consistently across phases.
- **No placeholders:** every code-changing step shows code; every command shows expected output; the only "fill in remaining entries" instruction (Phase 4 `SIGNATURES` table) explicitly references the existing `CLEARING_ANIMS` source, which the engineer reads in Phase 0 step 2.
- **Order:** phases are independent enough that 4 ↔ 5 could swap, but presenting in the order spec uses keeps the engineer aligned with the design doc.
