# Quick Play Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Beta-only `/quick-play` hub: draggable mode wheel (classic / blast legacy / word-hunt / wheel-rush + Random), 60s solo rounds scored vs solver-perfect, results with coins/XP/improvement/percentile/leaderboard/ghost-rival, seeded challenge-link viral loop, PostHog funnel tracking.

**Architecture:** New `components/quick-play/` (wheel, adapters, results, hub state machine) + thin `app/api/quick-play/*` routes over testable `backend/modules/quickPlay*.ts` modules + one Supabase migration. Reuses: `findAllWordsAsync` solver, `canSeeInWorkModes` beta gate, `components/daily/results/*`, `RivalCompareCard`, `fireConfetti`, `shareImageGenerator`, haptics/SFX singletons.

**Tech Stack:** Next.js 16, TypeScript, Tailwind (neo tokens), Vitest, Supabase (SQL migration + RPC), PostHog.

## Global Constraints

- All UI text via `t('quickPlay.solo.*')` — 6 locales: en, he, sv, ja, es, ru. Single-brace `{name}` interpolation.
- Max 500 lines/file. TDD mandatory (RED→GREEN per task).
- No bots: never import `botManager` in quick-play code.
- Beta gate: `canSeeInWorkModes` from `useAuth()` — render nothing until profile resolved (pitfall Class 1).
- Dark-only surfaces hardcode `bg-neo-navy` (pitfall Class 5). No fullscreen opacity entrance tweens on mobile.
- Double-submit: re-entrancy ref guard on round completion (pitfall Class 2).
- No table added to `supabase_realtime` publication (rule 50).
- Migration goes in `fe-next/supabase/migrations/`.
- Commit per task; ask user before each `git commit`.

---

### Task 1: Migration — tables + percentile RPC

**Files:**
- Create: `fe-next/supabase/migrations/20260706120000_quick_play.sql`

**Interfaces:**
- Produces: tables `quick_play_results`, `quick_play_challenges`; RPC `quick_play_percentile_today(p_score_pct numeric) → numeric`; RPC `get_quick_play_leaderboard(p_range text, p_limit int) → rows`.

- [ ] **Step 1: Write migration**

```sql
-- Quick Play (beta): solo rounds scored vs solver-perfect
CREATE TABLE public.quick_play_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('classic','blast','word-hunt','wheel-rush')),
  seed text NOT NULL,
  score integer NOT NULL CHECK (score >= 0),
  perfect_score integer NOT NULL CHECK (perfect_score > 0),
  score_pct numeric(5,2) NOT NULL CHECK (score_pct >= 0 AND score_pct <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quick_play_results_today_idx ON public.quick_play_results (created_at, score_pct);
CREATE INDEX quick_play_results_user_idx ON public.quick_play_results (user_id, mode, created_at DESC);

CREATE TABLE public.quick_play_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('classic','blast','word-hunt','wheel-rush')),
  seed text NOT NULL,
  challenger_score integer NOT NULL,
  challenger_score_pct numeric(5,2) NOT NULL,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_score integer,
  accepted_score_pct numeric(5,2),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quick_play_challenges_challenger_idx ON public.quick_play_challenges (challenger_id, created_at DESC);

ALTER TABLE public.quick_play_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_play_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY quick_play_results_select ON public.quick_play_results FOR SELECT USING (true);
CREATE POLICY quick_play_results_insert ON public.quick_play_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY quick_play_challenges_select ON public.quick_play_challenges FOR SELECT USING (true);
CREATE POLICY quick_play_challenges_insert ON public.quick_play_challenges FOR INSERT WITH CHECK (auth.uid() = challenger_id);
CREATE POLICY quick_play_challenges_accept ON public.quick_play_challenges FOR UPDATE USING (true) WITH CHECK (accepted_by = auth.uid());

-- Percentile among today's rounds; empty day → 100 (you're first, celebrate)
CREATE OR REPLACE FUNCTION public.quick_play_percentile_today(p_score_pct numeric)
RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    ROUND(100.0 * COUNT(*) FILTER (WHERE score_pct < p_score_pct) / NULLIF(COUNT(*), 0), 0),
    100
  ) FROM public.quick_play_results WHERE created_at >= date_trunc('day', now());
$$;

CREATE OR REPLACE FUNCTION public.get_quick_play_leaderboard(p_range text, p_limit int DEFAULT 50)
RETURNS TABLE (user_id uuid, best_score_pct numeric, best_score int, rounds bigint, rank bigint)
LANGUAGE sql STABLE AS $$
  SELECT user_id, MAX(score_pct), MAX(score), COUNT(*),
         RANK() OVER (ORDER BY MAX(score_pct) DESC, MAX(score) DESC)
  FROM public.quick_play_results
  WHERE (p_range = 'all' OR created_at >= date_trunc('day', now()))
  GROUP BY user_id
  ORDER BY 2 DESC, 3 DESC
  LIMIT p_limit;
$$;
```

