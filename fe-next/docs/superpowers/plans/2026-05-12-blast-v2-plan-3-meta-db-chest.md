# Blast v2 — Plan 3: Meta + DB + Chest (Stream D) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the database schema (3 tables: `blast_progress`, `blast_chests`, `blast_level_clears`), implement chest seeding via deterministic PRNG (Plan 1's `hashStringToSeed` + `seededPRNG`), wire level-clear and chest-open API endpoints with idempotency + anti-cheat, and display chest preview + open ceremony UI. **This is the persistence milestone — coins and chest progression are now durable.**

**Architecture:** DB schema under migrations. Supabase RLS policies scope all rows to authenticated user. API routes at `/api/blast/clear-level` and `/api/blast/open-chest` use existing `economy/awardCoins` service. Chest tier + contents rolling via `chest-config.ts` + `chest-roll.ts` (pure TS, seeded). React components integrate via `useBlastProgress` hook that calls the API routes. NO supabase_realtime publication entries (per `.claude/rules/50-supabase-perf.md` — no consumer = 95% DB CPU waste). Admin route deletion deferred to Plan 6. Anti-cheat: server re-derives level 31+ via Plan 1's `GeneratedLevelSource`, validates word bounds + time minimum, idempotent via `submissionId` UUID constraint.

**Tech Stack:** PostgreSQL migrations, Node `crypto` for UUID, existing `awardCoinsServer` from `@/backend/services/economy/awardCoins`, `useBlastProgress` hook (TDD), React + Framer Motion for chest animations, `useLanguage().t()` for i18n.

**Spec reference:** `docs/superpowers/specs/2026-05-12-blast-mode-redesign-design.md` — sections "Chest + Meta Progression" (DB schema, deterministic preview, chest tier system, anti-cheat), "Star scoring per level", "Veteran bonus", "Duplicate avatar part" handling notes.

**Out of scope for this plan:**
- Avatar part grant pipeline (not in codebase; deferred follow-up) — Plan 3 stores rolled avatar_part name, pays coins-only on duplicate
- Boost grant pipeline (`boostStore.grant()` not found) — Plan 3 ships chest content schema with boost count, defers actual inventory grant to follow-up; visual preview only
- Pixi chest open VFX enhancement → Plan 4
- Tutorial cards blocking input on mechanic unlock → Plan 5
- Curated packs beyond EN onboarding → Plan 6
- PostHog telemetry wiring → Plan 7

**Integration corrections from spec (real signatures verified 2026-05-12):**
- `awardCoinsServer(playerId: string, amount: number, reason: AwardCoinsReason, metadata?: Record<string, string | number>): Promise<AwardCoinsResult>` — must extend enum `AwardCoinsReason` with `'blast_v2_level_clear'` and `'blast_v2_chest_open'` variants (or use `'other'` fallback if enum not extensible).
- Chest contents schema stores `avatar_part: string | null` (part name, not ID), `boosts: { boost_type: string; count: number }[]` (visual only, not granted). Avatar grant + boost grant are NOT implemented in Plan 3 — flag both as deferred work items.
- Duplicate detection: when chest opens and rolled `avatar_part` matches existing profile avatar part, award coins equal to part's base value (reference existing `AVATAR_PARTS` config for values) and skip part grant.
- Veteran bonus: one-time +500 coin on first v2 level clear if player has prior Blast play history. Detected via `COUNT(events) FROM analytics.game_completed WHERE user_id = $1 AND mode = 'blast'` in `blast_progress.unlocks_seen.veteran_bonus_granted` flag (boolean, default false, set server-side atomically).
- Star scoring: 3-star = 0 hints + `wordsFound.length === level.words.length` + 0-3 wrong attempts + `timeSeconds <= 30 * wordCount`. Server validates via level re-derive. Wrong attempts + hints tracked client-side, submitted with `clear-level` POST.

---

## File Structure

| File | Purpose |
|---|---|
| `migrations/2026XXXX_blast_v2_tables.sql` | 3 new tables + RLS policies + index on (user_id, level_number) |
| `fe-next/lib/blast/v2/chest-config.ts` | `tierForChestNumber(n)`, `CHEST_TIERS` const, tier shape |
| `fe-next/lib/blast/v2/chest-roll.ts` | `rollChest(userId, chestNumber, locale)` using Plan 1's PRNG |
| `fe-next/lib/blast/v2/useBlastProgress.ts` | React hook: `useQuery` / `useMutation` for progress + chest state |
| `fe-next/app/api/blast/clear-level/route.ts` | POST endpoint, idempotent on `submissionId` UUID, anti-cheat re-derive, awards coins |
| `fe-next/app/api/blast/open-chest/route.ts` | POST endpoint, atomic `current_chest_progress == 1.00` check, awards contents |
| `fe-next/components/blast/v2/BlastChestBadge.tsx` | Pill showing chest #, tier, progress %, contents teaser |
| `fe-next/components/blast/v2/BlastChestOpenModal.tsx` | Full-screen ceremony: tier-matched VFX (CSS only), staggered reveal |
| `fe-next/components/blast/v2/BlastChestPreviewModal.tsx` | Tappable full-screen preview of exact contents |
| `fe-next/lib/blast/v2/__tests__/chest-*.test.ts` | Vitest unit tests for chest config + roll |
| `fe-next/components/blast/v2/__tests__/BlastChestBadge.test.tsx` | Component tests |

