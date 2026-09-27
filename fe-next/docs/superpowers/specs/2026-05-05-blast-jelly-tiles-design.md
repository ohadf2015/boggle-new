# Blast Mode — Jelly Tile Redesign + Effect Pass

**Date:** 2026-05-05
**Visual reference:** `iran-game/public/blast-concept-A2-jelly.jpg` (concept A2 — Glossy Jelly)
**Status:** Draft awaiting user approval

## Goal

Make blast-mode tiles feel more 3D and "fun" by giving them a wet, jelly-candy presentation, and upgrade the existing GSAP/PIXI juice layer to match the new look. Keep brand neutrality with the rest of LexiClash by limiting the new look to blast mode (other modes unchanged).

## Non-goals

- Replace tile DOM with a pure-canvas (PIXI) renderer. Out of scope; too expensive vs. the polish payoff.
- Touch tile data model (`BlastTileType`, scoring, solver). Visual layer only.
- Rebalance any gameplay number.

## Visual Anatomy

Tile becomes a stack of layers (current order kept; layers refined or added):

| Layer | Source | Change |
|---|---|---|
| **cast shadow** | `.candyShell` | Taller drop, slightly softer blur, shifts down 2 → 4 px to read as more elevated mass. |
| **base body** | inline `style.background` from `TILE_VISUALS` | Unchanged palette. Add inner radial vignette so body curves toward the rim. |
| **edge translucency rim** | NEW `.jellyRim` | Thin pseudo-element at the inner border showing a brighter, slightly desaturated ring — reads as light passing through the jelly's edge. |
| **mirror gloss** | `.gloss` (rewritten) | Curved highlight covering top ~55% of the dome. Two stops (bright-white centre → fade) with subtle horizontal sheen. Uses `mix-blend-mode: screen` already in place. |
| **micro-noise** | `.gloss::before` | Kept (anti-banding). |
| **rim stroke** | `.rim` | Lighter top-left stroke + darker bottom-right unchanged (gives the dome a silhouette). |
| **letter** | `.letter` | Unchanged shadows; verify legibility against new gloss. |

CSS-only depth — no transform-style:preserve-3d, no real perspective on the tile itself. Perspective lives on the parent grid (Phase 2).

## Idle Animation (Phase 2)

- Each tile carries a randomised "breathing" tilt: GSAP timeline does `rotateX ±2deg, rotateY ±2deg` over 4 s, `ease.inOut.sine`, infinite, `yoyo`.
- Phase per tile randomised (`Math.random() * 4`) so the grid never pulses in unison.
- Hover/press handled inline (no GSAP needed): `:hover` → translateZ-equivalent (scale 1.04 + brighter `--bt-gloss`); `:active` → scale 0.94 + flatten cast shadow (already present, keep).
- `prefers-reduced-motion` → skip the breathing timeline entirely.

## Selection Juice (Phase 3)

- A liquid-pink ribbon connects consecutively selected tile centres. Implemented in PIXI (v8) on the existing overlay canvas (`useBlastPixiOverlays`).
- Geometry: PIXI `Mesh` + `MeshGeometry` polyline through tile centres, with a vertex-coloured gradient (hot pink → magenta → hot pink) and a soft outer glow filter. Width tapers from ~6 px at the head to ~3 px at the tail.
- Updates on selection mutation (add / undo / clear). Cleanup on word commit or full deselect.
- Perf budget: ≤ 2 ms / frame for ribbon draw on a mid Android device.

## Blast / Clear (Phase 4)

- Existing per-type CSS `CLEARING_ANIMS` (transform + filter) is replaced by GSAP timelines that produce the same per-type signature (bomb explode, ice shatter, lightning stretch, magnet implode, prism whirl, rainbow spin, etc.) with finer easing and timing control.
- For each clear, a PIXI particle burst is spawned at the tile centre with debris colour pulled from `TILE_ACCENTS[type].rimDark` and `castShadow`. Burst count scales with combo: solo clear = 8 particles, combo ≥ 3 = 16 + a single shockwave ring.
- All effects share one PIXI ticker batch (already established in `BlastEffectsCanvas`). No per-tile mount.
- Reduced-motion → particle count → 0, GSAP timeline duration / 3, no shockwave.

