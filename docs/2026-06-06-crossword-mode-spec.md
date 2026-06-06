# Crossword Mode — Spec (admin-only MVP)

Date: 2026-06-06 · Status: spec → implementing · Owner: founder

## Goal
New **Crossword** game mode. Admin-only for now. Languages: **EN + HE** first (5-lang
ready). **Offline-capable**. Maximize existing infra (per-language dictionary, connections
content-materialize pattern, Pixi FX, GSAP, offline SW/IndexedDB). Good + fun playability.

## Decisions (locked, post-advisor)
1. **Real clued crossword** — not codeword/cipher detour. A user asking for "a crossword"
   gets a crossword.
2. **Grid auto-generated from our dictionary** (CSP fill, build-time). This is the dict-infra
   leverage. Every across+down run is a valid dictionary word.
3. **Clues generated at BUILD time** (LLM), bundled per-locale as static `.generated.ts`
   (mirrors `lib/connections/puzzles/generated/*`). → fully offline, Hebrew scarcity solved
   not dodged. Admin-only = the natural clue-QA surface.
4. **Interactive grid is DOM, not Pixi.** DOM gives RTL cell-order (`direction: rtl`), text
   input, focus/cursor, on-screen keyboard, and screen-reader a11y for free. **Pixi = FX/
   celebration layer only** (word-complete burst, solve confetti) reusing `SharedFxApp`.
   **GSAP** = cell reveal/flip transitions, all reduced-motion gated.
5. **Phase 1 = pure logic, TDD-first** (generation, grid model, answer-check — pure functions).
   Then DOM render. Then Pixi FX. Correctness off the critical path of headless playtest.
6. **Defer** all competitive/leaderboard/party (it's admin-only — nobody's racing yet). No
   `crossword_daily_scores`, no speed-race, no relay in pass one.
7. **Hand-seed 2–3 puzzles per language now** so play is testable while the CSP solver matures.

## Infra reuse (verified)
- Dict build-time loaders: `fe-next/backend/dictionaryLoaders.ts`
  (`loadEnglishDictionary`, `loadHebrewDictionary`, `createSafeReadFile`). Node-readable, no HTTP.
- EN 142k words (955×3L, 2995×4L, 6366×5L). HE 351k (3032×3L, 22666×4L, 73316×5L). Abundant.
- Hebrew sofit normalization: `shared/utils/wordNormalization.ts` `normalizeHebrewWord`
  (raw file has sofits → store regular; apply sofit only at render boundary). No niqqud present.
- Per-language valid-letter regex + `normalizeWord(word, language)` already exist.
- Content materialize pattern: `scripts/connections/materialize-puzzles.mjs` →
  `lib/connections/puzzles/generated/{locale}.generated.ts` (static import-time constants).
- Daily determinism pattern: `lib/connections/daily.ts` (mulberry32 + seeded shuffle).
- Offline registry: `lib/offline/offlineCapableModes.ts` (add `crossword`).
- Pixi FX: `lib/pixiFx/SharedFxApp.ts` + `ParticlePool` (generation/live guards already fix
  the null-context rAF race). Motion gating: `AdaptiveMotion`, `useReducedMotion`,
  `useCalmMotion`, `useSkipAnimations`.
- Mode registration: `shared/types/game.ts` GameMode union; `components/GameModeSelector.tsx`
  (icons/colors/glow/labels); `components/landing/LandingChallengeCards.tsx` (card + admin
  gate `if (isAdmin …) next.push('crossword')`); admin route gate `lib/auth/isAdminSession.ts`.

## Data model

### Puzzle (authoring-time + bundled, no runtime DB needed for play)
```ts
// lib/crossword/types.ts
type Cell = { row: number; col: number; block: boolean; solution: string /* normalized, 1 char */ };
type Slot = {
  id: string;            // "A1" | "D3"
  dir: 'across' | 'down';
  number: number;        // grid number shown in start cell
  row: number; col: number;
  length: number;
  answer: string;        // normalized solution word
  clue: string;          // localized, build-time generated, admin-QA'd
};
type CrosswordPuzzle = {
  id: string;            // "en-mini-001"
  locale: PuzzleLocale;  // 'en' | 'he' | …
  size: number;          // grid is size×size (5 for mini MVP)
  rtl: boolean;          // he → true
  cells: Cell[];         // size*size, block cells have no solution
  slots: Slot[];
  difficulty: 'easy' | 'medium' | 'hard';
  source: 'authored' | 'generated';
};
```
Bundled per locale: `lib/crossword/puzzles/generated/{locale}.generated.ts` (array of puzzles).
Hand-seeded MVP puzzles live in `lib/crossword/puzzles/seed/{locale}.ts` until the generator
produces enough; both flow through the same loader/index.

### Runtime play state (client only, persisted to localStorage for resume + offline)
```ts
type CellEntry = string; // player letter, '' empty
type CrosswordProgress = {
  puzzleId: string;
  entries: Record<string /* "r,c" */, CellEntry>;
  status: 'playing' | 'solved';
  startedAt: number; elapsedMs: number;
  revealedCells: string[];     // for scoring honesty / no-penalty UX
  checkedAt?: number;
};
```
No DB writes in MVP (admin-only). Optional later: reuse `connections_daily_scores` shape.

