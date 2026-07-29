# Blast Mode VFX Upgrade Proposal

**Date:** 2026-04-09
**Context:** Follow-up to the z-index layering fix (commit `4ae97669f`) that
moved the PixiJS effects canvas ABOVE the DOM `BlastBoard` so particles,
shockwaves, shatters, and camera filters are finally visible on tile art.

With effects now visible, we want to level up "game feel" to match modern
match-3 / juice standards (think *Candy Crush*, *Puzzle & Dragons*, *Threes*,
Vlambeer's screenshake talk).

## Current Effect Stack (baseline)

Already shipped and working after the layering fix:

| Layer                | Implementation                                                      |
| -------------------- | ------------------------------------------------------------------- |
| Particles            | custom-pixi-particles presets (30+ particle configs by tile type)   |
| Shatter/dissolve     | `blastEnhancedEffects` — shatter, dissolve, crystallize, melt, etc. |
| Bloom                | `BloomFilter` — ramps with chain level                              |
| Shockwave            | `ShockwaveFilter` — fired per bomb/diamond/wave clear               |
| Chromatic aberration | `RGBSplitFilter` — inside `blastJuiceKit.megaPunch/comboPulse`      |
| Zoom blur            | `ZoomBlurFilter` — mega cascade + wave clear                        |
| Advanced bloom       | `AdvancedBloomFilter` — mega cascade + wave clear                   |
| Saturation pump      | `AdjustmentFilter` — combo pulse                                    |
| Camera shake         | `shake.shake` (Vlambeer-tuned intensities)                          |
| Hit-stop             | `timeDilation.freeze` 80–120ms on mega events                       |
| Ambient              | Bokeh, ghost trails, metaball goo, cross flash                      |

## Research Findings (7 candidate upgrades)

Sourced from pixi-filters v6 gallery, PixiJS v8 blog, particle-emitter repo,
and match-3 juice literature. Ranked by impact/effort.

| # | Upgrade                                  | Effort   | Impact  | Trigger                       | Notes                                                         |
| - | ---------------------------------------- | -------- | ------- | ----------------------------- | ------------------------------------------------------------- |
| 1 | **GlowFilter pulse ring**                | Cheap    | High    | Combo tier up                 | Expanding Graphics ring w/ GlowFilter, fades to 0 over ~450ms |
| 2 | **DisplacementFilter ripple**            | Cheap    | High    | Tile clear (bomb/diamond)     | Animated noise displacement — "reality bends" moment          |
| 3 | **GlitchFilter tension mode**            | Cheap    | Medium  | Last 10s of timed wave        | Adds pressure / "impending doom" feel                         |
| 4 | **AdvancedBloomFilter milestone strobe** | Cheap    | Medium  | Score milestone crossed       | 200ms brightness spike                                        |
| 5 | **ColorMapFilter LUT palette shift**     | Medium   | High    | Per-wave mood change          | Palette LUT per wave type (lava, ice, electric)               |
| 6 | **MeshRope particle trail ribbons**      | Medium   | Medium  | Power-tile activation path    | Trail that follows word path                                  |
| 7 | **RenderTexture afterimage smears**      | Expensive| Low     | Mega cascade                  | Risky on mobile GPUs; skip for now                            |

## Pitfalls (from research)

- **Filter stacking cost**: cap at ~3 simultaneous filters on mobile.
  `blastJuiceKit.runFilterBurst` already clears filters after each burst — safe.
- **GlitchFilter TTL leaks**: must cancel animation frame on unmount.
- **Motion accessibility**: gate additive flashes behind `prefers-reduced-motion`.
- **`ColorMatrixFilter` multiply**: reuse filter instance across frames vs. realloc.
- **RenderTexture memory**: requires a pool — not worth the complexity for LexiClash.
- **WebGPU fallback**: PixiJS v8 auto-falls to WebGL2, but custom filters may need
  `glsl: { vertex, fragment }` + `gpu: { vertex, fragment }` branches.

## Prioritized Plan

**Ship now (this PR):**
- **#1 GlowFilter pulse ring** — wired into `BlastEffectsCanvas` combo effect. New
  helper `spawnGlowPulseRing(cx, cy, tier)` added to `blastJuiceKit`. Tier maps
  to ring radius + color (lime → pink → cyan as combos escalate).

**Candidates for follow-up sprints:**
- **#2 DisplacementFilter ripple** — needs a small noise texture asset; +1 sprint.
- **#3 GlitchFilter tension mode** — needs "time left" signal plumbing from
  `BlastGame` into `BlastEffectsCanvas`; +1 sprint.
- **#5 ColorMapFilter palette shift** — needs wave-theme metadata (LUT PNG per
  wave variant) + designer input; larger scope.

**Skipped:**
- **#6 MeshRope trails** — word path already has DOM highlight; duplicated signal.
- **#7 RenderTexture afterimage** — expensive, risky on mobile, low incremental impact.

## Accessibility Guard

All new additive/strobe effects must respect
`window.matchMedia('(prefers-reduced-motion: reduce)')`. `blastJuiceKit` does not
currently check this — follow-up sprint should add a shared `motionOk()` util and
gate *all* filter bursts through it.
