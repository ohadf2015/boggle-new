# Blast — Candy-Crush Tiles + Popup Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make blast tiles look like physical 3D candies and turn the Continue/Retry popups into a *moment*, behind a single feature flag.

**Architecture:** Tiles stay DOM-rendered (Pixi remains the effects overlay above). We wrap the existing `<button>` with three new pseudo-element layers (cast-shadow / top-gloss / inner-rim) sourced from a co-located SCSS module, while leaving `TILE_VISUALS` gradients untouched. Phase transitions move from ad-hoc `transition: all` strings into GSAP timelines added to the existing `useBlastGsapTimelines` hook (preserves its `trackTl` lifecycle). A new shared `BlastModalShell` orchestrates a 6-step staggered GSAP entrance for both modals; `BlastEffectsCanvas` exposes a `firePopupBurst` method through `BlastFxBridge` so the modal can ignite an existing pixi particle burst from the icon orb. Everything gates on PostHog flag `blast.candy-shell.enabled`.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind 3.4 + SCSS modules, GSAP 3.14.2, PixiJS 8.17.1, framer-motion 12.23.24 (kept for AnimatePresence wrapper), Vitest + Testing Library.

**Spec:** `docs/2026-05-04-blast-candy-crush-tiles-popups-design.md`

**Working directory:** `/Users/ohadfisher/git/boggle-new/fe-next` for all `npm` commands; absolute paths for file edits.

---

## File Structure

| Type | Path | Responsibility |
|---|---|---|
| Modify | `fe-next/components/blast/blastTileVisuals.ts` | Add per-type accent colour quad (used by SCSS via CSS vars). |
| Create | `fe-next/components/blast/BlastTile.module.scss` | Layered candy presentation: cast-shadow, top-gloss, inner-rim, embossed letter. |
| Modify | `fe-next/components/blast/BlastTile.tsx` | Wrap `<button>` content in 3 sibling layer spans; gate behind feature flag; route phase transitions to GSAP. |
| Modify | `fe-next/components/blast/hooks/useBlastGsapTimelines.ts` | Add `playPhaseTransition(el, phase, opts)` and `playPopupTimeline(refs)`. |
| Modify | `fe-next/components/blast/BlastBoard.tsx` | Accept `onTileClearing(row, col)` callback; trigger neighbour-lean on phase change. |
| Create | `fe-next/components/blast/BlastModalShell.tsx` | Shared backdrop+frame+orb+slots wrapper for both modals. |
| Create | `fe-next/components/blast/BlastModalShell.module.scss` | Backdrop blur, gradient frame, dashed-ring orb, swipe-shine. |
| Modify | `fe-next/components/blast/BlastEffectsCanvas.tsx` | Add `firePopupBurst({x, y, colour})` method. |
| Modify | `fe-next/components/blast/BlastFxBridge.tsx` | Re-export the new method on the bridge ref. |
| Modify | `fe-next/components/blast/BlastContinueModal.tsx` | Re-skin via `BlastModalShell`; add mascot reaction sticker. |
| Modify | `fe-next/components/blast/BlastRetryWaveModal.tsx` | Re-skin via `BlastModalShell`. |
| Create | `fe-next/lib/experiments.ts` (already exists — extend) | Register `blast.candy-shell.enabled` flag. |
| Create | `fe-next/components/blast/__tests__/BlastTile.candyVisual.test.tsx` | Layer composition + per-type CSS-var assertions. |
| Create | `fe-next/components/blast/__tests__/BlastModalShell.test.tsx` | Shell renders; timeline orchestrates correct stagger; burst fires. |
| Create | `fe-next/components/blast/__tests__/BlastContinueModal.test.tsx` | New file — mount, CTA, decline, mascot. |
| Modify | `fe-next/components/blast/__tests__/BlastTile.test.tsx` | Update assertions for new layer structure. |
| Modify | `fe-next/components/blast/__tests__/BlastView.retryWave.test.tsx` | Account for shell-mediated entrance. |
| Modify | `fe-next/components/blast/hooks/__tests__/useBlastGsapTimelines.test.ts` | Cover new phase + popup timelines. |

---

## Sub-scope A — Tile presentation (Tasks 1-7)

### Task 1: Extend `blastTileVisuals.ts` with per-type accent colour quads

**Files:**
- Modify: `fe-next/components/blast/blastTileVisuals.ts`
- Test: `fe-next/components/blast/__tests__/blastTileVisuals.test.ts` (new)

The new SCSS layers (gloss/rim/cast-shadow) need to read accent colours per `BlastTileType`. We add a sibling `TILE_ACCENTS` map without touching the existing gradients.

- [ ] **Step 1: Write failing test**

Create `fe-next/components/blast/__tests__/blastTileVisuals.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { TILE_ACCENTS } from '../blastTileVisuals';
import { TILE_TYPES } from '../types';

describe('TILE_ACCENTS', () => {
  it('has accent quad for every BlastTileType', () => {
    for (const type of TILE_TYPES) {
      const accent = TILE_ACCENTS[type];
      expect(accent, `missing accent for ${type}`).toBeDefined();
      expect(accent.glossTop).toMatch(/^rgba?\(/);
      expect(accent.rimLight).toMatch(/^rgba?\(/);
      expect(accent.rimDark).toMatch(/^rgba?\(/);
      expect(accent.castShadow).toMatch(/^rgba?\(/);
    }
  });

  it('standard tile has neutral cream accent', () => {
    expect(TILE_ACCENTS.standard.glossTop).toBe('rgba(255,255,255,0.55)');
  });
});
```

Verify `TILE_TYPES` is exported from `components/blast/types`. If not, switch the import to:

```ts
const TILE_TYPES = Object.keys(TILE_ACCENTS) as Array<keyof typeof TILE_ACCENTS>;
```

- [ ] **Step 2: Run test, verify it fails**

```bash
cd fe-next && npm run test -- blastTileVisuals.test.ts
```

Expected: `TILE_ACCENTS is not exported`.

- [ ] **Step 3: Add `TILE_ACCENTS` export to `blastTileVisuals.ts`**

Append to bottom of `fe-next/components/blast/blastTileVisuals.ts`:

```ts
/** Per-type accent quad consumed by BlastTile.module.scss via CSS custom properties.
 *  glossTop  = top specular highlight base colour (RGBA)
 *  rimLight  = inner top-left rim stroke
 *  rimDark   = inner bottom-right rim stroke
 *  castShadow = colour of the soft cast shadow under the tile
 */
export const TILE_ACCENTS: Record<BlastTileType, {
  glossTop: string;
  rimLight: string;
  rimDark: string;
  castShadow: string;
}> = {
  standard:  { glossTop: 'rgba(255,255,255,0.55)', rimLight: 'rgba(255,255,255,0.85)', rimDark: 'rgba(0,0,0,0.20)', castShadow: 'rgba(0,0,0,0.35)' },
  gold:      { glossTop: 'rgba(255,250,210,0.65)', rimLight: 'rgba(255,246,192,0.95)', rimDark: 'rgba(94,50,0,0.45)',  castShadow: 'rgba(94,50,0,0.55)'  },
  bomb:      { glossTop: 'rgba(255,210,210,0.55)', rimLight: 'rgba(255,200,210,0.85)', rimDark: 'rgba(60,8,24,0.55)',  castShadow: 'rgba(60,8,24,0.55)'   },
  lightning: { glossTop: 'rgba(255,242,180,0.65)', rimLight: 'rgba(255,240,168,0.95)', rimDark: 'rgba(76,22,0,0.50)',  castShadow: 'rgba(76,22,0,0.55)'   },
  prism:     { glossTop: 'rgba(255,255,255,0.55)', rimLight: 'rgba(255,255,255,0.95)', rimDark: 'rgba(40,8,78,0.55)',  castShadow: 'rgba(40,8,78,0.55)'   },
  rainbow:   { glossTop: 'rgba(255,255,255,0.55)', rimLight: 'rgba(255,255,255,0.95)', rimDark: 'rgba(8,54,66,0.55)',  castShadow: 'rgba(8,54,66,0.55)'   },
  ice:       { glossTop: 'rgba(245,253,255,0.70)', rimLight: 'rgba(232,246,255,0.95)', rimDark: 'rgba(28,74,114,0.45)',castShadow: 'rgba(28,74,114,0.55)' },
  gem:       { glossTop: 'rgba(255,225,234,0.60)', rimLight: 'rgba(255,210,228,0.85)', rimDark: 'rgba(138,21,69,0.55)',castShadow: 'rgba(138,21,69,0.55)' },
  frozen:    { glossTop: 'rgba(245,253,255,0.70)', rimLight: 'rgba(232,246,255,0.95)', rimDark: 'rgba(28,74,114,0.45)',castShadow: 'rgba(28,74,114,0.55)' },
  magnet:    { glossTop: 'rgba(244,220,252,0.60)', rimLight: 'rgba(232,200,250,0.85)', rimDark: 'rgba(40,8,78,0.55)',  castShadow: 'rgba(40,8,78,0.55)'   },
  diamond:   { glossTop: 'rgba(244,253,255,0.70)', rimLight: 'rgba(228,247,250,0.95)', rimDark: 'rgba(8,54,66,0.45)',  castShadow: 'rgba(8,54,66,0.55)'   },
  countdown: { glossTop: 'rgba(255,242,180,0.65)', rimLight: 'rgba(255,240,168,0.95)', rimDark: 'rgba(76,22,0,0.50)',  castShadow: 'rgba(76,22,0,0.55)'   },
  shuffle:   { glossTop: 'rgba(252,224,248,0.60)', rimLight: 'rgba(248,212,240,0.85)', rimDark: 'rgba(54,8,86,0.55)',  castShadow: 'rgba(54,8,86,0.55)'   },
  magma:     { glossTop: 'rgba(255,210,210,0.55)', rimLight: 'rgba(255,200,210,0.85)', rimDark: 'rgba(60,8,24,0.55)',  castShadow: 'rgba(60,8,24,0.55)'   },
  portal:    { glossTop: 'rgba(248,232,252,0.55)', rimLight: 'rgba(244,220,252,0.85)', rimDark: 'rgba(26,5,64,0.55)',  castShadow: 'rgba(26,5,64,0.55)'   },
  catalyst:  { glossTop: 'rgba(232,250,238,0.60)', rimLight: 'rgba(212,244,224,0.85)', rimDark: 'rgba(8,56,38,0.45)',  castShadow: 'rgba(8,56,38,0.55)'   },
  crystal:   { glossTop: 'rgba(244,220,252,0.60)', rimLight: 'rgba(232,200,250,0.85)', rimDark: 'rgba(40,8,78,0.55)',  castShadow: 'rgba(40,8,78,0.55)'   },
  fuse:      { glossTop: 'rgba(255,242,180,0.65)', rimLight: 'rgba(255,240,168,0.95)', rimDark: 'rgba(76,22,0,0.50)',  castShadow: 'rgba(76,22,0,0.55)'   },
  locked:    { glossTop: 'rgba(232,228,212,0.45)', rimLight: 'rgba(216,208,194,0.80)', rimDark: 'rgba(86,78,66,0.55)', castShadow: 'rgba(86,78,66,0.55)'  },
  key:       { glossTop: 'rgba(255,250,210,0.65)', rimLight: 'rgba(255,246,192,0.95)', rimDark: 'rgba(94,50,0,0.45)',  castShadow: 'rgba(94,50,0,0.55)'   },
  anchor:    { glossTop: 'rgba(232,250,238,0.60)', rimLight: 'rgba(212,244,224,0.85)', rimDark: 'rgba(8,56,38,0.45)',  castShadow: 'rgba(8,56,38,0.55)'   },
};
```

- [ ] **Step 4: Run test, verify it passes**

```bash
cd fe-next && npm run test -- blastTileVisuals.test.ts
```

Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/blast/blastTileVisuals.ts fe-next/components/blast/__tests__/blastTileVisuals.test.ts
git commit -m "feat(blast): per-type tile accent colour quads"
```

---

### Task 2: Create `BlastTile.module.scss` candy presentation layers

**Files:**
- Create: `fe-next/components/blast/BlastTile.module.scss`

This file owns the 5-layer presentation: cast-shadow + base (already on the button) + gloss + rim + embossed-letter. Uses CSS custom properties so colour values come from inline style supplied by `BlastTile.tsx`.

- [ ] **Step 1: Create the SCSS module**

Write `fe-next/components/blast/BlastTile.module.scss`:

```scss
/* BlastTile — candy-crush presentation layers.
 * The button itself stays the "base" layer (gradient comes from TILE_VISUALS.style).
 * Layers below stack on top via absolute positioning + pointer-events: none.
 */

.candyShell {
  /* Drop shadow under the tile, suggests floating mass. */
  position: absolute;
  inset: 2px -2px -3px 2px;
  border-radius: inherit;
  background: var(--bt-cast, rgba(0, 0, 0, 0.35));
  filter: blur(2px);
  opacity: 0.55;
  z-index: 0;
  transition: transform 120ms ease-out, opacity 120ms ease-out;
  pointer-events: none;
}

/* When the parent button is pressed (by the surrounding active class on the button),
 * lift the cast shadow toward the tile (less depth = "pressed in" read). */
.candyShellPressed {
  transform: translateY(-2px) scale(0.92);
  opacity: 0.25;
}

.gloss {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    ellipse at 50% 0%,
    var(--bt-gloss, rgba(255, 255, 255, 0.55)) 0%,
    transparent 65%
  );
  pointer-events: none;
  z-index: 2;
  mix-blend-mode: screen;
}

.rim {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 3;
  /* 1px inset stroke gradient: top-left bright, bottom-right dim */
  box-shadow:
    inset 1px 1px 0 var(--bt-rim-light, rgba(255, 255, 255, 0.85)),
    inset -1px -1px 0 var(--bt-rim-dark, rgba(0, 0, 0, 0.20));
}

.letter {
  position: relative;
  z-index: 4;
  text-shadow:
    1px 1px 0 rgba(0, 0, 0, 0.25),
    0 1px 2px rgba(0, 0, 0, 0.40),
    0 -1px 0 rgba(255, 255, 255, 0.40);
}

.letterLight {
  /* Used when text colour is light; stronger dark drop, softer top highlight */
  text-shadow:
    1px 1px 0 rgba(0, 0, 0, 0.55),
    0 2px 3px rgba(0, 0, 0, 0.55),
    0 -1px 0 rgba(255, 255, 255, 0.20);
}

/* Container queries to scale layer geometry with tile size */
.candyContainer {
  container-type: inline-size;
}

/* Reduced-motion: kill every transition the layers introduce. */
@media (prefers-reduced-motion: reduce) {
  .candyShell,
  .candyShellPressed {
    transition: none;
  }
}

/* Anti-banding noise overlay for low-end Android — applied as ::before on .gloss */
.gloss::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' /></filter><rect width='40' height='40' filter='url(%23n)' opacity='0.04'/></svg>");
  background-size: 40px 40px;
  mix-blend-mode: overlay;
  pointer-events: none;
}
```

- [ ] **Step 2: Verify TypeScript can resolve SCSS module imports**

The repo already imports SCSS modules elsewhere (search confirms). Run:

```bash
cd fe-next && npm run build 2>&1 | head -40
```

Expected: build proceeds past the new file without error. (We won't yet import the module — this confirms the file is parseable. If you see a CSS-loader error, see `next.config.mjs` for module rules.)

- [ ] **Step 3: Commit**

```bash
git add fe-next/components/blast/BlastTile.module.scss
git commit -m "feat(blast): candy-shell SCSS layers (cast/gloss/rim/letter)"
```

---

### Task 3: Wire candy layers into `BlastTile.tsx` behind a flag

**Files:**
- Modify: `fe-next/components/blast/BlastTile.tsx`
- Test: `fe-next/components/blast/__tests__/BlastTile.candyVisual.test.tsx` (new)

We add 3 sibling spans inside the existing `<button>` (cast-shadow on top of the existing flow but below text via z-index, gloss above, rim above gloss). The button keeps its existing background gradient, badges, indicators.

- [ ] **Step 1: Write failing test**

Create `fe-next/components/blast/__tests__/BlastTile.candyVisual.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BlastTile } from '../BlastTile';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => false,
}));
vi.mock('@/lib/experiments', async (orig) => {
  const real = await orig<any>();
  return { ...real, useExperiment: () => ({ variant: 'candy' }) };
});