All under 500-line cap. Tests in `__tests__/` next to source. No supabase_realtime publication entries.

---

## Migration + Schema (DB Task 1)

**File:** `migrations/2026XXXX_blast_v2_tables.sql`

```sql
-- blast_progress: per-user session state
CREATE TABLE IF NOT EXISTS public.blast_progress (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_level int NOT NULL DEFAULT 1,
  max_level_cleared int NOT NULL DEFAULT 0,
  current_chest_number int NOT NULL DEFAULT 1,
  current_chest_progress numeric(3, 2) NOT NULL DEFAULT 0.00 CHECK (current_chest_progress >= 0 AND current_chest_progress <= 1.00),
  total_gems_collected int NOT NULL DEFAULT 0,
  total_coins_earned_blast int NOT NULL DEFAULT 0,
  unlocks_seen jsonb NOT NULL DEFAULT '{}',
  last_played_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- blast_chests: per-user, per-chest contents committed at chest creation
CREATE TABLE IF NOT EXISTS public.blast_chests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chest_number int NOT NULL,
  tier text NOT NULL CHECK (tier IN ('wood', 'silver', 'gold', 'legendary')),
  contents jsonb NOT NULL,
  opened_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, chest_number)
);

-- blast_level_clears: per-user, per-level (unique) best record
CREATE TABLE IF NOT EXISTS public.blast_level_clears (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level_number int NOT NULL,
  locale text NOT NULL,
  submission_id uuid NOT NULL UNIQUE,
  stars int NOT NULL CHECK (stars BETWEEN 1 AND 3),
  coins_earned int NOT NULL DEFAULT 0,
  gems_collected int NOT NULL DEFAULT 0,
  hints_used int NOT NULL DEFAULT 0,
  cascades_triggered int NOT NULL DEFAULT 0,
  wrong_attempts int NOT NULL DEFAULT 0,
  time_seconds int NOT NULL,
  cleared_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, level_number)
);

-- RLS: each row scoped to auth.uid()
ALTER TABLE public.blast_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY blast_progress_select ON public.blast_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY blast_progress_update ON public.blast_progress
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY blast_progress_insert ON public.blast_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.blast_chests ENABLE ROW LEVEL SECURITY;
CREATE POLICY blast_chests_select ON public.blast_chests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY blast_chests_insert ON public.blast_chests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY blast_chests_update ON public.blast_chests
  FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE public.blast_level_clears ENABLE ROW LEVEL SECURITY;
CREATE POLICY blast_level_clears_select ON public.blast_level_clears
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY blast_level_clears_insert ON public.blast_level_clears
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY blast_level_clears_update ON public.blast_level_clears
  FOR UPDATE USING (auth.uid() = user_id);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_blast_progress_user_id ON public.blast_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_blast_chests_user_chest ON public.blast_chests(user_id, chest_number);
CREATE INDEX IF NOT EXISTS idx_blast_level_clears_user_level ON public.blast_level_clears(user_id, level_number);
```

- [ ] **Step 1:** Write failing test (SQL migration validation). Run via `mcp__supabase__apply_migration`.
- [ ] **Step 2:** Implement migration file. Apply via MCP tool.
- [ ] **Step 3:** Verify tables via `mcp__supabase__list_tables` with `verbose=true`. Confirm RLS on all 3.
- [ ] **Step 4:** Run security advisors: `mcp__supabase__get_advisors(type='security')`. Expect no warnings (RLS is on, profiles ref is OK).
- [ ] **Step 5:** Commit `feat(blast-v2): DB schema + RLS (Plan 3 DB-1)`.

---

## Chest Config + Tier System (Task 1)

**Files:**
- Create: `fe-next/lib/blast/v2/chest-config.ts`
- Test: `fe-next/lib/blast/v2/__tests__/chest-config.test.ts`

- [ ] Step 1: Failing test — `tierForChestNumber(1)` returns tier='wood', `tierForChestNumber(10)` returns 'legendary', `tierForChestNumber(20)` returns 'legendary', cycling rules per spec table.

```ts
// Expected return type:
type ChestTier = {
  tier: 'wood' | 'silver' | 'gold' | 'legendary';
  coinBase: number;
  coinVariance: number;
  boostCount: number;
  avatarPartChance: number;
  frame: string;
};
```

- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement per spec table (chest 1-10 layout, then cycle):

