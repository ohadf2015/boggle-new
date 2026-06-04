# Profile & Rewards Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add coin-earn FX coverage for server grants (+native fallback), redesign profile sections (impeccable+gsap), and surface badges + current-season ranking on public profile, own profile, and the side nav.

**Architecture:** Three sequenced phases. Phase 1 (data+wiring, lowest risk) → Phase 2 (design) → Phase 3 (FX). Backend adds one read-only RPC + 2 public columns; frontend adds small focused components reusing existing parametrized hooks.

**Tech Stack:** Next.js 16 App Router, tRPC, Supabase Postgres (RPC), Tailwind 3.4 (neo-brutalist), Framer Motion, GSAP, Howler, PixiJS, Vitest. i18n ×5 (en/he/sv/ja/es), Hebrew RTL.

**Spec:** `docs/superpowers/specs/2026-06-04-profile-rewards-polish-design.md`

---

## File Structure

**Phase 1 — data + ranking surfaces**
- Create: `supabase/migrations/<ts>_current_season_rank_rpc.sql` — `get_user_current_season_rank(uuid)`
- Modify: `fe-next/backend/trpc/routers/playerProfile.ts` — add `rank_tier`,`ranked_mmr` to columns + return
- Modify: `fe-next/backend/trpc/routers/leaderboard.ts` — add `getCurrentSeasonRank` proc
- Create: `fe-next/components/seasons/RankTierChip.tsx` — tier badge (static color map)
- Create: `fe-next/components/seasons/SeasonRankCard.tsx` — "#42 of N · Gold" card
- Create: `fe-next/components/profile/ProfileAchievementsPublic.tsx` — read-only earned-badge row
- Modify: `fe-next/app/[locale]/u/[username]/PageClient.tsx` — insert rank card + achievements + tier chip
- Modify: `fe-next/app/[locale]/profile/PageClient.tsx` + `components/profile/ProfileHeader.tsx` — tier chip + season rank
- Modify: `fe-next/components/GlobalBottomNav.tsx` — tier dot on profile tab
- Modify: `fe-next/translations/{en,he,sv,ja,es}.ts` (or json) — `rank.*` keys
- Tests: co-located `__tests__/` for each component + leaderboard router test

**Phase 2 — profile redesign** (detailed at execution; design-iterative)
- Modify profile section components + `ProfileHeader.tsx`; possibly extract a `lib/profile/sectionMotion.ts` for the gsap matchMedia helper. Tests: reduced-motion + brand-guard.

**Phase 3 — coin FX** (detailed at execution)
- Create: `fe-next/utils/coinEarnedFx.ts` — `emitCoinEarned()` single source
- Modify: `CoinContext.tsx`, `awardWatchedAd`, server-grant client handlers (blast chest, missions, WotD, duel)
- Modify: `components/animations/GlobalCoinEarnFx.tsx` — DOM fallback when WebGL skipped
- Tests: emit helper, handler emission, fallback branch.

---

## PHASE 1 — Badges + Season Ranking

### Task 1: Current-season rank RPC (migration)

**Files:**
- Create: `fe-next/supabase/migrations/20260604_current_season_rank_rpc.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- get_user_current_season_rank: a player's live position in the CURRENT season leaderboard.
-- Uses idx_lb_season_score (season_id, total_score DESC). Returns 0 rows when un-ranked.
CREATE OR REPLACE FUNCTION public.get_user_current_season_rank(p_player_id uuid)
RETURNS TABLE(rank_position int, total_score int, games_played int, season_id int, total_players int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cur AS (SELECT public.get_current_season_id() AS sid),
  ranked AS (
    SELECT l.player_id,
           l.total_score,
           l.games_played,
           RANK() OVER (ORDER BY l.total_score DESC) AS rk,
           COUNT(*) OVER () AS cnt
    FROM public.leaderboard l, cur
    WHERE l.season_id = cur.sid
  )
  SELECT r.rk::int, r.total_score, r.games_played, (SELECT sid FROM cur), r.cnt::int
  FROM ranked r
  WHERE r.player_id = p_player_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_current_season_rank(uuid) TO anon, authenticated, service_role;
```

