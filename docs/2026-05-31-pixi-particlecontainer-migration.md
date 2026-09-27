# Spec — Migrate ParticleEmitter from per-frame Graphics to ParticleContainer

**Date:** 2026-05-31
**Scope:** `fe-next/lib/gameEngine/ParticleSystem.ts` (render layer only) + new `particleTextures.ts`.

## Problem (measured)

`ParticleEmitter.draw()` calls `graphics.clear()` then re-issues every live particle's
`.circle()/.star/.rect/.stroke().fill()` **every frame**. In Pixi v8, `Graphics` is
retained-mode: `clear()` marks the `GraphicsContext` dirty, so the geometry is
**re-tessellated on the CPU every frame**.

Worst-case load (Blast mega-cascade, full-board clear — verified by reading
`lib/gameEngine/presets/particles.ts` + `BlastFxOverlay.tsx`):
- ~26 concurrent emitters → 26 separate `Graphics` contexts, each tessellating each frame.
- ~680 filled shapes/frame at peak (realistic 95p ≈ 350–400).
- Lands on the climactic moment, on the app's low-end-mobile + TV targets.

This is exactly what `ParticleContainer` exists to fix (skill: "10× faster for static
properties"). The particle COUNT is fine for a GPU; the per-frame CPU **tessellation** is the cost.

## Approach (zero visual change, pure perf refactor)

Render each particle as a `Particle` sprite in a **per-emitter** `ParticleContainer`
(per-emitter so each preset's `blendMode: 'add'`/`'screen'` stays correct — 24 presets are additive).
Pre-generate one **white** texture per shape, **cached at module level**, tinted per-particle.

Per-frame work collapses from "re-tessellate ~680 shapes" to "write transform/tint/alpha
buffers" (GPU upload, no CPU geometry rebuild).

**Exact claim (corrected):** draw-call count is ~unchanged (one batch per per-emitter
container ≈ the old one-Graphics-per-emitter). The win is eliminating **per-frame CPU
geometry re-tessellation** — a frame-time win, not a draw-call win.

**Pixi v8 gotcha (verified via Context7):** per-frame *property* edits on existing
particles auto-upload, but changing the particle *list* (add/remove) requires
`container.update()` or new particles never render. Emitter sets a `_listDirty` flag on
spawn/death and calls `container.update()` once per frame only when the list changed
(`flushList()`); also flushed at the end of `burst()` for between-tick bursts.

### New module `lib/gameEngine/particleTextures.ts`
- `PARTICLE_UNIT = 16` — texture-space "size unit".
- **Pure, testable geometry** (locks visual fidelity — the regression-prone bit):
  `circleGeom`, `rectGeom` (2:1), `ringGeom` (lineWidth = 0.3·unit), `starPoints`
  (outer=unit, inner=0.45·unit, 5pt), `diamondPoints` (±unit vert, ±0.7·unit horiz) —
  constants copied verbatim from the current `draw*()` methods.
- `particleScaleForSize(size) = size / PARTICLE_UNIT` (uniform X/Y; on-screen size identical to old draw).
- `shouldRotateParticle(shape) = shape === 'star'` (old draw applied rotation ONLY to stars;
  circle is rotation-invariant; rect/diamond were never rotated → keep 0 = zero visual change).
- `getParticleTexture(shape): Texture` — lazy + cached; draws white shape on a 2D canvas →
  `Texture.from(canvas)`. **Guard:** no `document`/2D-ctx (SSR, node tests) → `Texture.WHITE`.
  Cached textures are **shared** → never destroyed by an emitter.

### `ParticleEmitter` changes
- `container`: `ParticleContainer({ dynamicProperties: { position, vertex, rotation, color: all true } })`;
  set `.blendMode` from config; `parent.addChild(container)`.
- Local `EmitterParticle extends ActiveParticle { sprite: Particle }` (keeps `types.ts` framework-agnostic).
- `spawnParticle`: create `Particle({ texture, x, y, anchorX/Y: 0.5, scaleX/Y, tint, alpha })`,
  `container.addParticle`.
- `update`: drop `draw()`; sync each sprite's `x/y/scaleX/scaleY/rotation/tint/alpha` from physics.
  Dead particle → `container.removeParticle(sprite)` + splice. Skip-render rule (size<0.5 || alpha<0.01)
  → `alpha = 0`.
- Race guard: bail when `container?.destroyed` (was `graphics?.destroyed`).
- `destroy`: `container.destroy()` (NO texture flag — textures are shared/cached).

### Preserved exactly
All physics, spawn math, color interpolation (`hexToNum`/`lerpColor`/`lerp`), emitter/pool
lifecycle, `maxParticles`, auto-cleanup, on-screen size & color.

## Tests (TDD)
- **New** `particleTextures.test.ts` (node, no canvas): geometry constants, `particleScaleForSize`,
  `shouldRotateParticle`, `getParticleTexture` falls back to `Texture.WHITE` without a canvas.
- **Update** `ParticleSystem.test.ts`: replace Graphics-method assertions with
  ParticleContainer behavior — a particle handle is added per spawn, removed on death, and
  `tint`/`alpha`/`scaleX` are synced after `update()`. Keep all lifecycle/cap/race tests
  (race test now flips `container.destroyed`). Update the `vi.mock('pixi.js')` to add
  `ParticleContainer`, `Particle`, `Texture.WHITE`.
- `ParticleSystem.color.test.ts`: unchanged (math untouched).

## Out of scope / follow-ups (logged, not done)
- Sharing 2 ParticleContainers by blendMode for fewer draw calls (blocked on per-emitter blend).
- Bloom filter `quality:4 strength:6` cost on mega-cascade (separate GPU fill-rate issue).
- TextStyle caching in `TileRenderer`; `filterArea` on blast filters; `cullable` on static layers.

## Verification limits (honest)
Unit tests prove the mapping math + lifecycle + the `container.update()`-on-list-change
contract, NOT "faster" and NOT that a burst visibly renders. The Pixi runtime is mocked in
node tests; dev-server (Next build lock) and CDP/Playwriter are env-blocked in this setup
(per project memory). **A burst has NOT yet been seen rendering in a browser** — this is a
shared system feeding every mode, so it must be playtested before merging to master.
Land on a branch labeled visually-unverified until then. The perf claim rests on the
structural fact that per-frame tessellation is eliminated.