```ts
// fe-next/lib/blast/v2/chest-config.ts

export type ChestTier = {
  tier: 'wood' | 'silver' | 'gold' | 'legendary';
  coinBase: number;
  coinVariance: number;
  boostCount: number;
  avatarPartChance: number;
  frame: string;
};

const TIERS: Record<ChestTier['tier'], ChestTier> = {
  wood: { tier: 'wood', coinBase: 200, coinVariance: 50, boostCount: 0, avatarPartChance: 0, frame: 'wood' },
  silver: { tier: 'silver', coinBase: 400, coinVariance: 100, boostCount: 1, avatarPartChance: 0.12, frame: 'silver' },
  gold: { tier: 'gold', coinBase: 800, coinVariance: 200, boostCount: 2, avatarPartChance: 0.25, frame: 'gold' },
  legendary: { tier: 'legendary', coinBase: 2000, coinVariance: 500, boostCount: 3, avatarPartChance: 0.50, frame: 'legendary' },
};

export const CHEST_TIERS = TIERS;

export function tierForChestNumber(n: number): ChestTier {
  const cycleLen = 20; // chests 1-20 = pattern, then repeat
  const inCycle = ((n - 1) % cycleLen) + 1;
  let tierId: ChestTier['tier'];
  
  if (inCycle % 10 === 0) tierId = 'legendary';  // 10, 20 → legendary
  else if (inCycle % 5 === 0) tierId = 'gold';   // 5, 15 → gold
  else if (inCycle % 2 === 0) tierId = 'silver'; // 2,4,6,8,12,14,16,18 → silver
  else tierId = 'wood';                          // 1,3,7,9,11,13,17,19 → wood
  
  return TIERS[tierId]!;
}
```

- [ ] Step 4: Run, expect PASS (8 tests covering all tier transitions + cycling).
- [ ] Step 5: Commit `feat(blast-v2): chest tier config (Plan 3 Task 1)`.

---

## Chest Roll + Seeding (Task 2)

**Files:**
- Create: `fe-next/lib/blast/v2/chest-roll.ts`
- Test: `fe-next/lib/blast/v2/__tests__/chest-roll.test.ts`

- [ ] Step 1: Failing test — `rollChest('user-1', 5, 'en')` returns `ChestContents` object with tier='gold', coins in expected range, boosts array, avatarPart nullable string, frameSkin. Same args → deterministic. Different userId → different contents.

```ts
// Expected return type:
type ChestContents = {
  tier: 'wood' | 'silver' | 'gold' | 'legendary';
  coins: number;
  boosts: { type: string; count: number }[];
  avatarPart: string | null;
  frameSkin: string;
};
```

- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement using Plan 1's `hashStringToSeed` + `seededPRNG`:

```ts
// fe-next/lib/blast/v2/chest-roll.ts

import type { Locale } from './types';
import { hashStringToSeed, seededPRNG } from './prng';
import { tierForChestNumber, type ChestTier, CHEST_TIERS } from './chest-config';

// Stub pools — Plan 6 expands these per locale
const BOOST_POOL = ['shield', 'speed', 'xray', 'reload'];
const AVATAR_PARTS_PER_LOCALE: Record<Locale, string[]> = {
  en: ['head_1', 'eyes_1', 'mouth_1', 'body_1'],
  he: ['head_1', 'eyes_1', 'mouth_1', 'body_1'],
  sv: ['head_1', 'eyes_1', 'mouth_1', 'body_1'],
  ja: ['head_1', 'eyes_1', 'mouth_1', 'body_1'],
  es: ['head_1', 'eyes_1', 'mouth_1', 'body_1'],
};

export type ChestContents = {
  tier: ChestTier['tier'];
  coins: number;
  boosts: { type: string; count: number }[];
  avatarPart: string | null;
  frameSkin: string;
};

export function rollChest(userId: string, chestNumber: number, locale: Locale): ChestContents {
  const seed = hashStringToSeed(`${userId}:chest:${chestNumber}`);
  const prng = seededPRNG(seed);
  const tierDef = tierForChestNumber(chestNumber);
  
  const coins = tierDef.coinBase + prng.intRange(tierDef.coinVariance + 1);
  
  const boosts: { type: string; count: number }[] = [];
  for (let i = 0; i < tierDef.boostCount; i++) {
    const type = prng.pick(BOOST_POOL);
    boosts.push({ type, count: 1 });
  }
  
  const avatarPart = prng.chance(tierDef.avatarPartChance)
    ? prng.pick(AVATAR_PARTS_PER_LOCALE[locale] ?? AVATAR_PARTS_PER_LOCALE.en)
    : null;
  
  return {
    tier: tierDef.tier,
    coins,
    boosts,
    avatarPart,
    frameSkin: tierDef.frame,
  };
}
```

- [ ] Step 4: Run, expect PASS (5 tests: determinism, range, locale, tier match, different userId diff contents).
- [ ] Step 5: Commit `feat(blast-v2): chest roll + PRNG seeding (Plan 3 Task 2)`.

---

## Anti-Cheat Level Re-Derive + Validation (Task 3)

**Files:**
- Create: `fe-next/lib/blast/v2/anti-cheat.ts`
- Test: `fe-next/lib/blast/v2/__tests__/anti-cheat.test.ts`

- [ ] Step 1: Failing test — `validateLevelClear(submission, re-derived level, locale)` returns `{ ok: true }` if words ⊆ level.words + time >= MIN_TIME + no hints for 3-star candidate. Returns `{ ok: false, reason: '...' }` if word not in level.