- [ ] **Step 2: Apply via supabase mcp `apply_migration`** (name `current_season_rank_rpc`).

- [ ] **Step 3: Verify with a live SELECT** against a known player id:

Run (execute_sql): `SELECT * FROM get_user_current_season_rank('<a real player_id from leaderboard>');`
Expected: one row `{rank_position, total_score, games_played, season_id, total_players}`; an id not in current season → 0 rows.

- [ ] **Step 4: Commit** (ask first) — `git add fe-next/supabase/migrations/20260604_current_season_rank_rpc.sql`

### Task 2: `leaderboard.getCurrentSeasonRank` tRPC proc

**Files:**
- Modify: `fe-next/backend/trpc/routers/leaderboard.ts` (add proc near `getPlayerRank`)
- Test: `fe-next/backend/trpc/routers/__tests__/leaderboard.currentSeasonRank.test.ts`

- [ ] **Step 1: Write failing test** (mock `getSupabase().rpc`):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpc = vi.fn();
vi.mock('../../../modules/supabaseServer', () => ({
  getSupabase: () => ({ rpc }),
  isSupabaseConfigured: () => true,
}));

import { leaderboardRouter } from '../leaderboard';

const caller = () => leaderboardRouter.createCaller({} as any);

describe('leaderboard.getCurrentSeasonRank', () => {
  beforeEach(() => { rpc.mockReset(); });

  it('returns rank payload when player is ranked', async () => {
    rpc.mockResolvedValue({ data: [{ rank_position: 42, total_score: 9100, games_played: 30, season_id: 3, total_players: 1204 }], error: null });
    const res = await caller().getCurrentSeasonRank({ playerId: '00000000-0000-0000-0000-000000000001' });
    expect(res.data).toEqual({ rankPosition: 42, totalScore: 9100, gamesPlayed: 30, seasonId: 3, totalPlayers: 1204 });
  });

  it('returns null when player is un-ranked (no rows)', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    const res = await caller().getCurrentSeasonRank({ playerId: '00000000-0000-0000-0000-000000000002' });
    expect(res.data).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`getCurrentSeasonRank` not a function).

Run: `cd fe-next && npx vitest run backend/trpc/routers/__tests__/leaderboard.currentSeasonRank.test.ts`

- [ ] **Step 3: Implement the proc** (insert before the closing `});` of the router, after `getPlayerRank`):

```ts
  getCurrentSeasonRank: loggedProcedure
    .input(z.object({ playerId: z.string().uuid() }))
    .query(async ({ input }) => {
      if (!isSupabaseConfigured()) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Leaderboard service not available' });
      }
      const supabase = getSupabase();
      if (!supabase) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }
      const { data, error } = await supabase
        .rpc('get_user_current_season_rank', { p_player_id: input.playerId });
      if (error) {
        logger.warn('TRPC', 'getCurrentSeasonRank RPC error', { error: error.message });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `RPC error: ${error.message}` });
      }
      const row = data?.[0];
      if (!row) return { data: null };
      return {
        data: {
          rankPosition: row.rank_position,
          totalScore: row.total_score,
          gamesPlayed: row.games_played,
          seasonId: row.season_id,
          totalPlayers: row.total_players,
        },
      };
    }),
```

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: tsc + lint changed file.** `cd fe-next && npx tsc --noEmit && npx eslint backend/trpc/routers/leaderboard.ts`

### Task 3: Expose `rank_tier` + `ranked_mmr` on public profile

**Files:**
- Modify: `fe-next/backend/trpc/routers/playerProfile.ts:9-14` (columns) and `:70-88` (return)
- Test: `fe-next/backend/trpc/routers/__tests__/playerProfile.rankFields.test.ts`

- [ ] **Step 1: Failing test** — mock supabase chain returns a profile incl `rank_tier:'Gold', ranked_mmr:1240`; assert `result.rankTier==='Gold'` and `result.rankedMmr===1240`. (Mirror existing mock style; head-count queries return `{count:0}`.)

- [ ] **Step 2: Run — expect FAIL** (undefined fields).

- [ ] **Step 3: Implement** — add `'rank_tier', 'ranked_mmr',` to the `PUBLIC_PROFILE_COLUMNS` array (line 12 area) and to the return object:
```ts
          rankTier: profile.rank_tier || null,
          rankedMmr: profile.ranked_mmr || null,
```

- [ ] **Step 4: Run — expect PASS.** Then tsc + lint changed file.

### Task 4: `RankTierChip` component

**Files:**
- Create: `fe-next/components/seasons/RankTierChip.tsx`
- Test: `fe-next/components/seasons/__tests__/RankTierChip.test.tsx`

- [ ] **Step 1: Failing test:**

```tsx
import { render, screen } from '@testing-library/react';
import { RankTierChip } from '../RankTierChip';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

describe('RankTierChip', () => {
  it('renders the tier label with a static color class', () => {
    const { container } = render(<RankTierChip tier="Gold" />);
    expect(screen.getByText('rank.tier.gold')).toBeInTheDocument();
    // static class, not dynamic interpolation
    expect(container.querySelector('.text-neo-yellow')).toBeTruthy();
  });

  it('renders nothing when tier is null', () => {
    const { container } = render(<RankTierChip tier={null} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement** (static TIER map — Tailwind only emits literal classes; sizes via static map too):

```tsx
'use client';
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export type RankTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

const TIER_CLASSES: Record<RankTier, string> = {
  Bronze: 'text-neo-orange border-neo-orange',
  Silver: 'text-neo-white border-neo-white',
  Gold: 'text-neo-yellow border-neo-yellow',
  Platinum: 'text-neo-cyan border-neo-cyan',
  Diamond: 'text-neo-purple border-neo-purple',
};

const SIZE_CLASSES = {
  xs: 'text-[10px] px-1.5 py-0.5',
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
} as const;

export function RankTierChip({ tier, size = 'sm', className }: {
  tier: string | null | undefined;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  const { t } = useLanguage();
  if (!tier || !(tier in TIER_CLASSES)) return null;
  const key = tier as RankTier;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-neo border-2 bg-neo-navy font-neo-display uppercase tracking-wide',
        TIER_CLASSES[key], SIZE_CLASSES[size], className,
      )}
    >
      {t(`rank.tier.${key.toLowerCase()}`)}
    </span>
  );
}
```

- [ ] **Step 4: Run — expect PASS.** tsc + lint.

### Task 5: `SeasonRankCard` component

**Files:**
- Create: `fe-next/components/seasons/SeasonRankCard.tsx`
- Test: `fe-next/components/seasons/__tests__/SeasonRankCard.test.tsx`

- [ ] **Step 1: Failing test** — mock `trpc.leaderboard.getCurrentSeasonRank.useQuery` to return ranked data → assert `#42` and "of 1,204" render; mock null → assert `rank.unranked` text renders. Also pass `tier` prop → `RankTierChip` shows.

