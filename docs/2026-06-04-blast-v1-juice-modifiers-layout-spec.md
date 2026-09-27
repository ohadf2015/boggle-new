# Blast v1 — Feel, Modifiers & Layout Upgrade (SP)

**Date:** 2026-06-04
**Scope:** Single-player Blast (`fe-next/components/blast/legacy/`). Make it smoother, juicier, more satisfying; add a random **Wave Modifier** system; polish in-game layout across phone / tablet / TV.
**Skills:** impeccable (neo-brutalist party energy), gsap-core, pixijs-2d.

## Hard constraint (the design pivot)

MP Blast is **server-authoritative**: single fixed-wave board (wave 3), score computed server-side at `wordValidationHandler.ts:151`, grid generated deterministically from `gameCode`. MP has **no wave progression**. Therefore:

- **Wave Modifiers are SINGLE-PLAYER ONLY.** They map onto SP's wave 1–12 loop, which is 100% client-authoritative. Zero server changes, zero desync risk (re-arming the known "Blast MP grid desync" bug is unacceptable).
- Gate everything behind the existing `mode === 'multiplayer'` / `options.isMultiplayer` boundary (useBlastEngine.ts:237,433; BlastGame.tsx:115).
- Modifier selection is a **pure function of `(seed, wave)`** — deterministic, replayable, unit-testable.

## Pillar 1 — Random Wave Modifiers (backbone, TDD-first)

New pure module `utils/blastModifiers.ts`. A modifier is a small descriptor that (a) patches `WaveConfig` fields and/or (b) multiplies word score, plus display metadata (id, icon, color family, i18n key).

```ts
export interface BlastWaveModifier {
  id: BlastModifierId;          // stable union
  color: 'lime' | 'pink' | 'cyan' | 'purple' | 'yellow' | 'orange';
  icon: string;                 // lucide name
  scoreMultiplier?: number;     // applied client-side (SP only)
  patch?: Partial<Pick<WaveConfig,
    'specialTileChance'|'goldDistribution'|'iceDistribution'|'vowelModifier'
    |'maxCascadeChain'|'cascadeChainBonus'|'movesAllowed'>>;
  gravityFlavor?: 'feather';    // juice-only hint, no logic impact
}
export type BlastModifierId =
  | 'goldRush' | 'chainFrenzy' | 'doubleDown' | 'featherfall'
  | 'bombParty' | 'luckyVowels' | 'megaCombo';
```

Functions (all pure):
- `selectWaveModifier(seed: number, wave: number): BlastWaveModifier | null`
  - Wave 1 = never (teach the ropes). Wave ≥2 = ~55% chance. Deterministic from `(seed, wave)`.
  - Never repeat the immediately-previous wave's modifier.
- `applyModifierToWaveConfig(config: WaveConfig, mod: BlastWaveModifier | null): WaveConfig`
  - Pure clone + clamped patch (chances 0–1, moves ≥1).
- `applyModifierToScore(base: number, mod: BlastWaveModifier | null): number`
  - `Math.round(base * (mod?.scoreMultiplier ?? 1))`.

Initial modifier table (party-flavored, brand colors):
| id | effect | patch / score |
|---|---|---|
| goldRush | golden everywhere | goldDistribution↑, scoreMultiplier 1.15 (gold yellow) |
| chainFrenzy | cascades go wild | cascadeChainBonus×2, maxCascadeChain +2 (lime) |
| doubleDown | high risk/reward | scoreMultiplier 2, movesAllowed −1 (pink) |
| featherfall | slow, dreamy fall | gravityFlavor feather + cascadeChainBonus +0.3 (cyan) |
| bombParty | more bombs | specialTileChance↑ (orange) |
| luckyVowels | easy words | vowelModifier 1.3 (purple) |
| megaCombo | combos amplified | cascadeChainBonus +0.5, scoreMultiplier 1.1 (cyan) |

**Integration (SP only):**
- `BlastView` builds wave config per wave → wrap with `applyModifierToWaveConfig`. Modifier chosen via `selectWaveModifier(blastSeed, wave)`, tracked in state, passed down.
- `BlastGame` score path multiplies final word score via `applyModifierToScore` (SP branch only).
- Engine `cascadeChainBonus`/`maxCascadeChain` already flow from config → automatic.

## Pillar 2 — Reveal & feedback UI

- **Wave-transition banner**: in `waveTransition` phase, show the modifier name/desc with a neo-brutalist card + GSAP entrance (stamp-in scale + settle, reduced-motion = instant). Reuse existing wave-transition layout; add modifier slot.
- **Persistent HUD chip** during play: small modifier chip in `BlastHUD` (icon + short label) so players remember the active rule.
- i18n keys `blast.modifier.<id>.{name,desc}` × 5 languages (en authoritative, native others).

## Pillar 3 — Juice / feel (verify-by-render, not unit-tested)

All behind `gsap.matchMedia` reduced-motion; all **finite** (no `repeat:Infinity` — see daily-results perf memory).
- Tile press-squeeze on pointer-down (cheap CSS scale, instant).
- Modifier reveal flourish (GSAP timeline, ≤700ms).
- Cascade chain "punch" fires from chain ≥2 (currently only glow/text) via existing `BlastJuiceKit.megaPunch`/`comboPulse`.
- Featherfall modifier slows gravity stagger for a dreamy drop (engine sequencer timing hint).

## Pillar 4 — Layout responsiveness (verify-by-render)

`BlastStage.tsx` improvements (surgical; file is 580 lines, presentational):
- Replace hard-capped board `max-w-[min(600px,75dvh)]` with fluid sizing that consumes available play area on large/TV screens while staying square; use `dvh`/`dvw` + container query where it helps.
- Mobile: ensure word-forming area and word-feedback don't overlap; reserve space.
- Tablet/TV: scale HUD + board up; don't leave huge empty gutters.
- Respect `pb-safe` notch handling already present.

## Out of scope
- MP changes (server scoring untouched).
- New tile types (modifiers reuse existing mechanics).
- BlastTile split beyond what's needed (483 lines — extract only if an edit pushes >500).

## Testing
- TDD: `utils/__tests__/blastModifiers.test.ts` — determinism, wave-1-none, no-consecutive-repeat, patch clamping, score multiply, every modifier id valid-patch (compile-time `Partial<WaveConfig>`).
- Guard: SP-only — assert MP path never receives a modifier (config equality when `isMultiplayer`).
- i18n parity test for new keys (existing harness).
- Layout + juice: verified by running the app (`PORT=3005 npm run dev`) at phone/tablet/TV widths + Hebrew RTL.

## Phases (commit per phase, ask before commit)
1. **(pre)** Commit existing locked-tile-removal work as its own commit (clean baseline).
2. **Modifiers core** — TDD pure module + i18n + wiring (SP) + HUD chip + banner.
3. **Layout** — BlastStage responsive pass.
4. **Juice** — GSAP/Pixi feel polish (reduced-motion gated).
