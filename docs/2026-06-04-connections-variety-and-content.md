# Connections — anti-monotony variety + content wave (2026-06-04)

Game mode: **Connections** = compound-bridge "missing link" riddle. A puzzle is
`word1 · BRIDGE · word2` where `word1+BRIDGE` and `BRIDGE+word2` are both real
compounds/phrases. The player sees `word1` and `word2` and guesses the hidden
`BRIDGE` (e.g. GRAPE·**VINE**·YARD = grapevine + vineyard).

## Problem
Players reported consecutive puzzles "feel too similar." The level-order
interleave only dispersed the exact **bridge** and **word1/word2 stems** — never
the **semantic theme**. Two puzzles with different bridges could still both feel
"food-ish" or "nature-ish." Measured: **en adjacent same-difficulty same-theme =
30.9%**. The daily challenge picked 5 puzzles via a plain seeded shuffle with
**zero** variety logic, so a day could surface duplicate bridges or near-identical
themes.

## What shipped

### 1. Theme classifier (all languages) — `lib/connections/theme.ts`
- `inferTheme({word1,word2,bridge,theme?})` → coarse `PuzzleTheme`
  (nature / body / food / structure / tool / clothing / misc).
- **Code-side lexicon, no DB column.** Precedence word1 → word2 → bridge → misc
  (the player sees word1/word2; the bridge is hidden). Explicit `theme?` on a
  puzzle overrides.
- **All 5 languages classified.** The lexicon carries stems for en + he + es +
  sv + ja (high-frequency pool tokens per language). This matters because the
  dispersal was previously a no-op outside English: Hebrew — the largest pool
  (445) — went from `comparable=0` adjacent theme-pairs (everything `misc`) to
  88, all dispersed (0% adjacency). Unknown tokens still fall through to `misc`
  gracefully (a mis-themed word only reorders, never breaks a puzzle).

### 2. Theme dispersal in the level run — `lib/connections/puzzles/index.ts`
`interleaveByBridge` rewritten as a deterministic penalty-greedy: bridge penalty
(hard, never adjacent unless every remaining item shares it), theme penalty
(soft), stem penalties (soft), plus a tiny "drain the biggest remaining bridge
bucket" tie-break. id-sorted base → pure & reproducible. **Result: en
theme-adjacency 30.9% → 0%** (bridge/stem dispersal unchanged, still <5%).

### 3. Daily variety — `lib/connections/daily.ts`
`pickWithVariety` staged greedy over the seeded-shuffled pool: strict
(bridge-unique + theme-unique + stem-unique) → relax stems → relax theme →
any-bridge. A daily set never repeats a bridge and never places two same
non-misc themes adjacently. **Intra-set only** — deliberately no cross-day
lookback (a daily must be reproducible from (date, locale) alone for leaderboard
integrity).

### 4. Content
- **English +65** (172 → 237 active). Sourced via `/claude-council:ask`
  (gemini-3-flash + grok-4.20), hand-vetted, then machine self-validated:
  `comp1 == word1+bridge` and `comp2 == bridge+word2` (separators/case stripped).
  This auto-rejected BULL·EYE (real word is "bull's-eye" — extra `s`, not a clean
  concatenation). Builder: `scripts/connections/build-en-variety-batch.mjs`.
- **Swedish +10** (62 → 72 active). Council candidates, then **objectively
  validated against the bundled `@arvidbt/swedish-words` dictionary (410k)**:
  every survivor has word1, word2, bridge AND both compounds as real dictionary
  words, with clean concatenation alignment. 26/36 candidates dropped (linking-s,
  form-shift, mis-segmentation, dict-absent). Builder:
  `scripts/connections/build-sv-variety-batch.mjs` (`--strict`).
- **Spanish +8** (63 → 71 active). Spanish uses `de`/`con` connectors, so the
  concat self-validator doesn't apply — instead I kept only the small set of
  textbook-common, single-token, pan-Spanish pairs I can vouch for by
  native-level judgment (media luna / luna de miel, café con leche / leche
  entera, hombre lobo, llave maestra / obra maestra, edad de piedra / piedra
  preciosa, cubo de hielo / hielo seco, vino blanco, libre albedrío). Dropped
  grok's multi-word idiom candidates ("dar la vuelta a la tortilla") that break
  the single-token board, and anything regional or needing a dropped connector
  ("todo **el** mundo"). Lower validation confidence than en/sv (no dictionary
  gate for phrasal Spanish) → batch kept deliberately small. ids `es-v-001..008`.
- **Japanese +30** (92 → 122 active). No LLM, no native judge: puzzles are
  **mined directly from the game's own curated common-word list**
  (`backend/common_hunt_words_ja.txt`). For every attested pair of two-kanji
  words (XY, YZ) sharing a middle kanji Y, X·Y·Z is a puzzle whose both
  compounds the game already recognizes. ~135 candidates were mined, then
  hand-curated to 30 with diverse bridges (30 distinct) and everyday clarity
  (入·口·笛 = 入口/口笛, 海·老·人 = 海老/老人, 納·豆·腐 = 納豆/豆腐, 花·火·山 =
  花火/火山). Builder `scripts/connections/build-ja-variety-batch.mjs`
  re-validates both compounds ∈ the common set, concat alignment, and dedups vs
  the existing pool. This sidesteps the hiragana-only-dictionary problem
  entirely — the common-word list contains kanji 二字熟語.

All content was inserted into `public.connections_puzzles` (source of truth) and
materialized to the committed `*.generated.ts` snapshots — diffs are purely
additive (en +65/-0, sv +10/-0, originals byte-identical → zero DB drift).

## Why content-add is leaderboard-safe
Growing a pool changes the whole-pool seeded shuffle, so `dailyPuzzleSet(<past
date>)` output changes. Verified this is consumed only for **today**: the daily
archive page shows stored stats (different endpoint), the leaderboard reads
stored `connections_daily_scores` rows, and only `maxDailyScore` recomputes — for
the today/yesterday anti-cheat ceiling, a generous upper bound, not a displayed
value.

## Tests
TDD throughout. `theme.test.ts` (classifier), `interleave.test.ts`
(theme-adjacency + existing bridge/stem caps), `daily.test.ts` (no dup bridge,
no adjacent same theme, determinism), `multiLangPool.test.ts` (sv-v compound
alignment guard), `en-pool.test.ts` (237 puzzles). 269 connections tests green;
frontend tsc + lint clean; production build compiled.

## Open / next
- es (63) and ja (92) pools still need native-validated content waves (es also
  needs a single-token reframing of the idiom candidates).
- Per-language theme lexicons would extend dispersal benefit beyond en (he/ja/es
  currently resolve mostly to `misc`, so they fall back to bridge/stem dispersal
  — no regression, just less theme signal).