- [ ] **Step 2: Apply via supabase MCP `apply_migration`, verify with `list_tables` (both tables present) and `SELECT public.quick_play_percentile_today(50);` → `100` on empty table**
- [ ] **Step 3: Commit** (`feat(quick-play): schema + percentile/leaderboard RPCs` — ask user first)

---

### Task 2: `quickPlayRound` module — seeded board + perfect score

**Files:**
- Create: `fe-next/backend/modules/quickPlayRound.ts`
- Test: `fe-next/backend/modules/__tests__/quickPlayRound.test.ts`

**Interfaces:**
- Consumes: `findAllWords(grid, language, options)` from `backend/modules/boggleSolver.ts:157`; existing seeded grid helpers in `utils/dailyChallenge/` (reuse its seeded RNG; if the RNG there is date-coupled, inline a mulberry32-style PRNG here).
- Produces:
```ts
export type QuickMode = 'classic' | 'blast' | 'word-hunt' | 'wheel-rush';
export type QuickRoundConfig = {
  mode: QuickMode; seed: string; durationSec: number;
  grid: string[][];            // classic/blast/word-hunt
  wheelLetters?: string[];     // wheel-rush only
  words: string[];             // solver word list (lowercase)
  perfectScore: number;
};
export async function buildQuickRound(mode: QuickMode, language: string, seed?: string): Promise<QuickRoundConfig>;
export function scoreWords(words: string[]): number; // same per-word length scoring the modes use
```

- [ ] **Step 1: RED — failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { buildQuickRound } from '../quickPlayRound';