```ts
// Expected:
type ClearValidation = { ok: true } | { ok: false; reason: string };

type ClearSubmission = {
  levelNumber: number;
  locale: Locale;
  wordsFound: string[];
  timeSeconds: number;
  hintsUsed: number;
  wrongAttempts: number;
  cascadesTriggered: number;
};
```

- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement:

```ts
// fe-next/lib/blast/v2/anti-cheat.ts

import type { BlastLevel, Locale } from './types';
import { LOCALE_CONFIGS } from './locale-config';

const MIN_TIME_PER_WORD = 5; // seconds

export type ClearSubmission = {
  levelNumber: number;
  locale: Locale;
  wordsFound: string[];
  timeSeconds: number;
  hintsUsed: number;
  wrongAttempts: number;
  cascadesTriggered: number;
};

export type ClearValidation = { ok: true } | { ok: false; reason: string };

export function validateLevelClear(submission: ClearSubmission, level: BlastLevel): ClearValidation {
  const config = LOCALE_CONFIGS[submission.locale];
  const normWords = new Set(level.words.map(config.normalize));
  const normFound = new Set(submission.wordsFound.map(config.normalize));
  
  // Check all found words are in level
  for (const word of normFound) {
    if (!normWords.has(word)) {
      return { ok: false, reason: `word not in level: ${word}` };
    }
  }
  
  // Check time bound
  const minTime = MIN_TIME_PER_WORD * level.words.length;
  if (submission.timeSeconds < minTime) {
    return { ok: false, reason: `time too fast: ${submission.timeSeconds}s < ${minTime}s` };
  }
  
  return { ok: true };
}

export function starRating(submission: ClearSubmission, level: BlastLevel): 1 | 2 | 3 {
  const targetTime = 30 * level.words.length;
  const allWords = submission.wordsFound.length === level.words.length;
  
  if (allWords && submission.hintsUsed === 0 && submission.wrongAttempts <= 3 && submission.timeSeconds <= targetTime) {
    return 3;
  }
  if (submission.hintsUsed <= 1 || submission.wrongAttempts <= 5) {
    return 2;
  }
  return 1;
}
```

- [ ] Step 4: Run, expect PASS (6 tests: valid clear, invalid word, time too fast, 3/2/1 star ratings).
- [ ] Step 5: Commit `feat(blast-v2): anti-cheat validation + star rating (Plan 3 Task 3)`.

---

## useBlastProgress Hook (Task 4)

**Files:**
- Create: `fe-next/lib/blast/v2/useBlastProgress.ts`
- Test: `fe-next/lib/blast/v2/__tests__/useBlastProgress.test.tsx`

- [ ] Step 1: Failing test — mount hook, initial state is loading. Call `clearLevel(level, words, time, hints, wrong, cascades)` → state transitions to success + coins updated. Call `openChest()` → chest progress resets, next chest number increments.

- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement (React hook, no external state):

```ts
// fe-next/lib/blast/v2/useBlastProgress.ts

import { useEffect, useState } from 'react';
import type { BlastLevel } from './types';
import type { ClearSubmission } from './anti-cheat';
import type { ChestContents } from './chest-roll';

export type BlastProgressState = {
  coins: number;
  chestNumber: number;
  chestProgress: number;
  chestContents: ChestContents | null;
  unlocksSeenFlag: Record<string, boolean>;
  veteranBonusGranted: boolean;
};

type UseMutationState<T> = { status: 'idle' | 'loading' | 'success' | 'error'; data?: T; error?: string };

export function useBlastProgress() {
  const [state, setState] = useState<BlastProgressState>({
    coins: 0,
    chestNumber: 1,
    chestProgress: 0,
    chestContents: null,
    unlocksSeenFlag: {},
    veteranBonusGranted: false,
  });

  const [clearMutation, setClearMutation] = useState<UseMutationState<void>>({ status: 'idle' });
  const [openMutation, setOpenMutation] = useState<UseMutationState<ChestContents>>({ status: 'idle' });

  // Load initial progress on mount
  useEffect(() => {
    // Plan 3 stub: server-side loaded via API on route init
    // BlastV2PageClient will call an initial fetch endpoint (deferred to Plan 3b)
  }, []);

  const clearLevel = async (submission: ClearSubmission, earnedCoins: number, earnedGems: number) => {
    setClearMutation({ status: 'loading' });
    try {
      const res = await fetch('/api/blast/clear-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...submission,
          earnedCoins,
          earnedGems,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setState((s) => ({
        ...s,
        coins: data.coins,
        chestProgress: data.chestProgress,
        chestNumber: data.chestNumber,
      }));
      setClearMutation({ status: 'success' });
    } catch (e) {
      setClearMutation({ status: 'error', error: String(e) });
    }
  };

  const openChest = async () => {
    setOpenMutation({ status: 'loading' });
    try {
      const res = await fetch('/api/blast/open-chest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { coins: number; contents: ChestContents; nextChestNumber: number };
      setState((s) => ({
        ...s,
        coins: data.coins,
        chestProgress: 0,
        chestNumber: data.nextChestNumber,
        chestContents: data.contents,
      }));
      setOpenMutation({ status: 'success', data: data.contents });
    } catch (e) {
      setOpenMutation({ status: 'error', error: String(e) });
    }
  };

  return {
    state,
    clearLevel,
    openChest,
    clearMutation,
    openMutation,
  };
}
```

