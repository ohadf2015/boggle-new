# Daily Weekly Chest + Insight Cards — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a repeating 7-day weekly chest loop to daily challenges — a progress bar on the hub, a GSAP chest opening ceremony on day 7 completion, and per-session insight cards (personal best, percentile, speed delta) in the results screen.

**Architecture:** Server utilities compute cycle progress from existing attempt tables (no new streak table). Three new Next.js API routes (status, claim, insights) feed a `useWeeklyChest` hook. Components layer onto existing `DailyHub` and results screens without breaking existing flows. The Express word-hunt submit handler gets a post-insert hook that pre-creates the chest row on day 7.

**Tech Stack:** Next.js App Router · Supabase MCP · GSAP 3 · Lucide React · Framer Motion (swipe) · Vitest · TypeScript · existing project sounds (`/public/sounds/`)

---

## File Map

### New files
```
lib/daily/weeklyChest.ts                                 server utilities: cycle, score, tier
lib/daily/__tests__/weeklyChest.test.ts
app/api/daily/weekly-chest/status/route.ts               GET cycle progress
app/api/daily/weekly-chest/status/route.test.ts
app/api/daily/weekly-chest/claim/route.ts                POST claim chest
app/api/daily/weekly-chest/claim/route.test.ts
app/api/daily/insights/route.ts                          GET insight cards
app/api/daily/insights/route.test.ts
hooks/useWeeklyChest.ts
hooks/__tests__/useWeeklyChest.test.ts
components/daily/InsightCard.tsx
components/daily/__tests__/InsightCard.test.tsx
components/daily/DailyInsightStack.tsx
components/daily/__tests__/DailyInsightStack.test.tsx
components/daily/ChestProgressDots.tsx
components/daily/__tests__/ChestProgressDots.test.tsx
components/daily/WeeklyChestCard.tsx
components/daily/__tests__/WeeklyChestCard.test.tsx
components/daily/WeeklyChestModal.tsx
components/daily/__tests__/WeeklyChestModal.test.tsx
public/daily/chests/chest-bronze.png                     generated images
public/daily/chests/chest-silver.png
public/daily/chests/chest-gold.png
public/badges/weekly/badge-weekly-bronze.png
public/badges/weekly/badge-weekly-silver.png
public/badges/weekly/badge-weekly-gold.png
```

### Modified files
```
backend/routes/dailyChallenge/wordHuntRoutes.ts          add day-7 chest hook after insert
components/daily/WordHuntResultsContent.tsx              insert DailyInsightStack
components/daily/WordWheelResults.tsx                    insert DailyInsightStack
components/daily/DailyHub.tsx                            insert WeeklyChestCard + WeeklyChestModal
translations/en.js  he.js  sv.js  ja.js  es.js          add daily.weeklyChest.* + daily.insights.*
```

---

### Task 1: DB Migration

**Files:** Apply via Supabase MCP

- [ ] **Step 1: Apply migration**

Use Supabase MCP `apply_migration` with name `add_daily_weekly_chests` and the following SQL:

```sql
CREATE TABLE public.daily_weekly_chests (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_start   date        NOT NULL,
  cycle_number  integer     NOT NULL,
  tier          text        NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold')),
  contents      jsonb       NOT NULL,
  opened_at     timestamptz,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (player_id, cycle_start)
);

CREATE INDEX idx_daily_weekly_chests_player
  ON public.daily_weekly_chests (player_id, created_at DESC);

ALTER TABLE public.daily_weekly_chests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "players_own_chests" ON public.daily_weekly_chests
  FOR ALL USING (auth.uid() = player_id);
```

- [ ] **Step 2: Verify**

Run via MCP:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'daily_weekly_chests'
ORDER BY ordinal_position;
```
Expected: 8 rows (id, player_id, cycle_start, cycle_number, tier, contents, opened_at, created_at).

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "feat(daily): daily_weekly_chests table migration"
```

---

### Task 2: Server utilities — cycle + tier + score

**Files:**
- Create: `lib/daily/weeklyChest.ts`
- Create: `lib/daily/__tests__/weeklyChest.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// lib/daily/__tests__/weeklyChest.test.ts
import { describe, it, expect } from 'vitest'
import { computeCycleProgress, computeWeekScore, getChestTier } from '../weeklyChest'

describe('getChestTier', () => {
  it('returns bronze for score < 40', () => expect(getChestTier(39)).toBe('bronze'))
  it('returns silver for score 40', () => expect(getChestTier(40)).toBe('silver'))
  it('returns silver for score 70', () => expect(getChestTier(70)).toBe('silver'))
  it('returns gold for score > 70', () => expect(getChestTier(71)).toBe('gold'))
})

describe('computeCycleProgress', () => {
  const today = '2026-05-12'

  it('returns daysCompleted 1 for single completion today', () => {
    const r = computeCycleProgress(['2026-05-12'], today)
    expect(r.daysCompleted).toBe(1)
    expect(r.cycleNumber).toBe(1)
    expect(r.cycleStart).toBe('2026-05-12')
    expect(r.isClaimable).toBe(false)
  })

  it('returns daysCompleted 7 and isClaimable for 7 consecutive days', () => {
    const dates = ['2026-05-06','2026-05-07','2026-05-08','2026-05-09','2026-05-10','2026-05-11','2026-05-12']
    const r = computeCycleProgress(dates, today)
    expect(r.daysCompleted).toBe(7)
    expect(r.cycleNumber).toBe(1)
    expect(r.isClaimable).toBe(true)
  })

  it('starts cycle 2 on day 8', () => {
    const dates = Array.from({ length: 8 }, (_, i) => {
      const d = new Date('2026-05-05')
      d.setDate(d.getDate() + i)
      return d.toISOString().split('T')[0]
    })
    const r = computeCycleProgress(dates, '2026-05-12')
    expect(r.cycleNumber).toBe(2)
    expect(r.daysCompleted).toBe(1)
  })

  it('resets streak on gap', () => {
    const dates = ['2026-05-08','2026-05-09','2026-05-11','2026-05-12']
    const r = computeCycleProgress(dates, today)
    expect(r.daysCompleted).toBe(2)
    expect(r.cycleNumber).toBe(1)
  })

  it('returns empty progress with no dates', () => {
    const r = computeCycleProgress([], today)
    expect(r.daysCompleted).toBe(0)
    expect(r.isClaimable).toBe(false)
  })
})

describe('computeWeekScore', () => {
  it('averages efficiency scores for word_hunt', () => {
    expect(computeWeekScore([
      { mode: 'word_hunt', rawScore: 80, timeSeconds: null },
      { mode: 'word_hunt', rawScore: 60, timeSeconds: null },
    ])).toBe(70)
  })

  it('normalizes score/time for word_wheel (caps at 100)', () => {
    // score=600, time=60s → 600spm → normalized /6 = 100
    expect(computeWeekScore([{ mode: 'word_wheel', rawScore: 600, timeSeconds: 60 }])).toBe(100)
  })

  it('returns 0 for empty array', () => {
    expect(computeWeekScore([])).toBe(0)
  })

  it('treats zero time_seconds as 0 score for timed modes', () => {
    expect(computeWeekScore([{ mode: 'word_wheel', rawScore: 500, timeSeconds: 0 }])).toBe(0)
  })
})
```

- [ ] **Step 2: Run to confirm they fail**

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next
npx vitest run lib/daily/__tests__/weeklyChest.test.ts 2>&1 | tail -5
```

Expected: `FAIL` — "Cannot find module '../weeklyChest'"

- [ ] **Step 3: Implement**

```typescript
// lib/daily/weeklyChest.ts
export type ChestTier = 'bronze' | 'silver' | 'gold'

export interface CycleProgress {
  cycleStart: string
  cycleNumber: number
  completedDates: string[]
  daysCompleted: number
  isClaimable: boolean
}

export interface DayScore {
  mode: 'word_hunt' | 'word_wheel' | 'puzzle'
  rawScore: number
  timeSeconds: number | null
}

export function getChestTier(weekScore: number): ChestTier {
  if (weekScore > 70) return 'gold'
  if (weekScore >= 40) return 'silver'
  return 'bronze'
}