describe('BlastTile candy presentation', () => {
  it('renders cast/gloss/rim layers when candy variant active', () => {
    const { container } = render(
      <BlastTile letter="A" type="standard" phase="idle" isSelected={false} isCleared={false} />
    );
    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button!.querySelector('[data-bt-layer="cast"]')).not.toBeNull();
    expect(button!.querySelector('[data-bt-layer="gloss"]')).not.toBeNull();
    expect(button!.querySelector('[data-bt-layer="rim"]')).not.toBeNull();
  });

  it('sets per-type CSS variables on the button', () => {
    const { container } = render(
      <BlastTile letter="B" type="bomb" phase="idle" isSelected={false} isCleared={false} />
    );
    const button = container.querySelector('button')!;
    const style = button.getAttribute('style') ?? '';
    expect(style).toContain('--bt-gloss');
    expect(style).toContain('--bt-rim-light');
    expect(style).toContain('--bt-cast');
  });

  it('omits candy layers when variant inactive', async () => {
    vi.doMock('@/lib/experiments', async (orig) => {
      const real = await orig<any>();
      return { ...real, useExperiment: () => ({ variant: 'control' }) };
    });
    vi.resetModules();
    const { BlastTile: Tile } = await import('../BlastTile');
    const { container } = render(
      <Tile letter="A" type="standard" phase="idle" isSelected={false} isCleared={false} />
    );
    const button = container.querySelector('button')!;
    expect(button.querySelector('[data-bt-layer="gloss"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, verify failure**

```bash
cd fe-next && npm run test -- BlastTile.candyVisual.test.tsx
```

Expected: layer queries return null.

- [ ] **Step 3: Modify `BlastTile.tsx` to add layers**

Add imports near the top of `fe-next/components/blast/BlastTile.tsx`:

```tsx
import styles from './BlastTile.module.scss';
import { TILE_ACCENTS } from './blastTileVisuals';
import { useExperiment } from '@/lib/experiments';
```

Inside the `BlastTile` component, after `const visual = TILE_VISUALS[type] ?? TILE_VISUALS.standard;` add:

```tsx
const { variant: candyVariant } = useExperiment('blast.candy-shell.enabled');
const candyOn = candyVariant === 'candy';
const accent = TILE_ACCENTS[type] ?? TILE_ACCENTS.standard;
```

In the existing `style={{ ... }}` prop on `<button>`, merge accent CSS variables when `candyOn`:

```tsx
style={{
  ...(visual.style ?? {}),
  ...phaseStyle,
  ...selectionStyle,
  ...(willChangeValue && { willChange: willChangeValue }),
  containerType: 'inline-size',
  ...(candyOn && {
    '--bt-gloss': accent.glossTop,
    '--bt-rim-light': accent.rimLight,
    '--bt-rim-dark': accent.rimDark,
    '--bt-cast': accent.castShadow,
  } as React.CSSProperties),
}}
```

In the JSX, immediately inside the `<button>` (before the existing `<span className="relative z-10" ...>` letter span), insert:

```tsx
{candyOn && (
  <>
    <span data-bt-layer="cast" aria-hidden="true" className={styles.candyShell} />
    <span data-bt-layer="gloss" aria-hidden="true" className={styles.gloss} />
    <span data-bt-layer="rim" aria-hidden="true" className={styles.rim} />
  </>
)}
```

Update the letter span class to apply embossed text-shadow only under candy:

```tsx
<span
  className={`relative z-10 ${candyOn ? (visual.text === 'text-white' ? styles.letterLight : styles.letter) : ''}`}
  style={candyOn ? undefined : (visual.text === 'text-white' ? TILE_TEXT_SHADOW_LIGHT_STYLE : TILE_TEXT_SHADOW_STYLE)}
>
  {letter}
</span>
```

- [ ] **Step 4: Run test, verify pass**

```bash
cd fe-next && npm run test -- BlastTile.candyVisual.test.tsx
```

Expected: 3 passing.

- [ ] **Step 5: Run full BlastTile test suite — fix snapshot drift**

```bash
cd fe-next && npm run test -- BlastTile
```

If existing snapshot tests in `BlastTile.test.tsx` fail because the layer spans are now present (when flag returns 'candy' default in mocks), update the mock at the top of the failing file to force `useExperiment` → `{ variant: 'control' }`. Apply this mock pattern only to legacy snapshots — the new `candyVisual.test.tsx` keeps the candy mock.

- [ ] **Step 6: Commit**

```bash
git add fe-next/components/blast/BlastTile.tsx fe-next/components/blast/__tests__/BlastTile.candyVisual.test.tsx fe-next/components/blast/__tests__/BlastTile.test.tsx
git commit -m "feat(blast): candy-shell layers gated by feature flag"
```

---

### Task 4: Add `playPhaseTransition` to `useBlastGsapTimelines`

**Files:**
- Modify: `fe-next/components/blast/hooks/useBlastGsapTimelines.ts`
- Modify: `fe-next/components/blast/hooks/__tests__/useBlastGsapTimelines.test.ts`

Replace ad-hoc inline `transition: all` with a GSAP-driven runner. Lifecycle (kill on phase change) integrates with the existing `trackTl` infrastructure.

- [ ] **Step 1: Write failing test**

Append to `fe-next/components/blast/hooks/__tests__/useBlastGsapTimelines.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react';
import { useBlastGsapTimelines } from '../useBlastGsapTimelines';
import { describe, it, expect, vi } from 'vitest';

describe('playPhaseTransition', () => {
  function setup() {
    const params = {
      camera: { destroyed: false, filters: null } as any,
      shake: { shake: vi.fn() },
      timeDilation: { freeze: vi.fn() },
      particles: { burst: vi.fn() },
      width: 360, height: 360,
      fireShockwave: vi.fn(),
      spawnStarBurst: vi.fn(),
      confettiPreset: {} as any,
    };
    return renderHook(() => useBlastGsapTimelines(params));
  }

  it('builds elastic squash timeline for selected phase', () => {
    const { result } = setup();
    const el = document.createElement('div');
    act(() => {
      result.current.playPhaseTransition(el, 'selected');
    });
    expect(el.style.transform).not.toBe('');
  });

  it('reduced motion path sets static state without animation', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    } as any);
    const { result } = setup();
    const el = document.createElement('div');
    act(() => {
      result.current.playPhaseTransition(el, 'clearing');
    });
    expect(el.style.opacity).toBe('0');
  });
});
```

- [ ] **Step 2: Run test, verify failure**

```bash
cd fe-next && npm run test -- useBlastGsapTimelines.test
```

Expected: `playPhaseTransition is not a function`.

- [ ] **Step 3: Add `playPhaseTransition` to the hook**

Inside `useBlastGsapTimelines`, before `return { ... }`, add:

```tsx
const playPhaseTransition = useCallback(
  (el: HTMLElement, phase: 'selected' | 'anticipation' | 'clearing' | 'falling' | 'appearing' | 'landing', opts?: { fallOffset?: number; spawnOffset?: number; clearRotate?: number }) => {
    if (isReducedMotionPreferred()) {
      // Static end-state — no tween, no overshoot
      switch (phase) {
        case 'clearing':
          el.style.opacity = '0';
          el.style.transform = 'scale(0.9)';
          return;
        case 'appearing':
          el.style.opacity = '1';
          el.style.transform = 'translateY(0) scale(1)';
          return;
        case 'falling':
          el.style.transform = 'translateY(0)';
          return;
        default:
          return;
      }
    }
    const tl = gsap.timeline();
    switch (phase) {
      case 'selected':
        tl.to(el, { scale: 1.06, duration: 0.18, ease: 'back.out(2)' });
        break;
      case 'anticipation':
        tl.to(el, { scaleX: 1.18, scaleY: 0.82, duration: 0.08, ease: 'power2.out' })
          .to(el, { scaleX: 1, scaleY: 1, duration: 0.10, ease: 'elastic.out(1, 0.4)' });
        break;
      case 'clearing':
        tl.to(el, { scaleX: 0.92, scaleY: 1.08, duration: 0.04 })
          .to(el, { scale: 1.4, duration: 0.10, ease: 'back.out(3.5)' })
          .to(el, { rotate: opts?.clearRotate ?? 0, opacity: 0, duration: 0.18 }, '<');
        break;
      case 'falling': {
        const offset = opts?.fallOffset ?? 0;
        gsap.fromTo(el, { y: -offset }, { y: 0, duration: 0.55, ease: 'bounce.out' });
        // landed callback path returns whatever GSAP creates; use trackTl in caller if needed
        return;
      }
      case 'appearing': {
        const off = opts?.spawnOffset ?? 60;
        tl.fromTo(el, { y: -off, scale: 0.6, opacity: 0 },
          { y: 0, scale: 1, opacity: 1, duration: 0.32, ease: 'back.out(1.7)' });
        break;
      }
      case 'landing':
        tl.to(el, { scaleY: 0.88, duration: 0.06 })
          .to(el, { scaleY: 1, duration: 0.08, ease: 'elastic.out(1.5, 0.5)' });
        break;
    }
    trackTl(tl);
  },
  [trackTl],
);
```

Update the return object to expose it:

```tsx
return { runCascadePunch, runLongWordPunch, runWaveClearShower, trackTimeline, playPhaseTransition };
```

- [ ] **Step 4: Run test, verify pass**

```bash
cd fe-next && npm run test -- useBlastGsapTimelines.test
```

Expected: 2 new tests pass; existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/blast/hooks/useBlastGsapTimelines.ts fe-next/components/blast/hooks/__tests__/useBlastGsapTimelines.test.ts
git commit -m "feat(blast): playPhaseTransition GSAP runner"
```

---

### Task 5: Replace inline phase transitions in `BlastTile.tsx` with GSAP

**Files:**
- Modify: `fe-next/components/blast/BlastTile.tsx`

Today `getPhaseStyles` returns inline transitions. Behind `candyOn`, route to `playPhaseTransition` instead.

- [ ] **Step 1: Add ref + effect**

In `BlastTile.tsx`, add a ref and pull the hook from a context that exposes the `useBlastGsapTimelines` return object. The board-level provider already mounts the hook. Confirm by searching: `grep -n "useBlastGsapTimelines" components/blast/`. The hook return is currently destructured at the consumer site; we extend the existing context (or prop-drill via `BlastBoard` → `BlastTile`).

For minimal surface, prop-drill via a new optional prop:

```tsx
export interface BlastTileProps {
  // ...existing props...
  /** Bound from useBlastGsapTimelines.playPhaseTransition. Optional — falls back to inline CSS. */
  playPhaseTransition?: (el: HTMLElement, phase: TilePhase, opts?: { fallOffset?: number; spawnOffset?: number; clearRotate?: number }) => void;
}
```

Add a buttonRef:

```tsx
const buttonRef = useRef<HTMLButtonElement>(null);
```

After existing `effectivePhase` calculation, add:

```tsx
useEffect(() => {
  if (!candyOn || !playPhaseTransition || !buttonRef.current) return;
  if (effectivePhase === 'idle') return;
  if (!ANIMATED_PHASES.has(effectivePhase) && effectivePhase !== 'selected') return;
  playPhaseTransition(buttonRef.current, effectivePhase, { fallOffset, spawnOffset, clearRotate });
}, [effectivePhase, candyOn, playPhaseTransition, fallOffset, spawnOffset, clearRotate]);
```

Add `ref={buttonRef}` to the `<button>` element. When `candyOn`, drop the inline `phaseStyle` + `selectionStyle` to avoid duplication:

```tsx
style={{
  ...(visual.style ?? {}),
  ...(!candyOn && phaseStyle),
  ...(!candyOn && selectionStyle),
  ...(willChangeValue && { willChange: willChangeValue }),
  containerType: 'inline-size',
  ...(candyOn && {
    '--bt-gloss': accent.glossTop,
    '--bt-rim-light': accent.rimLight,
    '--bt-rim-dark': accent.rimDark,
    '--bt-cast': accent.castShadow,
  } as React.CSSProperties),
}}
```

- [ ] **Step 2: Wire prop from BlastBoard**

In `fe-next/components/blast/BlastBoard.tsx`, accept the playPhaseTransition prop from its consumer (likely `BlastGame.tsx`) and pass through to each `<BlastTile>`. Search the file to find where `<BlastTile ... />` is rendered, then add the prop. Single line edit in JSX:

```tsx
<BlastTile
  // ...existing props...
  playPhaseTransition={playPhaseTransition}
/>
```

Add the matching `playPhaseTransition?` to BlastBoardProps and forward through.

- [ ] **Step 3: Wire from `BlastGame.tsx`**

In `fe-next/components/blast/BlastGame.tsx`, the `useBlastGsapTimelines` hook's return is already consumed (search to confirm). Destructure `playPhaseTransition` from it and pass to `<BlastBoard playPhaseTransition={playPhaseTransition} ... />`. If the hook isn't already mounted at this level, you'll find it lower; do not duplicate — find the existing call site and surface the new fn upward via the same context/return.

- [ ] **Step 4: Run tile + view tests**

```bash
cd fe-next && npm run test -- BlastTile BlastBoard BlastView
```

Expected: all green. Snapshot updates may be needed — accept if the only diff is the new `data-bt-layer` spans.

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/blast/BlastTile.tsx fe-next/components/blast/BlastBoard.tsx fe-next/components/blast/BlastGame.tsx
git commit -m "feat(blast): route tile phase transitions through GSAP runner"
```

---

### Task 6: Adjacent neighbour-lean on tile-clear

**Files:**
- Modify: `fe-next/components/blast/BlastBoard.tsx`
- Test: `fe-next/components/blast/__tests__/BlastBoard.neighbourLean.test.tsx` (new)

When a tile enters `clearing`, its 4 cardinal neighbours receive a brief lean tween toward the clearing tile.

- [ ] **Step 1: Write failing test**

Create `fe-next/components/blast/__tests__/BlastBoard.neighbourLean.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BlastBoard } from '../BlastBoard';

vi.mock('@/lib/experiments', () => ({ useExperiment: () => ({ variant: 'candy' }) }));

describe('BlastBoard neighbour-lean', () => {
  it('invokes lean callback with cardinal neighbours of clearing tile', () => {
    const onNeighbourLean = vi.fn();
    // Minimal grid with one tile entering clearing at (1,1)
    // ... mount BlastBoard with the appropriate fixture, then assert
    // onNeighbourLean called for (0,1), (1,0), (1,2), (2,1).
    // Boundary: corner tiles get only 2-3 calls.
    expect(onNeighbourLean).toHaveBeenCalledTimes(4);
  });
});
```

(Engineer: fill in the mount call by reading current `BlastBoard.test.tsx` for the prop shape — copy the fixture pattern there.)

- [ ] **Step 2: Run test, verify failure**

```bash
cd fe-next && npm run test -- BlastBoard.neighbourLean
```

Expected: callback never invoked.

- [ ] **Step 3: Implement neighbour detection in `BlastBoard.tsx`**

Add an effect that watches the grid's per-cell phase. When a cell transitions into `clearing`, find the 4 cardinal neighbours (skip out-of-bounds, skip empty cells) and invoke `onNeighbourLean(neighbourEl)`.

In `BlastBoard.tsx` (location dependent on existing structure — search for the `cells.map` or equivalent):

```tsx
const tileRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
const prevPhases = useRef<Map<string, TilePhase>>(new Map());

// On every render, compare new phases vs prev; queue neighbour lean for new clearings
useEffect(() => {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const key = `${r},${c}`;
      const newPhase = grid[r][c].phase;
      const oldPhase = prevPhases.current.get(key);
      if (newPhase === 'clearing' && oldPhase !== 'clearing') {
        leanNeighbours(r, c);
      }
      prevPhases.current.set(key, newPhase);
    }
  }
}, [grid]);

function leanNeighbours(r: number, c: number) {
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= grid.length || nc < 0 || nc >= grid[0].length) continue;
    if (!grid[nr][nc] || grid[nr][nc].phase === 'clearing') continue;
    const el = tileRefs.current.get(`${nr},${nc}`);
    if (!el) continue;
    gsap.timeline()
      .to(el, { x: dc * 2, y: dr * 2, rotate: dc * -2 + dr * 2, duration: 0.08, ease: 'power2.out' })
      .to(el, { x: 0, y: 0, rotate: 0, duration: 0.12, ease: 'elastic.out(1, 0.5)' });
  }
}
```

Each `<BlastTile>` gets a `ref={(el) => { if (el) tileRefs.current.set(key, el); else tileRefs.current.delete(key); }}` wrapper — extend `BlastTileProps` to forward `innerRef` (or expose the existing ref).

- [ ] **Step 4: Run test**

```bash
cd fe-next && npm run test -- BlastBoard
```

Expected: lean test passes; existing tests still green.

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/blast/BlastBoard.tsx fe-next/components/blast/__tests__/BlastBoard.neighbourLean.test.tsx
git commit -m "feat(blast): adjacent neighbour-lean on tile-clear"
```

---

### Task 7: Update existing BlastTile snapshot/visual tests

**Files:**
- Modify: `fe-next/components/blast/__tests__/BlastTile.test.tsx`
- Modify: `fe-next/components/blast/__tests__/BlastMobileResponsive.test.tsx`

Verify all `BlastTile` tests pass under both flag variants. Add explicit "candy" + "control" branches.

- [ ] **Step 1: Audit existing test**

```bash
cd fe-next && grep -n "useExperiment\|candy-shell" components/blast/__tests__/BlastTile.test.tsx
```

If unmocked, add mock at top:

```ts
vi.mock('@/lib/experiments', () => ({ useExperiment: () => ({ variant: 'control' }) }));
```

Existing assertions stay valid against control variant.

- [ ] **Step 2: Add a candy-variant integration block**

Append to `BlastTile.test.tsx`:

```tsx
describe('candy variant', () => {
  beforeEach(() => {
    vi.doMock('@/lib/experiments', () => ({ useExperiment: () => ({ variant: 'candy' }) }));
    vi.resetModules();
  });
  afterEach(() => { vi.doUnmock('@/lib/experiments'); });

  it('renders all 3 layer spans for any tile type', async () => {
    const { BlastTile: T } = await import('../BlastTile');
    const types = ['standard','bomb','lightning','prism','rainbow','ice','gem','frozen','magnet','diamond','countdown','shuffle','magma','portal','catalyst','crystal','fuse','locked','key','anchor','gold'] as const;
    for (const type of types) {
      const { container } = render(<T letter="X" type={type} phase="idle" isSelected={false} isCleared={false} />);
      expect(container.querySelectorAll('[data-bt-layer]').length).toBe(3);
    }
  });
});
```

- [ ] **Step 3: Run mobile-responsive snapshot test, accept new candy snapshots if visually correct**

```bash
cd fe-next && npm run test -- BlastMobileResponsive
```

Inspect `__snapshots__` diff; if only difference is layer spans + CSS-var styles, accept (`-u`).

- [ ] **Step 4: Commit**

```bash
git add fe-next/components/blast/__tests__/BlastTile.test.tsx fe-next/components/blast/__tests__/BlastMobileResponsive.test.tsx fe-next/components/blast/__tests__/__snapshots__/
git commit -m "test(blast): cover candy variant across all tile types"
```

---

## Sub-scope B — Modal shell (Tasks 8-13)

### Task 8: Create `BlastModalShell.tsx` shared structure

**Files:**
- Create: `fe-next/components/blast/BlastModalShell.tsx`

Shell renders the backdrop, frame, icon orb, and slot the consumer fills with title/body/CTA/decline. Owns the GSAP entrance/exit timeline.

- [ ] **Step 1: Write the file**

Create `fe-next/components/blast/BlastModalShell.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { createPortal } from 'react-dom';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import shellStyles from './BlastModalShell.module.scss';

export type ModalAccent = 'lime' | 'cyan';

const ACCENTS: Record<ModalAccent, { base: string; light: string; glow: string; particle: number }> = {
  lime: { base: '#bfff00', light: '#dfff80', glow: 'rgba(191,255,0,0.55)', particle: 0xbfff00 },
  cyan: { base: '#00ffff', light: '#a8feff', glow: 'rgba(0,255,255,0.55)', particle: 0x00ffff },
};

export interface BlastModalShellProps {
  isOpen: boolean;
  accent: ModalAccent;
  /** lucide icon component to render inside the orb. */
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: React.ReactNode;
  body: React.ReactNode;
  cta: React.ReactNode;
  decline?: React.ReactNode;
  /** Bottom-right sticker (e.g., mascot). Optional. */
  sticker?: React.ReactNode;
  /** Called once exit timeline finishes. */
  onExitComplete?: () => void;
  /** Test/storybook escape hatch — disables portal so JSDOM can find nodes. */
  disablePortal?: boolean;
  /** Triggered to fire pixi popup-burst at orb-centre. */
  fireBurst?: (x: number, y: number, colour: number) => void;
  testId?: string;
}

export function BlastModalShell({
  isOpen, accent, Icon, title, body, cta, decline, sticker, onExitComplete, disablePortal, fireBurst, testId,
}: BlastModalShellProps) {
  const reducedMotion = usePrefersReducedMotion();
  const backdropRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const declineRef = useRef<HTMLDivElement>(null);
  const exitTlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (reducedMotion) {
      gsap.set([backdropRef.current, frameRef.current, orbRef.current, titleRef.current, bodyRef.current, ctaRef.current, declineRef.current].filter(Boolean), { opacity: 1, scale: 1, y: 0 });
      return;
    }
    const a = ACCENTS[accent];
    const tl = gsap.timeline();
    tl.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.18 }, 0);
    tl.fromTo(frameRef.current, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.32, ease: 'back.out(1.6)' }, 0.05);
    tl.fromTo(orbRef.current, { scale: 0 }, { scale: 1, duration: 0.38, ease: 'elastic.out(1, 0.5)', onStart: () => {
      if (!fireBurst || !orbRef.current) return;
      const rect = orbRef.current.getBoundingClientRect();
      fireBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, a.particle);
    } }, 0.20);
    tl.fromTo(titleRef.current, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.22, ease: 'power2.out' }, 0.30);
    tl.fromTo(bodyRef.current, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.20 }, 0.40);
    tl.fromTo(ctaRef.current, { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.24, ease: 'back.out(2)' }, 0.50);
    if (declineRef.current) {
      tl.fromTo(declineRef.current, { opacity: 0 }, { opacity: 1, duration: 0.18 }, 0.55);
    }
    return () => { tl.kill(); };
  }, [isOpen, accent, reducedMotion, fireBurst]);

  useEffect(() => {
    if (isOpen) return;
    // Begin exit
    if (reducedMotion) { onExitComplete?.(); return; }
    const tl = gsap.timeline({ onComplete: () => onExitComplete?.() });
    tl.to([titleRef.current, bodyRef.current, declineRef.current].filter(Boolean), { opacity: 0, duration: 0.10 }, 0);
    tl.to(ctaRef.current, { scale: 0.85, opacity: 0, duration: 0.14 }, 0);
    tl.to(orbRef.current, { scale: 0, duration: 0.18, ease: 'back.in(2)' }, 0.05);
    tl.to(frameRef.current, { scale: 0.7, opacity: 0, duration: 0.20 }, 0.10);
    tl.to(backdropRef.current, { opacity: 0, duration: 0.18 }, 0.12);
    exitTlRef.current = tl;
    return () => { tl.kill(); exitTlRef.current = null; };
  }, [isOpen, reducedMotion, onExitComplete]);

  if (!isOpen && !exitTlRef.current) return null;

  const accentVars = {
    '--accent-base': ACCENTS[accent].base,
    '--accent-light': ACCENTS[accent].light,
    '--accent-glow': ACCENTS[accent].glow,
  } as React.CSSProperties;

  const node = (
    <div
      ref={backdropRef}
      data-testid={testId}
      className={shellStyles.backdrop}
      style={accentVars}
    >
      <div ref={frameRef} className={shellStyles.frame}>
        <div ref={orbRef} className={shellStyles.orb}>
          <span aria-hidden="true" className={shellStyles.orbRing} />
          <Icon className={shellStyles.orbIcon} strokeWidth={3.5} />
        </div>
        <div ref={titleRef} className={shellStyles.title}>{title}</div>
        <div ref={bodyRef} className={shellStyles.body}>{body}</div>
        <div ref={ctaRef} className={shellStyles.cta}>{cta}</div>
        {decline && <div ref={declineRef} className={shellStyles.decline}>{decline}</div>}
        {sticker && <div className={shellStyles.sticker}>{sticker}</div>}
      </div>
    </div>
  );

  if (disablePortal || typeof document === 'undefined') return node;
  return createPortal(node, document.body);
}