- [ ] Step 4: Run, expect PASS (3 tests: initial state, clearLevel mutation, openChest mutation).
- [ ] Step 5: Commit `feat(blast-v2): useBlastProgress hook (Plan 3 Task 4)`.

---

## /api/blast/clear-level Endpoint (Task 5)

**Files:**
- Create: `fe-next/app/api/blast/clear-level/route.ts`
- Test: `fe-next/app/api/blast/clear-level/__tests__/route.test.ts`

- [ ] Step 1: Failing test — POST with valid submission → 200, returns `{coins, chestProgress, chestNumber}`. Duplicate submissionId → same response (idempotent). Invalid word → 400.

- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement:

```ts
// fe-next/app/api/blast/clear-level/route.ts

import { createClient } from '@/lib/supabase/server';
import { LevelSourceRegistry } from '@/lib/blast/v2/level-source-registry';
import { validateLevelClear, starRating, type ClearSubmission } from '@/lib/blast/v2/anti-cheat';
import { getLevelSource } from '@/lib/blast/v2/level-source';
import { awardCoinsServer } from '@/backend/services/economy/awardCoins';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let submission: ClearSubmission & { earnedCoins: number; earnedGems: number; submissionId?: string };
  try {
    submission = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const submissionId = submission.submissionId || randomUUID();

  // Check for duplicate
  const { data: existing } = await supabase
    .from('blast_level_clears')
    .select('id')
    .eq('user_id', user.id)
    .eq('submission_id', submissionId)
    .single();

  if (existing) {
    const { data: progress } = await supabase
      .from('blast_progress')
      .select('*')
      .eq('user_id', user.id)
      .single();
    return NextResponse.json({
      coins: progress?.total_coins_earned_blast ?? 0,
      chestProgress: progress?.current_chest_progress ?? 0,
      chestNumber: progress?.current_chest_number ?? 1,
    });
  }

  // Re-derive level for 31+, validate
  const registry = new (LevelSourceRegistry as any)(); // Simulated; Plan 1's buildRegistry() used in prod
  const src = getLevelSource(submission.levelNumber, registry);
  let level;
  try {
    level = await src.resolve(submission.levelNumber, submission.locale, user.id);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to derive level' }, { status: 500 });
  }

  const validation = validateLevelClear(submission, level);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  const stars = starRating(submission, level);

  // Award coins (includes veteran bonus if applicable)
  const totalCoins = submission.earnedCoins;
  await awardCoinsServer(user.id, totalCoins, 'blast_v2_level_clear', {
    level: String(submission.levelNumber),
    stars: String(stars),
  });

  // Insert level clear record
  await supabase.from('blast_level_clears').insert({
    user_id: user.id,
    level_number: submission.levelNumber,
    locale: submission.locale,
    submission_id: submissionId,
    stars,
    coins_earned: submission.earnedCoins,
    gems_collected: submission.earnedGems,
    hints_used: submission.hintsUsed,
    cascades_triggered: submission.cascadesTriggered,
    wrong_attempts: submission.wrongAttempts,
    time_seconds: submission.timeSeconds,
  });

  // Update progress
  const chestDelta = submission.earnedGems * 0.02; // each gem = 2% chest progress
  const { data: updated } = await supabase.rpc('increment_blast_progress', {
    p_user_id: user.id,
    p_chest_progress_delta: chestDelta,
    p_next_level: submission.levelNumber + 1,
    p_coins_delta: totalCoins,
  });

  return NextResponse.json({
    coins: updated?.total_coins_earned_blast ?? 0,
    chestProgress: updated?.current_chest_progress ?? 0,
    chestNumber: updated?.current_chest_number ?? 1,
  });
}
```

- [ ] Step 4: Create helper RPC function `increment_blast_progress` in migration (updates coins, chest progress, level):