## Cascade / Fall (Phase 5)

- Replacement tiles drop with `ease.in.cubic`, then squash-and-stretch settle (scaleY 0.7 → 1.05 → 1, scaleX inverse, 200 ms total).
- Stagger across the column (`stagger: 0.04`) so a refilled column doesn't land in unison.
- Reduced-motion → instant final position.

## File Boundaries

| File | Owns | Touched |
|---|---|---|
| `components/blast/BlastTile.module.css` | Layer geometry, animations, reduced-motion gates | YES — gloss + rim rewritten, jellyRim added, idle keyframes added |
| `components/blast/BlastTile.tsx` | Tile JSX, layer wiring, GSAP refs | YES — add jellyRim layer, attach idle GSAP, hover/press refresh |
| `components/blast/blastTileVisuals.ts` | TILE_VISUALS, TILE_ACCENTS, CLEARING_COLORS, CLEARING_ANIMS | YES — extend TILE_ACCENTS with new vars; mark CLEARING_ANIMS as legacy fallback for reduced-motion |
| `components/blast/effects/blastJuiceKit.ts` | Particle / shockwave primitives | MAYBE — extend if particle bursts need per-type variants |
| `components/blast/effects/blastGsapTimelines.ts` | Reusable named timelines (idle breathing, jelly clear) | YES — add `idleJellyBreathe`, replace per-type `clearTile<Type>` builders |
| `components/blast/hooks/useBlastGsapTimelines.ts` | Mount + clean up tile timelines | YES — wire breathing on mount, route clear to new builder |
| `components/blast/hooks/useBlastPixiOverlays.ts` | PIXI overlay canvas mgmt | YES — add chain-ribbon mesh + per-type particle factory |
| `components/blast/BlastEffectsCanvas.tsx` | PIXI stage host | LIKELY — confirm canvas size / DPR handles new ribbon |
| Other blast components | unchanged |

No file should exceed 500 lines (per project rule). If `BlastTile.tsx` would cross, split presentation layers into `BlastTileLayers.tsx`.

## RTL

Cast shadow auto-flips via existing `[dir='rtl']` rule. Gloss highlight is symmetric (radial top-centre) so no flip needed. Verify with `?locale=he` smoke.

## Accessibility

- All new layers `aria-hidden` (presentation only).
- Letter contrast unchanged.
- Reduced-motion gates documented per phase.
- No reliance on hue alone for power-tile identity (icon already present).

## Performance Budget

- Idle GSAP: one shared timeline per tile, paused while off-screen (IntersectionObserver gate).
- PIXI ribbon: ≤ 2 ms / frame mid-Android.
- PIXI particles: max concurrent particles 64; older bursts evicted FIFO.
- All animations honour `prefers-reduced-motion`.

## Test Strategy

Per project TDD rule, every phase commits red → green → refactor. Phases get:

| Phase | Test type | What |
|---|---|---|
| 1 jelly presentation | snapshot + a11y | Tile renders new layer set; aria-hidden correct; contrast unchanged |
| 2 idle GSAP | unit (vitest) | Timeline created with random phase, paused on reduced-motion, cleaned up on unmount |
| 3 PIXI ribbon | unit | Point sequence matches selection order; cleared on commit/deselect |
| 4 blast clear | unit | Each `BlastTileType` has timeline with correct signature & duration; particle count matches combo |
| 5 cascade | unit | Stagger order = column-bottom-up; final position matches grid model |

Existing test suites (`useBlastDebris.test`, `useBlastGsapTimelines.test`, blast component tests) must stay green.

## Verification Gate

`npm run lint && npm run test && npm run build` green; manual smoke on dev `:3001` covering /blast load, idle breathing, multi-tile selection chain, multi-type blast clear, cascade refill, HE locale RTL, and `prefers-reduced-motion: reduce` (Chromium devtools).

## Techniques (researched 2026-05-05)

