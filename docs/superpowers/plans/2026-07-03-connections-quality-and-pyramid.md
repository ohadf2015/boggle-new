# Connections Quality Overhaul + Bridge Pyramid — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every served Word Bridge puzzle pass a native dual-judge gate (fail-closed), enrich all puzzles with accepted answers + hints, refill starving locale pools (incl. ru), and ship the Bridge Pyramid daily mode (3 riddles → finale word connecting the 3 bridges).

**Architecture:** DB (`connections_puzzles`) stays source of truth; committed `.generated.ts` snapshots stay the runtime load path. Quality work = offline agent sweep writing `quality_score/accepted_answers/hint/is_active` + a one-line fail-closed gate in the materializer. Pyramid = new self-contained table + materialized pool + pure selection/state libs + UI reusing `PuzzleCard` for base riddles.

**Tech Stack:** Next.js 16 App Router, TypeScript, Vitest, Supabase (MCP for DB ops), Tailwind neo-brutalist system, i18n `t()` ×6 locales.

## Global Constraints

- All UI text via `t('key')`, keys added to ALL 6 translations (en/he/sv/ja/es/ru), native copy not literal translation.
- TDD RED-GREEN-REFACTOR; tests are source of truth.
- Files <500 lines, components <300.
- Quality gate threshold: `quality_score >= 60` (min of two judge scores).
- Deterministic daily selection: FNV-1a hash of `${dateISO}:${locale}` + mulberry32 (same as `lib/connections/daily.ts:84`).
- `npm run lint && npm run test && npm run build` before each commit; ask user before every `git commit`.

---

## Phase 1 — Quality (fail-closed pipeline)

### Task 1: Fail-closed materializer gate

**Files:**
- Modify: `fe-next/scripts/connections/materialize-puzzles.mjs:26-32`

**Interfaces:**
- Produces: materialized pools contain ONLY rows with `is_active AND quality_score >= 60`.

- [ ] **Step 1:** Add gate to the select query:

```js
const QUALITY_GATE = 60; // fail-closed: unscored (NULL) rows never ship
...
    .eq('is_active', true)
    .gte('quality_score', QUALITY_GATE)
```

(`.gte` on a NULL column excludes NULLs in PostgREST — that IS the fail-closed property.)

- [ ] **Step 2:** ponytail note in header comment: gate mirrors Word Hunt fail-closed serving. No unit test — script is a thin query wrapper; verification is Task 2 Step 5 SQL + regenerated snapshots. Do NOT run it yet (pools would empty before the sweep scores rows).

### Task 2: Dual-judge sweep of existing pool (content op, agent fan-out)

**Files:** none (DB writes via Supabase MCP). Runbook: append "How to re-run" section to the spec doc.

**Interfaces:**
- Produces: every row in `connections_puzzles` has `quality_score` (0–100), active rows have `hint` and ≥1 `accepted_answers` entry when variants exist; `is_active=false` where score <60. Admin `bad` verdicts (`connections_puzzle_reviews.verdict='bad'`) force `is_active=false` regardless of score.

- [ ] **Step 1:** Export batches: `select id, word1, bridge, word2, difficulty, hint from connections_puzzles where locale='<L>' order by id` — chunk 25/batch.
- [ ] **Step 2:** Per batch dispatch ONE sonnet agent that role-plays BOTH personas sequentially and returns per-puzzle JSON `{id, editorScore, designerScore, accepted[], hint, difficulty, reason}`:
  - **Native editor persona:** both `word1+bridge` and `bridge+word2` must each be a natural, instantly-recognizable compound/strong collocation for a native speaker. Hebrew: reversed smichut, English calques, technical terms (אוטובוס מפרקי), generic adjective pairings (סרט ישראלי, מדבר חם) → fail (<40).
  - **Puzzle designer persona:** bridge fairly guessable from the two words; no OTHER common word fits both slots better or equally (ambiguity → <50); difficulty label sane (fix it if not).
  - `accepted[]`: legitimate variants only (inflection, plural, spelling, he final-letter forms) — NOT synonyms that break the compound.
  - `hint`: native, evocative, does not contain the answer.
- [ ] **Step 3:** Agent applies its own batch via `mcp__supabase__execute_sql` UPDATE per row:

```sql
update connections_puzzles set
  quality_score = least(<editorScore>, <designerScore>),
  accepted_answers = array[...]::text[],   -- omit clause if empty
  hint = coalesce(nullif(<hint>,''), hint),
  difficulty = <difficulty>,
  is_active = (least(...) >= 60) and is_active,
  updated_at = now()
where id = '<id>';
```

  Agent returns counts only (scored/passed/failed) + 3 worst examples.
- [ ] **Step 4:** After all locales: enforce admin verdicts:

```sql
update connections_puzzles p set is_active=false, updated_at=now()
from connections_puzzle_reviews r where r.puzzle_id=p.id and r.verdict='bad' and p.is_active;
```

- [ ] **Step 5:** Verify (must all be true):

```sql
select locale, count(*) filter (where is_active and quality_score is null) unscored_active,
       count(*) filter (where is_active) active,
       count(*) filter (where is_active and (hint is null or hint='')) active_no_hint
from connections_puzzles group by locale;
-- unscored_active = 0 and active_no_hint = 0 everywhere; active >= 100 per locale (else Task 3 tops up)
```

- Order: he → en → es → sv → ja. Parallel batches (≤6 concurrent agents).

### Task 3: Pool refill — ru from zero, starving locales top-up (content op)

**Files:**
- Modify: `fe-next/lib/connections/puzzles/index.ts:3-22` (add ru import + map entry)
- Create: `fe-next/lib/connections/puzzles/generated/ru.generated.ts` (via materializer)

**Interfaces:**
- Produces: ≥150 active judged puzzles per locale (en he es sv ja ru); `RU_PUZZLES` export; `PUZZLES_BY_LOCALE.ru` wired.

- [ ] **Step 1:** Per locale below target: dispatch generation agents (sonnet), 20 candidates/agent. Prompt: produce word1·BRIDGE·word2 triples where both pairs are real, common compounds/strong collocations natives recognize instantly; mix difficulty; id format `<locale>-g2-<n>` (check max existing n first); include hint + accepted variants + one example pair. Russian: true compounds are rare — use rock-solid two-word collocations (грецкий ОРЕХ / ОРЕХ мускатный style) with unique bridges.
- [ ] **Step 2:** Every candidate passes the SAME dual judge as Task 2 (fresh judge agent, not the generator). Insert survivors:

```sql
insert into connections_puzzles (id, locale, word1, bridge, word2, accepted_answers, hint, examples, difficulty, source, is_active, quality_score)
values (..., 'generated', true, <score>)
on conflict (id) do nothing;
```

- [ ] **Step 3:** Dedup guard before insert: no existing row with same `(locale, bridge, word1)` or `(locale, bridge, word2)`.
- [ ] **Step 4:** Wire ru pool:

```ts
import { RU_PUZZLES } from './generated/ru.generated';
...
const PUZZLES_BY_LOCALE: Partial<Record<PuzzleLocale, ConnectionPuzzle[]>> = {
  en: EN_PUZZLES, he: HE_PUZZLES, es: ES_PUZZLES, sv: SV_PUZZLES, ja: JA_PUZZLES, ru: RU_PUZZLES,
};
```

  ru input path: add `ru` to the IME path (same as `ja` — check `localeNeedsIME` in PuzzleCard; Cyrillic needs device keyboard, on-screen keyboard is he/en/es/sv-only).
- [ ] **Step 5:** Run test to confirm existing pool tests pass with ru wired: `cd fe-next && npx vitest run lib/connections`.

### Task 4: Re-materialize + curated openings

**Files:**
- Modify: `fe-next/lib/connections/puzzles/generated/*.generated.ts` (regenerated)
- Modify: `fe-next/lib/connections/puzzles/index.ts:110-131` (CURATED_OPENING es/sv/ja/ru)

- [ ] **Step 1:** `cd fe-next && node scripts/connections/materialize-puzzles.mjs en he es sv ja ru` (now gated).
- [ ] **Step 2:** For es/sv/ja/ru pick 8 top-scored easy puzzles each (concrete, visual, distinct bridges — same criteria as the en list comment) and add to `CURATED_OPENING`.
- [ ] **Step 3:** `npx vitest run lib/connections` (openingCuration.test.ts asserts ids resolve to easy pool members). Fix ids if failing.
- [ ] **Step 4:** Commit Phase 1 (ask user first): `feat(connections): fail-closed quality gate, judged pools, ru locale`.

---

## Phase 2 — Bridge Pyramid mode