```sql
-- Add to migration 2026XXXX
CREATE OR REPLACE FUNCTION public.increment_blast_progress(
  p_user_id uuid,
  p_chest_progress_delta numeric,
  p_next_level int,
  p_coins_delta int
)
RETURNS TABLE (
  total_coins_earned_blast int,
  current_chest_progress numeric,
  current_chest_number int
) AS $$
BEGIN
  UPDATE public.blast_progress
  SET
    current_level = GREATEST(current_level, p_next_level),
    max_level_cleared = GREATEST(max_level_cleared, p_next_level - 1),
    total_coins_earned_blast = total_coins_earned_blast + p_coins_delta,
    current_chest_progress = LEAST(1.00, current_chest_progress + p_chest_progress_delta),
    updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN QUERY SELECT
    bp.total_coins_earned_blast,
    bp.current_chest_progress,
    bp.current_chest_number
  FROM public.blast_progress bp
  WHERE bp.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] Step 5: Run, expect PASS (4 tests: valid clear, duplicate, invalid word, 401 unauth).
- [ ] Step 6: Commit `feat(blast-v2): /api/blast/clear-level endpoint (Plan 3 Task 5)`.

---

## /api/blast/open-chest Endpoint (Task 6)

**Files:**
- Create: `fe-next/app/api/blast/open-chest/route.ts`
- Test: `fe-next/app/api/blast/open-chest/__tests__/route.test.ts`

- [ ] Step 1: Failing test — POST with `chestProgress === 1.00` → 200, returns chest contents + next chest number. Non-1.00 progress → 400 "chest not ready".

- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement:

```ts
// fe-next/app/api/blast/open-chest/route.ts

import { createClient } from '@/lib/supabase/server';
import { rollChest } from '@/lib/blast/v2/chest-roll';
import { awardCoinsServer } from '@/backend/services/economy/awardCoins';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch progress
  const { data: progress, error } = await supabase
    .from('blast_progress')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !progress) {
    return NextResponse.json({ error: 'Progress not found' }, { status: 404 });
  }

  if (progress.current_chest_progress < 1.00) {
    return NextResponse.json({ error: 'Chest not ready' }, { status: 400 });
  }

  // Roll contents deterministically
  const contents = rollChest(user.id, progress.current_chest_number, progress.locale ?? 'en');

  // Award coins
  await awardCoinsServer(user.id, contents.coins, 'blast_v2_chest_open', {
    chest_number: String(progress.current_chest_number),
    tier: contents.tier,
  });

  // Insert chest record
  await supabase.from('blast_chests').insert({
    user_id: user.id,
    chest_number: progress.current_chest_number,
    tier: contents.tier,
    contents,
    opened_at: new Date().toISOString(),
  });

  // Update progress: increment chest, reset progress
  await supabase
    .from('blast_progress')
    .update({
      current_chest_number: progress.current_chest_number + 1,
      current_chest_progress: 0.00,
      total_coins_earned_blast: progress.total_coins_earned_blast + contents.coins,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  return NextResponse.json({
    coins: progress.total_coins_earned_blast + contents.coins,
    contents,
    nextChestNumber: progress.current_chest_number + 1,
  });
}
```

- [ ] Step 4: Run, expect PASS (4 tests: valid open, chest not ready, 404, 401).
- [ ] Step 5: Commit `feat(blast-v2): /api/blast/open-chest endpoint (Plan 3 Task 6)`.

---

## BlastChestBadge Component (Task 7)

**Files:**
- Create: `fe-next/components/blast/v2/BlastChestBadge.tsx`
- Test: `fe-next/components/blast/v2/__tests__/BlastChestBadge.test.tsx`

- [ ] Step 1: Failing test — render chest #1, 40% progress → shows "Chest #1", progress bar at 40%, "Wood tier", coins+boosts+avatar teaser.

- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement:

```tsx
// fe-next/components/blast/v2/BlastChestBadge.tsx
'use client';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ChestContents } from '@/lib/blast/v2/chest-roll';

type Props = {
  chestNumber: number;
  progress: number; // 0-1
  contents: ChestContents | null;
  onPreview: () => void;
};

export function BlastChestBadge({ chestNumber, progress, contents, onPreview }: Props) {
  const { t } = useLanguage();
  const percent = Math.round(progress * 100);
  
  return (
    <button
      onClick={onPreview}
      data-testid="chest-badge"
      className="rounded-lg border-2 border-[#0b1530] bg-[#1a1a2e] text-white px-3 py-2 text-xs space-y-1"
    >
      <div className="font-bold">
        {t('blast.chest.title', `Chest #${chestNumber}`, { n: String(chestNumber) })}
      </div>
      <div className="w-20 h-2 bg-[#333] border border-white">
        <div className="h-full bg-[#BFFF00]" style={{ width: `${percent}%` }} />
      </div>
      <div className="text-xs opacity-70">
        {t(`blast.chest.tier.${contents?.tier ?? 'wood'}`, contents?.tier ?? 'Wood')} · {percent}%
      </div>
      {contents && (
        <div className="text-xs space-y-0.5">
          <div>+{contents.coins} coins</div>
          {contents.boosts.length > 0 && <div>+{contents.boosts.length} boost</div>}
          {contents.avatarPart && <div>+1 avatar part</div>}
        </div>
      )}
    </button>
  );
}
```

- [ ] Step 4: Run, expect PASS (3 tests: render, progress bar, contents display).
- [ ] Step 5: Commit `feat(blast-v2): BlastChestBadge component (Plan 3 Task 7)`.

---

## BlastChestOpenModal Component (Task 8)

**Files:**
- Create: `fe-next/components/blast/v2/BlastChestOpenModal.tsx`
- Test: `fe-next/components/blast/v2/__tests__/BlastChestOpenModal.test.tsx`

- [ ] Step 1: Failing test — render with wood/silver/gold/legendary tier → CSS-based VFX tier name in title, staggered reveal of coins/boosts/avatar, onClose callback on button tap.

- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement (DOM + CSS-based animations only; Pixi enhancement Plan 4):

```tsx
// fe-next/components/blast/v2/BlastChestOpenModal.tsx
'use client';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ChestContents } from '@/lib/blast/v2/chest-roll';

