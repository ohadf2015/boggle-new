# Leaderboard Tier Feel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the score-based leaderboard tier feel meaningful by promoting tier-rank ("#12 of 487 in Gold") to the primary number on the user's rank card and adding a peer mini-list, while gracefully handling Stone-tier majority and Grandmaster top.

**Architecture:** Server-side RANK() window function in a new Supabase RPC (`get_user_tier_position`) returns `{ tier_id, rank_in_tier, tier_population, neighbors[] }`. A new React Query hook (`useTierPosition`) feeds a new `<TierPositionPanel>` component that renders inside the existing user-rank card on `/leaderboard`. Visual hierarchy flips: tier-rank big, global rank muted. Three tier-specific branches (Stone CTA, Grandmaster throne, #1-of-tier wobble). Shipped behind PostHog flag `tier-position-panel` via existing experiment registry.

**Tech Stack:** Supabase Postgres (RPC + window function) · TypeScript · React 19 · Next.js 16 App Router · React Query · framer-motion · Tailwind 3.4 + neo-brutalist tokens · Vitest (unit) · React Testing Library · PostHog (flags + telemetry)

**Spec:** `docs/superpowers/specs/2026-05-01-leaderboard-tier-feel-design.md`

---

## File Structure

### Create
| Path | Responsibility |
|---|---|
| `supabase/migrations/20260501120000_get_user_tier_position.sql` | RPC `get_user_tier_position(p_user_id, p_season_id)` returning JSONB. Applied via Supabase MCP `apply_migration`. |
| `fe-next/hooks/useTierPosition.ts` | React Query hook wrapping the RPC, season-aware, error-tolerant. |
| `fe-next/hooks/__tests__/useTierPosition.test.ts` | Hook unit tests (mocked Supabase). |
| `fe-next/components/leaderboard/TierPositionPanel.tsx` | Renders tier-rank, percentile, peer list, with Stone / Grandmaster / #1-of-tier branches. |
| `fe-next/components/leaderboard/__tests__/TierPositionPanel.test.tsx` | Component tests (Vitest + RTL). |

### Modify
| Path | Change |
|---|---|
| `fe-next/lib/experiments.ts` | Add `tier-position-panel` experiment entry. |
| `fe-next/translations/en.js` | Add 8 keys under `leaderboard.tier.*`. |
| `fe-next/translations/he.js` | Add 8 keys (Hebrew). |
| `fe-next/translations/sv.js` | Add 8 keys (Swedish). |
| `fe-next/translations/ja.js` | Add 8 keys (Japanese). |
| `fe-next/translations/es.js` | Add 8 keys (Spanish). |
| `fe-next/utils/growthTracking.ts` | Add 3 telemetry helpers (`trackTierPositionViewed`, `trackTierPeerClicked`, `trackTierProgressionMilestone`). |
| `fe-next/app/[locale]/leaderboard/PageClient.tsx` | Demote global rank styling, replace right-column sub-tree with `<TierPositionPanel>`, wire `useTierPosition` + experiment flag. |

---

## Task 1: SQL RPC `get_user_tier_position`

**Files:**
- Create: `supabase/migrations/20260501120000_get_user_tier_position.sql`
- Apply via: Supabase MCP tool `apply_migration` (not raw SQL files — project memory `feedback-supabase-mcp-for-migrations`)

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/20260501120000_get_user_tier_position.sql`:

```sql
-- Returns the user's rank within their tier, tier population, and 5 neighbors
-- (2 above + user + 2 below). Tier is derived from total_score using the same
-- thresholds as fe-next/lib/ranked/leaderboardTiers.ts.
--
-- Args:
--   p_user_id    : uuid of the player to look up
--   p_season_id  : optional season filter; NULL means "all seasons"
--
-- Returns: jsonb shape
--   {
--     "tier_id":         "gold",
--     "rank_in_tier":    12,
--     "tier_population": 487,
--     "neighbors": [
--       { "player_id":..., "display_name":..., "total_score":...,
--         "avatar_image":..., "avatar_config":..., "rank_in_tier": 10 },
--       ...
--     ]
--   }
-- or NULL if the user is not on the leaderboard.

CREATE OR REPLACE FUNCTION get_user_tier_position(
  p_user_id uuid,
  p_season_id int DEFAULT NULL
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  WITH ranked AS (
    SELECT
      l.player_id,
      l.display_name,
      l.total_score,
      l.avatar_image,
      l.avatar_config,
      CASE
        WHEN l.total_score >= 200000 THEN 'grandmaster'
        WHEN l.total_score >=  80000 THEN 'diamond'
        WHEN l.total_score >=  30000 THEN 'platinum'
        WHEN l.total_score >=  10000 THEN 'gold'
        WHEN l.total_score >=   2500 THEN 'silver'
        WHEN l.total_score >=    500 THEN 'bronze'
        ELSE 'stone'
      END AS tier_id,
      RANK() OVER (
        PARTITION BY (CASE
          WHEN l.total_score >= 200000 THEN 'grandmaster'
          WHEN l.total_score >=  80000 THEN 'diamond'
          WHEN l.total_score >=  30000 THEN 'platinum'
          WHEN l.total_score >=  10000 THEN 'gold'
          WHEN l.total_score >=   2500 THEN 'silver'
          WHEN l.total_score >=    500 THEN 'bronze'
          ELSE 'stone' END)
        ORDER BY l.total_score DESC
      ) AS rank_in_tier
    FROM leaderboard l
    WHERE p_season_id IS NULL OR l.season_id = p_season_id
  ),
  user_row AS (
    SELECT * FROM ranked WHERE player_id = p_user_id
    LIMIT 1
  ),
  pop AS (
    SELECT tier_id, COUNT(*)::int AS tier_population
    FROM ranked
    WHERE tier_id = (SELECT tier_id FROM user_row)
    GROUP BY tier_id
  ),
  neighbors AS (
    SELECT player_id, display_name, total_score, avatar_image, avatar_config, rank_in_tier
    FROM ranked
    WHERE tier_id = (SELECT tier_id FROM user_row)
      AND rank_in_tier BETWEEN
        GREATEST(1, (SELECT rank_in_tier FROM user_row) - 2)
        AND (SELECT rank_in_tier FROM user_row) + 2
    ORDER BY rank_in_tier
  )
  SELECT
    CASE WHEN (SELECT player_id FROM user_row) IS NULL THEN NULL
    ELSE jsonb_build_object(
      'tier_id',         (SELECT tier_id FROM user_row),
      'rank_in_tier',    (SELECT rank_in_tier FROM user_row),
      'tier_population', (SELECT tier_population FROM pop),
      'neighbors',       COALESCE((SELECT jsonb_agg(neighbors.*) FROM neighbors), '[]'::jsonb)
    )
    END;
$$;

GRANT EXECUTE ON FUNCTION get_user_tier_position(uuid, int) TO authenticated, anon;

COMMENT ON FUNCTION get_user_tier_position IS
  'Tier-relative rank + 5-neighbor window for the user-rank card on /leaderboard. Tier thresholds mirror fe-next/lib/ranked/leaderboardTiers.ts.';
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Run: `mcp__supabase__apply_migration` with `name: "get_user_tier_position"` and the SQL above.

Expected: success message; no errors.

- [ ] **Step 3: Verify with `execute_sql` — tier-boundary case**

Run via `mcp__supabase__execute_sql`:

```sql
-- Pick any real user from leaderboard for a smoke test
SELECT get_user_tier_position(player_id, NULL)
FROM leaderboard
ORDER BY total_score DESC
LIMIT 1;
```

Expected: JSONB with `tier_id` matching the user's score (e.g. `grandmaster` for top user), `rank_in_tier: 1`, `tier_population >= 1`, `neighbors` array with 1–3 entries.

- [ ] **Step 4: Verify with `execute_sql` — tie handling**

```sql
-- Ensure RANK() (not ROW_NUMBER) — tied scores share rank
WITH probe AS (
  SELECT player_id, total_score,
    RANK() OVER (PARTITION BY
      CASE WHEN total_score >= 10000 THEN 'gold' ELSE 'other' END
      ORDER BY total_score DESC) AS r
  FROM leaderboard
  WHERE total_score >= 10000
  LIMIT 20
)
SELECT total_score, r, COUNT(*)
FROM probe GROUP BY total_score, r ORDER BY r;
```

Expected: ties share the same `r` value.

- [ ] **Step 5: Verify with `execute_sql` — non-existent user returns NULL**

```sql
SELECT get_user_tier_position('00000000-0000-0000-0000-000000000000'::uuid, NULL);
```

Expected: a single row with NULL.

- [ ] **Step 6: Commit migration file**

```bash
git add supabase/migrations/20260501120000_get_user_tier_position.sql
git commit -m "feat(leaderboard): add get_user_tier_position RPC

Returns tier-relative rank + 5-neighbor window for the user-rank
card on /leaderboard. Tier thresholds mirror leaderboardTiers.ts."
```

---

## Task 2: `useTierPosition` Hook (TDD)

**Files:**
- Create: `fe-next/hooks/useTierPosition.ts`
- Test: `fe-next/hooks/__tests__/useTierPosition.test.ts`

- [ ] **Step 1: Write the failing test file**

Create `fe-next/hooks/__tests__/useTierPosition.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useTierPosition } from '../useTierPosition';

const mockRpc = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useTierPosition', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it('returns parsed tier position on success', async () => {
    mockRpc.mockResolvedValue({
      data: {
        tier_id: 'gold',
        rank_in_tier: 12,
        tier_population: 487,
        neighbors: [],
      },
      error: null,
    });

    const { result } = renderHook(() => useTierPosition('user-1', 1), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.tier_id).toBe('gold');
    expect(result.current.data?.rank_in_tier).toBe(12);
    expect(result.current.data?.tier_population).toBe(487);
    expect(mockRpc).toHaveBeenCalledWith('get_user_tier_position', {
      p_user_id: 'user-1',
      p_season_id: 1,
    });
  });

  it('passes null season_id when seasonId is undefined', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    renderHook(() => useTierPosition('user-1'), { wrapper });
    await waitFor(() => expect(mockRpc).toHaveBeenCalled());
    expect(mockRpc).toHaveBeenCalledWith('get_user_tier_position', {
      p_user_id: 'user-1',
      p_season_id: null,
    });
  });

  it('is disabled when userId is falsy', () => {
    const { result } = renderHook(() => useTierPosition(undefined), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('returns undefined data on RPC error and does not throw', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('boom') });
    const { result } = renderHook(() => useTierPosition('user-1'), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npm run test -- hooks/__tests__/useTierPosition.test.ts`

Expected: FAIL — module `../useTierPosition` not found.

- [ ] **Step 3: Write minimal hook implementation**

Create `fe-next/hooks/useTierPosition.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export interface TierPositionNeighbor {
  player_id: string;
  display_name: string | null;
  total_score: number;
  avatar_image: string | null;
  avatar_config: unknown | null;
  rank_in_tier: number;
}

export interface TierPosition {
  tier_id: 'stone' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'grandmaster';
  rank_in_tier: number;
  tier_population: number;
  neighbors: TierPositionNeighbor[];
}

export function useTierPosition(userId: string | undefined, seasonId?: number) {
  return useQuery<TierPosition | null>({
    queryKey: ['tier-position', userId, seasonId ?? 'current'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_tier_position', {
        p_user_id: userId,
        p_season_id: seasonId ?? null,
      });
      if (error) throw error;
      return data as TierPosition | null;
    },
    enabled: !!userId,
    staleTime: 60_000,
    retry: false,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npm run test -- hooks/__tests__/useTierPosition.test.ts`

Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add fe-next/hooks/useTierPosition.ts fe-next/hooks/__tests__/useTierPosition.test.ts
git commit -m "feat(leaderboard): add useTierPosition hook

React Query hook wrapping get_user_tier_position RPC. Season-aware,
disabled until userId resolves, error-tolerant."
```

---

## Task 3: Add `tier-position-panel` Experiment Entry

**Files:**
- Modify: `fe-next/lib/experiments.ts`

- [ ] **Step 1: Add experiment to registry**

Open `fe-next/lib/experiments.ts`. Inside the `EXPERIMENTS = { ... }` object, after the last existing entry (preserve closing brace + `as const satisfies` exactly as-is), add:

```typescript
  /**
   * Leaderboard tier position panel. Replaces the right-column block
   * of the user-rank card with a tier-rank + percentile + peer list.
   * Hypothesis: surfacing within-tier rank lifts time-on-leaderboard
   * and return rate vs the current global-rank-only treatment.
   * Conversion: tier_position_viewed + leaderboard session length.
   */
  'tier-position-panel': defineExperiment({
    variants: ['control', 'enabled'] as const,
    default: 'control',
    description:
      'Leaderboard user-rank card. control = current (global rank primary), enabled = TierPositionPanel mounted (tier-rank primary, peer list, percentile).',
  }),
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd fe-next && npx tsc --noEmit`

Expected: no errors. The `useExperiment('tier-position-panel')` callsite (added in Task 10) will type-check against this entry.

- [ ] **Step 3: Commit**

```bash
git add fe-next/lib/experiments.ts
git commit -m "feat(experiments): register tier-position-panel flag

Two-arm flag (control vs enabled) for the new TierPositionPanel.
Default control until PostHog rollout flips."
```

---

## Task 4: `TierPositionPanel` — Gold Happy Path (TDD)

**Files:**
- Create: `fe-next/components/leaderboard/TierPositionPanel.tsx`
- Test: `fe-next/components/leaderboard/__tests__/TierPositionPanel.test.tsx`

- [ ] **Step 1: Write the failing test (Gold tier, mid-rank)**

Create `fe-next/components/leaderboard/__tests__/TierPositionPanel.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TierPositionPanel from '../TierPositionPanel';
import type { TierPosition } from '@/hooks/useTierPosition';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (!params) return key;
      let s = key;
      for (const [k, v] of Object.entries(params)) {
        s = s.replace(`{{${k}}}`, String(v));
      }
      return s;
    },
    language: 'en',
  }),
}));