### Task 5: Schema + types + deterministic daily selection

**Files:**
- Create: migration `connections_pyramid_puzzles` (via `mcp__supabase__apply_migration`, name `20260703_connections_pyramid_puzzles`)
- Create: `fe-next/lib/connections/pyramid/types.ts`
- Create: `fe-next/lib/connections/pyramid/daily.ts`
- Create: `fe-next/lib/connections/pyramid/puzzles.ts` (pool accessor)
- Create: `fe-next/lib/connections/pyramid/__tests__/daily.test.ts`
- Create: `fe-next/scripts/connections/materialize-pyramids.mjs`

**Interfaces:**
- Produces: `PyramidPuzzle` type; `dailyPyramid(dateISO: string, locale: string): PyramidPuzzle | null`; `getPyramidsForLocale(locale: string): PyramidPuzzle[]`.

- [ ] **Step 1:** Migration:

```sql
create table public.connections_pyramid_puzzles (
  id text primary key,
  locale text not null,
  meta_answer text not null,
  meta_accepted text[] not null default '{}',
  meta_hint text,
  base jsonb not null, -- [{word1,bridge,word2,accepted:[],hint,difficulty}] length 3; bridge pairs with meta_answer
  difficulty text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  quality_score numeric,
  source text not null default 'generated',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index connections_pyramid_active_idx on public.connections_pyramid_puzzles (locale, is_active);
alter table public.connections_pyramid_puzzles enable row level security;
create policy "pyramid_public_read" on public.connections_pyramid_puzzles for select using (is_active);
-- writes: service role only (no insert/update policies)
```

- [ ] **Step 2:** `types.ts`:

```ts
import type { ConnectionPuzzle } from '../types';

/** One authored unit: 3 base bridge riddles whose bridges all pair with metaAnswer. */
export interface PyramidPuzzle {
  id: string;
  /** The finale answer M — forms a compound/strong collocation with each base bridge. */
  metaAnswer: string;
  metaAccepted?: string[];
  metaHint?: string;
  /** Exactly 3, played in order. */
  base: [ConnectionPuzzle, ConnectionPuzzle, ConnectionPuzzle];
  difficulty: ConnectionPuzzle['difficulty'];
}
```

- [ ] **Step 3 (RED):** `daily.test.ts` — write, run, expect FAIL (module missing):

```ts
import { describe, it, expect, vi } from 'vitest';
import { dailyPyramid } from '../daily';

vi.mock('../puzzles', () => ({
  getPyramidsForLocale: (locale: string) =>
    locale === 'xx' ? [] : [
      { id: 'en-pyr-001', metaAnswer: 'LIGHT', base: [b('a'), b('b'), b('c')], difficulty: 'medium' },
      { id: 'en-pyr-002', metaAnswer: 'HOUSE', base: [b('d'), b('e'), b('f')], difficulty: 'medium' },
      { id: 'en-pyr-003', metaAnswer: 'FIRE', base: [b('g'), b('h'), b('i')], difficulty: 'medium' },
    ],
}));
function b(k: string) {
  return { id: k, word1: 'W1', bridge: 'B' + k, word2: 'W2', difficulty: 'easy' as const };
}

describe('dailyPyramid', () => {
  it('is deterministic for (date, locale)', () => {
    expect(dailyPyramid('2026-07-03', 'en')?.id).toBe(dailyPyramid('2026-07-03', 'en')?.id);
  });
  it('varies across dates over a window', () => {
    const ids = new Set(['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04'].map((d) => dailyPyramid(d, 'en')?.id));
    expect(ids.size).toBeGreaterThan(1);
  });
  it('returns null on empty pool', () => {
    expect(dailyPyramid('2026-07-03', 'xx')).toBeNull();
  });
});
```

- [ ] **Step 4 (GREEN):** `daily.ts`:

```ts
import { mulberry32, fnv1aHash } from '@/lib/rng/seededRandom';
import { getPyramidsForLocale } from './puzzles';
import type { PyramidPuzzle } from './types';

/** Deterministic daily pyramid for (UTC date, locale) — same contract as dailyPuzzleSet. */
export function dailyPyramid(dateISO: string, locale: string): PyramidPuzzle | null {
  const pool = getPyramidsForLocale(locale);
  if (pool.length === 0) return null;
  const rng = mulberry32(fnv1aHash(`pyramid:${dateISO}:${locale}`));
  return pool[Math.floor(rng() * pool.length)];
}
```

  `puzzles.ts` mirrors `puzzles/index.ts` shape (map of generated imports; empty arrays until Task 7 materializes; `getPyramidsForLocale` falls back to `[]`, NOT en — a locale without native pyramids hides the mode).
