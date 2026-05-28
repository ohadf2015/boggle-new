# Spec: Make Cozy Mode Genuinely Calm

**Status:** in progress · **Date:** 2026-05-28 · **Author:** cozy-mode pass (council + impeccable + advisor)

## Problem

Cozy mode (`data-cosy='true'`) currently = "the loud app, turned down." Celebrations are *scaled* to 40% particles (not off), secondary text fails WCAG AA, and ~200–300 component hex colors bypass tokens so they don't adapt. For the **elder + effect-averse persona** it must feel *categorically different*: sleek, clean, quiet — not a dimmer party.

## Target persona

Elder users + people who dislike confetti/effects. They want: legibility, calm motion, a *dignified* sense of accomplishment (not "nothing happened"), and an interface that feels premium and restful.

## Decisions (council + advisor convergent)

1. **Effects OFF, not scaled.** In cozy, particle celebrations (canvas-confetti + Pixi bursts) do **not** fire. Replaced with quiet dignified feedback: a gentle in-place "stamp"/checkmark accent + smooth score tally, no screen-shake, no fireworks. `prefers-reduced-motion` remains the OS hard-off (independent).
2. **No new state axis.** `cosyMode` drives everything. We retire the `'gentle'` celebration tier and introduce `'calm'` (particles off) as the cozy value. `'full'` unchanged for default.
3. **Token migration is bounded.** Migrate only values that render *wrong* in cozy (theme-semantic surface/ink/accent/border/shadow). Brand/OAuth, avatar, and tier-medal colors are **intentionally fixed** — do NOT tokenize them to theme-shift.
4. **Contrast must pass AA** (verified on rendered screens, not just tokens). Known failures to fix: `--muted-foreground` clay-on-sand = 3.17:1 (FAIL), functional borders = 1.04:1 (invisible).
5. **Anti-rot guardrail** > exhaustive migration: a test that *fails* on new raw hex / `text-white` in component files (allowlist intentional ones).
6. **Premium calm feel** (not generic light mode): increased line-height + letter-spacing + larger base type for legibility, slower fluid motion (≈350–450ms, `cubic-bezier(0.4,0,0.2,1)`, no bounce/spring/wobble), generous spacing.

## Non-goals

- Swapping the font family app-wide (Fredoka→serif) — too large + RTL risk. We tune leading/tracking/size instead.
- Migrating all ~6k hex literals. Only theme-breaking ones.
- A separate "gentle" middle tier. One calm mode.
- New ambient sound design (out of scope this pass; suppress loud SFX where cheap).

## Phases

### Phase 1 — Effects off + quiet feedback (biggest "feels different" lever)
- `cosyPreferences.ts`: `celebrationIntensity` cozy value → `'calm'`.
- `celebrationScale.ts`: add `'calm'` → particleMultiplier 0; `applyCelebrationIntensity` returns a "suppress" signal for calm; `scaleParticleCount('calm')` → 0.
- `confettiUtils.fireConfetti()` chokepoint: when intensity is `'calm'`, early-return (like reduced-motion) — fire NO particles.
- Pixi `SharedFxApp` burst entry points: no-op bursts in calm.
- Quiet feedback primitive: a small accessible component / util that renders a gentle scale-in checkmark + soft tally, used at the central celebration points. Respects reduced-motion (instant).
- TDD: scale math, chokepoint suppression, quiet primitive renders.

### Phase 2 — Contrast + premium calm type/motion
- Fix `--muted-foreground` to ≥4.5:1 on sand (darken clay).
- Functional borders (inputs, dividers, focus ring) → ≥3:1 token; keep decorative card edges soft.
- Cozy type: line-height +~12%, letter-spacing +~1–2%, base size up for legibility.
- Cozy motion: transition durations ≈350–450ms ease-in-out; neutralize bounce/spring/wobble keyframes under cozy.
- Update `calmPalette.contract.test.ts` to assert AA on muted + border contrast.

### Phase 3 — Deep surface theming (DEFERRED — its own pass)
**Root cause found (2026-05-28, Playwriter):** cozy is only skin-deep. The `--neo-*` token overrides work (body bg resolves to sand `#dbd3c2`), but ~750 surfaces use **raw Tailwind palette classes** (`bg-slate-800`=346, `bg-slate-700`=283, `bg-slate-900`=75, `bg-gray-*`=45) + ~120 `dark:bg-*` variants that bypass the tokens entirely → header, nav, and most cards stay DARK in cozy.

**Two hard constraints discovered (why this is its own pass, not a tail step):**
1. **Not monotonic-safe.** A bg-only flip (`bg-slate-800`→cream) inverts contrast with every foreground on it (`text-slate-300/400` secondary text, colored text, icon fills, `border-slate-*`, `hover:` inversion). The fix MUST be contrast-complete: every surface flip paired with fg/border/hover flips, verified on rendered output LTR+RTL across ≥3 screens. (Removing the `dark` class globally → light-text-on-light-header bug, observed.)
2. **Turbopack drops `[class*=]` circuit-breaker rules.** A `html[data-cosy] [class*='bg-slate-800']{…!important}` block works when injected at runtime (verified: card→`rgb(244,240,230)`, secondary text→11:1) but is STRIPPED by Turbopack/Lightning-CSS compilation (same rule from globals.css leaves the card dark `oklch(0.279)`). So the breaker approach needs a compilation-safe mechanism — explicit class selectors, a PostCSS-safe transform, or (best) actual migration of palette classes → semantic tokens.

**Recommended approach for the pass:** introduce semantic tokens (`--surface`, `--surface-elevated`, `--ink`, `--ink-muted`, `--edge`) and migrate the dark palette classes (`bg-slate-*` etc.) to them at the component level (the council's mapping-layer; also retires the override-stack p0 debt). Leave brand/avatar/tier-medal colors fixed. Verify each screen LTR+RTL with contrast sampled on rendered output.

### Phase 4 — Anti-rot guardrail
- Vitest test scanning `components/**`, `app/**` for raw `#hex` in className/style and bare `text-white`, failing with an allowlist for intentional brand/identity colors.

## Verification
- Prod build (NOT dev server — HMR does not reload cozy CSS; documented gotcha). Or inject cozy CSS via Playwriter.
- Playwriter screenshots: before (baseline) + after, LTR + Hebrew RTL, phone + desktop.
- Contrast sampled on rendered screens.
- `npm run lint && npm run test` green.

## Risks
- RTL × cozy double matrix — test Hebrew.
- Suppressing Pixi bursts must not break the shared FX app lifecycle.
- Retiring `'gentle'` tier: grep all consumers of `celebrationIntensity`/`'gentle'`.
