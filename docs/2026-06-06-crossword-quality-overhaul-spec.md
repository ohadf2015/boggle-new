# Crossword Quality Overhaul — Spec

**Date:** 2026-06-06
**Goal:** "Crossword isn't looking like a crossword at all and the puzzles are very weak — make it really worth it."

## Diagnosis (audit)

The crossword *engine* is sound: `buildGrid` (lib/crossword/grid.ts) already produces numbered
cells, across/down slots, and `null`→block cells; the renderer draws blocks and varied-length
words; RTL is solved (logical geometry, CSS mirroring). **The data is the disease.**

The 6 committed seeds (`lib/crossword/puzzles/seed.ts`) are **word squares, not crosswords**:

- `en-mini-001` = 3×3 where *every row AND every column* is a word (spa/ear/ant × sea/pan/art).
- All EN seeds 3×3, all HE seeds 3×3, all entries 3 letters, **zero black blocks**.

A word square reads as a tic-tac-toe letter grid, not a crossword. Three structural defects:

1. **Word-square data** — no blocks, every cell doubly a word, all equal length.
2. **Tiny + weak** — only 6 puzzles, all trivial 3-letter words.
3. **No Across/Down clue list** — only a single-clue bar; the iconic clue columns are absent.

Root cause in tooling: `scripts/crossword/findReal.ts` fills templates with `blocks: []` at
size 3–4 → the no-duplicate CSP yields double word squares by construction.

## What makes it a real crossword (quality invariants)

Enforced as tests over every committed puzzle (hard), plus construction-time quality targets:

**Hard (tested):**
- ≥1 block cell.
- Every entry is a real dictionary word, length ≥3 (validated against the live EN/HE dicts).
- Varied word lengths (not all-equal → not a word square).
- **Every slot has a non-empty clue** (no `crossword.noClue` fallback shipping).
- White cells form a single connected region.

**Quality targets (construction):**
- 180° rotational block symmetry (classic convention).
- Every white cell "checked" — in both an across and a down word (American standard; achievable at 5×5).
- Words common/cluable (curated; reject obscure fill).

## Approach

1. **Construction script** `scripts/crossword/build.ts`: fill symmetric **blocked** templates
   (5×5 corners/diagonal, one 7×7) from the **full** dictionary (a ~300-word common pool is too
   sparse to constrain a doubly-checked 5×5), gate on the invariants above, then **rank by
   common-word coverage** and flag rare words. Output = grids + slot answers for curation.
2. **Curate + clue (Opus authors):** pick the best ~10–12 EN + ~6 HE grids, reject any with an
   obscure/uncluable word, write a clue for **every** slot. Replace the word-square seeds.
3. **Locale scope:** EN + HE get real curated banks. sv/es/ja fall back to EN (already the code's
   behavior) — we do not fabricate puzzle quality in languages we cannot verify.
4. **Clue-list UI:** new `CrosswordClueList` — Across + Down columns, active-clue highlight,
   click-to-jump. Keep `ClueBar` for mobile focus. Blocks → pure black (reads more crossword-like).
5. **Tests:** invariant suite over the committed bank + TDD for the clue-list component.
6. **Verify in browser** against the `isAdminSession()`-gated route (LTR + Hebrew RTL). Quality is
   judged by looking, not by the test suite.

## Guardrails (keep, do not change)
- Admin gate stays (`app/[locale]/crossword/page.tsx`); verify *against* it.
- HE puzzles stored NORMALIZED (non-sofit); final forms applied at render boundary only.
- All UI text via `t()`; 5 languages.

## Out of scope
- Runtime/daily auto-generation at scale (the CSP makes valid *grids*, not good *clues*).
- sv/es/ja curated banks.
- Larger 11×11/15×15 grids (wrong context for mobile/party audience).
