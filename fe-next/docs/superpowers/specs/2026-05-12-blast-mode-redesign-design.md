# Blast Mode v2 — Redesign Design Spec

**Status:** Reconstructed 2026-05-14 from 7 execution plans, critique responses, jelly-tiles spec, and migration docs. Plans referenced this path; the file was never authored. This is the consolidated source of truth.

**Branch:** `feat/blast-v2-redesign` (73 commits, tags `blast-v2-plan-{1..7}-complete`, **unmerged**).

**Flag:** `blast.v2` (PostHog), default `false`. Legacy renders when off.

---

## 1. Goals

Replace legacy Blast with a Royal Match / Wordscapes hybrid: word-finding on a candy-collapse grid, deterministic across sessions, themed per locale, gated by a mechanic-unlock ladder, rewarded via tiered chests.

**Non-goals:** sabotage mechanics, multiplayer, lives/energy gating.

---

## 2. Data Model

```ts
export type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';
export type Letter = string;                          // single grapheme
export type CellId = `c${number}r${number}`;          // c=col, r=row from BOTTOM
export type TileFlag = 'coin' | 'gem' | 'frozen' | 'double_bonus';

export type ThemeKey =
  | 'onboarding'
  | 'fruits' | 'animals' | 'food' | 'ocean' | 'space'
  | 'nature' | 'sports' | 'colors' | 'transport' | 'body'
  | 'home' | 'school' | 'tools' | 'weather' | 'music'
  | 'jobs' | 'family' | 'numbers' | 'feelings'
  | 'mythology' | 'science' | 'travel' | 'art' | 'time';

export type BlastColumn = {
  index: number;        // 0 = leftmost (rendered rightmost in HE RTL)
  tiles: Letter[];      // index 0 = BOTTOM
};

export type BlastLevel = {
  id: string;
  levelNumber: number;
  theme: ThemeKey;
  locale: Locale;
  words: string[];
  columns: BlastColumn[];
  resolvableOrder: string[];
  tileFlags: Partial<Record<CellId, TileFlag[]>>;
  difficulty: number;
  gravityMode?: 'standard' | 'lateral-slide';
  hasPivot?: boolean;
  interestingnessScore?: number;
};

export type MechanicSet = {
  coinOverlay: boolean;
  reverseSelection: boolean;
  shuffleButton: boolean;
  gemTiles: boolean;
  frozenTiles: boolean;
  cascadeWords: boolean;
  doubleBonusTile: boolean;
  revealLetterHint: boolean;
  bonusDictionary: boolean;   // lvl 25+
};
```

`★ Insight ─────────────────────────────────────`
- `CellId` template type forces compile-time shape — runtime parse uses `String.match` not `regex.exec` (stateful `lastIndex` hazard on shared regex).
- Column bottom-indexed because gravity flows down; rendering layer inverts for top-anchored DOM.
- HE locale renders RTL via `dir="rtl"` on board root — engine IDs unchanged so logic stays locale-blind.
`─────────────────────────────────────────────────`

---

## 3. Content Sources (Strategy Pattern)

`LevelSource` interface, two impls selected by `getLevelSource(n)`:

| Range | Source | Why |
|---|---|---|
| 1–30 | `CuratedPackSource` | Reads `content/blast/packs/<locale>/pack-<theme>.json`. Hand-tuned FTUE. |
| 31+ | `GeneratedLevelSource` | Constraint solver + 5-axis interestingness scorer + regen loop. |

**Generator pipeline:** placement → tile-flag rolls → silhouette enforcement → interestingness scoring → reject below threshold. Deterministic via `hashStringToSeed(s) → seededPRNG(seed)` (Node `crypto`).

---

## 4. Locale Strategy

Per-locale `LocaleConfig` record:
- alphabet, RTL flag, final-form folding (HE), accent-fold (ES), å/ä/ö first-class (SV), hiragana V1 (JA)
- theme pools (~50 words/theme/locale, expanded from 3-8 seeds in Plan 6)
- `bonusDictionary: () => Promise<Set<string>>` — Plan 6 wires real Practice-mode loaders; Plan 1 ships stubs
- `HE_AMBIGUOUS_BLOCKLIST` for letter-final disambiguation

---

## 5. Mechanic Unlock Ladder

`mechanicsForLevel(n: number): MechanicSet` — incremental:

| Level | Unlock | Tutorial Card |
|---|---|---|
| 1 | base + 6-step FTUE | yes |
| 2-4 | `coinOverlay` | yes |
| 5+ | `reverseSelection`, `shuffleButton` | per-mechanic |
| 8+ | `gemTiles`, `frozenTiles` | yes |
| 12+ | `cascadeWords`, `doubleBonusTile` | yes |
| 18+ | `revealLetterHint` | yes |
| 25+ | `bonusDictionary` | yes |

