---
name: connections-puzzle-craft
description: Generate and judge Connections (Word Bridge) puzzles for all locales — format laws, per-language collocation rules, ambiguity/uniqueness checks, pyramid construction algorithm, and the verified gen→judge→integrate pipeline. Use when creating, auditing, or integrating connections/pyramid puzzles in any language.
---

# Connections Puzzle Craft

Word Bridge: player sees `word1 + [?] + word2` and types the BRIDGE so that
**word1+bridge** AND **bridge+word2** are each a real word/set phrase.
EN example: GRAPE + [VINE] + YARD → grapevine + vineyard.
HE example: כאב + [ראש] + ממשלה → כאב ראש + ראש ממשלה.

Data lives in Supabase (`connections_puzzles`, `connections_pyramid_puzzles`),
ships via `scripts/connections/materialize-puzzles.mjs` / `materialize-pyramids.mjs`
into `lib/connections/puzzles/generated/*.generated.ts` (gate: `is_active AND quality_score >= 60`).

## Quality laws (a puzzle fails if ANY of these fails)

1. **Both sides real AS WRITTEN.** word1+bridge and bridge+word2 must each be a
   set phrase/compound a native instantly recognizes — letter-exact for fused
   compounds, no missing particles, correct agreement. "Plausible" ≠ real.
2. **No generic-adjective pairings.** `papeles importantes`, `קיץ ארוך`,
   `ЯРКАЯ ЗВЕЗДА НАДЕЖДЫ`-style poetic genitives are NOT set phrases. If the
   word2 could be swapped for 20 other adjectives, reject.
3. **Uniqueness (owner-flagged, top priority).** Brainstorm 5+ candidate
   bridges for the pair. If another word fits both sides equally naturally,
   either add it to `accepted_answers` or reject the puzzle (2+ equally-good
   answers = guessing lottery = reject).
4. **Hint never contains the answer** (or its root).
5. **word1/word2 are real standalone words** (no "ING", no fragments).
6. **Never cull for easiness alone.** Easy familiar compounds (BED·ROOM·MATE)
   are a deliberate feature — owner rule. Retier difficulty down instead.
   Cull only for laws 1–5.
7. **accepted_answers are ALTERNATIVE CORRECT ANSWERS** — every entry must
   itself satisfy law 1 for BOTH sides (typing it counts as solving!). Legit:
   inflections (foot→feet), spelling variants, a genuinely-valid second bridge
   (ГОРЯЧАЯ ЛИНИЯ + ЛИНИЯ ЗРЕНИЯ). Corrupt: unrelated words, the formed
   compounds themselves (fruktträd for bridge träd), one-side-only fits.
   2026-08 audit found 57 puzzles whose accepted_answers accepted WRONG
   answers — when you find these, WIPE the field, don't cull the puzzle
   (the core triple is usually fine).

## Per-language rules

- **en**: closed compounds or rock-solid two-word phrases (SCOTCH TAPE ok).
  Depluralized matching exists — accepted_answers should list plural variants.
- **he**: natural smichut/phrases in modern Israeli Hebrew. Store canonical
  spelling WITH sofit letters (game folds them). Reject: phrases needing
  articles (ראש **ה**שנה), backwards word order (מוזיקת פופ ≠ פופ מוזיקה),
  gender disagreement (נגינה קלאסי ✗). LLM he output historically ~30% keep —
  judge every item.
- **sv**: LETTER-EXACT closed compounds. Foge-s/joint letters kill puzzles:
  arbete+lag is invalid because the real word is arbet**s**lag.
- **ja**: both combos must be real common words (jukugo), JLPT N2-N3 level.
  accepted_answers carries hiragana readings. LLMs invent compounds (天風,
  面準) and even write hints admitting it — verify every kanji combo.
- **es**: fused compounds (rompecabezas) or unshakeable collocations
  (muelas del juicio). word2 may include its particle if that's the surface
  form displayed. Known failure mode: definitions in word2. Neutral Spanish.
- **ru**: famous set phrases as written with correct case/gender agreement
  (КРАСНАЯ НИТЬ + НИТЬ ЖИЗНИ). Reject invented poetic genitive chains, any
  Ukrainian word, truncated strings.

## Pyramid format law

3 base bridge-puzzles + meta_answer. Requirements:
- The 3 base bridges are **pairwise distinct and ≠ meta_answer**.
- meta_answer forms a real compound/phrase with EACH base bridge (either order).
- No base puzzle contains the meta as word1/word2 (spoils the finale).
- Correct example: meta LIGHT ← MOON/HEAD/SPOT (moonlight/headlight/spotlight),
  base for MOON = HONEY+[MOON]+SHINE.

**CRITICAL — the degenerate attractor:** LLM generation collapses into
`bridge == meta ×3` (meta STONE ← STONE/STONE/STONE) in ~90% of attempts,
even after explicit prohibition and correction rounds. NEVER trust free-form
pyramid generation. Use one of:
1. `node scripts/connections/mine/pyramids-from-pool.mjs <locales>` —
   deterministic, mines from the curated active pool, inherits its quality.
   Re-run whenever regular pools grow. PREFERRED.
2. Constrained generation: extract proven meta→partner lists from the pool
   first (partners = bridges co-occurring with the meta in active puzzles),
   hand the agent ONLY the base-puzzle authoring job, require an `_evidence`
   field spelling out all 9 formed words, then independently verify.

## Pipeline (verified 2026-08-01)

1. **Generate** (fable agent): read the locale's `*.generated.ts` first for
   conventions + dedupe. Self-judge ≥75. Output JSON (snake_case DB columns).
2. **Independent verify** (fresh fable agent, "ruthless native editor,
   default REJECT"): writes `rejects-<locale>.json` / `rejects-<locale>-pyr.json`.
   Generators self-score garbage at 75+; independent verification is NOT optional.
3. **Native tie-break** on borderline items; hand-patch salvageable pyramids.
4. **Integrate**: `node scripts/connections/integrate-aug2026-batch.mjs --dir <dir> [--apply] <locales>`
   — applies sweep culls (is_active=false, never delete), accepted_answers
   merges, downward retiers, structural pyramid law, reject unions, dedupe.
5. **Materialize + test**: `materialize-puzzles.mjs` / `materialize-pyramids.mjs`,
   then `vitest run lib/connections components/connections`.

Audit sweeps use the same laws; output `{"flags":[{id,reason,severity:"cull"|"review"}],
"add_accepted":[{id,additions}], "too_obvious":[{id,suggested_difficulty}]}`.