describe('buildQuickRound', () => {
  it('same seed → identical board and perfectScore (deterministic)', async () => {
    const a = await buildQuickRound('classic', 'en', 'seed-1');
    const b = await buildQuickRound('classic', 'en', 'seed-1');
    expect(a.grid).toEqual(b.grid);
    expect(a.perfectScore).toBe(b.perfectScore);
  });
  it('no seed → generates one and returns it', async () => {
    const r = await buildQuickRound('blast', 'en');
    expect(r.seed).toBeTruthy();
    expect(r.perfectScore).toBeGreaterThan(0);
  });
  it('wheel-rush returns wheelLetters and perfect = sum of word scores', async () => {
    const r = await buildQuickRound('wheel-rush', 'en', 'seed-2');
    expect(r.wheelLetters).toHaveLength(8);
    expect(r.perfectScore).toBeGreaterThan(0);
  });
  it('word list is lowercase (Class-2 case pitfall)', async () => {
    const r = await buildQuickRound('classic', 'en', 'seed-1');
    expect(r.words.every((w) => w === w.toLowerCase())).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL (module missing).** `cd fe-next && npx vitest run backend/modules/__tests__/quickPlayRound.test.ts`
- [ ] **Step 3: GREEN — implement.** Seeded PRNG → grid via same letter-distribution helper daily uses; `findAllWords` (min length 3, language dict) → `words`; `perfectScore = scoreWords(words)`; wheel-rush: pick a seeded 8-letter wheel from the wheel puzzle generator used by `WordWheelChallenge` (or 8 letters of a seeded pangram-ish draw + solver over wheel-subset words). Blast/word-hunt share the classic grid path (`ponytail:` initial-grid max; cascade-aware later if % feels wrong).
- [ ] **Step 4: Run — PASS. Step 5: Commit** (ask user)

---

### Task 3: `quickPlaySubmit` module + API routes

**Files:**
- Create: `fe-next/backend/modules/quickPlaySubmit.ts`
- Create: `fe-next/app/api/quick-play/round/route.ts`
- Create: `fe-next/app/api/quick-play/submit/route.ts`
- Create: `fe-next/app/api/quick-play/leaderboard/route.ts`
- Test: `fe-next/backend/modules/__tests__/quickPlaySubmit.test.ts`

**Interfaces:**
- Consumes: `buildQuickRound` (Task 2); `awardCoinsServer` (`backend/services/economy/awardCoins.ts:32`); `increment_player_xp` + `increment_ghost_rival_score` RPCs via injected supabase client.
- Produces:
```ts
export type QuickSubmitInput = { userId: string; mode: QuickMode; seed: string; score: number;
  wordsFound: number; durationMs: number; challengeId?: string };
export type QuickSubmitOutcome = { scorePct: number; coins: number; xp: number;
  percentileToday: number; history: number[] };
export async function processQuickSubmit(db: SupabaseLike, input: QuickSubmitInput): Promise<QuickSubmitOutcome>;
```
- Routes: `POST /api/quick-play/round` `{mode, language, seed?}` → `QuickRoundConfig` (strip `words` for grid modes — client validates via mode's own validator; keep `words` for wheel-rush which needs them). `POST /api/quick-play/submit` → auth + `processQuickSubmit`. `GET /api/quick-play/leaderboard?range=today|all` → RPC rows + caller rank.

- [ ] **Step 1: RED — tests with stubbed db + stubbed buildQuickRound**

```ts
import { describe, it, expect, vi } from 'vitest';
vi.mock('../quickPlayRound', () => ({
  buildQuickRound: vi.fn().mockResolvedValue({ perfectScore: 1000, words: [], grid: [], seed: 's', mode: 'classic', durationSec: 60 }),
  scoreWords: (w: string[]) => w.length,
}));
import { processQuickSubmit } from '../quickPlaySubmit';

const db = () => {
  const rpc = vi.fn().mockResolvedValue({ data: 73, error: null });
  const insert = vi.fn().mockResolvedValue({ data: { id: 'r1' }, error: null });
  return { rpc, from: vi.fn(() => ({ insert, select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    update: vi.fn().mockReturnThis() })) } as any;
};

describe('processQuickSubmit', () => {
  it('rejects score above recomputed perfect', async () => {
    await expect(processQuickSubmit(db(), { userId: 'u', mode: 'classic', seed: 's', score: 5000, wordsFound: 1, durationMs: 60000 }))
      .rejects.toThrow(/score/i);
  });
  it('computes scorePct capped at 100 and returns percentile', async () => {
    const out = await processQuickSubmit(db(), { userId: 'u', mode: 'classic', seed: 's', score: 680, wordsFound: 9, durationMs: 60000 });
    expect(out.scorePct).toBe(68);
    expect(out.percentileToday).toBe(73);
  });
  it('awards coins scaled by scorePct and caps them', async () => {
    const out = await processQuickSubmit(db(), { userId: 'u', mode: 'classic', seed: 's', score: 1000, wordsFound: 20, durationMs: 60000 });
    expect(out.coins).toBeGreaterThan(0);
    expect(out.coins).toBeLessThanOrEqual(200);
  });
});
```

(vi.mock path note: test lives in `__tests__/`, module under test in parent — mock `../quickPlayRound`, NOT `./quickPlayRound` — known repo gotcha.)

- [ ] **Step 2: Run — FAIL. Step 3: GREEN — implement:** recompute perfect via `buildQuickRound(mode, lang, seed)`; reject `score > perfectScore * 1.0` for grid modes (wheel exact) with blast exception `score > perfectScore` → cap pct 100 but accept (cascades), reject only `> perfectScore * 3` (sanity); insert row; coins = `Math.min(200, Math.round(scorePct))` + 25 flat completion (`ponytail:` flat formula, tune from PostHog later); XP via `increment_player_xp` (existing caps apply); rival via `increment_ghost_rival_score`; challenge accept: update `quick_play_challenges` row when `challengeId` present; history = last 10 same-mode `score_pct` for the user.
- [ ] **Step 4: PASS. Step 5: Thin routes** — copy auth/rate-limit shape from `app/api/ghost-rival/route.ts:13-71`. **Step 6: Commit** (ask user)

---

### Task 4: `QuickPlayWheel` component

**Files:**
- Create: `fe-next/components/quick-play/QuickPlayWheel.tsx`
- Create: `fe-next/components/quick-play/wheelGeometry.ts`
- Test: `fe-next/components/quick-play/__tests__/wheelGeometry.test.ts`
- Test: `fe-next/components/quick-play/__tests__/QuickPlayWheel.test.tsx`

**Interfaces:**
- Consumes: `MODE_ICONS`, `MODE_ACTIVE_COLORS` (`components/GameModeSelector.tsx:24-46`); `haptics` singleton (`utils/haptics/HapticsManager.ts`); pointer-event pattern from `hooks/useWheelDragSpell.ts:54-110`.
- Produces:
```ts
export type WheelSelection = QuickMode | 'random';
export function QuickPlayWheel(props: {
  selection: WheelSelection;
  onSelect: (sel: WheelSelection, method: 'drag' | 'tap' | 'random') => void;
  onPlay: () => void;
}): JSX.Element;
// wheelGeometry.ts
export function nearestNode(dx: number, dy: number, deadZonePx: number): QuickMode | 'random';
export const NODE_ANGLES: Record<QuickMode, number>; // wheel-rush 0°, word-hunt 90°, blast 180°, classic 270°
```

- [ ] **Step 1: RED — geometry tests (pure, no DOM)**

```ts
import { describe, it, expect } from 'vitest';
import { nearestNode } from '../wheelGeometry';

describe('nearestNode', () => {
  it('inside dead zone → random', () => expect(nearestNode(5, -5, 24)).toBe('random'));
  it('drag up → wheel-rush', () => expect(nearestNode(0, -80, 24)).toBe('wheel-rush'));
  it('drag right → word-hunt', () => expect(nearestNode(80, 0, 24)).toBe('word-hunt'));
  it('drag down → blast', () => expect(nearestNode(0, 80, 24)).toBe('blast'));
  it('drag left → classic', () => expect(nearestNode(-80, 0, 24)).toBe('classic'));
  it('diagonal snaps to nearest', () => expect(nearestNode(70, -60, 24)).toBe('word-hunt'));
});
```

- [ ] **Step 2: FAIL → GREEN:** `nearestNode` = atan2 → nearest of 4 angles; dead zone returns random.
- [ ] **Step 3: RED — component test (jsdom):** render, fire `pointerdown/pointermove(0,-80)/pointerup` on knob → `onSelect('wheel-rush','drag')`; click a node → `onSelect(mode,'tap')`; knob shows RANDOM label when selection==='random'.
- [ ] **Step 4: GREEN — implement wheel:** DOM ring (nodes at NODE_ANGLES on 160px radius), knob follows pointer while dragging (`transform`, no re-render per move — ref + rAF like word-craft ghost), spring-back via CSS transition on release, `haptics.selection()` when hovered node changes, selected node scales up with `MODE_ACTIVE_COLORS` classes + tether div. PLAY button uses selected color family; dark surface `bg-neo-navy`. Mockup reference: Design System `quick-play/01-mode-wheel.html`.
- [ ] **Step 5: PASS. Step 6: Commit** (ask user)

---

### Task 5: Mode adapters

**Files:**
- Create: `fe-next/components/quick-play/adapters/QuickModeAdapter.tsx` (dispatcher + shared types)
- Create: `fe-next/components/quick-play/adapters/normalizeResult.ts`
- Test: `fe-next/components/quick-play/__tests__/normalizeResult.test.ts`

**Interfaces:**
- Consumes: `WordWheelGame` props `{puzzle, duration, onComplete(WordWheelGameResult), language, practice}` (`components/daily/WordWheelGame.tsx:37-42`); `DailyWordHuntSurvival` props `{grid, language, duration, onComplete(SurvivalGameResult), onQuit}` (`components/daily/DailyWordHuntSurvival.tsx:207`); `SinglePlayerGame` props `{settings, onGameEnd(SinglePlayerResultsData), onQuit}` (`components/singleplayer/SinglePlayerGame.tsx:33-41`); `BlastGame` legacy (`components/blast/legacy/BlastGame.tsx`) with quick config (smallest viable entry — pass initial grid + duration; refactor its config entry minimally if props missing).
- Produces:
```ts
export type QuickRoundResult = { mode: QuickMode; seed: string; score: number; perfectScore: number;
  scorePct: number; wordsFound: number; totalWords: number; durationMs: number };
export function QuickModeAdapter(props: { config: QuickRoundConfig; onDone: (r: QuickRoundResult) => void }): JSX.Element;
// normalizeResult.ts — pure, one fn per mode:
export function fromWordWheel(r: {wordsFound: string[]; score: number; timeSeconds: number}, cfg: QuickRoundConfig): QuickRoundResult;
export function fromSurvival(r: {score: number; wordsDiscovered: string[]}, cfg: QuickRoundConfig): QuickRoundResult;
export function fromSinglePlayer(r: {score: number; wordsFound: string[]}, cfg: QuickRoundConfig): QuickRoundResult;
export function fromBlast(r: {score: number; wordsFound: string[]}, cfg: QuickRoundConfig): QuickRoundResult;
```

- [ ] **Step 1: RED — normalize tests: each fixture → correct scorePct (rounded, capped 100), totalWords=cfg.words.length, blast score 1200 vs perfect 1000 → scorePct 100 (cap).**

```ts
import { describe, it, expect } from 'vitest';
import { fromWordWheel, fromBlast } from '../adapters/normalizeResult';
const cfg = { mode: 'wheel-rush', seed: 's', durationSec: 60, grid: [], words: ['cat','act','tact'], perfectScore: 500 } as any;

it('wheel result normalizes', () => {
  const r = fromWordWheel({ wordsFound: ['cat'], score: 100, timeSeconds: 60 }, cfg);
  expect(r).toMatchObject({ scorePct: 20, wordsFound: 1, totalWords: 3, perfectScore: 500 });
});
it('blast cascade overshoot caps at 100', () => {
  const r = fromBlast({ score: 1200, wordsFound: ['a','b'] }, { ...cfg, mode: 'blast', perfectScore: 1000 });
  expect(r.scorePct).toBe(100);
});
```

- [ ] **Step 2: FAIL → GREEN (pure fns). Step 3: dispatcher component** — switch on `config.mode`, mount the mode component with quick props (practice/hideCompetitive flags on WordWheelGame; no bots for SinglePlayerGame), single `onDone` guarded by re-entrancy ref (`if (doneRef.current) return; doneRef.current = true;`). **Step 4: Commit** (ask user)

---

### Task 6: Results screen

**Files:**
- Create: `fe-next/components/quick-play/QuickPlayResults.tsx`
- Create: `fe-next/components/quick-play/celebrationTier.ts`
- Test: `fe-next/components/quick-play/__tests__/celebrationTier.test.ts`

**Interfaces:**
- Consumes: `QuickRoundResult` + `QuickSubmitOutcome`; `RivalCompareCard` (`components/daily/RivalCompareCard.tsx:6-78`); `fireConfetti` (`utils/confettiUtils.ts:152`); results building blocks from `components/daily/results/` (ScoreBadge/RewardsSummary patterns — copy structure, don't force-fit daily props).
- Produces: `QuickPlayResults(props: { result; outcome; rival?: {name; score; scorePct; type: 'challenge'|'weekly'}; onNextRound: () => void; onChallenge: () => void })`.

- [ ] **Step 1: RED — celebrationTier tests**

```ts
import { describe, it, expect } from 'vitest';
import { celebrationTier } from '../celebrationTier';
// tiers: 0 none, 1 decent (pct>=50), 2 personal best, 3 beat rival, 4 top-10% today
it('picks highest applicable tier', () => {
  expect(celebrationTier({ scorePct: 40, isPersonalBest: false, beatRival: false, percentileToday: 30 })).toBe(0);
  expect(celebrationTier({ scorePct: 60, isPersonalBest: false, beatRival: false, percentileToday: 50 })).toBe(1);
  expect(celebrationTier({ scorePct: 60, isPersonalBest: true, beatRival: false, percentileToday: 50 })).toBe(2);
  expect(celebrationTier({ scorePct: 60, isPersonalBest: true, beatRival: true, percentileToday: 50 })).toBe(3);
  expect(celebrationTier({ scorePct: 60, isPersonalBest: true, beatRival: true, percentileToday: 91 })).toBe(4);
});
```

- [ ] **Step 2: FAIL → GREEN (pure fn).** **Step 3: Component:** layout per mockup `quick-play/02-round-results.html` — gauge (SVG stroke-dasharray count-up), improvement chip (`outcome.history` avg vs `result.scorePct`), coins/XP pills, percentile bar, rival card, leaderboard peek (fetch top3 + own rank from leaderboard API), CTAs. Confetti on mount scaled by tier (tier 0–1: none/small burst; 4: `fireConfetti` full + `haptics.success()`). Static appear (no opacity-0 entrance) — Class 5. **Step 4: Commit** (ask user)

---

### Task 7: Hub + route + beta gate + landing entry

**Files:**
- Create: `fe-next/app/[locale]/quick-play/page.tsx` (server: metadata `robots {index:false}` — copy `app/[locale]/adventure/layout.tsx:88-90` pattern)
- Create: `fe-next/app/[locale]/quick-play/PageClient.tsx`
- Create: `fe-next/components/quick-play/QuickPlayHub.tsx`
- Modify: landing mode cards list (`components/landing/LandingChallengeCards` and/or `lib/landing/modeMeta.ts`) — add Quick Play entry gated on `canSeeInWorkModes`
- Modify: `app/conditional-providers.tsx:38-55` — only if a chosen game component requires a provider from that stack (check at implementation; goal is NOT loading socket stack if avoidable)
- Test: `fe-next/components/quick-play/__tests__/QuickPlayHub.test.tsx`

**Interfaces:**
- Consumes: `useAuth().canSeeInWorkModes` (`contexts/auth/hooks/useAuthState.ts:103-106`); gate pattern `app/[locale]/adventure/PageClient.tsx:39-50`; Tasks 4–6 components; round/submit APIs.
- Produces: hub state machine `'wheel' | 'playing' | 'results'`; URL param handling `?challenge=<id>`.

- [ ] **Step 1: RED — hub test:** renders wheel initially; PLAY with selection 'random' resolves to one of 4 modes and fires PostHog `quick_play_mode_selected` with `method:'random'`; after adapter `onDone` → results state; "next round" → wheel with roundIndex+1. Mock adapters/APIs.
- [ ] **Step 2: FAIL → GREEN:** hub fetches `/api/quick-play/round` on PLAY, mounts adapter, submits on done (single-flight guard), shows results. Challenge param: fetch challenge row → banner + locked mode/seed. PageClient: beta redirect exactly like adventure. Landing card: same shape as existing beta entries.
- [ ] **Step 3: PASS. Step 4: Commit** (ask user)

---

### Task 8: Challenge share loop

**Files:**
- Create: `fe-next/components/quick-play/challengeShare.ts`
- Modify: `fe-next/components/quick-play/QuickPlayResults.tsx` (wire `onChallenge`)
- Test: `fe-next/components/quick-play/__tests__/challengeShare.test.ts`

**Interfaces:**
- Consumes: `shareWithFallback` (`utils/shareWithFallback.ts`); `shareImageGenerator` (`utils/shareImageGenerator.ts:39-80`); POST insert to `quick_play_challenges` via `/api/quick-play/challenge` (add thin route in this task, logic in `quickPlaySubmit.ts`: `createChallenge(db, {userId, mode, seed, score, scorePct}) → {id}`).
- Produces: `buildChallengeUrl(id: string, locale: string): string` → `${origin}/${locale}/quick-play?challenge=${id}`; `shareChallenge(result: QuickRoundResult, locale): Promise<void>` (creates row, generates share image, invokes Web Share/clipboard, fires `quick_play_challenge_shared`).

- [ ] **Step 1: RED:** `buildChallengeUrl('abc','he')` → `/he/quick-play?challenge=abc`; `shareChallenge` posts row then calls share with URL + localized text (mock fetch + navigator.share).
- [ ] **Step 2: FAIL → GREEN. Step 3: Accept side already wired in Task 7 (banner + locked seed); verify round-trip test: challenge accept submit includes `challengeId` → `processQuickSubmit` updates row (extend Task 3 test file).**
- [ ] **Step 4: Commit** (ask user)

---

### Task 9: i18n ×6 + analytics sweep

**Files:**
- Modify: `fe-next/translations/{en,he,sv,ja,es,ru}.js` — new `quickPlay.solo.*` block (title, beta, dragHint, selected, play, subCaption, roundComplete, ofPerfect, wordsFound, improvedBy, betterThan, rivalLead/rivalBehind/rivalTie, seeLeaderboard, nextRound, challengeFriend, challengeHint, challengeBanner, firstToday, betaOnlyToast)
- Test: extend existing translation-shape test if present; else `node -e "require('./translations/he.js')"` smoke per locale

**Steps:**
- [ ] **Step 1: Author en block; native (not literal) he/sv/ja/es/ru via fe-next:ux-writer skill conventions. Hebrew: gender-neutral rival phrasing (push-rival memory). Single-brace `{name}` placeholders.**
- [ ] **Step 2: Verify: `node --input-type=module -e` require each locale, assert `quickPlay.solo` key count identical across 6 files (Class-1 dup-block pitfall from `285ab14d3`).**
- [ ] **Step 3: Grep sweep: every PostHog event name from spec exists exactly once in client code; every user-visible string in quick-play components goes through `t()`.**
- [ ] **Step 4: Commit** (ask user)

---

### Task 10: Gates + live verify

- [ ] **Step 1:** `cd fe-next && npm run lint && npx tsc --noEmit` → 0 errors
- [ ] **Step 2:** `npx vitest run` scoped to changed dirs, then full suite → green (known pre-existing OOM flake: rerun sequentially if concurrent-session OOM)
- [ ] **Step 3:** `npm run build` → RC=0 verified by `.next/BUILD_ID` mtime (never trust wrapper rc — Class 4)
- [ ] **Step 4:** /verify skill: drive `/quick-play` locally (beta user), play one round each mode, confirm results/rewards/percentile render; `?locale=he` RTL pass
- [ ] **Step 5:** Final commit + push (ask user)

---

## Self-Review

- Spec coverage: wheel ✓(T4) rounds ✓(T2,T5) results ✓(T6) rewards ✓(T3) percentile/leaderboard ✓(T1,T3) rival ✓(T3,T6) viral loop ✓(T8) beta gate ✓(T7) analytics ✓(T7,T9) i18n ✓(T9) celebrations ✓(T6) no-bots ✓(constraint+T5).
- Types consistent: `QuickRoundConfig`/`QuickRoundResult`/`QuickSubmitOutcome` defined once (T2/T5/T3), consumed by name elsewhere.
- Known unknowns flagged in-task (Blast prop entry, wheel-rush puzzle source, conditional-providers need) with resolution instructions rather than placeholders.