- [ ] **Step 5:** `npx vitest run lib/connections/pyramid` → PASS.
- [ ] **Step 6:** `materialize-pyramids.mjs`: copy `materialize-puzzles.mjs` pattern; select `id,meta_answer,meta_accepted,meta_hint,base,difficulty` where `is_active and quality_score >= 60`; emit `PYRAMIDS_<LOCALE>` const of `PyramidPuzzle` literals mapping snake→camel and `base` jsonb → 3-tuple.

### Task 6: Pyramid game state machine (pure lib, TDD)

**Files:**
- Create: `fe-next/lib/connections/pyramid/gameLogic.ts`
- Create: `fe-next/lib/connections/pyramid/__tests__/gameLogic.test.ts`

**Interfaces:**
- Consumes: `checkGuess` from `../gameLogic` (base riddles are `ConnectionPuzzle`s), `PyramidPuzzle`.
- Produces:

```ts
export const FINALE_POINTS = 500;
export interface PyramidState {
  pyramid: PyramidPuzzle;
  stage: 0 | 1 | 2 | 3;            // 0-2 = base riddle index, 3 = finale
  lives: number;                    // shared pool, INITIAL_LIVES = 3
  score: number;
  solvedBridges: string[];          // revealed bridges (solved OR given up)
  gaveUpBase: boolean[];            // per base riddle, for share grid
  wrongAttempts: number;            // current stage
  hintRevealed: boolean;
  status: 'playing' | 'correct' | 'wrong' | 'gaveUp' | 'outOfLives' | 'won' | 'lost';
}
export function initPyramidState(pyramid: PyramidPuzzle): PyramidState;
export function pyramidGuess(state: PyramidState, input: string): PyramidState;
export function pyramidAdvance(state: PyramidState): PyramidState;   // after correct/gaveUp: next stage or won/lost
export function pyramidGiveUp(state: PyramidState): PyramidState;    // reveal, no life cost (parity with daily)
export function pyramidRevive(state: PyramidState): PyramidState;
export function checkFinaleGuess(input: string, pyramid: PyramidPuzzle): boolean;
```

- [ ] **Step 1 (RED):** tests — behaviors: init(stage 0, 3 lives); correct base guess scores by difficulty (`POINTS_BY_DIFFICULTY` parity: easy 100/medium 200/hard 350) and pushes bridge to `solvedBridges`; wrong guess costs life, resets nothing else; 3rd wrong → `outOfLives`... then `lost` on advance; giveUp reveals bridge (still feeds `solvedBridges`), flags `gaveUpBase[i]`; advance from stage 2 → stage 3 (finale); correct finale (via `metaAccepted`, canonicalized same as base: `checkFinaleGuess('lights', {metaAnswer:'LIGHT',...})` true) → `won`, +500; finale giveUp → `lost` with reveal. Run → FAIL.
- [ ] **Step 2 (GREEN):** implement. Finale check reuses `checkGuess` by constructing a synthetic `ConnectionPuzzle` `{ id: pyramid.id + ':finale', word1: '', word2: '', bridge: pyramid.metaAnswer, acceptedAnswers: pyramid.metaAccepted, difficulty: pyramid.difficulty }` — canonicalization (he sofit, diacritics, depluralize) comes free.
- [ ] **Step 3:** `npx vitest run lib/connections/pyramid` → PASS.

### Task 7: Pyramid content en+he (content op, agent fan-out)

**Files:**
- Create: `fe-next/lib/connections/puzzles/generated/pyramid.en.generated.ts`, `pyramid.he.generated.ts` (via materializer)
- Modify: `fe-next/lib/connections/pyramid/puzzles.ts` (imports)

**Interfaces:**
- Produces: ≥30 active judged pyramids per locale (en, he).

