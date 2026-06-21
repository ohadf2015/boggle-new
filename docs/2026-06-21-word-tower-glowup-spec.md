# Word Tower Glow-Up — Spec

**Date:** 2026-06-21
**Goal (verbatim):** improve the UI of Word Tower (use Claude Design), improve game UX, randomness,
generate more interesting assets/animations to make each biome unique and fun to explore, improve the
crane functionality (use Pixi to make it work well), improve gravity and effects, plan upgrade options,
make it fun to play in general.

## Context

Word Tower is already one of the deepest modes (~120 files, ~21k LoC). PixiJS v8 renders the tower
(`WordTowerScene.tsx` + `towerSprites.ts`); pure-logic physics live in `lib/wordTower/*` (TDD-friendly).
6 biomes (City→Sky→Stratosphere→Orbit→Nebula→Galaxy). Crane is **DOM** today. Mode is admin/flag-gated.

This is **amplification of an existing system**, not greenfield. Respect the pure-function architecture;
extend the Pixi scene rather than rewrite. TDD mandatory.

## Design register

Game HUD with high brand personality: neo-brutalist refined, dark navy, electric color-coded
(lime/pink/cyan/purple/orange), Fredoka + Rubik. Competitive clarity wins over decoration. WCAG AA
(accent fills take BLACK ink). Full RTL. `prefers-reduced-motion` fallbacks mandatory.

## Diagnosis — what's weak today

1. **Drop feel is flat:** perfect drops have NO screen shake; all quality bands share identical
   physics; swivel settle has no micro-bounce; tall words over-simulate the arc.
2. **Tower menace gated too high:** no sway until instability 0.3; no micro-jitter; lean snaps.
3. **Crane is cosmetic DOM:** no cable stretch/snap, no in-air dust/shadow, no Pixi richness.
4. **Biomes are a color remap only:** no per-biome particles, greeble tints, ambient identity, or
   difficulty scaling. Same structure city→galaxy.
5. **No meta-progression:** coins are spent nowhere tower-specific; no reason to climb again.
6. **HUD never design-reviewed.**

## Phases (each shippable, TDD per phase)

### Phase 1 — Drop + gravity + crane physics feel
- `swivelDrop.ts`: snappier overshoot (omega ↑), bolder base/max tilt, cascading per-brick descent,
  tall-word arc dampen.
- `towerSway.ts`: lower sway-start gate (0.3→0.15), add always-present micro-jitter layer.
- `cranePendulum.ts`: cable-stretch state + snap-back on land.
- `cranePlacement.ts`: add `dropQualityIntensity` (0=perfect…1=miss) + `nearMissProximity`.
- `WordTowerScene.tsx`: drop-quality-scaled screen shake + impact ring; particles tinted by biome.
- **Pure fns get RED→GREEN tests.**

### Phase 2 — Biome uniqueness
- New `WORD_TOWER_BIOME_THEMES` in `wordTowerConstants.ts`: per-biome `instabilityMult`, `glintColor`,
  `particlePalette[]`, `greebleAccent`, `windMult`. TDD the lookup + invariants.
- `towerSprites.ts`: greeble accent inherits biome; fainter pending tiles; inset bevel-depth band.
- `shaftWind.ts`: additive deterministic turbulence jitter (TDD).
- Wire per-biome instability multiplier + particle tints into the scene.

### Phase 3 — Pixi crane render layer
- Add a Pixi crane layer (jib/trolley/cable/hook/carried beam) into the scene, synced from crane
  state; in-air falling-block shadow + dust trail + cable-snap glow on release.

### Phase 4 — Randomness + variety
- Richer tray generation (vowel/consonant balance + guaranteed buildability variety), surprise/mutator
  spread, hazard pacing. Pure, TDD.

### Phase 5 — Upgrade / meta-progression
- Persistent tower upgrade tree purchased with coins: e.g. *Steady Cable* (slower swing), *Wide Footing*
  (wider perfect band), *Windbreak* (less wind), *Master Architect* (bigger rewards), *Reinforced Core*
  (extra wobble before topple), *Quick Hands* (faster crane). Pure economy + zustand store + UI panel.
  Effects feed the physics constants. TDD the economy + effect application.

### Phase 6 — Claude Design HUD mock + UI polish
- DesignSync mock of redesigned HUD (floor counter, combo meter, crane CTA, biome banner) for review,
  then implement polish to neo-brutalist tokens.

### Phase 7 — Biome ambient assets (Higgsfield) — bonus
- Generate biome-distinct ambient art (sky/props) as proof; wire a couple.

## Priority / ship order
1 (feel) → 2 (biome) → 5 (upgrades, explicit ask) → 3 (Pixi crane, explicit ask) → 6 (Claude Design,
explicit ask) → 4 (randomness) → 7 (assets, bonus). Ship per phase; ask before each commit.

## Shipped status (2026-06-21)

- **Phase 1 ✅** — `swivelDrop` (bolder tilt, cascading per-brick descent, tall-word dampen),
  `towerSway` (sway gate 0.3→0.18 + cosmetic micro-jitter), `cranePendulum` (cable stretch-snap),
  `cranePlacement.dropQualityIntensity`. Wired: cascade in `swivelWordIn`, jitter on container angle.
  +13 tests.
- **Phase 2 ✅** — `BIOME_THEME` extended with per-biome `particles/glint/greebleAccent/windMult/
  instabilityMult`. Wired: biome-tinted success + zone-entry bursts, per-surface greeble accent
  (`SURFACE_ACCENT`), fainter pending ghosts, per-biome wind. `instabilityMult` is data-only (awaits a
  shared-source difficulty pass to stay WYSIWYG-safe). +9 tests.
- **Phase 5 ✅** — `upgrades.ts` pure economy (6 upgrades, cost curve, clamped effects) + persistent
  `useTowerUpgradeStore` (localStorage, spends via coinManager) + `WordTowerUpgradePanel` (neo, RTL, AA)
  reachable via a corner pill, native i18n ×5. **4 effects live**: Steady Cable (sweep ÷speed), Windbreak
  (wind ×mult), Master Architect (reward ×mult), Reinforced Core (extraTopple → `brinkExtra`). **2
  deferred** (kept in economy, hidden from shop via `LIVE_UPGRADE_IDS`): Wide Footing (perfect-band
  widen) + Quick Recovery (lean recovery) — both need WYSIWYG-sensitive crane-band/lean wiring. +15 tests.

Net: 745 Word Tower tests green, tsc/lint clean, i18n parses ×5. Phases 3 (Pixi crane), 4 (randomness),
6 (Claude Design), 7 (assets) remain.

## Guardrails
- Mode stays flag/admin-gated; additive only; don't regress the 84 existing tests.
- Daemon wipes untracked files + resets master — commit early, land via cherry-pick-onto-origin/master.
- Every new animation needs a reduced-motion path.
- Verify by content on disk (`grep`), not harness "modified" notes.