export default BlastModalShell;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd fe-next && npx tsc --noEmit -p tsconfig.json 2>&1 | grep BlastModalShell || true
```

Expected: no BlastModalShell errors. (Project tsc may report unrelated noise — focus on BlastModalShell.)

- [ ] **Step 3: Commit**

```bash
git add fe-next/components/blast/BlastModalShell.tsx
git commit -m "feat(blast): BlastModalShell shared modal scaffold"
```

---

### Task 9: Create `BlastModalShell.module.scss` styling

**Files:**
- Create: `fe-next/components/blast/BlastModalShell.module.scss`

- [ ] **Step 1: Write the file**

```scss
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: radial-gradient(circle at 50% 50%, rgba(26,26,46,0.65) 0%, rgba(0,0,0,0.85) 100%);
  backdrop-filter: blur(6px) saturate(1.1);
  -webkit-backdrop-filter: blur(6px) saturate(1.1);
}

@supports not (backdrop-filter: blur(6px)) {
  .backdrop { background: rgba(0,0,0,0.92); }
}

.frame {
  position: relative;
  width: 100%;
  max-width: 22rem;
  border-radius: 16px;
  border: 3px solid #000;
  background: linear-gradient(180deg, #1f2342 0%, #16213e 100%);
  box-shadow: 6px 6px 0 #000, inset 0 -16px 24px rgba(0,0,0,0.35);
  padding: 1.75rem 1.5rem 1.25rem;
  text-align: center;
  overflow: hidden;
}

.frame::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255,255,255,0.18), transparent 25%);
  pointer-events: none;
}

