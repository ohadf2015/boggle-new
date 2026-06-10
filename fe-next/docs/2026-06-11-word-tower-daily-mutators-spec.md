# Word Tower — Daily Mutators + crane/anchor/juice upgrade (2026-06-11)

Admin-only. Goal: improve the daily tower, the crane feel, graphics/fun/randomness,
and the competitive aspect — without rewriting the (deliberate) Pixi physics core or
the (deliberate) fair constant-velocity crane sweep.

## Why this shape (advisor-reconciled)
- **Admin-only ⇒ no "other players" yet.** A per-day leaderboard would rank a population
  of one and needs a schema migration (progress table stores only all-time `best_height_m`,
  no per-day `game_code`). DEFERRED. The competitive win comes from the **shared daily
  twist**: everyone faces the identical mutator that day ⇒ scores stay comparable/brag-worthy,
  reusing the existing rivals + share-card infra at zero new backend cost.
- **Daily premise is "same tower for everyone."** Every mutator is **date-seeded** — identical
  for all players that UTC day. Never per-player random.
- **Crane:** keep the constant-velocity triangle (variable target was rejected as unfair).
  Crane *variety* routes only through the existing `sweepPeriodMs` (speed, fair).
- **Graphics:** no Pixi physics rewrite. Testable wins = declarative React/CSS (banner, chip,
  golden-letter tray highlight, combo-milestone fanfare) + at most additive FX calls.

## 1. Daily Mutators (spine) — `lib/wordTower/dailyMutators.ts` (pure)
Six rotating mutators, one active per UTC day, chosen deterministically from the date key.
Effects fold through THREE pure taps so the rest of the game reads them at existing points:

| id | icon | effect | fold |
|----|------|--------|------|
| `goldenLetter` | 🌟 | a daily golden letter; words containing it climb ×1.6 | word mult |
| `vowelGale`    | 🅰️ | each vowel in the word adds +8% height | word mult |
| `longAndStrong`| 📏 | words ≥6 letters climb ×1.5 | word mult |
| `skylineRush`  | 🚀 | every floor climbs +15% | modifiers.heightMult |
| `tailwind`     | 🪁 | crane sweeps 20% slower → easier perfect drops | sweep mult |
| `featherday`   | 🪶 | topples cost one fewer floor (cosy) | modifiers.toppleReduction |

Pure API:
- `mutatorForDate(dateKey: string): DailyMutator` — deterministic pick (hash(dateKey) % 6).
  Golden letter is itself seeded from the date key per language.
- `mutatorWordMultiplier(m, canonWord, language): number` — word-aware height ×; 1 for non-word mutators.
- `mutatorModifiers(m): Partial<PerkModifiers>` — structural effects to merge into the perk fold.
- `mutatorSweepMult(m): number` — crane sweep period × (≥1 easier, <1 harder); 1 for others.

## 2. Daily anchor cold-open fix — `wordTowerManager.ts`
`pickAnchor` picks any bag letter (rare but real strand on Q/Z/X cold-open). Add an optional
per-language weak-starter exclusion used at daily init only. Pure, deterministic. Shifts today's
seed for anyone mid-run — acceptable (admin-only / pre-launch).

## 3. Wiring (existing fold points)
- `WordTowerPlay`: compute `const mutator = mutatorForDate(utcDateKey())` in daily mode.
  - Merge `mutatorModifiers(mutator)` into `perks.modifiers` → one struct to `useCraneDrop`
    (reuses heightMult + toppleReduction + brink + wobble paths). Endless mode = no mutator.
  - `sweepMs = clampFloor(sweepPeriodMs(floors) * mutatorSweepMult(mutator))`.
  - Pass a `wordHeightMult` getter to `useCraneDrop` reading the current pending word →
    `commit(base * m.heightMult * wordHeightMult())`. Default `() => 1` (back-compat, endless).

## 4. Graphics / fun (declarative, testable)
- `WordTowerMutatorBanner.tsx` — neo card (icon + name + desc) on daily mount, auto-hides ~3s.
- Persistent mutator chip in the top bar (next to the daily badge) so the twist stays visible.
- Golden-letter tray highlight in `WordTowerHud` when `goldenLetter` is active.
- Combo-milestone fanfare: pure `comboMilestone(combo)` (3/5/10/20 → tier) + a banner pop.

## 5. Competitive (no schema)
- Share card (`/api/word-tower/share`) gains an optional `m` (mutator id) param →
  `WordTowerShareCard` renders the day's twist line. Brag surface that ties the shared daily.
- Existing rivals/chase-chip untouched.

## 6. Constraints / invariants
- Admin gate UNTOUCHED: `PageClient` `allowed = isAdmin || gameEnabled || isDev`; `dailyModes`
  `word-tower.adminOnly = true`.
- All UI text via `t()`, i18n ×5 (he RTL, en, sv, ja, es).
- TDD: pure modules first (mutators, anchor, combo milestone), then component wiring.
- Files < 500 lines.