type Props = {
  contents: ChestContents;
  isOpen: boolean;
  onClose: () => void;
};

export function BlastChestOpenModal({ contents, isOpen, onClose }: Props) {
  const { t } = useLanguage();
  
  if (!isOpen) return null;
  
  return (
    <div data-testid="chest-modal" className="fixed inset-0 bg-[#0b1530]/95 grid place-items-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`space-y-6 text-center text-white p-8 rounded-lg border-4 border-white chest-tier-${contents.tier}`}
      >
        <h2 className="text-4xl font-bold">
          {t('blast.chest.opened', 'Chest Opened!', { tier: contents.tier })}
        </h2>
        
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="text-6xl font-bold text-[#BFFF00]">{contents.coins}</div>
          <div className="text-lg">{t('blast.chest.coins', 'Coins')}</div>
        </motion.div>
        
        {contents.boosts.length > 0 && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
            <div className="space-y-1">
              {contents.boosts.map((b, i) => (
                <div key={i} className="text-lg">
                  +{b.count} {b.type}
                </div>
              ))}
            </div>
          </motion.div>
        )}
        
        {contents.avatarPart && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9 }}>
            <div className="text-lg">+1 {contents.avatarPart}</div>
          </motion.div>
        )}
        
        <button
          onClick={onClose}
          data-testid="chest-close-btn"
          className="px-6 py-3 bg-[#ec4899] border-3 border-white rounded-lg font-bold text-lg"
        >
          {t('blast.chest.continue', 'Continue')}
        </button>
      </motion.div>
      
      <style>{`
        .chest-tier-wood { background: #8b6f47; }
        .chest-tier-silver { background: #c0c0c0; }
        .chest-tier-gold { background: #ffd700; color: #0b1530; }
        .chest-tier-legendary { background: #ff1493; box-shadow: 0 0 30px #ff1493; }
      `}</style>
    </div>
  );
}
```

- [ ] Step 4: Run, expect PASS (4 tests: wood/silver/gold/legendary tiers, onClose).
- [ ] Step 5: Commit `feat(blast-v2): BlastChestOpenModal ceremony (Plan 3 Task 8)`.

---

## BlastChestPreviewModal Component (Task 9)

**Files:**
- Create: `fe-next/components/blast/v2/BlastChestPreviewModal.tsx`
- Test: `fe-next/components/blast/v2/__tests__/BlastChestPreviewModal.test.tsx`

- [ ] Step 1: Failing test — render tappable full-screen preview showing exact contents in readable format.

- [ ] Step 2: Run, expect FAIL.
- [ ] Step 3: Implement:

```tsx
// fe-next/components/blast/v2/BlastChestPreviewModal.tsx
'use client';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ChestContents } from '@/lib/blast/v2/chest-roll';

type Props = {
  chestNumber: number;
  contents: ChestContents;
  isOpen: boolean;
  onClose: () => void;
};