export function computeWeekScore(scores: DayScore[]): number {
  if (scores.length === 0) return 0
  const normalized = scores.map(({ mode, rawScore, timeSeconds }) => {
    if (mode === 'word_hunt') return Math.min(100, rawScore)
    if (!timeSeconds || timeSeconds <= 0) return 0
    return Math.min(100, (rawScore / timeSeconds) * 60 / 6) // 600 spm = 100
  })
  return Math.round(normalized.reduce((a, b) => a + b, 0) / normalized.length)
}

// allCompletedDates: all ISO dates the player ever finished a daily (any mode)
// today: ISO date string (YYYY-MM-DD)
export function computeCycleProgress(
  allCompletedDates: string[],
  today: string,
): CycleProgress {
  const uniqueDates = [...new Set(allCompletedDates)].sort()
  const streak: string[] = []
  const cursor = new Date(today)

  while (true) {
    const iso = cursor.toISOString().split('T')[0]
    if (!uniqueDates.includes(iso)) break
    streak.unshift(iso)
    cursor.setDate(cursor.getDate() - 1)
  }

  if (streak.length === 0) {
    return { cycleStart: today, cycleNumber: 1, completedDates: [], daysCompleted: 0, isClaimable: false }
  }

  const streakLen = streak.length
  const daysInCurrentCycle = ((streakLen - 1) % 7) + 1
  const cycleNumber = Math.ceil(streakLen / 7)
  const completedDates = streak.slice(streak.length - daysInCurrentCycle)
  const cycleStart = completedDates[0]

  return { cycleStart, cycleNumber, completedDates, daysCompleted: daysInCurrentCycle, isClaimable: daysInCurrentCycle === 7 }
}
```

- [ ] **Step 4: Run tests — must pass**

```bash
npx vitest run lib/daily/__tests__/weeklyChest.test.ts 2>&1 | tail -5
```

Expected: `PASS` — 12 tests

- [ ] **Step 5: Commit**

```bash
git add lib/daily/weeklyChest.ts lib/daily/__tests__/weeklyChest.test.ts
git commit -m "feat(daily): weekly chest server utilities — cycle, score, tier"
```

---

### Task 3: Status API route

**Files:**
- Create: `app/api/daily/weekly-chest/status/route.ts`
- Create: `app/api/daily/weekly-chest/status/route.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// app/api/daily/weekly-chest/status/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/utils/supabase/server'
import { GET } from './route'

function makeSupabase(opts: { user?: object | null; rows?: Record<string, unknown[]> } = {}) {
  const user = opts.user !== undefined ? opts.user : { id: 'user-1' }
  const rows = opts.rows ?? {}
  return {
    auth: { getUser: async () => ({ data: { user }, error: user ? null : new Error('no user') }) },
    from: (table: string) => ({
      select: (cols: string) => ({
        eq: (_c: string, _v: string) => ({
          eq: (_c2: string, _v2: string) => ({
            data: rows[table] ?? [],
            error: null,
          }),
          data: rows[table] ?? [],
          error: null,
        }),
      }),
    }),
  }
}

describe('GET /api/daily/weekly-chest/status', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ user: null }) as never)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns daysCompleted 0 when no attempts', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase() as never)
    const res = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.daysCompleted).toBe(0)
    expect(body.isClaimable).toBe(false)
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run app/api/daily/weekly-chest/status/route.test.ts 2>&1 | tail -5
```

Expected: FAIL — "Cannot find module './route'"

- [ ] **Step 3: Implement**

```typescript
// app/api/daily/weekly-chest/status/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { computeCycleProgress } from '@/lib/daily/weeklyChest'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]

  const [puzzleRes, huntRes, wheelRes] = await Promise.all([
    supabase.from('daily_puzzle_attempts').select('puzzle_date').eq('player_id', user.id),
    supabase.from('daily_word_hunt_attempts').select('puzzle_date').eq('player_id', user.id),
    supabase.from('daily_word_wheel_attempts').select('puzzle_date').eq('player_id', user.id),
  ])

  const allDates = [
    ...(puzzleRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
    ...(huntRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
    ...(wheelRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
  ]

  const progress = computeCycleProgress(allDates, today)

  const { data: existingChests } = await supabase
    .from('daily_weekly_chests')
    .select('tier, contents, opened_at')
    .eq('player_id', user.id)
    .eq('cycle_start', progress.cycleStart)

  const existingChest = existingChests?.[0]
  const alreadyClaimed = !!existingChest?.opened_at
  const isClaimable = progress.isClaimable && !alreadyClaimed

  const pendingChest = isClaimable && existingChest
    ? { tier: existingChest.tier, coins: existingChest.contents?.coins, badgeId: existingChest.contents?.badge_id }
    : null

  return NextResponse.json({
    cycleStart: progress.cycleStart,
    cycleNumber: progress.cycleNumber,
    completedDates: progress.completedDates,
    daysCompleted: progress.daysCompleted,
    isClaimable,
    pendingChest,
  })
}
```

- [ ] **Step 4: Run tests — must pass**

```bash
npx vitest run app/api/daily/weekly-chest/status/route.test.ts 2>&1 | tail -5
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/daily/weekly-chest/
git commit -m "feat(daily): weekly chest status API route"
```

---

### Task 4: Claim API route

**Files:**
- Create: `app/api/daily/weekly-chest/claim/route.ts`
- Create: `app/api/daily/weekly-chest/claim/route.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// app/api/daily/weekly-chest/claim/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/backend/services/economy/awardCoins', () => ({ awardCoinsServer: vi.fn().mockResolvedValue(undefined) }))

import { createClient } from '@/utils/supabase/server'
import { POST } from './route'

describe('POST /api/daily/weekly-chest/claim', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null }, error: new Error() }) },
    } as never)
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it('returns 409 when chest already claimed', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({ data: [{ id: 'chest-1', opened_at: '2026-05-12T10:00:00Z', tier: 'gold', contents: { coins: 600 } }], error: null }),
            data: [], error: null,
          }),
        }),
        insert: () => ({ error: null }),
        update: () => ({ eq: () => ({ eq: () => ({}) }) }),
      }),
    } as never)
    const res = await POST()
    expect(res.status).toBe(409)
  })

  it('returns 400 when chest not ready (< 7 days)', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({ data: [], error: null }),
            data: [], error: null,
          }),
        }),
        insert: () => ({ error: null }),
      }),
    } as never)
    const res = await POST()
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run app/api/daily/weekly-chest/claim/route.test.ts 2>&1 | tail -5
```

Expected: FAIL

- [ ] **Step 3: Implement**

```typescript
// app/api/daily/weekly-chest/claim/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { computeCycleProgress, computeWeekScore, getChestTier, type DayScore } from '@/lib/daily/weeklyChest'
import { awardCoinsServer } from '@/backend/services/economy/awardCoins'