Persisted to `blast_progress.unlocks_seen` (jsonb). Skip-all flow available from Settings.

---

## 6. Selection + Collapse Engine (Plan 2)

- **State machine:** stateless reducer; React hook `useBlastV2` wraps it
- **Selection overlay:** SVG path; tile anchors via `data-cell-id`
- **Validation:** dictionary + word-list + cascade detection
- **Gravity:** Framer Motion `layout` prop drives collapse; supports `'standard'` and `'lateral-slide'` modes
- **Cascade scoring:** generator scores *opportunity* (Plan 1); runtime detects *realized* cascades (Plan 2)

---

## 7. Star Scoring

3-star clear requires:
1. 0 hints used
2. `wordsFound.length === level.words.length`
3. ≤3 wrong attempts
4. `timeSeconds <= 30 * wordCount`

---

## 8. Database Schema (Plan 3)

```sql
CREATE TABLE public.blast_progress (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_level int NOT NULL DEFAULT 1,
  max_level_cleared int NOT NULL DEFAULT 0,
  current_chest_number int NOT NULL DEFAULT 1,
  current_chest_progress numeric(3,2) NOT NULL DEFAULT 0.00
    CHECK (current_chest_progress BETWEEN 0 AND 1.00),
  total_gems_collected int NOT NULL DEFAULT 0,
  total_coins_earned_blast int NOT NULL DEFAULT 0,
  unlocks_seen jsonb NOT NULL DEFAULT '{}',
  last_played_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.blast_chests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chest_number int NOT NULL,
  tier text NOT NULL CHECK (tier IN ('wood','silver','gold','legendary')),
  contents jsonb NOT NULL,
  opened_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, chest_number)
);

-- blast_level_clears: idempotency via submissionId UUID
```

**Anti-cheat:** server re-derives level 31+ via `GeneratedLevelSource` from seed, validates word bounds + min-time, dedupes on `submissionId`.

**Veteran bonus:** +500 coins one-time on first v2 clear if user has prior legacy Blast events. Atomic flip of `unlocks_seen.veteran_bonus_granted`.

**Duplicate avatar part:** convert to coin equal to part's base value, skip part grant.

---

## 9. FX Layer (Plan 4) — 18 Moments

Two Pixi canvases over the board:

| Layer | Component | Owns |
|---|---|---|
| L1 atmosphere | `BlastAtmosphereOverlay` | spotlight breathing, ambient dust, dotted-grid |
| L4 burst | `BlastFxOverlay` | shatter, cascade sparkles, coin/gem arcs, bonus shockwaves, chest tiers |

Facade hook: `useBlastFx({ boardRef, modeColor })` returns 14 typed methods. Reduced-motion gated via `useReducedMotion()` from `framer-motion`. Screen shake via `data-shake-key` increment on board root (CSS keyframes). Sprite assets under `/public/blast/v2/fx/` — missing files log warn, never crash.

---

## 10. Tile Visual Anatomy (Jelly Refresh, 2026-05-05 spec)

| Layer | Source | Change |
|---|---|---|
| cast shadow | `.candyShell` | softer blur, +2-4px down |
| base body | `TILE_VISUALS` | unchanged palette + inner radial vignette |
| edge translucency | NEW `.jellyRim` | bright desaturated ring (light through jelly edge) |
| mirror gloss | `.gloss` rewrite | curved top-55% highlight, `mix-blend-mode: screen` |
| micro-noise | `.gloss::before` | kept (anti-banding) |
| rim stroke | `.rim` | unchanged |
| letter | `.letter` | unchanged, verify legibility |

**Idle:** per-tile GSAP `rotateX/Y ±2° / 4s / yoyo`, phase randomized so grid never pulses in unison.
**Cascade fall:** `ease.in.cubic` → squash/stretch (scaleY 0.7→1.05→1, 200ms), stagger 0.04 per column.

---

## 11. Tutorial / FTUE (Plan 5)

- Level 1: 6-step overlay (non-blocking)
- Per-mechanic unlock cards (NOT hard-pause — critique convergent KILL)
- Skip-all flow → Settings replay UI
- Veteran detection: legacy Blast event count > 0 → mechanic cards condensed
- State: `UnlocksSeen` jsonb in `blast_progress.unlocks_seen`

---

## 12. Content Volumes (Plan 6)

- **150 curated levels:** 30 levels × 5 locales (JSON files)
- **25 theme backgrounds:** fal-ai/flux generated WebP
- **~1200 translation entries:** `blast.*` namespace × 5 locales (HE/SV/JA/ES tagged `// native-review-pending`)
- **Theme pools:** expanded from seed (~3-8 words) → ~50/theme/locale
- **Bonus-dict loaders:** `lib/blast/v2/bonus-dict-loaders.ts` exports `Record<Locale, () => Promise<Set<string>>>`