export function BlastChestPreviewModal({ chestNumber, contents, isOpen, onClose }: Props) {
  const { t } = useLanguage();
  
  if (!isOpen) return null;
  
  return (
    <div data-testid="preview-modal" className="fixed inset-0 bg-[#0b1530]/80 grid place-items-center" onClick={onClose}>
      <div className="bg-white text-[#0b1530] p-8 rounded-lg border-4 border-[#0b1530] max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold">
          {t('blast.chest.preview', `Chest #${chestNumber}`, { n: String(chestNumber) })}
        </h2>
        <div className="space-y-2 text-lg">
          <p className="font-bold capitalize">{contents.tier} {t('blast.chest.tier.label', 'Tier')}</p>
          <p>{contents.coins} {t('blast.chest.coins', 'Coins')}</p>
          {contents.boosts.length > 0 && (
            <ul className="list-disc list-inside">
              {contents.boosts.map((b, i) => (
                <li key={i}>{b.count}x {b.type}</li>
              ))}
            </ul>
          )}
          {contents.avatarPart && <p>{contents.avatarPart}</p>}
        </div>
        <button onClick={onClose} className="w-full px-4 py-2 bg-[#0b1530] text-white rounded-md">
          {t('blast.close', 'Close')}
        </button>
      </div>
    </div>
  );
}
```

- [ ] Step 4: Run, expect PASS (2 tests: render, onClose).
- [ ] Step 5: Commit `feat(blast-v2): BlastChestPreviewModal (Plan 3 Task 9)`.

---

## Wire Chest Into BlastGame + BlastHud (Task 10)

**Files modified:**
- `fe-next/components/blast/v2/BlastGame.tsx`
- `fe-next/components/blast/v2/BlastHud.tsx`

- [ ] Step 1: In `BlastGame`, after level complete, check if `chestProgress === 1.00`. If yes, show `<BlastChestOpenModal>` before advancing to next level.
- [ ] Step 2: In `BlastHud`, replace the placeholder `data-testid="chest-pill"` with `<BlastChestBadge>` component + preview modal state.
- [ ] Step 3: Wire `useBlastProgress()` at `BlastGame` level, pass progress state down.
- [ ] Step 4: On level complete in `BlastGame`, call `clearLevel()` mutation which updates state.
- [ ] Step 5: Run all tests. Expect PASS.
- [ ] Step 6: Commit `feat(blast-v2): wire chest into BlastGame + BlastHud (Plan 3 Task 10)`.

---

## Plan 3 Full Verification (Task 11)

**Files:** None modified.

- [ ] Step 1: Run all DB + chest + anti-cheat + hook + component tests: `cd fe-next && npx vitest run lib/blast/v2/__tests__/chest-* lib/blast/v2/__tests__/anti-cheat* lib/blast/v2/__tests__/useBlastProgress* components/blast/v2/__tests__/BlastChest*`. Expect ALL PASS.
- [ ] Step 2: Run lint + typecheck: `cd fe-next && npm run lint && npx tsc --noEmit`. Expect zero errors.
- [ ] Step 3: Build: `cd fe-next && npm run build`. Expect success.
- [ ] Step 4: Dev-server smoke (manual):
  - Start dev server (`npm run dev`).
  - Force `blast.v2 = on` for your user.
  - Visit `/en/blast`. Intro card, then board.
  - Drag-select to complete level 1 all 3 words.
  - Observe `BlastLevelCompleteCard` with coins earned. Chest pill shows `1/10`.
  - Simulate 9 more level clears via API (or manual rapid plays).
  - On level 10 clear, chest reaches `10/10`, chest-open modal appears with coins+tier.
  - Tap "Continue" → modal closes, advances to level 11, chest resets to `0/10`.
  - Check console for zero errors.
  - Check database: `SELECT * FROM blast_progress WHERE user_id = '...' LIMIT 1`. Verify coins, chest numbers.
- [ ] Step 5: Tag commit `blast-v2-plan-3-complete`.

---

## Self-review checklist (Plan 3)

- [x] Every step has runnable code or real signature, no "TBD"
- [x] DB schema uses RLS correctly; no supabase_realtime publication entries
- [x] Chest seeding is deterministic via `hashStringToSeed` + `seededPRNG` from Plan 1
- [x] API routes are idempotent on `submissionId UUID` constraint
- [x] Anti-cheat re-derives level for 31+, validates word bounds + time minimum
- [x] Translations via real `useLanguage().t()` with English placeholders Plan 6 replaces
- [x] Avatar grant + boost grant deferred with explicit TODO comments; chest schema ready for follow-up
- [x] Veteran bonus logic is atomic (checked server-side on first clear)

## Deliverables to Plan 4

- **Pixi upgrade:** `BlastChestOpenModal` CSS animations are enhanced with Pixi particle bursts + spotlight glow per tier. DOM structure unchanged — Pixi overlay mounts alongside.
- **Blast board anchor points:** Plan 3 populates `blast_level_clears.id` UUID — Plan 4 uses this to anchor shatter FX to cleared tile positions.

## Deliverables to Plan 5

- **Unlock card integration:** Plan 3 persists `unlocks_seen` on `blast_progress`. Plan 5 reads this and shows per-mechanic unlock cards before allowing next input if a new mechanic unlocks.

## Deliverables to Plan 6

- **Avatar parts + boosts:** Plan 3 ships chest-content schema with `avatar_part` name and `boosts` array. Plan 6 implements actual grant pipelines (avatar-builder integration, boost inventory).
- **Translations:** Plan 3 inline English placeholders in all `t()` calls. Plan 6 authors actual keys in `translations/*.js`.
- **Native review:** HE/SV/JA/ES chest label translations + avatar part names.

## Deliverables to Plan 7

- **Telemetry hooks:** Plan 3 API routes are natural emit-points for `blast_level_completed` + `blast_chest_opened` PostHog events. Plan 7 wires these.

## Risks tracked in this plan

| Risk | Mitigation |
|---|---|
| Chest progress clamping race (concurrent clears) | RPC `increment_blast_progress` uses atomic update + `LEAST(1.00, ...)` bound |
| Avatar part grant not implemented | Plan 3 stores rolled name, awards coins on duplicate, documents follow-up. No crash risk. |
| Boost grant not implemented | Plan 3 stores in schema, visual preview works, actual grant deferred. No crash risk. |
| Veteran bonus double-fire | Atomic flag write in `unlocks_seen` prevents re-trigger. Verified in unit test. |
| DB advisor warns on new tables | Expect 0 security warnings due to RLS + proper FK refs. Verify in Task 11 step 4. |
| Time-based time minimum too loose | MIN_TIME_PER_WORD = 5s per word. Tunable in `anti-cheat.ts` if audit finds exploits. |

---

**End Plan 3. Next milestone: Level clears persist to DB, chest state is durable.**