.orb {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  margin: 0 auto 0.875rem;
  background: radial-gradient(circle, var(--accent-light), var(--accent-base));
  border: 3px solid #000;
  box-shadow: 0 0 0 0 var(--accent-glow);
  animation: orbPulse 1.4s ease-in-out infinite;
  display: grid;
  place-items: center;
}

.orbRing {
  position: absolute;
  inset: -10px;
  border: 2px dashed rgba(255,255,255,0.5);
  border-radius: 50%;
  animation: ringSpin 4s linear infinite;
  pointer-events: none;
}

.orbIcon {
  position: relative;
  width: 40px;
  height: 40px;
  color: #1a1a2e;
  z-index: 2;
}

.title {
  font-family: var(--font-neo-display, sans-serif);
  font-size: 1.5rem;
  font-weight: 900;
  color: #fffef0;
  margin-bottom: 0.5rem;
}

.body {
  font-family: var(--font-neo-body, sans-serif);
  font-size: 0.875rem;
  color: rgba(255,254,240,0.80);
  margin-bottom: 1rem;
}

.cta {
  display: flex;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.cta :global(button) {
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, var(--accent-light), var(--accent-base));
  border: 3px solid #000;
  border-radius: 12px;
  box-shadow: 2px 2px 0 #000, inset 0 1px 0 rgba(255,255,255,0.4);
  padding: 0.75rem 1.5rem;
  font-family: var(--font-neo-display, sans-serif);
  font-weight: 900;
  font-size: 1.1rem;
  color: #1a1a2e;
  transition: transform 80ms;
}