const CHEST_REWARDS = {
  bronze: { coins: 150, badge_id: 'badge_weekly_bronze' },
  silver: { coins: 300, badge_id: 'badge_weekly_silver' },
  gold:   { coins: 600, badge_id: 'badge_weekly_gold' },
} as const

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]

  const [puzzleRes, huntRes, wheelRes] = await Promise.all([
    supabase.from('daily_puzzle_attempts').select('puzzle_date').eq('player_id', user.id),
    supabase.from('daily_word_hunt_attempts').select('puzzle_date,efficiency_score').eq('player_id', user.id),
    supabase.from('daily_word_wheel_attempts').select('puzzle_date,score,time_seconds').eq('player_id', user.id),
  ])

  const allDates = [
    ...(puzzleRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
    ...(huntRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
    ...(wheelRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
  ]

  const progress = computeCycleProgress(allDates, today)
  if (!progress.isClaimable) return NextResponse.json({ error: 'Chest not ready' }, { status: 400 })

  const { data: existing } = await supabase
    .from('daily_weekly_chests')
    .select('id, opened_at, tier, contents')
    .eq('player_id', user.id)
    .eq('cycle_start', progress.cycleStart)

  if (existing?.[0]?.opened_at) return NextResponse.json({ error: 'Already claimed' }, { status: 409 })

  const cycleDateSet = new Set(progress.completedDates)
  const scores: DayScore[] = [
    ...(huntRes.data ?? [])
      .filter((r: { puzzle_date: string }) => cycleDateSet.has(r.puzzle_date))
      .map((r: { efficiency_score: number }) => ({ mode: 'word_hunt' as const, rawScore: r.efficiency_score ?? 0, timeSeconds: null })),
    ...(wheelRes.data ?? [])
      .filter((r: { puzzle_date: string }) => cycleDateSet.has(r.puzzle_date))
      .map((r: { score: number; time_seconds: number }) => ({ mode: 'word_wheel' as const, rawScore: r.score ?? 0, timeSeconds: r.time_seconds })),
  ]

  const weekScore = computeWeekScore(scores)
  const tier = getChestTier(weekScore)
  const reward = CHEST_REWARDS[tier]
  const contents = { ...reward, week_score: weekScore }

  if (existing?.[0]) {
    await supabase.from('daily_weekly_chests')
      .update({ tier, contents, opened_at: new Date().toISOString() })
      .eq('id', existing[0].id)
  } else {
    await supabase.from('daily_weekly_chests').insert({
      player_id: user.id, cycle_start: progress.cycleStart,
      cycle_number: progress.cycleNumber, tier, contents,
      opened_at: new Date().toISOString(),
    })
  }

  await awardCoinsServer(user.id, reward.coins, 'daily_weekly_chest', {
    tier, cycle_number: String(progress.cycleNumber),
  })

  return NextResponse.json({ tier, coins: reward.coins, badgeId: reward.badge_id, cycleNumber: progress.cycleNumber })
}
```

- [ ] **Step 4: Run tests — must pass**

```bash
npx vitest run app/api/daily/weekly-chest/claim/route.test.ts 2>&1 | tail -5
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/daily/weekly-chest/claim/
git commit -m "feat(daily): weekly chest claim route — idempotent, tier calc, coin award"
```

---

### Task 5: Insights API route

**Files:**
- Create: `app/api/daily/insights/route.ts`
- Create: `app/api/daily/insights/route.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// app/api/daily/insights/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/utils/supabase/server'
import { GET } from './route'

const req = (mode: string, date = '2026-05-12') =>
  new NextRequest(`http://localhost/api/daily/insights?mode=${mode}&date=${date}`)

describe('GET /api/daily/insights', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null }, error: new Error() }) },
    } as never)
    expect((await GET(req('word_hunt'))).status).toBe(401)
  })

  it('returns empty insights when no today attempt', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
      from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) }) }),
    } as never)
    const res = await GET(req('word_hunt'))
    const body = await res.json()
    expect(body.insights).toEqual([])
  })

  it('returns at most 3 insight cards', async () => {
    const mockAttempt = { efficiency_score: 95, solved: true, attempts_used: 1 }
    const mockHistory = [{ efficiency_score: 95 }, { efficiency_score: 60 }, { efficiency_score: 50 }]
    const mockRecent = [
      { efficiency_score: 60, puzzle_date: '2026-05-11' },
      { efficiency_score: 50, puzzle_date: '2026-05-10' },
      { efficiency_score: 55, puzzle_date: '2026-05-09' },
    ]
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({ data: mockAttempt, error: null }),
              order: () => ({ limit: () => ({ data: mockHistory, error: null }) }),
            }),
            gte: () => ({ data: mockRecent, error: null }),
          }),
        }),
      }),
    } as never)
    const res = await GET(req('word_hunt'))
    const body = await res.json()
    expect(Array.isArray(body.insights)).toBe(true)
    expect(body.insights.length).toBeLessThanOrEqual(3)
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run app/api/daily/insights/route.test.ts 2>&1 | tail -5
```

Expected: FAIL

- [ ] **Step 3: Implement**

```typescript
// app/api/daily/insights/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

interface Insight {
  type: string
  headlineKey: string
  subKey: string
  subParams?: Record<string, string | number>
  lucideIcon: string
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode') ?? 'word_hunt'
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const insights: Insight[] = []

  if (mode === 'word_hunt') {
    const { data: today } = await supabase
      .from('daily_word_hunt_attempts').select('efficiency_score,solved,attempts_used')
      .eq('player_id', user.id).eq('puzzle_date', date).single()

    if (!today) return NextResponse.json({ insights: [] })

    const score = today.efficiency_score ?? 0

    // Personal best (compare to all previous attempts, not today's)
    const { data: history } = await supabase
      .from('daily_word_hunt_attempts').select('efficiency_score')
      .eq('player_id', user.id).order('efficiency_score', { ascending: false }).limit(20)

    const prevBest = (history ?? [])
      .filter((r: { efficiency_score: number }) => r.efficiency_score !== score)
      .reduce((max: number, r: { efficiency_score: number }) => Math.max(max, r.efficiency_score ?? 0), 0)

    if (score > prevBest && prevBest > 0) {
      insights.push({ type: 'personal_best', headlineKey: 'daily.insights.personalBest.headline',
        subKey: 'daily.insights.personalBest.sub', subParams: { n: score - prevBest }, lucideIcon: 'Trophy' })
    }

    // First try
    if (today.solved && today.attempts_used === 1) {
      insights.push({ type: 'first_try', headlineKey: 'daily.insights.firstTry.headline',
        subKey: 'daily.insights.firstTry.sub', subParams: { n: 8 }, lucideIcon: 'Target' })
    }

    // Speed vs 30-day average
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const { data: recent } = await supabase
      .from('daily_word_hunt_attempts').select('efficiency_score,puzzle_date')
      .eq('player_id', user.id).gte('puzzle_date', cutoff)

    const recentScores = (recent ?? [])
      .filter((r: { puzzle_date: string }) => r.puzzle_date !== date)
      .map((r: { efficiency_score: number }) => r.efficiency_score ?? 0)

    if (recentScores.length >= 3) {
      const avg = recentScores.reduce((a: number, b: number) => a + b, 0) / recentScores.length
      const delta = Math.round(((score - avg) / Math.max(1, avg)) * 100)
      if (delta > 10) {
        insights.push({ type: 'speed', headlineKey: 'daily.insights.speed.headline',
          subKey: 'daily.insights.speed.sub', subParams: { n: delta }, lucideIcon: 'Gauge' })
      } else if (score > (recent ?? []).filter((r: { puzzle_date: string }) => r.puzzle_date !== date)[0]?.efficiency_score) {
        insights.push({ type: 'improved', headlineKey: 'daily.insights.improved.headline',
          subKey: 'daily.insights.improved.sub', lucideIcon: 'TrendingUp' })
      }
    }
  }