Concrete recipes per axis, picked for Next.js + Tailwind + GSAP + PIXI v8.

### Wet-look gloss (Phase 1)

- **Stacked radial gradients + blend modes.** Two layered pseudo-elements: `::before` for the broad cream toplight (`radial-gradient(ellipse at 50% 0%, white 0%, transparent 65%)` × `mix-blend-mode: screen`); `::after` for a narrower mirror sheen (`radial-gradient(ellipse at 50% 8%, white 0%, transparent 35%)` × `mix-blend-mode: overlay`). Reference: [MDN mix-blend-mode](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/mix-blend-mode), [The Power of CSS Blend Modes — Cloud Four](https://cloudfour.com/thinks/the-power-of-css-blend-modes/).
- **Anti-banding.** Existing fractalNoise SVG overlay stays — confirmed essential on Android low-end.

### Edge translucency / inner glow (Phase 1)

- **Stacked inset box-shadows.** `box-shadow: inset 0 0 8px rgba(255,255,255,0.45), inset 0 0 2px rgba(255,255,255,0.85)` reads as light bouncing inside the dome's edge. Reference: [Coder's Block — Creating Glow Effects](https://codersblock.com/blog/creating-glow-effects-with-css/).
- **Offset blurred pseudo-element** with `oklch()` colour for the warm rim halo on power-tiles. Apple's Liquid Glass technique applies cleanly. Reference: [Recreating Apple's Liquid Glass with CSS](https://dev.to/kevinbism/recreating-apples-liquid-glass-effect-with-pure-css-3gpl).

### Idle GSAP (Phase 2)

- **Per-tile tween, not one timeline-with-stagger.** Each tile gets `gsap.to(el, { rotateX: '+=2', rotateY: '+=2', duration: 4, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: Math.random() * 4 })`. Random `delay` desynchronises without per-tile timeline overhead.
- **Off-screen pause via IntersectionObserver.** Single observer attached to grid root; on `intersectionRatio < 0.05`, call `tween.pause()`; restore on visible. Confirmed pattern. Reference: [GSAP forum — IntersectionObserver stagger](https://gsap.com/community/forums/topic/22232-intersectionobserver-stagger-element-with-delay-time/).
- **`will-change: transform` only on mount, removed on `tween.kill()`** to avoid Chromium layer-thrash on long sessions.

### PIXI v8 chain ribbon (Phase 3)

- **Use `MeshRope` (renamed from `SimpleRope` in v8).** API: `new MeshRope({ texture, points })`. Update `points` array in place each frame the selection changes (reuse `Point` instances, don't recreate). Reference: [PixiJS v8 MeshRope docs](https://pixijs.download/dev/docs/scene.MeshRope.html).
- **Tapered look** via texture: a 256×8 texture with horizontal alpha gradient (head → tail). PixiJS v8 also ships **linear gradient fill** support if we want runtime-generated colour. Reference: [PixiJS v8 launch notes](https://pixijs.com/blog/pixi-v8-launches).
- **Glow filter** sparingly — `BlurFilter` with `blur: 4` only on the ribbon container, not per-segment, to keep the ≤2 ms/frame budget.

### GSAP squash-stretch on cascade (Phase 5)

- **Manual two-tween recipe** (project ships plain `gsap@3.14.2`, no Club plugins). Position tween: `gsap.from(tile, { y: -200, duration: 0.55, ease: 'bounce.out' })`. Squash tween in parallel: `gsap.fromTo(tile, { scaleY: 1.15, scaleX: 0.85 }, { scaleY: 0.7, scaleX: 1.15, duration: 0.18, ease: 'power2.out', delay: 0.4, yoyo: true, repeat: 1, transformOrigin: 'center bottom' })`. The squash kicks in just before landing and snaps back. Reference: [GSAP bounce ease docs](https://gsap.com/docs/v3/Eases/).
- **Column stagger** with `stagger: 0.04` so a refilled column doesn't land in unison.

## Open Questions

None. CustomBounce confirmed unavailable — manual two-tween recipe locked above.