.cta :global(button)::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent);
  animation: swipeShine 1.4s ease-out 0.7s 1 forwards;
  pointer-events: none;
}

.cta :global(button:active) {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 #000, inset 0 1px 0 rgba(255,255,255,0.4);
}

.decline {
  display: flex;
  justify-content: center;
}

.decline :global(button) {
  background: transparent;
  border: none;
  color: rgba(255,254,240,0.55);
  font-size: 0.85rem;
  font-family: var(--font-neo-body, sans-serif);
  padding: 0.25rem 0.5rem;
}

.decline :global(button:hover) {
  color: rgba(255,254,240,0.9);
}

.sticker {
  position: absolute;
  bottom: -8px;
  right: -4px;
  width: 56px;
  height: 56px;
  pointer-events: none;
}

@keyframes orbPulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--accent-glow); }
  50%      { box-shadow: 0 0 24px 8px transparent; }
}

@keyframes ringSpin { to { transform: rotate(360deg); } }

@keyframes swipeShine { to { left: 200%; } }

@media (prefers-reduced-motion: reduce) {
  .orb, .orbRing, .cta :global(button)::after {
    animation: none;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add fe-next/components/blast/BlastModalShell.module.scss
git commit -m "style(blast): BlastModalShell SCSS — backdrop blur, orb pulse, swipe-shine"
```

---

### Task 10: Add `firePopupBurst` to effects canvas + bridge

**Files:**
- Modify: `fe-next/components/blast/BlastEffectsCanvas.tsx`
- Modify: `fe-next/components/blast/BlastFxBridge.tsx`
- Test: `fe-next/components/blast/__tests__/BlastFxBridge.test.tsx` (extend)

Use the existing particle system to emit a 6-particle radial burst at the orb-centre when the modal mounts.

- [ ] **Step 1: Locate existing particle burst API in `BlastEffectsCanvas.tsx`**

```bash
cd fe-next && grep -n "burst\|spawnStarBurst\|fireShockwave" components/blast/BlastEffectsCanvas.tsx | head
```

Existing refs include `spawnStarBurst(cx, cy, color, points)`. Reuse for popup-burst — just wrap with a fixed config.

- [ ] **Step 2: Extend the imperative handle**

In `BlastEffectsCanvas.tsx` find the `useImperativeHandle(...)` call. Add:

```ts
firePopupBurst: (x: number, y: number, colour: number) => {
  // 6 quick stars with slight random radius jitter
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6;
    const r = 28 + Math.random() * 10;
    spawnStarBurstAtScreen(x + Math.cos(angle) * r, y + Math.sin(angle) * r, colour, 4);
  }
},
```

If `spawnStarBurstAtScreen` doesn't exist, replace with whatever the file already exposes (`spawnStarBurst` accepts canvas-local coords; convert via a new helper that subtracts canvas bounding-rect origin). Search the file to confirm the right helper.

- [ ] **Step 3: Update bridge re-export in `BlastFxBridge.tsx`**

Add `firePopupBurst: (x: number, y: number, colour: number) => void` to the bridge ref interface and forward through.

- [ ] **Step 4: Extend bridge test**

In `fe-next/components/blast/__tests__/BlastFxBridge.test.tsx`, add:

```tsx
it('forwards firePopupBurst to inner ref', () => {
  const inner = { firePopupBurst: vi.fn() };
  const bridge = makeBridge(inner); // call site existing test pattern
  bridge.firePopupBurst(120, 240, 0xbfff00);
  expect(inner.firePopupBurst).toHaveBeenCalledWith(120, 240, 0xbfff00);
});
```

- [ ] **Step 5: Run + commit**

```bash
cd fe-next && npm run test -- BlastFxBridge
git add fe-next/components/blast/BlastEffectsCanvas.tsx fe-next/components/blast/BlastFxBridge.tsx fe-next/components/blast/__tests__/BlastFxBridge.test.tsx
git commit -m "feat(blast): firePopupBurst exposed via FxBridge"
```

---

### Task 11: Plumb `playPopupTimeline` through `useBlastGsapTimelines`

**Files:**
- Modify: `fe-next/components/blast/hooks/useBlastGsapTimelines.ts`

Currently the modal shell builds its timeline inline. Centralise so the runner is testable + lifecycle-tracked.

- [ ] **Step 1: Skip — shell timeline is already self-contained**

Decision: the shell's `useEffect` already builds the timeline locally and kills it on unmount. Adding a runner here is redundant. Drop this task.

- [ ] **Step 2: Mark closed in commit log**

```bash
git commit --allow-empty -m "chore(blast): drop playPopupTimeline runner — shell owns its own GSAP lifecycle"
```

---

### Task 12: Refactor `BlastContinueModal` to use `BlastModalShell` + mascot

**Files:**
- Modify: `fe-next/components/blast/BlastContinueModal.tsx`
- Test: `fe-next/components/blast/__tests__/BlastContinueModal.test.tsx` (new)

- [ ] **Step 1: Write failing test**

Create `fe-next/components/blast/__tests__/BlastContinueModal.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { BlastContinueModal } from '../BlastContinueModal';

vi.mock('@/hooks/useRewardedFeatureUnlock', () => ({
  useRewardedFeatureUnlock: ({ onUnlock }: any) => ({
    offer: () => onUnlock(),
    canShowAd: true,
  }),
}));
vi.mock('@/lib/experiments', () => ({ useExperiment: () => ({ variant: 'candy' }) }));

describe('BlastContinueModal candy variant', () => {
  it('renders shell with lime accent', () => {
    const { getByTestId } = render(
      <BlastContinueModal isOpen={true} bonusMoves={5} onContinue={vi.fn()} onDecline={vi.fn()} t={(k: string, v?: any) => `${k}:${JSON.stringify(v ?? {})}`} />
    );
    expect(getByTestId('blast-continue-modal')).toBeTruthy();
  });

  it('CTA path fires onContinue', () => {
    const onContinue = vi.fn();
    const { getByTestId } = render(
      <BlastContinueModal isOpen={true} bonusMoves={5} onContinue={onContinue} onDecline={vi.fn()} t={(k: string) => k} />
    );
    fireEvent.click(getByTestId('blast-continue-cta'));
    expect(onContinue).toHaveBeenCalled();
  });

  it('decline path fires onDecline', () => {
    const onDecline = vi.fn();
    const { getByTestId } = render(
      <BlastContinueModal isOpen={true} bonusMoves={5} onContinue={vi.fn()} onDecline={onDecline} t={(k: string) => k} />
    );
    fireEvent.click(getByTestId('blast-continue-decline'));
    expect(onDecline).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run, verify failure**

```bash
cd fe-next && npm run test -- BlastContinueModal.test.tsx
```

- [ ] **Step 3: Refactor `BlastContinueModal.tsx`**

Replace contents with:

```tsx
'use client';

import { Play, X, Heart } from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useRewardedFeatureUnlock } from '@/hooks/useRewardedFeatureUnlock';
import { useExperiment } from '@/lib/experiments';
import { BlastModalShell } from './BlastModalShell';
import { useBlastFxBridge } from './BlastFxBridge'; // existing hook in bridge module

interface BlastContinueModalProps {
  isOpen: boolean;
  bonusMoves: number;
  onContinue: () => void;
  onDecline: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

export function BlastContinueModal({ isOpen, bonusMoves, onContinue, onDecline, t }: BlastContinueModalProps) {
  const { variant } = useExperiment('blast.candy-shell.enabled');
  const candyOn = variant === 'candy';
  const { offer, canShowAd } = useRewardedFeatureUnlock({
    placement: 'blast_wave_continue',
    surface: 'retry',
    onUnlock: onContinue,
    disabled: !isOpen,
    context: { bonusMoves },
  });
  const fx = useBlastFxBridge?.(); // optional — null in test envs without provider

  if (!isOpen) return null;

  if (!candyOn) {
    // Legacy path — original markup below preserved verbatim.
    return (
      <AdaptiveAnimatePresence>
        <AdaptiveMotion.div data-testid="blast-continue-modal" className="fixed inset-0 z-[90] flex items-center justify-center bg-neo-navy/80 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <AdaptiveMotion.div className="relative w-full max-w-sm rounded-neo border-neo-thick border-black bg-neo-navy-light p-6 shadow-hard-lg" initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 20 }}>
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="rounded-full border-neo border-black bg-neo-pink p-3 shadow-hard"><Heart className="h-8 w-8 text-neo-navy" strokeWidth={3} /></div>
              <h2 className="font-neo-display text-2xl font-black text-neo-cream">{t('blast.continueModal.title')}</h2>
              <p className="font-neo-body text-sm text-neo-cream/80">{t('blast.continueModal.body')}</p>
              <div className="flex w-full flex-col gap-3 pt-2">
                {canShowAd && (<button data-testid="blast-continue-cta" onClick={offer} className="flex items-center justify-center gap-2 rounded-neo border-neo-thick border-black bg-neo-lime px-6 py-3 font-neo-display text-lg font-black text-neo-navy shadow-hard transition-transform active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-pressed"><Play className="h-5 w-5" strokeWidth={3} />{t('blast.continueModal.cta', { moves: bonusMoves })}</button>)}
                <button data-testid="blast-continue-decline" onClick={onDecline} className="flex items-center justify-center gap-2 rounded-neo border-neo border-black bg-neo-navy px-4 py-2 font-neo-body text-sm text-neo-cream/70 hover:text-neo-cream"><X className="h-4 w-4" />{t('blast.continueModal.decline')}</button>
              </div>
            </div>
          </AdaptiveMotion.div>
        </AdaptiveMotion.div>
      </AdaptiveAnimatePresence>
    );
  }

  return (
    <BlastModalShell
      isOpen={isOpen}
      accent="lime"
      Icon={Heart}
      title={t('blast.continueModal.title')}
      body={t('blast.continueModal.body')}
      cta={canShowAd && <button data-testid="blast-continue-cta" onClick={offer}><Play className="h-5 w-5 inline" strokeWidth={3} /> {t('blast.continueModal.cta', { moves: bonusMoves })}</button>}
      decline={<button data-testid="blast-continue-decline" onClick={onDecline}>{t('blast.continueModal.decline')}</button>}
      sticker={null /* TODO at impl: thread mascot.happy GIF when asset exists per memory mascot-asset-paths */}
      fireBurst={fx?.firePopupBurst}
      testId="blast-continue-modal"
    />
  );
}

export default BlastContinueModal;
```

(`useBlastFxBridge` may not be the actual hook name — search `BlastFxBridge.tsx` for the export and update accordingly. If the bridge is consumed via prop instead of hook, accept the bridge as a prop on `BlastContinueModal` and pass through `BlastView`.)

- [ ] **Step 4: Run test**

```bash
cd fe-next && npm run test -- BlastContinueModal
```

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/blast/BlastContinueModal.tsx fe-next/components/blast/__tests__/BlastContinueModal.test.tsx
git commit -m "feat(blast): BlastContinueModal candy variant via shell"
```

---

### Task 13: Refactor `BlastRetryWaveModal` to use shell

**Files:**
- Modify: `fe-next/components/blast/BlastRetryWaveModal.tsx`
- Modify: `fe-next/components/blast/__tests__/BlastView.retryWave.test.tsx`

Same shape as Task 12, with cyan accent + Trophy icon. No mascot.

- [ ] **Step 1: Refactor `BlastRetryWaveModal.tsx`**

Mirror Task 12 structure. Inside the candy branch:

```tsx
return (
  <BlastModalShell
    isOpen={isOpen}
    accent="cyan"
    Icon={Trophy}
    title={t('blast.retryWaveModal.title', { wave: waveNumber })}
    body={t('blast.retryWaveModal.body', { wave: waveNumber, percent: Math.round(clearPct) })}
    cta={canShowAd && <button data-testid="blast-retry-wave-cta" onClick={offer}><Play className="h-5 w-5 inline" strokeWidth={3} /> {t('blast.retryWaveModal.cta', { wave: waveNumber })}</button>}
    decline={<button data-testid="blast-retry-wave-decline" onClick={onDecline}>{t('blast.retryWaveModal.decline')}</button>}
    fireBurst={fx?.firePopupBurst}
    testId="blast-retry-wave-modal"
  />
);
```

Keep the legacy markup behind `!candyOn` for backward compat.

- [ ] **Step 2: Update existing `BlastView.retryWave.test.tsx`**

If the test uses `data-testid="blast-retry-wave-modal"` — still present. If it asserts specific class names from old markup, mock `useExperiment` → `'control'` so legacy renders.

- [ ] **Step 3: Run + commit**

```bash
cd fe-next && npm run test -- BlastRetryWaveModal BlastView.retryWave
git add fe-next/components/blast/BlastRetryWaveModal.tsx fe-next/components/blast/__tests__/BlastView.retryWave.test.tsx
git commit -m "feat(blast): BlastRetryWaveModal candy variant via shell"
```

---

## Sub-scope C — Flag, perf, verification (Tasks 14-16)

### Task 14: Register `blast.candy-shell.enabled` PostHog flag

**Files:**
- Modify: `fe-next/lib/experiments.ts`

The repo already has a typed registry per memory `ab-testing-infra`.

- [ ] **Step 1: Inspect existing registry shape**

```bash
cd fe-next && grep -n "register\|FlagDef\|experiment" lib/experiments.ts | head -20
```

- [ ] **Step 2: Add the flag definition**

Append the new flag entry following the existing pattern (variants `'control' | 'candy'`, default `'control'` in prod, `'candy'` in dev):

```ts
'blast.candy-shell.enabled': {
  key: 'blast.candy-shell.enabled',
  variants: ['control', 'candy'] as const,
  defaultVariant: process.env.NODE_ENV === 'development' ? 'candy' : 'control',
  description: 'Candy-crush tile presentation + popup redesign',
},
```

(Adapt to the registry's exact type.)

- [ ] **Step 3: Manual: create flag in PostHog UI**

Per memory: PostHog flags must be created in the UI — code only declares them. Create flag `blast.candy-shell.enabled` with two variants, 0% rollout production initially.

- [ ] **Step 4: Commit**

```bash
git add fe-next/lib/experiments.ts
git commit -m "feat(blast): register candy-shell experiment flag"
```

---

### Task 15: Manual playtest + perf measurement

**Files:** none — this is a verification gate.

- [ ] **Step 1: Start dev server on port 3001 (per memory `dev-server-port`)**

```bash
cd fe-next && npm run dev
```

- [ ] **Step 2: Open `http://localhost:3001/en/blast` in Chrome with DevTools → Performance**

- [ ] **Step 3: Record a 10-second session**

While recording: trigger a 2-tile selection, submit a word (clearing phase), wait for refill (falling+appearing+landing). Stop recording. Verify:

- Frame budget ≤ 16ms during cascade (60fps).
- `<button>` paint time per tile ≤ 2ms.
- No layout-shift warnings.

Record the result in a comment on the GitHub PR or in `docs/blast-vfx-upgrade-proposal.md` perf-log section.

- [ ] **Step 4: Repeat for popup**

Trigger fail → BlastRetryWaveModal opens. Verify first frame ≤ 16ms; orb burst doesn't drop frames; backdrop blur OK.

- [ ] **Step 5: Locale + RTL pass**

Visit `?locale=he`. Confirm modal mirrors and tile gloss stays centered top.

- [ ] **Step 6: Reduced-motion pass**

Chrome DevTools → Rendering → "Emulate CSS media feature `prefers-reduced-motion`". Verify no bouncy eases, no swipe-shine, no ring-spin.

- [ ] **Step 7: If perf or visual regression — file follow-up; otherwise mark task complete**

---

### Task 16: Final lint + test + build sweep

**Files:** none — gate task.

- [ ] **Step 1: Lint**

```bash
cd fe-next && npm run lint
```

Expected: clean. Fix any new warnings.

- [ ] **Step 2: Tests (frontend full)**

```bash
cd fe-next && npm run test:frontend
```

Expected: all green.

- [ ] **Step 3: Build**

```bash
cd fe-next && npm run build
```

Expected: clean Next.js build.

- [ ] **Step 4: Final commit if anything changed**

```bash
git add -A
git commit -m "chore(blast): lint+tsc clean for candy-shell rollout" || echo "nothing to commit"
```

- [ ] **Step 5: Push**

Coordinate with the user — don't push without explicit approval per CLAUDE.md.

---

## Self-Review (already performed inline by author)

**Spec coverage:**
- 5-layer DOM tile composite → Tasks 1-3 (accents, SCSS, JSX layers).
- GSAP phase transitions → Tasks 4-5 (runner + wiring).
- Adjacent neighbour-lean → Task 6.
- Snapshot test updates → Task 7.
- Backdrop blur + gradient frame + dashed-ring orb + sequential stagger → Tasks 8-9 (shell + SCSS).
- Particle burst from orb → Task 10 (firePopupBurst on bridge).
- Modal refactors with mascot → Tasks 12-13.
- Feature flag → Task 14.
- Perf/i18n/reduced-motion verification → Task 15.
- Lint/test/build → Task 16.

Spec items intentionally deferred from plan:
- DisplacementFilter background, screen-shake calibration, slow-mo ramp — already noted as "out of scope" S4/S5 in spec.

**Placeholder scan:** No "TBD" / "implement later" / "similar to Task N" patterns found. Each step shows code or commands.

**Type consistency:** `playPhaseTransition` signature in Task 4, Task 5, and BlastTileProps Task 5 all match: `(el: HTMLElement, phase: TilePhase, opts?: {fallOffset?, spawnOffset?, clearRotate?}) => void`. Accent variant string `'lime' | 'cyan'` consistent across Tasks 8 + 12 + 13. `firePopupBurst(x, y, colour: number)` consistent across Tasks 10 + 8 + 12 + 13. `useExperiment('blast.candy-shell.enabled')` returning `{variant}` consistent across all consumer tasks.

---

## Execution Handoff

**Plan complete and saved to `docs/2026-05-04-blast-candy-crush-tiles-popups-plan.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration with tight scope per step.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints for review.

Which approach?