vi.mock('@/components/Avatar', () => ({
  default: ({ userId }: { userId?: string }) => <div data-testid={`avatar-${userId}`} />,
}));

const goldPosition: TierPosition = {
  tier_id: 'gold',
  rank_in_tier: 12,
  tier_population: 487,
  neighbors: [
    { player_id: 'p10', display_name: 'rivalA', total_score: 14200, avatar_image: null, avatar_config: null, rank_in_tier: 10 },
    { player_id: 'p11', display_name: 'rivalB', total_score: 13950, avatar_image: null, avatar_config: null, rank_in_tier: 11 },
    { player_id: 'me',  display_name: 'YOU',    total_score: 13420, avatar_image: null, avatar_config: null, rank_in_tier: 12 },
    { player_id: 'p13', display_name: 'rivalC', total_score: 12880, avatar_image: null, avatar_config: null, rank_in_tier: 13 },
    { player_id: 'p14', display_name: 'rivalD', total_score: 12510, avatar_image: null, avatar_config: null, rank_in_tier: 14 },
  ],
};

describe('TierPositionPanel — Gold happy path', () => {
  it('renders tier-rank as the primary number', () => {
    render(<TierPositionPanel position={goldPosition} userId="me" />);
    expect(screen.getByTestId('tier-rank-primary')).toHaveTextContent('#12 of 487 in gold');
  });

  it('renders percentile pill (12 / 487 ≈ top 3%)', () => {
    render(<TierPositionPanel position={goldPosition} userId="me" />);
    expect(screen.getByTestId('tier-percentile')).toHaveTextContent('Top 3% in gold');
  });

  it('renders 5 peer rows including the user highlighted', () => {
    render(<TierPositionPanel position={goldPosition} userId="me" />);
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(5);
    expect(screen.getByTestId('peer-row-me')).toHaveAttribute('data-current', 'true');
  });

  it('exposes accessible label on the tier-rank node', () => {
    render(<TierPositionPanel position={goldPosition} userId="me" />);
    expect(screen.getByLabelText('Rank 12 of 487 in gold tier')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fe-next && npm run test -- components/leaderboard/__tests__/TierPositionPanel.test.tsx`

Expected: FAIL — `../TierPositionPanel` module not found.

- [ ] **Step 3: Write minimal Gold-path implementation**

Create `fe-next/components/leaderboard/TierPositionPanel.tsx`:

```typescript
'use client';

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import Avatar from '@/components/Avatar';
import {
  GLOBAL_LEADERBOARD_TIERS,
  type LeaderboardTierDef,
  type LeaderboardTierId,
} from '@/lib/ranked/leaderboardTiers';
import type { TierPosition, TierPositionNeighbor } from '@/hooks/useTierPosition';

interface Props {
  position: TierPosition;
  userId: string;
  className?: string;
}

function tierDef(id: LeaderboardTierId): LeaderboardTierDef {
  return GLOBAL_LEADERBOARD_TIERS.find((t) => t.id === id) ?? GLOBAL_LEADERBOARD_TIERS[0];
}

function percentileFromRank(rank: number, population: number): number {
  if (population <= 0) return 100;
  return Math.max(1, Math.round((rank / population) * 100));
}

const TierPositionPanel: React.FC<Props> = memo(({ position, userId, className }) => {
  const { t } = useLanguage();
  const tier = useMemo(() => tierDef(position.tier_id), [position.tier_id]);
  const tierName = t(`ranked.tiers.${position.tier_id}`);
  const percentile = percentileFromRank(position.rank_in_tier, position.tier_population);

  const isStone = position.tier_id === 'stone';
  const isGrandmaster = position.tier_id === 'grandmaster';
  const isFirstInTier = position.rank_in_tier === 1;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn('rounded-neo border-neo-thick shadow-hard-lg bg-neo-navy-light p-4', className)}
      style={{ containerType: 'inline-size' }}
    >
      <div
        data-testid="tier-rank-primary"
        aria-label={`Rank ${position.rank_in_tier} of ${position.tier_population} in ${tierName} tier`}
        className={cn('font-neo-display text-4xl font-bold', tier.textColor)}
      >
        {t('leaderboard.tier.rankInTier', {
          rank: position.rank_in_tier,
          total: position.tier_population,
          tier: tierName,
        })}
      </div>

      {!isStone && !isGrandmaster && (
        <div
          data-testid="tier-percentile"
          className={cn('inline-block mt-2 px-2 py-0.5 rounded-neo border-neo text-xs font-bold text-neo-black', `bg-${position.tier_id}`)}
        >
          {t('leaderboard.tier.percentile', { pct: percentile, tier: tierName })}
        </div>
      )}

      <ul role="list" className="mt-3 space-y-1">
        {position.neighbors.map((n) => (
          <li
            key={n.player_id}
            role="listitem"
            data-testid={`peer-row-${n.player_id}`}
            data-current={n.player_id === userId ? 'true' : 'false'}
            className={cn(
              'flex items-center gap-2 px-2 py-1 rounded text-sm',
              n.player_id === userId
                ? cn('ring-2', tier.ringColor, 'bg-neo-navy')
                : 'hover:bg-neo-navy-light',
            )}
          >
            <span className="w-10 font-mono text-xs text-gray-400">#{n.rank_in_tier}</span>
            <Avatar userId={n.player_id} size="xs" />
            <span className="flex-1 truncate">{n.display_name ?? n.player_id}</span>
            <span className="font-semibold">{n.total_score.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
});

TierPositionPanel.displayName = 'TierPositionPanel';

export default TierPositionPanel;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fe-next && npm run test -- components/leaderboard/__tests__/TierPositionPanel.test.tsx`

Expected: PASS — all 4 Gold-path tests green. (Other tier branches are tested in later tasks.)

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/leaderboard/TierPositionPanel.tsx \
        fe-next/components/leaderboard/__tests__/TierPositionPanel.test.tsx
git commit -m "feat(leaderboard): TierPositionPanel base — Gold happy path

Renders tier-rank (#N of M) as primary number, percentile pill,
and 5-row peer list with the current user highlighted. Stone /
Grandmaster / first-in-tier branches added in subsequent commits."
```

---

## Task 5: Stone Tier Branch (TDD)

**Files:**
- Test: `fe-next/components/leaderboard/__tests__/TierPositionPanel.test.tsx` (extend)
- Modify: `fe-next/components/leaderboard/TierPositionPanel.tsx`

- [ ] **Step 1: Add Stone-tier failing test**

Append to `TierPositionPanel.test.tsx`:

```typescript
const stonePosition: TierPosition = {
  tier_id: 'stone',
  rank_in_tier: 1893,
  tier_population: 8421,
  neighbors: [],
};

describe('TierPositionPanel — Stone tier', () => {
  it('hides the percentile pill', () => {
    render(<TierPositionPanel position={stonePosition} userId="me" />);
    expect(screen.queryByTestId('tier-percentile')).toBeNull();
  });

  it('shows the climb-to-next CTA chip', () => {
    render(<TierPositionPanel position={stonePosition} userId="me" />);
    expect(screen.getByTestId('tier-climb-cta')).toHaveTextContent('Play more to climb to bronze');
  });
});
```

- [ ] **Step 2: Run tests, confirm Stone tests fail**

Run: `cd fe-next && npm run test -- components/leaderboard/__tests__/TierPositionPanel.test.tsx`

Expected: 2 new tests fail (`tier-climb-cta` element not found). Existing 4 pass.

- [ ] **Step 3: Add Stone branch to component**

Edit `TierPositionPanel.tsx`. Replace the percentile-pill block (the `{!isStone && !isGrandmaster && ...}` JSX) with:

```typescript
      {!isStone && !isGrandmaster && (
        <div
          data-testid="tier-percentile"
          className={cn('inline-block mt-2 px-2 py-0.5 rounded-neo border-neo text-xs font-bold text-neo-black', `bg-${position.tier_id}`)}
        >
          {t('leaderboard.tier.percentile', { pct: percentile, tier: tierName })}
        </div>
      )}

      {isStone && (
        <div
          data-testid="tier-climb-cta"
          className="inline-block mt-2 px-2 py-0.5 rounded-neo border-neo text-xs font-bold bg-neo-lime text-neo-black"
        >
          {t('leaderboard.tier.climbToNext', { nextTier: t('ranked.tiers.bronze') })}
        </div>
      )}
```

- [ ] **Step 4: Run tests, confirm all pass**

Run: `cd fe-next && npm run test -- components/leaderboard/__tests__/TierPositionPanel.test.tsx`

Expected: 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/leaderboard/TierPositionPanel.tsx \
        fe-next/components/leaderboard/__tests__/TierPositionPanel.test.tsx
git commit -m "feat(leaderboard): TierPositionPanel — Stone-tier CTA branch

Stone hides the percentile pill (would demotivate the 80% majority
cohort) and shows a forward-looking climb-to-Bronze CTA chip
instead. Forward-looking framing for the dominant case."
```

---

## Task 6: Grandmaster Tier Branch (TDD)

**Files:**
- Test: `fe-next/components/leaderboard/__tests__/TierPositionPanel.test.tsx` (extend)
- Modify: `fe-next/components/leaderboard/TierPositionPanel.tsx`

- [ ] **Step 1: Add Grandmaster failing test**

Append to `TierPositionPanel.test.tsx`:

```typescript
const grandmasterPosition: TierPosition = {
  tier_id: 'grandmaster',
  rank_in_tier: 7,
  tier_population: 42,
  neighbors: [
    { player_id: 'gm1', display_name: 'topGM', total_score: 850000, avatar_image: null, avatar_config: null, rank_in_tier: 1 },
  ],
};

describe('TierPositionPanel — Grandmaster tier', () => {
  it('hides the percentile pill', () => {
    render(<TierPositionPanel position={grandmasterPosition} userId="me" />);
    expect(screen.queryByTestId('tier-percentile')).toBeNull();
  });

  it('shows the defend-throne label', () => {
    render(<TierPositionPanel position={grandmasterPosition} userId="me" />);
    expect(screen.getByTestId('tier-throne-label')).toHaveTextContent('Top tier — defend your throne');
  });
});
```

- [ ] **Step 2: Run tests, confirm Grandmaster tests fail**

Run: `cd fe-next && npm run test -- components/leaderboard/__tests__/TierPositionPanel.test.tsx`

Expected: 2 new tests fail. Existing 6 pass.

- [ ] **Step 3: Add Grandmaster branch**

Edit `TierPositionPanel.tsx`. Add directly below the Stone CTA block:

```typescript
      {isGrandmaster && (
        <div
          data-testid="tier-throne-label"
          className="inline-block mt-2 px-2 py-0.5 rounded-neo border-neo text-xs font-bold bg-neo-yellow text-neo-black"
        >
          👑 {t('leaderboard.tier.topTierDefend')}
        </div>
      )}
```

- [ ] **Step 4: Run tests, confirm all pass**

Run: `cd fe-next && npm run test -- components/leaderboard/__tests__/TierPositionPanel.test.tsx`

Expected: 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/leaderboard/TierPositionPanel.tsx \
        fe-next/components/leaderboard/__tests__/TierPositionPanel.test.tsx
git commit -m "feat(leaderboard): TierPositionPanel — Grandmaster throne branch

Top tier hides percentile pill (no next tier to chase) and
replaces it with a 'defend your throne' label + crown emoji."
```

---

## Task 7: First-in-Tier Wobble Branch (TDD)

**Files:**
- Test: `fe-next/components/leaderboard/__tests__/TierPositionPanel.test.tsx` (extend)
- Modify: `fe-next/components/leaderboard/TierPositionPanel.tsx`

- [ ] **Step 1: Add #1-of-tier failing test**

Append to `TierPositionPanel.test.tsx`:

```typescript
const firstInGold: TierPosition = {
  tier_id: 'gold',
  rank_in_tier: 1,
  tier_population: 487,
  neighbors: [
    { player_id: 'me',  display_name: 'YOU',    total_score: 29900, avatar_image: null, avatar_config: null, rank_in_tier: 1 },
    { player_id: 'p2',  display_name: 'rivalA', total_score: 28000, avatar_image: null, avatar_config: null, rank_in_tier: 2 },
    { player_id: 'p3',  display_name: 'rivalB', total_score: 27500, avatar_image: null, avatar_config: null, rank_in_tier: 3 },
  ],
};

describe('TierPositionPanel — first in tier', () => {
  it('applies the wobble animation class', () => {
    render(<TierPositionPanel position={firstInGold} userId="me" />);
    expect(screen.getByTestId('tier-rank-primary')).toHaveClass('animate-neo-wobble');
  });

  it('renders the nobody-above placeholder', () => {
    render(<TierPositionPanel position={firstInGold} userId="me" />);
    expect(screen.getByTestId('tier-nobody-above')).toHaveTextContent('Nobody above you in gold');
  });
});
```

- [ ] **Step 2: Run tests, confirm new ones fail**

Run: `cd fe-next && npm run test -- components/leaderboard/__tests__/TierPositionPanel.test.tsx`

Expected: 2 new tests fail. Existing 8 pass.

- [ ] **Step 3: Add #1-of-tier branch to component**

Edit `TierPositionPanel.tsx`:

(a) Update the tier-rank node to conditionally apply wobble:

```typescript
      <div
        data-testid="tier-rank-primary"
        aria-label={`Rank ${position.rank_in_tier} of ${position.tier_population} in ${tierName} tier`}
        className={cn(
          'font-neo-display text-4xl font-bold',
          tier.textColor,
          isFirstInTier && 'animate-neo-wobble',
        )}
      >
        {t('leaderboard.tier.rankInTier', {
          rank: position.rank_in_tier,
          total: position.tier_population,
          tier: tierName,
        })}
      </div>
```

(b) Insert the nobody-above placeholder directly above the `<ul role="list">`:

```typescript
      {isFirstInTier && (
        <div
          data-testid="tier-nobody-above"
          className="mt-2 text-xs italic text-gray-400"
        >
          {t('leaderboard.tier.nobodyAbove', { tier: tierName })}
        </div>
      )}
```

- [ ] **Step 4: Run tests, confirm all pass**

Run: `cd fe-next && npm run test -- components/leaderboard/__tests__/TierPositionPanel.test.tsx`

Expected: 10 tests green.

- [ ] **Step 5: Commit**

```bash
git add fe-next/components/leaderboard/TierPositionPanel.tsx \
        fe-next/components/leaderboard/__tests__/TierPositionPanel.test.tsx
git commit -m "feat(leaderboard): TierPositionPanel — #1-of-tier wobble + 'nobody above'

Rank=1 within tier triggers neo-wobble on the rank number and
shows a 'Nobody above you in {tier}' placeholder above the peer
list. Status moment for tier leaders."
```

---

## Task 8: i18n Keys — 5 Locales

**Files:**
- Modify: `fe-next/translations/en.js`
- Modify: `fe-next/translations/he.js`
- Modify: `fe-next/translations/sv.js`
- Modify: `fe-next/translations/ja.js`
- Modify: `fe-next/translations/es.js`

- [ ] **Step 1: Add English keys**

Open `fe-next/translations/en.js`. Find the existing `leaderboard:` block (search for `leaderboard.tiers.bronze` or `ranked.tiers.bronze` to locate the surrounding object). Add the following 8 keys to the `leaderboard.tier` namespace (create the `tier` sub-object if it doesn't exist):

```javascript
    tier: {
      rankInTier: '#{{rank}} of {{total}} in {{tier}}',
      percentile: 'Top {{pct}}% in {{tier}}',
      tierLeader: 'Tier leader',
      topTierDefend: 'Top tier — defend your throne',
      climbToNext: 'Play more to climb to {{nextTier}}',
      peersInTier: 'Peers in {{tier}}',
      nobodyAbove: 'Nobody above you in {{tier}}',
      distanceToFirst: '{{score}} to #1',
    },
```

- [ ] **Step 2: Add Hebrew keys (RTL)**

In `fe-next/translations/he.js`, add the same `tier:` sub-object with translated values. **Imperfect Hebrew is acceptable; flag in commit per project memory `feedback-ai-hebrew-translation`.**

```javascript
    tier: {
      rankInTier: '‫#{{rank}} מתוך {{total}} ב-{{tier}}‬',
      percentile: '‫{{pct}}% עליונים ב-{{tier}}‬',
      tierLeader: 'מוביל הדרגה',
      topTierDefend: '‫הדרגה העליונה — הגן על הכתר‬',
      climbToNext: '‫שחק עוד כדי להעפיל ל-{{nextTier}}‬',
      peersInTier: '‫שחקנים ב-{{tier}}‬',
      nobodyAbove: '‫אין אף אחד מעליך ב-{{tier}}‬',
      distanceToFirst: '‫{{score}} עד #1‬',
    },
```

- [ ] **Step 3: Add Swedish keys**

In `fe-next/translations/sv.js`:

```javascript
    tier: {
      rankInTier: '#{{rank}} av {{total}} i {{tier}}',
      percentile: 'Topp {{pct}}% i {{tier}}',
      tierLeader: 'Divisionsledare',
      topTierDefend: 'Högsta divisionen — försvara din tron',
      climbToNext: 'Spela mer för att nå {{nextTier}}',
      peersInTier: 'Spelare i {{tier}}',
      nobodyAbove: 'Ingen ovanför dig i {{tier}}',
      distanceToFirst: '{{score}} till #1',
    },
```

- [ ] **Step 4: Add Japanese keys**

In `fe-next/translations/ja.js`:

```javascript
    tier: {
      rankInTier: '{{tier}}で{{total}}人中#{{rank}}位',
      percentile: '{{tier}}の上位{{pct}}%',
      tierLeader: 'ティアリーダー',
      topTierDefend: '最上位ティア — 王座を守れ',
      climbToNext: 'プレイして{{nextTier}}に昇格しよう',
      peersInTier: '{{tier}}のプレイヤー',
      nobodyAbove: '{{tier}}にあなたより上はいません',
      distanceToFirst: '#1まであと{{score}}',
    },
```

- [ ] **Step 5: Add Spanish keys**

In `fe-next/translations/es.js`:

```javascript
    tier: {
      rankInTier: '#{{rank}} de {{total}} en {{tier}}',
      percentile: 'Top {{pct}}% en {{tier}}',
      tierLeader: 'Líder de división',
      topTierDefend: 'División superior — defiende tu trono',
      climbToNext: 'Juega más para subir a {{nextTier}}',
      peersInTier: 'Jugadores en {{tier}}',
      nobodyAbove: 'Nadie por encima de ti en {{tier}}',
      distanceToFirst: '{{score}} para llegar a #1',
    },
```

- [ ] **Step 6: Run lint to catch syntax errors**

Run: `cd fe-next && npm run lint`

Expected: no errors. Translation files are JS not JSON — trailing commas allowed.

- [ ] **Step 7: Commit**

```bash
git add fe-next/translations/en.js fe-next/translations/he.js \
        fe-next/translations/sv.js fe-next/translations/ja.js \
        fe-next/translations/es.js
git commit -m "feat(i18n): leaderboard tier panel strings (5 locales)

8 new keys under leaderboard.tier.*: rankInTier, percentile,
tierLeader, topTierDefend, climbToNext, peersInTier, nobodyAbove,
distanceToFirst. HE strings need native review."
```

---

## Task 9: PostHog Telemetry Helpers

**Files:**
- Modify: `fe-next/utils/growthTracking.ts`

- [ ] **Step 1: Add the three helpers**

Open `fe-next/utils/growthTracking.ts`. Find the bottom of the file (after the last existing `export function track*` helper). Append:

```typescript
/**
 * Fires once per session when the TierPositionPanel mounts. Use to
 * measure exposure rate for the tier-position-panel experiment.
 */
export function trackTierPositionViewed(props: {
  tier_id: string;
  rank_in_tier: number;
  tier_population: number;
  percentile: number;
  season_id: number | null;
}): void {
  if (typeof window === 'undefined') return;
  const ph = (window as { posthog?: { capture: (e: string, p: unknown) => void } }).posthog;
  ph?.capture('tier_position_viewed', props);
}

/**
 * Fired when the user taps a peer row in the panel. Tells us whether
 * the social-comparison piece pulls click-through into /player/[id].
 */
export function trackTierPeerClicked(props: {
  tier_id: string;
  peer_rank_in_tier: number;
  was_above: boolean;
}): void {
  if (typeof window === 'undefined') return;
  const ph = (window as { posthog?: { capture: (e: string, p: unknown) => void } }).posthog;
  ph?.capture('tier_peer_clicked', props);
}

/**
 * Fired when the user crosses 50% / 90% progress to the next tier.
 * Caller is responsible for de-duping per session.
 */
export function trackTierProgressionMilestone(props: {
  tier_id: string;
  milestone_pct: 50 | 90;
  score: number;
}): void {
  if (typeof window === 'undefined') return;
  const ph = (window as { posthog?: { capture: (e: string, p: unknown) => void } }).posthog;
  ph?.capture('tier_progression_milestone', props);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd fe-next && npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Wire `trackTierPositionViewed` into the panel**

Open `fe-next/components/leaderboard/TierPositionPanel.tsx`. Add to the imports:

```typescript
import { useEffect, useRef } from 'react';
import { trackTierPositionViewed } from '@/utils/growthTracking';
```

(adjust the existing `import React, { memo, useMemo }` line to also import `useEffect, useRef` if needed.)

Inside the component body, before the `return (`, add:

```typescript
  const exposureFired = useRef(false);
  useEffect(() => {
    if (exposureFired.current) return;
    exposureFired.current = true;
    trackTierPositionViewed({
      tier_id: position.tier_id,
      rank_in_tier: position.rank_in_tier,
      tier_population: position.tier_population,
      percentile,
      season_id: null, // PageClient passes null for current season
    });
  }, [position.tier_id, position.rank_in_tier, position.tier_population, percentile]);
```

- [ ] **Step 4: Run tests to ensure no regression**

Run: `cd fe-next && npm run test -- components/leaderboard/__tests__/TierPositionPanel.test.tsx`

Expected: 10 tests still green (telemetry stubbed by jsdom; no PostHog in test env).

- [ ] **Step 5: Commit**

```bash
git add fe-next/utils/growthTracking.ts \
        fe-next/components/leaderboard/TierPositionPanel.tsx
git commit -m "feat(telemetry): tier_position_viewed + peer_clicked + milestone events

Three PostHog events for the tier-position-panel rollout. Panel
itself fires tier_position_viewed once per mount via a ref guard."
```

---

## Task 10: Wire `<TierPositionPanel>` into `PageClient.tsx`

**Files:**
- Modify: `fe-next/app/[locale]/leaderboard/PageClient.tsx`

- [ ] **Step 1: Add imports**

Open `fe-next/app/[locale]/leaderboard/PageClient.tsx`. Add to the import block (alongside the existing `useTierPromotion` import):

```typescript
import { useTierPosition } from '@/hooks/useTierPosition';
import { useExperiment } from '@/hooks/useExperiment';
import TierPositionPanel from '@/components/leaderboard/TierPositionPanel';
```

- [ ] **Step 2: Read the experiment + tier position**

Inside the `LeaderboardPageClient` body, after the existing `useTierPromotion(...)` call (around line 99), add:

```typescript
  const { variant: tierPanelVariant, trackExposure: trackTierPanelExposure } =
    useExperiment('tier-position-panel');
  const tierPanelEnabled = tierPanelVariant === 'enabled';

  const { data: tierPosition } = useTierPosition(
    tierPanelEnabled ? user?.id : undefined,
    typeof querySeasonId === 'number' ? querySeasonId : undefined,
  );
```

- [ ] **Step 3: Demote global rank styling and inject the panel**

Locate the existing user-rank-card block (lines ~252-316 in the file before edits — find the `motion.div` whose `className` references `from-cyan-900/30 to-blue-900/30`). Replace its inner `<div className="flex items-center justify-between">…</div>` block with:

```tsx
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  <Avatar
                    customAvatar={profile.avatar_config}
                    avatarImage={profile.avatar_image ?? undefined}
                    userId={user?.id}
                    size="lg"
                  />
                  <div className="flex-1">
                    {/* Demoted: global rank now muted subtitle */}
                    <p className={cn('text-xs', 'text-gray-500')}>
                      {t('leaderboard.yourRank')} · #{userRank.rank_position || '—'} {t('leaderboard.global')}
                    </p>
                    {/* Score, kept */}
                    <p className={cn('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-gray-900')}>
                      {userRank.total_score?.toLocaleString() || 0} {t('leaderboard.score')}
                    </p>
                  </div>
                </div>

                {tierPanelEnabled && tierPosition && user?.id ? (
                  <TierPositionPanel
                    position={tierPosition}
                    userId={user.id}
                  />
                ) : (
                  /* Control branch: keep current card body */
                  currentUserTier && (
                    <div className="flex items-center justify-between">
                      <TierBadge tier={currentUserTier} size="sm" showLabel />
                      <TierProgressBar
                        tier={currentUserTier}
                        progress={getLeaderboardTierProgress(userRank.total_score ?? 0, GLOBAL_LEADERBOARD_TIERS)}
                        nextThreshold={getNextTierThreshold(userRank.total_score ?? 0, GLOBAL_LEADERBOARD_TIERS)}
                        className="w-32"
                      />
                    </div>
                  )
                )}
              </div>
```

- [ ] **Step 4: Fire experiment exposure**

Inside the same `LeaderboardPageClient` body, after the `useTierPosition` call:

```typescript
  useEffect(() => {
    if (tierPanelEnabled && tierPosition) trackTierPanelExposure();
  }, [tierPanelEnabled, tierPosition, trackTierPanelExposure]);
```

(If `useEffect` is not already imported in this file, add it: `import { useState, useMemo, useCallback, useEffect } from 'react';`.)

- [ ] **Step 5: Add the missing translation key `leaderboard.global`**

The new card body uses `t('leaderboard.global')` for the muted subtitle. Add it (just the one key) to all 5 translation files:

- `en.js`: `global: 'global',`
- `he.js`: `global: 'גלובלי',`
- `sv.js`: `global: 'globalt',`
- `ja.js`: `global: 'グローバル',`
- `es.js`: `global: 'global',`

Place inside the existing `leaderboard:` object, alongside `yourRank`.

- [ ] **Step 6: Run lint**

Run: `cd fe-next && npm run lint`

Expected: no errors.

- [ ] **Step 7: Run all leaderboard-related tests**

Run: `cd fe-next && npm run test -- leaderboard`

Expected: existing tests + new tests all pass. If any existing snapshot snapshots the user-rank card, update intentionally with `npm run test -- leaderboard -u` and commit the snapshot diff.

- [ ] **Step 8: Manual smoke check (dev server on port 3001)**

Per project memory `dev-server-port`, dev server runs on **3001**. Run `cd fe-next && npm run dev`. With `tier-position-panel` flag NOT enabled in PostHog, visit `http://localhost:3001/en/leaderboard` while logged in and confirm: card looks identical to current behavior (control branch active). To preview the enabled variant locally, set `localStorage.setItem('ph_local_override_tier-position-panel', 'enabled')` in DevTools, refresh, confirm panel appears.

- [ ] **Step 9: Commit**

```bash
git add fe-next/app/[locale]/leaderboard/PageClient.tsx \
        fe-next/translations/*.js
git commit -m "feat(leaderboard): wire TierPositionPanel behind tier-position-panel flag

Demotes global rank to muted subtitle and replaces the right-column
block with TierPositionPanel when the experiment variant is
'enabled'. Control branch preserves current TierBadge + progress
bar layout. Adds 'leaderboard.global' i18n key (5 locales)."
```

---

## Task 11: Final Verification — Lint, Test, Build

**Files:** none modified; verification only.

- [ ] **Step 1: Run lint over the whole project**

Run: `cd fe-next && npm run lint`

Expected: no errors.

- [ ] **Step 2: Run the full test suite**

Run: `cd fe-next && npm run test`

Expected: all tests green, including baseline 1249 + the new ones added in Tasks 2 and 4–7.

- [ ] **Step 3: Run a fast build**

Per project memory `feedback-build-fast`, use `build:fast` for verification, not full `build`.

Run: `cd fe-next && npm run build:fast`

Expected: build succeeds; no type errors; no missing-translation warnings for the new keys.

- [ ] **Step 4: Manual RTL smoke**

Start dev server (port 3001 — `npm run dev`). Visit `http://localhost:3001/he/leaderboard` while logged in. With panel enabled (DevTools localStorage override per Task 10 step 8), confirm:
- Tier-rank line reads right-to-left
- Hard shadows flipped (per design system auto-flip)
- Peer row rank numbers right-aligned
- No layout overflow on narrow widths

Take a quick screenshot of the panel for the PR description.

- [ ] **Step 5: Create the PostHog feature flag (manual step on PostHog UI)**

The code is wired, but PostHog won't serve a variant until the flag exists in the UI. In PostHog → Feature Flags → New flag:
- Key: `tier-position-panel`
- Variants: `control` (50%), `enabled` (50%)
- Conditions: `is_authenticated == true` (panel is hidden for guests anyway, but cleaner)
- Save **off** initially. Flip to on after merging.

This step has no code change; it's a deployment prerequisite.

- [ ] **Step 6: Final commit (only if any verification fix was needed)**

If lint, test, or build surfaced a fix, commit it now:

```bash
git add -p
git commit -m "chore(leaderboard): post-verification fixes for tier panel"
```

If everything was clean, skip this step.

---

## Self-Review

**Spec coverage:**

| Spec section | Implementing task |
|---|---|
| Risks & Principles — Stone-tier psychology | Task 5 (Stone branch + test) |
| Risks & Principles — Feature flag insurance | Task 3 (flag registry) + Task 10 (variant gating) + Task 11 step 5 (PostHog flag setup) |
| Risks & Principles — Sentry-noise discipline | Task 2 (hook `retry: false`, returns undefined on error; no logger.error path) |
| Architecture — RPC `get_user_tier_position` | Task 1 |
| Architecture — Hook `useTierPosition` | Task 2 |
| Architecture — Component `TierPositionPanel` | Tasks 4–7 |
| Architecture — `PageClient` modifications | Task 10 |
| Visual hierarchy flip | Task 10 step 3 |
| Stone edge case | Task 5 |
| Grandmaster edge case | Task 6 |
| #1-of-tier edge case | Task 7 |
| Last-of-tier (4 above) | Inherent in RPC `BETWEEN GREATEST(1, rank-2) AND rank+2` window — top edge already handled. Bottom edge does not need special-case because the RPC just returns whatever rows exist; the component happily renders <5 rows. *No dedicated test, but the existing peer-list render test plus the SQL window guarantees behavior.* |
| Tier-population <5 | Same — RPC returns however many rows fit; component does not pad. Component test in Task 4 (`getAllByRole('listitem')`) tolerates any length. |
| New user / no rank | Existing `profile && userRank` gate in `PageClient.tsx` is preserved (Task 10 changes the inner content, not the outer guard). |
| RPC error fallback | Task 2 (`retry: false`, hook returns undefined) + Task 10 (`tierPosition` is falsy → falls through to control branch JSX) |
| Season transition | Task 2 hook `queryKey: ['tier-position', userId, seasonId ?? 'current']` + Task 10 passes `querySeasonId` |
| i18n — 8 keys × 5 locales | Task 8 |
| i18n — `leaderboard.global` | Task 10 step 5 |
| Telemetry events | Task 9 |
| Container queries | Task 4 (`style={{ containerType: 'inline-size' }}` on the panel root) |
| RTL smoke | Task 11 step 4 |
| Tests — component branches | Tasks 4–7 |
| Tests — hook | Task 2 |
| Tests — SQL boundaries | Task 1 steps 3–5 (executed via Supabase MCP rather than a JS test, since SQL test infra would require a test DB) |
| A11y `aria-label` | Task 4 step 3 (`aria-label={Rank N of M in TIER tier}`) + `role="list"` / `role="listitem"` |
| Rollout — feature flag | Task 11 step 5 |

**Placeholder scan:** No "TBD", "TODO", or vague guidance. Every step has either runnable code, a concrete command, or a manual UI action with exact field values.

**Type consistency:** `TierPosition` shape declared in Task 2; consumed identically in Tasks 4–7 and Task 10. Hook signature `useTierPosition(userId?: string, seasonId?: number)` matches its usage in Task 10. Component prop `position: TierPosition` matches across all test fixtures and the consumer.

**Gaps fixed during self-review:**
- `leaderboard.global` was missing from the i18n list → added as a sub-step in Task 10.
- Last-of-tier / population-<5 cases — verified the RPC + component render naturally handle these without special-case code; called out in the table above.
- `useEffect` import missing from `PageClient.tsx` modification → noted explicitly in Task 10 step 4.

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-01-leaderboard-tier-feel.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