- [ ] **Step 1:** Generation agents (sonnet, 10 pyramids/agent): pick meta answer M with ≥3 strong compound partners; choose A,B,C; author a base riddle around each (word1·A·word2 etc., both pairs natural compounds); base riddles must NOT hint at M; ids `en-pyr-001…`; include hints + accepted variants for every slot.
- [ ] **Step 2:** Dual-judge each pyramid as a UNIT (fresh agent): every base riddle passes Task 2 criteria AND finale is fair (M is the clearly best word pairing with all three bridges; no rival word pairs with all 3). Score = min over 4 sub-puzzles; insert `is_active = score>=60`.
- [ ] **Step 3:** `node scripts/connections/materialize-pyramids.mjs en he`; wire imports in `pyramid/puzzles.ts`.
- [ ] **Step 4:** Sanity test run: `npx vitest run lib/connections/pyramid` (daily selection now over real pool).

### Task 8: Pyramid UI + route + i18n

**Files:**
- Create: `fe-next/components/connections/pyramid/PyramidChallenge.tsx` (orchestrator, <300 lines)
- Create: `fe-next/components/connections/pyramid/PyramidProgress.tsx` (3 base slots + apex)
- Create: `fe-next/components/connections/pyramid/FinaleCard.tsx` (3 clue words + input; reuse `ConnectionsKeyboard` + wrong-flash pattern from `PuzzleCard`)
- Create: `fe-next/components/connections/pyramid/__tests__/PyramidChallenge.test.tsx`
- Create: `fe-next/app/[locale]/connections/pyramid/page.tsx` (mirror `connections/daily/page.tsx` shell)
- Create: `fe-next/lib/connections/pyramid/shareGrid.ts` + test (pyramid emoji layout: `⬛/🟩/🟨/🟥` per base + apex row, callout, url)
- Modify: connections landing page (mode card) + daily results (cross-promo card) — locate exact files at execution (`app/[locale]/connections/page.tsx` area)
- Modify: `fe-next/translations/{en,he,sv,ja,es,ru}.js` — new `connections.pyramid.*` keys (title, intro, finalePrompt, cluesLabel, won, lost, share, cta) — native copy via fe-next:ux-writer conventions; anchor edits near the gameplay `connections` block (`whyItWorks` anchor gotcha).

**Component contract:**
- `PyramidChallenge` drives `PyramidState`; base stages render existing `PuzzleCard` with the current base `ConnectionPuzzle` (same props as daily usage — copy the wiring from `ConnectionsDailyChallenge.tsx`); stage 3 renders `FinaleCard {clues: string[3], onGuess, state}`; solved bridges animate into `PyramidProgress` slots.
- TDD: RED component tests first — renders 3-stage flow; solving 3 bases unlocks finale showing the 3 bridges as clues; finale correct → won screen with share; out of lives → lost + reveal. Use existing connections test utils/mocks (see `components/connections/__tests__/`).

- [ ] **Step 1 (RED):** component tests → FAIL.
- [ ] **Step 2 (GREEN):** implement components + page.
- [ ] **Step 3:** shareGrid TDD (RED→GREEN).
- [ ] **Step 4:** i18n keys ×6; run `node scripts/find-missing-translations.js` — no NEW gaps.
- [ ] **Step 5:** Entry points: landing mode card (hidden when `dailyPyramid(today, locale) === null`) + cross-promo on daily results.
- [ ] **Step 6:** RTL check: pyramid layout mirrors under `?locale=he`.

### Task 9: Full gate + ship

- [ ] **Step 1:** `cd fe-next && npm run lint` → 0 errors.
- [ ] **Step 2:** `npx tsc --noEmit` → 0.
- [ ] **Step 3:** `npm run test` (frontend + backend) → green (blast/legacy mpGrid OOM flake is pre-existing — rerun only that suite if it trips).
- [ ] **Step 4:** `npm run build` with `echo "RC=$?"` sentinel + check `.next/BUILD_ID` mtime (bg-task exit-masking rule).
- [ ] **Step 5:** Commit Phase 2 (ask user): `feat(connections): bridge pyramid daily mode`.

## Self-review notes

- Spec A4 (matching fairness) needs no code: `checkGuess` already canonicalizes + honors `acceptedAnswers` (`lib/connections/gameLogic.ts:54-61`); content sweep supplies the data. Covered by Task 2.
- Pyramid has NO leaderboard/score API in MVP (spec non-goal) — local streak via localStorage only if trivial, else omit (share grid is the retention hook).
- `available_from`/theme columns unused by pyramid MVP — YAGNI.
- ru IME path decision recorded in Task 3 Step 4.