---

## 13. Telemetry (Plan 7)

11 typed event emitters. Example:

```ts
trackBlastLevelStarted({
  level: number;
  locale: Locale;
  theme: ThemeKey;
  mechanics: string[];   // truthy keys of MechanicSet
  // ...
});
```

Super-prop `is_cg` already wired in `CrazyGamesSDK.tsx`. Flag hook: `usePostHogFlag<boolean>('blast.v2', false)`. Experiments registry: `lib/experiments.ts` has `blast.v2` entry.

**Dashboards:** FTUE funnel, cascade rate, chest open rate, hint usage, avatar part excitement, tutorial skip rate (SQL in `docs/dashboards/blast-v2-*.sql`).

---

## 14. Convergent Design Decisions (from critique responses)

3-of-3 LLM critiques agreed — these are **load-bearing constraints**:

| Concern | Decision |
|---|---|
| Fail-soft cascade pause | KILL — hidden state recurrence |
| Hint costs 1 move | KILL — punishes already-stuck players |
| Hard-pause tutorial cards | KILL — flow break, TV/competitive friction |
| Color Power = pure luck | Rainbow paints neighbors (conversion mechanic) |
| Find The Word as hard gate | Reframe as bonus / auto-credit cascade clears |
| 3 goal types insufficient long-term | **Goal Stacking** — e.g. wave 25 = "Find Word using 4+ pink tiles" |
| Specials need agency | Royal Match pattern: match-N spawns temp special |
| Micro-achievement toasts | Move to end-of-wave card (3 = noise) |
| Ship order | Clarity sprint **first**, then new goals |

---

## 15. Success Criteria (3 Months Post-100%)

**Primary (must hit):**

| # | Metric | Target | Baseline |
|---|---|---|---|
| P1 | DAU on Blast (7d roll) | ≥110% legacy peak | week-0 legacy |
| P2 | D7 retention | ≥25% | legacy 12% |
| P3 | L1 → L5 funnel | ≥50% | legacy ~40% |
| P4 | Avg session length | ≥8 min | legacy ~6 min |
| P5 | Crash rate | ≤legacy + 0.5% | 0.8% |

**Secondary (directional):** S1 chest opens/DAU/wk ≥0.8 · S2 cascade rate 0.3-0.6 · S3 L1 FTUE completion ≥85% · S4 avatar part adoption ≥15% new · S5 hint usage/clear <1.5

---

## 16. Rollout Plan

**Phase 0 — Pre-launch:** flag OFF, CI green, design + i18n sign-off, dashboards built.
**Phase 1 — Internal (1 day):** `role IN ('admin','tester')`, ~5-10 real devices × 5 locales.
**Phase 2 — Staged (1 week):** Mon 10% → Tue 25% → Wed 50% → Fri 100%. Gate each step on D1 retention ≥ baseline + crash ≤ legacy + 0.5% + session ≥ baseline + DAU ≥ 80% legacy.
**Phase 3 — Legacy deletion (Phase 2 + 1 week stable):** delete legacy files, modify routing, remove experiments, build green.

**Emergency rollback:** any one metric red ≥12h OR two yellow ≥24h → flip `blast.v2 = false` (<5 min). Target re-launch 24-48h.

---

## 17. Plan Index

| Plan | Owns | Path |
|---|---|---|
| 1 | types, locale config, mechanic flags, level sources, generator | `superpowers/plans/2026-05-12-blast-v2-plan-1-foundations.md` |
| 2 | engine, hook, board components, gravity collapse, flag-gated route | `...plan-2-engine-rendering.md` |
| 3 | DB schema, chest seeding, level-clear/chest-open APIs, anti-cheat | `...plan-3-meta-db-chest.md` |
| 4 | Pixi overlays, 18 FX moments, reduced-motion gates | `...plan-4-fx-layer.md` |
| 5 | FTUE, unlock cards, skip-all, replay UI, veteran detect | `...plan-5-tutorial.md` |
| 6 | 150 curated packs, 25 theme images, ~1200 i18n, bonus dicts | `...plan-6-content.md` |
| 7 | PostHog events, dashboards, 4-phase rollout, legacy deletion | `...plan-7-telemetry-migration.md` |

Related: `plans/blast-cc-mechanics-2026-05-10.md` (jelly/cake/chocolate extensions), `plans/blast-tile-revival-2026-05-10.md` (audit-gated re-enable of 14 retired tiles, waves 8-11).

---

## 18. Known Deferred Work (per memory `blast-v2-plans-shipped-2026-05-12`)

- Native HE/SV/JA/ES translation review (AI-generated)
- 25 theme images (placeholders shipped)
- 150 curated level packs (skeleton shipped)
- Chest / FTUE / unlock-card telemetry wire-ins
- Phase 3 legacy deletion
- Branch merge to master