## RTL / Hebrew handling
- Grid matrix is logical (row,col); **CSS `direction: rtl` on the grid container** flips
  across visual order right→left. Cell *order* is layout, not glyph shaping → single-letter
  DOM cells render correctly without bidi work.
- Solutions stored in **regular (non-sofit) form**. Display: when a cell is the last letter of
  any word, apply sofit form via `applyHebrewFinalLetters` at render only. Player input
  normalized via `normalizeWord(input,'he')` before compare (folds sofit → regular).
- Answer check: `normalizeWord(entered, locale) === slot.answer` (already-normalized).
- Niqqud: none in dict; strip from any pasted input defensively.

## Generation (build-time CSP)  `scripts/crossword/generate.mjs`
- Load dict via `dictionaryLoaders` → normalize (HE sofit) → index `byLength` and
  `byPosLetter` (`"pos_letter" → word[]`).
- Grid templates: start with classic symmetric 5×5 mini masks (few/no blocks). MVP = fully
  open 5×5 (10 slots: 5 across + 5 down) — densest, all-interlocking.
- Backtracking fill: most-constrained-slot-first (min remaining domain), random word from
  reduced domain, exponential backtrack on dead-end, `maxAttempts` cap. Timebox per puzzle
  (~500ms 5×5 is feasible per research). Reject grids with offensive/blocklisted words
  (reuse existing profanity filter if present; else simple blocklist).
- Output: write `*.generated.ts` per locale. **Clue pass**: for each answer, generate a clue
  via LLM (build-time script, batched, cached by `locale+answer`), default difficulty-aware,
  written into the puzzle. Admins later edit/replace via review UI (future phase).
- Seed fallback: hand-authored puzzles in `seed/` so the mode is playable before CSP output
  is curated.

## Playability / fun (MVP)
- Tap cell → highlight active slot (across or down); tap again or toggle button → switch dir.
- On-screen keyboard (localized: QWERTY for en, Hebrew layout for he) + hardware keyboard.
- Auto-advance to next empty cell on input; backspace moves back; skip filled cells.
- Toolbar: **Check** (green/red flash, no penalty), **Reveal letter**, **Reveal word**,
  clue bar showing current slot's clue (tap clue list to jump).
- Timer (display only MVP). On solve: GSAP cell cascade + Pixi confetti burst, "solved" card.
- Resume from localStorage. Reduced-motion: instant states, no Pixi spawn.

## Architecture / files (new)
```
lib/crossword/
  types.ts
  grid.ts            # buildGrid, numbering, slot extraction, cell⇄slot maps   (pure, TDD)
  generate.core.ts   # CSP fill from indexed dict (pure, TDD; used by build script)
  answer.ts          # normalize + check entry vs slot/grid, isSolved          (pure, TDD)
  daily.ts           # deterministic pick (date,locale) → puzzle               (pure, TDD)
  progress.ts        # localStorage load/save/resume                          (TDD)
  puzzles/
    index.ts         # loader + locale resolve (mirrors connections)
    seed/{en,he}.ts  # hand-seeded MVP puzzles
    generated/*.ts   # build-script output (later)
components/crossword/
  CrosswordView.tsx        # orchestrator
  CrosswordGrid.tsx        # DOM grid, RTL, focus/cursor
  CrosswordCell.tsx
  CrosswordKeyboard.tsx    # localized on-screen kbd
  ClueBar.tsx / ClueList.tsx
  CrosswordFx.tsx          # Pixi FX layer (SharedFxApp) + GSAP solve cascade
app/[locale]/crossword/
  page.tsx                 # isAdminSession() gate → notFound() else
  CrosswordClient.tsx      # dynamic import, providers
scripts/crossword/
  generate.mjs             # CSP + clue gen → generated/*.ts
```

## Phasing
- **P1 (now):** `types`, `grid`, `generate.core`, `answer`, `daily`, `progress` — all TDD.
  Hand-seed 2 EN + 2 HE puzzles. No UI yet.
- **P2:** DOM grid + cell + keyboard + clue bar/list, RTL, resume. Wire admin route + nav gate
  + i18n (5 langs). Playable.
- **P3:** Pixi FX + GSAP solve cascade, reduced-motion gated. Offline registry + SW shell.
- **P4 (build pipeline):** `generate.mjs` CSP + LLM clues → curate generated puzzles per locale.
- **Deferred:** leaderboard, speed-race, party team mode, admin clue-review UI.

## Testing
- Pure logic: Vitest, RED-GREEN-REFACTOR. Grid numbering, slot extraction (en LTR + he RTL),
  answer normalization (sofit fold), solved detection, daily determinism, progress resume.
- CSP: property test — every produced grid's across+down runs ∈ dictionary; terminates within
  attempt cap; HE normalized.
- Build/lint/tsc green. Live + RTL playtest at P2 (admin-gated; manual).

## Out of scope (MVP)
Multiplayer/realtime, leaderboard tables, coins/IAP for hints (wire to existing later),
themed weekly arcs, arrowword/codeword variants.