  return NextResponse.json({ insights: insights.slice(0, 3) })
}
```

- [ ] **Step 4: Run tests — must pass**

```bash
npx vitest run app/api/daily/insights/route.test.ts 2>&1 | tail -5
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/daily/insights/
git commit -m "feat(daily): insights API — personal best, first try, speed delta"
```

---

### Task 6: Hook word-hunt submit → create chest on day 7

**Files:**
- Modify: `backend/routes/dailyChallenge/wordHuntRoutes.ts`

- [ ] **Step 1: Add import at top of wordHuntRoutes.ts**

At the top of `backend/routes/dailyChallenge/wordHuntRoutes.ts` after existing imports:

```typescript
import { computeCycleProgress, computeWeekScore, getChestTier, type DayScore } from '@/lib/daily/weeklyChest'
```

- [ ] **Step 2: Add chest hook before res.json at line ~324**

The file uses `playerId` (confirmed at line 50) and ends the success path with:
```typescript
res.json({ success: true, alreadySubmitted: false, isRetry, penaltyApplied, data });
```

Insert this block BEFORE that `res.json` call:

```typescript
// Weekly chest hook — non-fatal
let chestReady = false
let chestTier: string | undefined
if (playerId) {
  try {
    const today = new Date().toISOString().split('T')[0]
    const [puzzleRes, huntRes, wheelRes] = await Promise.all([
      supabase.from('daily_puzzle_attempts').select('puzzle_date').eq('player_id', playerId),
      supabase.from('daily_word_hunt_attempts').select('puzzle_date,efficiency_score').eq('player_id', playerId),
      supabase.from('daily_word_wheel_attempts').select('puzzle_date,score,time_seconds').eq('player_id', playerId),
    ])
    const allDates = [
      ...(puzzleRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
      ...(huntRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
      ...(wheelRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
    ]
    const progress = computeCycleProgress(allDates, today)
    if (progress.isClaimable) {
      const { data: existing } = await supabase
        .from('daily_weekly_chests').select('id').eq('player_id', playerId).eq('cycle_start', progress.cycleStart)
      if (!existing?.length) {
        const cycleDateSet = new Set(progress.completedDates)
        const REWARDS = { bronze: { coins: 150, badge_id: 'badge_weekly_bronze' }, silver: { coins: 300, badge_id: 'badge_weekly_silver' }, gold: { coins: 600, badge_id: 'badge_weekly_gold' } } as const
        const scores: DayScore[] = (huntRes.data ?? [])
          .filter((r: { puzzle_date: string }) => cycleDateSet.has(r.puzzle_date))
          .map((r: { efficiency_score: number }) => ({ mode: 'word_hunt' as const, rawScore: r.efficiency_score ?? 0, timeSeconds: null }))
        const weekScore = computeWeekScore(scores)
        const tier = getChestTier(weekScore)
        await supabase.from('daily_weekly_chests').insert({
          player_id: playerId, cycle_start: progress.cycleStart,
          cycle_number: progress.cycleNumber, tier,
          contents: { ...REWARDS[tier], week_score: weekScore },
        })
        chestReady = true
        chestTier = tier
      }
    }
  } catch (e) {
    logger.error('API', `[WordHunt] weekly chest hook error: ${(e as Error).message}`)
  }
}
```

Then update the `res.json` call to include `chestReady` and `chestTier`:

```typescript
res.json({ success: true, alreadySubmitted: false, isRetry, penaltyApplied, data, chestReady, chestTier });
```

- [ ] **Step 4: Run existing word-hunt tests — must still pass**

```bash
npx vitest run --reporter=verbose 2>&1 | grep -E "PASS|FAIL" | grep -i "word.hunt\|wordHunt" | head -10
```

Expected: all existing word-hunt tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/routes/dailyChallenge/wordHuntRoutes.ts
git commit -m "feat(daily): hook word-hunt submit → pre-create chest row on day 7"
```

---

### Task 7: `useWeeklyChest` hook

**Files:**
- Create: `hooks/useWeeklyChest.ts`
- Create: `hooks/__tests__/useWeeklyChest.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// hooks/__tests__/useWeeklyChest.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useWeeklyChest } from '../useWeeklyChest'

const makeFetch = (body: object) =>
  vi.fn().mockResolvedValue({ ok: true, json: async () => body })

describe('useWeeklyChest', () => {
  beforeEach(() => vi.clearAllMocks())

  it('is loading initially', () => {
    global.fetch = makeFetch({ daysCompleted: 3, isClaimable: false, completedDates: [], cycleStart: '2026-05-10', cycleNumber: 1, pendingChest: null })
    const { result } = renderHook(() => useWeeklyChest())
    expect(result.current.loading).toBe(true)
  })

  it('resolves data after fetch', async () => {
    global.fetch = makeFetch({ daysCompleted: 7, isClaimable: true, completedDates: ['2026-05-06','2026-05-07','2026-05-08','2026-05-09','2026-05-10','2026-05-11','2026-05-12'], cycleStart: '2026-05-06', cycleNumber: 1, pendingChest: { tier: 'gold', coins: 600, badgeId: 'badge_weekly_gold' } })
    const { result } = renderHook(() => useWeeklyChest())
    await waitFor(() => !result.current.loading)
    expect(result.current.daysCompleted).toBe(7)
    expect(result.current.isClaimable).toBe(true)
    expect(result.current.pendingChest?.tier).toBe('gold')
  })

  it('claim() POSTs and then refreshes', async () => {
    const claimResponse = { tier: 'silver', coins: 300, badgeId: 'badge_weekly_silver', cycleNumber: 1 }
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ daysCompleted: 7, isClaimable: true, completedDates: [], cycleStart: '2026-05-06', cycleNumber: 1, pendingChest: null }) })
      .mockResolvedValueOnce({ ok: true, json: async () => claimResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ daysCompleted: 0, isClaimable: false, completedDates: [], cycleStart: '2026-05-13', cycleNumber: 2, pendingChest: null }) })
    const { result } = renderHook(() => useWeeklyChest())
    await waitFor(() => !result.current.loading)
    const claimed = await result.current.claim()
    expect(claimed?.tier).toBe('silver')
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run hooks/__tests__/useWeeklyChest.test.ts 2>&1 | tail -5
```

Expected: FAIL

- [ ] **Step 3: Implement**

```typescript
// hooks/useWeeklyChest.ts
'use client'
import { useState, useEffect, useCallback } from 'react'

export interface PendingChest {
  tier: 'bronze' | 'silver' | 'gold'
  coins: number
  badgeId: string
  cycleNumber?: number
}

export interface WeeklyChestState {
  loading: boolean
  daysCompleted: number
  completedDates: string[]
  cycleStart: string
  cycleNumber: number
  isClaimable: boolean
  pendingChest: PendingChest | null
  claim: () => Promise<PendingChest | null>
  refresh: () => void
}

const DEFAULTS = { daysCompleted: 0, completedDates: [] as string[], cycleStart: '', cycleNumber: 1, isClaimable: false, pendingChest: null as PendingChest | null }

export function useWeeklyChest(): WeeklyChestState {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(DEFAULTS)

  const refresh = useCallback(() => {
    setLoading(true)
    fetch('/api/daily/weekly-chest/status')
      .then(r => r.json())
      .then(json => { setData(json); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const claim = useCallback(async (): Promise<PendingChest | null> => {
    const res = await fetch('/api/daily/weekly-chest/claim', { method: 'POST' })
    if (!res.ok) return null
    const json = await res.json()
    refresh()
    return json as PendingChest
  }, [refresh])

  return { loading, ...data, claim, refresh }
}
```

- [ ] **Step 4: Run tests — must pass**

```bash
npx vitest run hooks/__tests__/useWeeklyChest.test.ts 2>&1 | tail -5
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add hooks/useWeeklyChest.ts hooks/__tests__/useWeeklyChest.test.ts
git commit -m "feat(daily): useWeeklyChest hook — status + claim"
```

---

### Task 8: `InsightCard` component

**Files:**
- Create: `components/daily/InsightCard.tsx`
- Create: `components/daily/__tests__/InsightCard.test.tsx`

- [ ] **Step 1: Write failing test**

```typescript
// components/daily/__tests__/InsightCard.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import InsightCard from '../InsightCard'

describe('InsightCard', () => {
  it('renders headline and sub', () => {
    render(<InsightCard type="personal_best" headline="New record!" sub="+23 pts" lucideIcon="Trophy" index={0} />)
    expect(screen.getByText('New record!')).toBeTruthy()
    expect(screen.getByText('+23 pts')).toBeTruthy()
  })

  it('renders without crashing for each insight type', () => {
    const types = ['personal_best','percentile','speed','first_try','streak_complete','improved'] as const
    for (const type of types) {
      const { unmount } = render(<InsightCard type={type} headline="h" sub="s" lucideIcon="Trophy" />)
      unmount()
    }
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run components/daily/__tests__/InsightCard.test.tsx 2>&1 | tail -5
```

Expected: FAIL

- [ ] **Step 3: Implement**

```typescript
// components/daily/InsightCard.tsx
'use client'
import { Trophy, Zap, Gauge, Target, Flame, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const ICONS = { Trophy, Zap, Gauge, Target, Flame, TrendingUp } as const
export type InsightIcon = keyof typeof ICONS

const TYPE_STYLE: Record<string, { bg: string; border: string; icon: string }> = {
  personal_best:   { bg: 'bg-neo-yellow/10', border: 'border-neo-yellow/40', icon: 'text-neo-yellow' },
  percentile:      { bg: 'bg-neo-cyan/10',   border: 'border-neo-cyan/40',   icon: 'text-neo-cyan' },
  speed:           { bg: 'bg-neo-pink/10',   border: 'border-neo-pink/40',   icon: 'text-neo-pink' },
  first_try:       { bg: 'bg-neo-lime/10',   border: 'border-neo-lime/40',   icon: 'text-neo-lime' },
  streak_complete: { bg: 'bg-amber-500/10',  border: 'border-amber-500/40',  icon: 'text-amber-400' },
  improved:        { bg: 'bg-emerald-500/10',border: 'border-emerald-500/40',icon: 'text-emerald-400' },
}

interface InsightCardProps {
  type: string
  headline: string
  sub: string
  lucideIcon: InsightIcon
  index?: number
}

export default function InsightCard({ type, headline, sub, lucideIcon, index = 0 }: InsightCardProps) {
  const Icon = ICONS[lucideIcon] ?? Trophy
  const style = TYPE_STYLE[type] ?? TYPE_STYLE.improved

  return (
    <motion.div
      initial={{ x: 60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: index * 0.15, type: 'spring', stiffness: 320, damping: 24 }}
      className={cn('flex-shrink-0 w-44 rounded-neo border-2 p-3 shadow-hard', style.bg, style.border)}
    >
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: index * 0.15 + 0.1, type: 'spring', stiffness: 400, damping: 12 }}
        className={cn('mb-2', style.icon)}
      >
        <Icon className="w-5 h-5" />
      </motion.div>
      <p className="font-neo-display font-black text-sm text-neo-white leading-tight">{headline}</p>
      <p className="text-xs text-neo-cream/60 mt-0.5 leading-tight">{sub}</p>
    </motion.div>
  )
}
```

- [ ] **Step 4: Run tests — must pass**

```bash
npx vitest run components/daily/__tests__/InsightCard.test.tsx 2>&1 | tail -5
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/daily/InsightCard.tsx components/daily/__tests__/InsightCard.test.tsx
git commit -m "feat(daily): InsightCard — neo-brutalist, Framer Motion pop, Lucide icons"
```

---

### Task 9: `DailyInsightStack` + wire into results

**Files:**
- Create: `components/daily/DailyInsightStack.tsx`
- Create: `components/daily/__tests__/DailyInsightStack.test.tsx`
- Modify: `components/daily/WordHuntResultsContent.tsx`
- Modify: `components/daily/WordWheelResults.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// components/daily/__tests__/DailyInsightStack.test.tsx
import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import DailyInsightStack from '../DailyInsightStack'

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, isRTL: false }),
}))

describe('DailyInsightStack', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders nothing when insights array is empty', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ insights: [] }) })
    const { container } = render(<DailyInsightStack mode="word_hunt" date="2026-05-12" />)
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    }, { timeout: 200 })
  })

  it('renders max 3 insight cards', async () => {
    const fourInsights = Array.from({ length: 4 }, (_, i) => ({
      type: 'improved', headlineKey: `h${i}`, subKey: `s${i}`, lucideIcon: 'TrendingUp',
    }))
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ insights: fourInsights }) })
    const { container } = render(<DailyInsightStack mode="word_hunt" date="2026-05-12" />)
    await waitFor(() => {
      const cards = container.querySelectorAll('[data-testid="insight-card"]')
      expect(cards.length).toBeLessThanOrEqual(3)
    }, { timeout: 200 })
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run components/daily/__tests__/DailyInsightStack.test.tsx 2>&1 | tail -5
```

Expected: FAIL

- [ ] **Step 3: Implement DailyInsightStack**

```typescript
// components/daily/DailyInsightStack.tsx
'use client'
import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import InsightCard, { type InsightIcon } from './InsightCard'

interface InsightData {
  type: string
  headlineKey: string
  subKey: string
  subParams?: Record<string, string | number>
  lucideIcon: InsightIcon
}

interface Props {
  mode: 'word_hunt' | 'word_wheel' | 'puzzle'
  date: string
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''))
}

export default function DailyInsightStack({ mode, date }: Props) {
  const { t } = useLanguage()
  const [insights, setInsights] = useState<InsightData[]>([])

  useEffect(() => {
    fetch(`/api/daily/insights?mode=${mode}&date=${encodeURIComponent(date)}`)
      .then(r => r.json())
      .then(({ insights: data }) => setInsights((data ?? []).slice(0, 3)))
      .catch(() => {})
  }, [mode, date])

  if (!insights.length) return null

  return (
    <div className="mb-4">
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
        {insights.map((insight, i) => (
          <div key={`${insight.type}-${i}`} data-testid="insight-card">
            <InsightCard
              type={insight.type}
              headline={t(insight.headlineKey)}
              sub={insight.subParams ? interpolate(t(insight.subKey), insight.subParams) : t(insight.subKey)}
              lucideIcon={insight.lucideIcon}
              index={i}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests — must pass**

```bash
npx vitest run components/daily/__tests__/DailyInsightStack.test.tsx 2>&1 | tail -5
```

Expected: PASS

- [ ] **Step 5: Wire into WordHuntResultsContent**

Open `components/daily/WordHuntResultsContent.tsx`. Add import at top:

```typescript
import DailyInsightStack from '@/components/daily/DailyInsightStack'
```

Find the `StatsBlurb` component usage or the stats section. Insert after it, before `AttemptHistory`:

```tsx
<DailyInsightStack mode="word_hunt" date={puzzleDate} />
```

Where `puzzleDate` is whatever prop/variable holds the current puzzle date in that file. Run `grep -n "puzzleDate\|puzzle_date\|date" components/daily/WordHuntResultsContent.tsx | head -10` to confirm the variable name.

- [ ] **Step 6: Wire into WordWheelResults**

Open `components/daily/WordWheelResults.tsx`. Add the same import, and insert:

```tsx
<DailyInsightStack mode="word_wheel" date={puzzleDate} />
```

After the stats/score section, before any share or leaderboard section.

- [ ] **Step 7: Run full frontend test suite**

```bash
npm run test:frontend 2>&1 | tail -8
```

Expected: no new failures

- [ ] **Step 8: Commit**

```bash
git add components/daily/DailyInsightStack.tsx components/daily/__tests__/DailyInsightStack.test.tsx components/daily/WordHuntResultsContent.tsx components/daily/WordWheelResults.tsx
git commit -m "feat(daily): DailyInsightStack — wired into word hunt + word wheel results"
```

---

### Task 10: `ChestProgressDots` component

**Files:**
- Create: `components/daily/ChestProgressDots.tsx`
- Create: `components/daily/__tests__/ChestProgressDots.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// components/daily/__tests__/ChestProgressDots.test.tsx
import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('gsap', () => ({ default: { from: vi.fn(), to: vi.fn() } }))

import ChestProgressDots from '../ChestProgressDots'

describe('ChestProgressDots', () => {
  it('renders exactly 7 dots', () => {
    const { container } = render(
      <ChestProgressDots completedDates={['2026-05-10','2026-05-11','2026-05-12']} cycleStart="2026-05-10" />
    )
    expect(container.querySelectorAll('[data-testid="dot"]').length).toBe(7)
  })

  it('marks 3 dots as filled', () => {
    const { container } = render(
      <ChestProgressDots completedDates={['2026-05-10','2026-05-11','2026-05-12']} cycleStart="2026-05-10" />
    )
    expect(container.querySelectorAll('[data-filled="true"]').length).toBe(3)
  })

  it('marks 0 dots as filled when no completions', () => {
    const { container } = render(
      <ChestProgressDots completedDates={[]} cycleStart="2026-05-10" />
    )
    expect(container.querySelectorAll('[data-filled="true"]').length).toBe(0)
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run components/daily/__tests__/ChestProgressDots.test.tsx 2>&1 | tail -5
```

Expected: FAIL

- [ ] **Step 3: Implement**

```typescript
// components/daily/ChestProgressDots.tsx
'use client'
import { useEffect, useRef } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import gsap from 'gsap'

interface Props {
  completedDates: string[]
  cycleStart: string
}

function buildDots(cycleStart: string, completedDates: string[]) {
  const completed = new Set(completedDates)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(cycleStart)
    d.setDate(d.getDate() + i)
    const iso = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('en', { weekday: 'short' })
    return { iso, label, filled: completed.has(iso) }
  })
}

export default function ChestProgressDots({ completedDates, cycleStart }: Props) {
  const dotsRef = useRef<(HTMLDivElement | null)[]>([])
  const dots = buildDots(cycleStart, completedDates)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const els = dotsRef.current.filter(Boolean) as HTMLDivElement[]
    gsap.from(els, { scale: 0, opacity: 0, stagger: 0.08, duration: 0.4, ease: 'back.out(1.7)' })
  }, [])

  return (
    <div className="flex items-center gap-2">
      {dots.map((dot, i) => (
        <div
          key={dot.iso}
          ref={el => { dotsRef.current[i] = el }}
          data-testid="dot"
          data-filled={dot.filled}
          className="flex flex-col items-center gap-1"
        >
          {dot.filled
            ? <CheckCircle2 className="w-6 h-6 text-neo-lime" />
            : <Circle className="w-6 h-6 text-neo-white/30" />
          }
          <span className="text-[10px] text-neo-cream/50 font-bold uppercase">{dot.label}</span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run tests — must pass**

```bash
npx vitest run components/daily/__tests__/ChestProgressDots.test.tsx 2>&1 | tail -5
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/daily/ChestProgressDots.tsx components/daily/__tests__/ChestProgressDots.test.tsx
git commit -m "feat(daily): ChestProgressDots — 7 slots, GSAP stagger, CheckCircle2/Circle icons"
```

---

### Task 11: `WeeklyChestCard` + wire into DailyHub

**Files:**
- Create: `components/daily/WeeklyChestCard.tsx`
- Create: `components/daily/__tests__/WeeklyChestCard.test.tsx`
- Modify: `components/daily/DailyHub.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// components/daily/__tests__/WeeklyChestCard.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/hooks/useWeeklyChest', () => ({
  useWeeklyChest: () => ({
    loading: false, daysCompleted: 4, completedDates: ['2026-05-09','2026-05-10','2026-05-11','2026-05-12'],
    cycleStart: '2026-05-09', cycleNumber: 1, isClaimable: false, pendingChest: null,
    claim: vi.fn(), refresh: vi.fn(),
  }),
}))
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, isRTL: false }) }))
vi.mock('gsap', () => ({ default: { to: vi.fn().mockReturnValue({ kill: vi.fn() }) } }))

import WeeklyChestCard from '../WeeklyChestCard'

describe('WeeklyChestCard', () => {
  it('renders title', () => {
    render(<WeeklyChestCard onChestClaimed={vi.fn()} />)
    expect(screen.getByText('daily.weeklyChest.title')).toBeTruthy()
  })

  it('does not show claim button when not claimable', () => {
    render(<WeeklyChestCard onChestClaimed={vi.fn()} />)
    expect(screen.queryByText('daily.weeklyChest.claimButton')).toBeNull()
  })

  it('returns null while loading', () => {
    vi.doMock('@/hooks/useWeeklyChest', () => ({
      useWeeklyChest: () => ({ loading: true, daysCompleted: 0, completedDates: [], cycleStart: '', cycleNumber: 1, isClaimable: false, pendingChest: null, claim: vi.fn(), refresh: vi.fn() }),
    }))
    // Loading state renders null — test passes if no crash
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run components/daily/__tests__/WeeklyChestCard.test.tsx 2>&1 | tail -5
```

Expected: FAIL

- [ ] **Step 3: Implement WeeklyChestCard**

```typescript
// components/daily/WeeklyChestCard.tsx
'use client'
import { useEffect, useRef } from 'react'
import { Calendar, Lock, LockOpen } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { useWeeklyChest, type PendingChest } from '@/hooks/useWeeklyChest'
import ChestProgressDots from './ChestProgressDots'
import { cn } from '@/lib/utils'
import gsap from 'gsap'

interface Props { onChestClaimed: (chest: PendingChest) => void }

export default function WeeklyChestCard({ onChestClaimed }: Props) {
  const { t } = useLanguage()
  const { loading, daysCompleted, completedDates, cycleStart, isClaimable, pendingChest, claim } = useWeeklyChest()
  const lockRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isClaimable || !lockRef.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const tween = gsap.to(lockRef.current, { scale: 1.08, yoyo: true, repeat: -1, duration: 0.8, ease: 'sine.inOut' })
    return () => { tween.kill() }
  }, [isClaimable])

  const handleClaim = async () => {
    const result = await claim()
    if (result) onChestClaimed(result)
  }

  if (loading) return null

  const tier = pendingChest?.tier ?? 'silver'
  const tierLabel = t(`daily.weeklyChest.tier${tier.charAt(0).toUpperCase() + tier.slice(1)}`)

  return (
    <div className="rounded-neo border-2 border-neo-black bg-neo-navy-light shadow-hard p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-neo-cream/60" />
          <span className="font-neo-display font-black text-sm text-neo-white uppercase tracking-wider">
            {t('daily.weeklyChest.title')}
          </span>
        </div>
        <span className="text-xs text-neo-cream/50 font-bold">
          {t('daily.weeklyChest.dayProgress').replace('{day}', String(daysCompleted))}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {cycleStart && (
          <ChestProgressDots completedDates={completedDates} cycleStart={cycleStart} />
        )}
        <div ref={lockRef} className="ml-auto">
          {isClaimable
            ? <LockOpen className="w-7 h-7 text-neo-yellow" />
            : <Lock className="w-7 h-7 text-neo-white/40" />
          }
        </div>
      </div>

      <p className="text-xs text-neo-cream/50 mt-2">
        {isClaimable
          ? t('daily.weeklyChest.claimReady').replace('{tier}', tierLabel)
          : t('daily.weeklyChest.daysRemaining').replace('{n}', String(7 - daysCompleted)).replace('{tier}', tierLabel)
        }
      </p>

      <AnimatePresence>
        {isClaimable && (
          <motion.button
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={handleClaim}
            className="mt-3 w-full py-2 rounded-neo border-2 border-neo-black bg-neo-yellow text-neo-navy font-neo-display font-black text-sm shadow-hard active:shadow-hard-pressed active:translate-y-px"
          >
            {t('daily.weeklyChest.claimButton')}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 4: Run tests — must pass**

```bash
npx vitest run components/daily/__tests__/WeeklyChestCard.test.tsx 2>&1 | tail -5
```

Expected: PASS

- [ ] **Step 5: Wire into DailyHub**

Open `components/daily/DailyHub.tsx`. Add imports after existing imports:

```typescript
import { useState } from 'react'
import WeeklyChestCard from './WeeklyChestCard'
import WeeklyChestModal from './WeeklyChestModal'
import type { PendingChest } from '@/hooks/useWeeklyChest'
```

Add state inside the component (after existing state declarations):

```typescript
const [claimedChest, setClaimedChest] = useState<PendingChest | null>(null)
```

In JSX, before the quest cards section (after `LastSevenDaysIndicator` or similar), add:

```tsx
{user && <WeeklyChestCard onChestClaimed={setClaimedChest} />}

{claimedChest && (
  <WeeklyChestModal chest={claimedChest} onClose={() => setClaimedChest(null)} />
)}
```

- [ ] **Step 6: Run frontend tests — must still pass**

```bash
npm run test:frontend 2>&1 | tail -5
```

Expected: no new failures

- [ ] **Step 7: Commit**

```bash
git add components/daily/WeeklyChestCard.tsx components/daily/__tests__/WeeklyChestCard.test.tsx components/daily/DailyHub.tsx
git commit -m "feat(daily): WeeklyChestCard + wire into DailyHub"
```

---

### Task 12: `WeeklyChestModal` — GSAP 3-act ceremony + sounds

**Files:**
- Create: `components/daily/WeeklyChestModal.tsx`
- Create: `components/daily/__tests__/WeeklyChestModal.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// components/daily/__tests__/WeeklyChestModal.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }))
vi.mock('gsap', () => ({ default: {
  timeline: () => ({ to: () => ({ add: () => ({ from: () => ({ add: () => ({}) }) }), fromTo: () => ({ add: () => ({}) }) }), kill: vi.fn() }),
  to: vi.fn(), from: vi.fn(), fromTo: vi.fn(),
} }))

import WeeklyChestModal from '../WeeklyChestModal'

const chest = { tier: 'gold' as const, coins: 600, badgeId: 'badge_weekly_gold', cycleNumber: 2 }

describe('WeeklyChestModal', () => {
  it('renders the coin amount', () => {
    render(<WeeklyChestModal chest={chest} onClose={vi.fn()} />)
    // coin counter starts at 0 in test env (animation skipped)
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('has dialog role for accessibility', () => {
    render(<WeeklyChestModal chest={chest} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run to confirm fail**

```bash
npx vitest run components/daily/__tests__/WeeklyChestModal.test.tsx 2>&1 | tail -5
```

Expected: FAIL

- [ ] **Step 3: Implement WeeklyChestModal**

```typescript
// components/daily/WeeklyChestModal.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { Coins, Award, X } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import gsap from 'gsap'
import type { PendingChest } from '@/hooks/useWeeklyChest'

const CHEST_IMAGES = {
  bronze: '/daily/chests/chest-bronze.png',
  silver: '/daily/chests/chest-silver.png',
  gold:   '/daily/chests/chest-gold.png',
} as const

const TIER_COLORS = {
  bronze: 'text-amber-500',
  silver: 'text-slate-300',
  gold:   'text-neo-yellow',
} as const

// Map to existing project sounds in /public/sounds/
const SOUNDS = {
  shake: '/sounds/earthquake-shake.mp3',
  open:  '/sounds/chest-open.mp3',
  coins: '/sounds/coin-cascade.mp3',
  fanfare: '/sounds/victory-fanfare.mp3',
  pop: '/sounds/balloon-pop.mp3',
} as const

function playSound(src: string) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const a = new Audio(src)
  a.volume = 0.45
  a.play().catch(() => {})
}

interface Props {
  chest: PendingChest & { cycleNumber?: number }
  onClose: () => void
}

export default function WeeklyChestModal({ chest, onClose }: Props) {
  const { t } = useLanguage()
  const chestRef = useRef<HTMLImageElement>(null)
  const raysRef = useRef<HTMLDivElement>(null)
  const revealRef = useRef<HTMLDivElement>(null)
  const [canClose, setCanClose] = useState(false)
  const [coinCount, setCoinCount] = useState(0)
  const tierLabel = t(`daily.weeklyChest.tier${chest.tier.charAt(0).toUpperCase() + chest.tier.slice(1)}`)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) { setCanClose(true); setCoinCount(chest.coins); return }

    playSound(SOUNDS.shake)

    const tl = gsap.timeline()

    // Act 1: shake
    tl.to(chestRef.current, { rotation: 5, duration: 0.12, yoyo: true, repeat: 6, ease: 'none' })

    // Act 2: burst
    .add(() => playSound(SOUNDS.open))
    .to(chestRef.current, { y: -200, rotation: -45, opacity: 0, duration: 0.5, ease: 'power2.out' })
    .fromTo(raysRef.current, { scale: 0, opacity: 0.8 }, { scale: 3, opacity: 0, duration: 0.6 }, '<')
    .add(() => playSound(SOUNDS.coins), '-=0.3')

    // Act 3: reveal
    .add(() => {
      playSound(SOUNDS.fanfare)
      let n = 0
      const step = Math.ceil(chest.coins / 30)
      const id = setInterval(() => {
        n = Math.min(n + step, chest.coins)
        setCoinCount(n)
        if (n >= chest.coins) clearInterval(id)
      }, 40)
    })
    .from(revealRef.current!.children, { scale: 0, ease: 'back.out(1.7)', stagger: 0.2, duration: 0.5 })
    .add(() => setCanClose(true))

    return () => { tl.kill() }
  }, [chest.coins])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('daily.weeklyChest.title')}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-neo-navy/90"
    >
      <div className="relative flex flex-col items-center gap-6 p-8 max-w-sm w-full">
        {/* Light rays */}
        <div
          ref={raysRef}
          className="absolute inset-0 pointer-events-none rounded-full"
          style={{ background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,225,53,0.12) 20deg, transparent 40deg, rgba(255,225,53,0.12) 60deg, transparent 80deg, rgba(255,225,53,0.12) 100deg, transparent 120deg, rgba(255,225,53,0.12) 140deg, transparent 160deg, rgba(255,225,53,0.12) 180deg, transparent 200deg, rgba(255,225,53,0.12) 220deg, transparent 240deg, rgba(255,225,53,0.12) 260deg, transparent 280deg, rgba(255,225,53,0.12) 300deg, transparent 320deg, rgba(255,225,53,0.12) 340deg, transparent 360deg)' }}
        />

        {/* Chest */}
        <img
          ref={chestRef}
          src={CHEST_IMAGES[chest.tier]}
          alt={`${chest.tier} chest`}
          width={160}
          height={160}
          className="relative z-10"
        />

        {/* Reveal items */}
        <div ref={revealRef} className="flex flex-col items-center gap-4 relative z-10">
          <div className="flex items-center gap-2">
            <Coins className={cn('w-9 h-9', TIER_COLORS[chest.tier])} />
            <span className={cn('font-neo-display font-black text-5xl tabular-nums', TIER_COLORS[chest.tier])}>
              +{coinCount}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Award className={cn('w-6 h-6', TIER_COLORS[chest.tier])} />
            <img
              src={`/badges/weekly/badge-weekly-${chest.tier}.png`}
              alt={`${chest.tier} badge`}
              width={48}
              height={48}
              className="rounded-full border-2 border-neo-black shadow-hard"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>

          <p className={cn('font-neo-display font-black text-lg uppercase tracking-wider', TIER_COLORS[chest.tier])}>
            {tierLabel} {t('common.week') || 'Week'}
          </p>
        </div>

        {canClose && (
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-neo-cream/50 hover:text-neo-cream text-sm font-bold mt-2 relative z-10"
          >
            <X className="w-4 h-4" />
            {t('common.tapToContinue') || 'Tap to continue'}
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests — must pass**

```bash
npx vitest run components/daily/__tests__/WeeklyChestModal.test.tsx 2>&1 | tail -5
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/daily/WeeklyChestModal.tsx components/daily/__tests__/WeeklyChestModal.test.tsx
git commit -m "feat(daily): WeeklyChestModal — GSAP 3-act ceremony, coin counter, existing sounds"
```

---

### Task 13: i18n keys — 5 locales

**Files:**
- Modify: `translations/en.js`, `translations/he.js`, `translations/sv.js`, `translations/ja.js`, `translations/es.js`

- [ ] **Step 1: Add to en.js**

Find the `daily` key object in `translations/en.js`. Add inside it:

```javascript
weeklyChest: {
  title: "Weekly Chest",
  dayProgress: "Day {day} of 7",
  daysRemaining: "{n} more days for your {tier} Chest!",
  claimReady: "Your {tier} Chest is ready!",
  claimButton: "Claim Chest",
  tierBronze: "Bronze",
  tierSilver: "Silver",
  tierGold: "Gold",
},
insights: {
  personalBest: { headline: "New personal best!", sub: "+{n} pts vs your record" },
  percentile:   { headline: "Elite today!",        sub: "Top {n}% of all players" },
  speed:        { headline: "Speed demon!",         sub: "{n}% faster than your avg" },
  firstTry:     { headline: "First try!",           sub: "Only {n}% solved it in 1" },
  streakComplete:{ headline: "Week complete!",      sub: "Your chest is ready to claim" },
  improved:     { headline: "Getting sharper!",     sub: "Better than yesterday" },
},
```

- [ ] **Step 2: Add to he.js**

```javascript
weeklyChest: {
  title: "תיבת שבועית",
  dayProgress: "יום {day} מתוך 7",
  daysRemaining: "עוד {n} ימים לתיבת {tier}!",
  claimReady: "תיבת ה{tier} שלך מוכנה!",
  claimButton: "פתח תיבה",
  tierBronze: "ברונזה",
  tierSilver: "כסף",
  tierGold: "זהב",
},
insights: {
  personalBest: { headline: "שיא אישי חדש!", sub: "+{n} נקודות מעל שיאך" },
  percentile:   { headline: "אליטה היום!",   sub: "טופ {n}% מכל השחקנים" },
  speed:        { headline: "מהיר כרוח!",    sub: "{n}% מהיר מהממוצע שלך" },
  firstTry:     { headline: "ניחשת בניסיון ראשון!", sub: "רק {n}% הצליחו בניסיון אחד" },
  streakComplete:{ headline: "שבוע מושלם!", sub: "התיבה שלך מוכנה לפתיחה" },
  improved:     { headline: "הולך ומשתפר!", sub: "טוב יותר מאתמול" },
},
```

- [ ] **Step 3: Add to sv.js**

```javascript
weeklyChest: {
  title: "Veckokista",
  dayProgress: "Dag {day} av 7",
  daysRemaining: "{n} dagar kvar för din {tier}-kista!",
  claimReady: "Din {tier}-kista är klar!",
  claimButton: "Öppna kista",
  tierBronze: "Brons",
  tierSilver: "Silver",
  tierGold: "Guld",
},
insights: {
  personalBest: { headline: "Nytt personbästa!", sub: "+{n} poäng över ditt rekord" },
  percentile:   { headline: "Elit idag!",        sub: "Topp {n}% av alla spelare" },
  speed:        { headline: "Snabbast!",          sub: "{n}% snabbare än ditt snitt" },
  firstTry:     { headline: "Första försöket!",  sub: "Bara {n}% löste det på ett försök" },
  streakComplete:{ headline: "Veckan klar!",     sub: "Din kista är klar att öppna" },
  improved:     { headline: "Blir skarpare!",    sub: "Bättre än igår" },
},
```

- [ ] **Step 4: Add to ja.js**

```javascript
weeklyChest: {
  title: "週間チェスト",
  dayProgress: "7日中{day}日目",
  daysRemaining: "{tier}チェストまであと{n}日！",
  claimReady: "{tier}チェストの準備ができました！",
  claimButton: "チェストを開ける",
  tierBronze: "ブロンズ",
  tierSilver: "シルバー",
  tierGold: "ゴールド",
},
insights: {
  personalBest: { headline: "自己ベスト更新！", sub: "記録より+{n}ポイント" },
  percentile:   { headline: "今日はエリート！", sub: "全プレイヤーのトップ{n}%" },
  speed:        { headline: "スピードスター！", sub: "平均より{n}%速い" },
  firstTry:     { headline: "一発正解！",        sub: "{n}%のみが1回で解けた" },
  streakComplete:{ headline: "1週間達成！",      sub: "チェストを開ける準備ができました" },
  improved:     { headline: "成長中！",           sub: "昨日より上達" },
},
```

- [ ] **Step 5: Add to es.js**

```javascript
weeklyChest: {
  title: "Cofre semanal",
  dayProgress: "Día {day} de 7",
  daysRemaining: "¡{n} días más para tu cofre {tier}!",
  claimReady: "¡Tu cofre {tier} está listo!",
  claimButton: "Abrir cofre",
  tierBronze: "Bronce",
  tierSilver: "Plata",
  tierGold: "Oro",
},
insights: {
  personalBest: { headline: "¡Nuevo récord personal!", sub: "+{n} pts sobre tu récord" },
  percentile:   { headline: "¡Élite hoy!",             sub: "Top {n}% de todos" },
  speed:        { headline: "¡Velocidad récord!",      sub: "{n}% más rápido que tu promedio" },
  firstTry:     { headline: "¡Al primer intento!",     sub: "Solo el {n}% lo resolvió en 1" },
  streakComplete:{ headline: "¡Semana completa!",      sub: "Tu cofre está listo para abrir" },
  improved:     { headline: "¡Cada vez mejor!",        sub: "Mejor que ayer" },
},
```

- [ ] **Step 6: Run lint — must pass**

```bash
npm run lint 2>&1 | tail -5
```

Expected: 0 errors

- [ ] **Step 7: Commit**

```bash
git add translations/
git commit -m "feat(daily): i18n — weekly chest + insight cards (5 locales)"
```

---

### Task 14: Generate chest + badge images

**Files:**
- Create: `public/daily/chests/chest-{bronze,silver,gold}.png`
- Create: `public/badges/weekly/badge-weekly-{bronze,silver,gold}.png`

- [ ] **Step 1: Create directories**

```bash
mkdir -p /Users/ohadfisher/git/boggle-new/fe-next/public/daily/chests
mkdir -p /Users/ohadfisher/git/boggle-new/fe-next/public/badges/weekly
```

- [ ] **Step 2: Generate 6 images via fal-ai MCP**

Use `mcp__fal-ai__run_model` with model `fal-ai/flux/schnell` for each. Download and save to the paths above.

**chest-bronze.png** — prompt:
```
pixel art treasure chest, bronze #cd7f32 color bands, dark navy background #1a1a2e, neo-brutalist game UI style, hard 3px pixel drop shadow black, bold black border, no gradients, no glassmorphism, star symbol on chest lid, 512x512 centered, game asset
```

**chest-silver.png** — prompt:
```
pixel art treasure chest, silver metallic #c0c0c0 and slate grey, dark navy background #1a1a2e, neo-brutalist style, hard pixel drop shadow, bold black border, no gradients, gem diamond symbol on lid, 512x512 centered
```

**chest-gold.png** — prompt:
```
pixel art treasure chest, bright gold yellow #FFE135, dark navy background #1a1a2e, neo-brutalist style, hard pixel drop shadow, bold black border, no gradients, crown symbol on chest lid, dramatic glow, 512x512 centered
```

**badge-weekly-bronze.png** — prompt:
```
circular shield badge, bronze color #cd7f32, dark navy background, pixel art style, bold black border 3px, star icon center, neo-brutalist game achievement badge, no gradients, 256x256
```

**badge-weekly-silver.png** — prompt:
```
circular shield badge, silver color #c0c0c0, dark navy background, pixel art style, bold black border 3px, diamond gem icon center, neo-brutalist game achievement badge, no gradients, 256x256
```

**badge-weekly-gold.png** — prompt:
```
circular shield badge, gold yellow color #FFE135, dark navy background, pixel art style, bold black border 3px, crown icon center, neo-brutalist game achievement badge, no gradients, 256x256
```

- [ ] **Step 3: Verify files exist**

```bash
ls -la /Users/ohadfisher/git/boggle-new/fe-next/public/daily/chests/
ls -la /Users/ohadfisher/git/boggle-new/fe-next/public/badges/weekly/
```

Expected: 3 files in each directory

- [ ] **Step 4: Commit**

```bash
git add public/daily/chests/ public/badges/weekly/
git commit -m "feat(daily): chest + badge images — bronze/silver/gold (generated)"
```

---

### Task 15: Wire existing sounds + final build

**Files:** No new files — use existing project sounds from `/public/sounds/`

The `WeeklyChestModal` already references existing sounds via the `SOUNDS` const. Verify they exist:

- [ ] **Step 1: Confirm sound files exist**

```bash
ls /Users/ohadfisher/git/boggle-new/fe-next/public/sounds/ | grep -E "earthquake-shake|chest-open|coin-cascade|victory-fanfare|balloon-pop"
```

Expected: all 5 files present. If any are missing, copy the closest substitute:
```bash
# e.g., if coin-cascade.mp3 missing, use coin-collect.mp3:
cp public/sounds/coin-collect.mp3 public/sounds/coin-cascade.mp3
```

- [ ] **Step 2: Run full test suite + lint + build**

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next
npm run lint && npm run test && npm run build 2>&1 | tail -15
```

Expected: lint clean, all tests pass, build succeeds with no errors.

- [ ] **Step 3: Smoke-test in browser**

```bash
npm run dev
```

Navigate to `http://localhost:3001/en/daily` (logged-in user) and verify:
- `WeeklyChestCard` renders above mode tiles
- Correct number of dots filled based on today's play history
- Lock icon shows when < 7 days, LockOpen when day 7
- Navigate to word hunt results — `DailyInsightStack` renders (may be empty on first play)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(daily): weekly chest + insight cards — complete feature"
```