```tsx
import { render, screen } from '@testing-library/react';
import { SeasonRankCard } from '../SeasonRankCard';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));
const useQuery = vi.fn();
vi.mock('@/lib/trpc', () => ({ trpc: { leaderboard: { getCurrentSeasonRank: { useQuery: (...a: any[]) => useQuery(...a) } } } }));

describe('SeasonRankCard', () => {
  it('shows position and total when ranked', () => {
    useQuery.mockReturnValue({ data: { data: { rankPosition: 42, totalPlayers: 1204, totalScore: 9100, gamesPlayed: 30, seasonId: 3 } }, isLoading: false });
    render(<SeasonRankCard playerId="p1" tier="Gold" />);
    expect(screen.getByText(/42/)).toBeInTheDocument();
    expect(screen.getByText('rank.tier.gold')).toBeInTheDocument();
  });
  it('shows unranked when no data', () => {
    useQuery.mockReturnValue({ data: { data: null }, isLoading: false });
    render(<SeasonRankCard playerId="p1" tier={null} />);
    expect(screen.getByText('rank.unranked')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement** (neo-brutalist card; numbers locale-formatted via `toLocaleString`; no gradients):

```tsx
'use client';
import React from 'react';
import { Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { RankTierChip } from './RankTierChip';

export function SeasonRankCard({ playerId, tier }: { playerId: string; tier?: string | null }) {
  const { t } = useLanguage();
  const q = trpc.leaderboard.getCurrentSeasonRank.useQuery(
    { playerId }, { staleTime: 60_000, retry: false },
  );
  const rank = q.data?.data ?? null;
  return (
    <div className="rounded-neo-xl p-5 bg-neo-navy-light border-2 border-black shadow-hard-lg">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="inline-flex items-center gap-2 font-neo-display text-neo-white uppercase text-sm tracking-wide">
          <Trophy className="w-4 h-4 text-neo-yellow" />
          {t('rank.seasonTitle')}
        </span>
        <RankTierChip tier={tier} size="sm" />
      </div>
      {rank ? (
        <div className="flex items-baseline gap-2">
          <span className="font-neo-display text-3xl text-neo-yellow">#{rank.rankPosition.toLocaleString()}</span>
          <span className="font-neo-body text-sm text-neo-white">
            {t('rank.ofPlayers').replace('{count}', rank.totalPlayers.toLocaleString())}
          </span>
        </div>
      ) : (
        <p className="font-neo-body text-sm text-neo-white/80">{t('rank.unranked')}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run — expect PASS.** tsc + lint.

### Task 6: i18n keys (×5)

**Files:** Modify `fe-next/translations/en.*`, `he.*`, `sv.*`, `ja.*`, `es.*`

- [ ] **Step 1: Add `rank` block** to each language (native phrasing, no calques). en example:
```
rank: {
  seasonTitle: 'Season Rank',
  ofPlayers: 'of {count} players',
  unranked: 'Play a ranked game to enter this season’s leaderboard.',
  tier: { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum', diamond: 'Diamond' },
}
```
he (RTL, natural): `seasonTitle: 'דירוג העונה'`, `ofPlayers: 'מתוך {count} שחקנים'`, `unranked: 'שחקו משחק מדורג כדי להיכנס לטבלת העונה.'`, tiers transliterated naturally (ארד/כסף/זהב/פלטינה/יהלום). sv/ja/es likewise native.

- [ ] **Step 2:** `cd fe-next && npx tsc --noEmit` (translation type parity) — expect PASS.

### Task 7: Wire into public profile

**Files:** Modify `fe-next/app/[locale]/u/[username]/PageClient.tsx`
- Test: `fe-next/app/[locale]/u/[username]/__tests__/PageClient.rank.test.tsx`

- [ ] **Step 1: Failing test** — render with mocked `playerProfile.get` (incl `rankTier:'Gold'`) + mocked `getCurrentSeasonRank` ranked + `achievementCounts:{wordsmith:3}`; assert `SeasonRankCard` text and an achievement badge render.

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement** — import `SeasonRankCard` + `ProfileAchievementsPublic` + `RankTierChip`; add tier chip into the hero (`@username · Lv N` line) and insert `<SeasonRankCard playerId={profile.id} tier={profile.rankTier} />` above `<SeasonTrophyCase/>`, then `<ProfileAchievementsPublic counts={profile.achievementCounts} />`.

- [ ] **Step 4: Run — expect PASS.** tsc + lint.

### Task 8: `ProfileAchievementsPublic` (read-only badge row)

**Files:** Create `fe-next/components/profile/ProfileAchievementsPublic.tsx` + test.

- [ ] **Step 1: Failing test** — pass `counts={{wordsmith:2, owl:1}}` → renders 2 badges; `counts={}` → renders empty-state text `achievements.none`.
- [ ] **Step 2: FAIL.**
- [ ] **Step 3: Implement** — map non-zero `counts` keys to `AchievementBadge` (reuse existing) in a wrapping flex row; neo-brutalist bordered container; header `t('profile.achievements')`. Reuse `achievementIcons` + `isHallOfFameAchievement` ordering (Hall of Fame first).
- [ ] **Step 4: PASS.** tsc + lint.

### Task 9: Own profile + ProfileHeader tier chip + side nav dot

**Files:** Modify `fe-next/app/[locale]/profile/PageClient.tsx`, `components/profile/ProfileHeader.tsx`, `components/GlobalBottomNav.tsx` (+ tests where logic).

- [ ] **Step 1:** ProfileHeader — render `<RankTierChip tier={profile?.rank_tier} size="sm" />` next to the level badge (non-compact). Own profile overview — add `<SeasonRankCard playerId={user.id} tier={profile?.rank_tier} />`.
- [ ] **Step 2:** GlobalBottomNav — on the profile tab, render a small tier-colored dot when `profile?.rank_tier` present, with `aria-label={t('rank.tier.<tier>')}`. Static color via the same TIER map (extract to `lib/seasons/tierColors.ts` shared by chip + nav to stay DRY). Hidden when no tier — no layout shift.
- [ ] **Step 3:** Test the tierColors map + nav dot conditional render. PASS.
- [ ] **Step 4:** tsc + lint + `npm run test:frontend` (changed) + `npm run build`.

- [ ] **Step 5: Commit Phase 1** (ask first), pathspec-scoped:
```bash
git add fe-next/supabase/migrations/20260604_current_season_rank_rpc.sql \
  fe-next/backend/trpc/routers/leaderboard.ts fe-next/backend/trpc/routers/playerProfile.ts \
  fe-next/components/seasons/RankTierChip.tsx fe-next/components/seasons/SeasonRankCard.tsx \
  fe-next/lib/seasons/tierColors.ts \
  fe-next/components/profile/ProfileAchievementsPublic.tsx \
  fe-next/app/[locale]/u/[username]/PageClient.tsx fe-next/app/[locale]/profile/PageClient.tsx \
  fe-next/components/profile/ProfileHeader.tsx fe-next/components/GlobalBottomNav.tsx \
  fe-next/translations/* \
  fe-next/components/seasons/__tests__ fe-next/components/profile/__tests__ \
  fe-next/backend/trpc/routers/__tests__ fe-next/app/[locale]/u/[username]/__tests__ \
  docs/superpowers/specs/2026-06-04-profile-rewards-polish-design.md \
  docs/superpowers/plans/2026-06-04-profile-rewards-polish.md
git commit -m "feat(profile): current-season rank + tier chip + achievements on public/own profile + side nav"
```

---

## PHASE 2 — Profile Sections Redesign (impeccable + gsap-core)

Run `/impeccable` (craft) + `/gsap-core` against the profile sections. Detailed tasks authored at execution. Hard rules carried from spec:
- Finite entrances only; `gsap.matchMedia()` with `(prefers-reduced-motion: no-preference)` branch; reduced-motion branch = instant, no opacity:0 trap.
- Neo-brutalist: hard shadows, solid borders, mode colors; **no gradients/glass**.
- Tests: (a) reduced-motion renders content immediately (no permanently-hidden node); (b) brand-guard on changed files (no `gradient`/`backdrop-blur`).
- Commit per phase (ask first).

## PHASE 3 — Coin FX Coverage + Native Fallback

Detailed tasks authored at execution. Carried from spec:
- `utils/coinEarnedFx.ts` `emitCoinEarned(amount, reason, sourceEl?)` — single event source; refactor `CoinContext`/`awardWatchedAd` onto it.
- Emit on positive server grants: blast chest open, daily missions claim, WotD claim, duel win.
- `GlobalCoinEarnFx`: DOM/framer fallback (finite ~1.2s) when `SharedFxApp` inactive (native) AND motion allowed; reduced-motion → sound only, no visual; web+motion unchanged (PixiJS).
- Tests: emit helper (ignores ≤0), handler emission once, fallback branch matrix.
- Commit per phase (ask first).

---

## Self-Review notes
- Spec coverage: #3 → Phase 1 (rank + badges + nav); #2 → Phase 2; #1 → Phase 3. All mapped.
- Type consistency: proc returns `{rankPosition,totalScore,gamesPlayed,seasonId,totalPlayers}` used identically in SeasonRankCard. `RankTierChip` tier prop is `string|null|undefined` everywhere; TIER map keys PascalCase, i18n key lowercased.
- Placeholder scan: migration timestamp `20260604` is concrete; verify no collision at apply time (bump suffix if needed).
