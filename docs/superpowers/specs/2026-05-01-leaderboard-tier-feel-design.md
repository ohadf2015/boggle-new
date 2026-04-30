# Leaderboard Tier Feel — Design Spec

**Date:** 2026-05-01
**Owner:** Ohad
**Status:** Approved (brainstorming) → ready for plan

## Goal

Make tier in the leaderboard *feel* meaningful — give every player a sense of **progression**, **belonging**, and **status** within their tier, instead of just a passive label next to a global rank.

User's literal ask: "you are #1 in your tier, for example."

## Problem (Current State)

The `/leaderboard` page already shows a "your rank" card (`fe-next/app/[locale]/leaderboard/PageClient.tsx:252-316`). It displays:

- Avatar
- Global rank `#{userRank.rank_position}` (giant number, primary visual)
- Tier badge (small, decorative)
- Total score
- `<TierProgressBar>` to next tier
- `<NearRankIndicator>` (separate component, near-rank by global position)

**Gaps:**

1. No rank within tier — player has no sense of being "1 of N in Gold."
2. No tier population — tier feels disconnected from peers.
3. Tier badge is cosmetic, not load-bearing.
4. Global rank is primary; for the 80%+ of players in Stone tier, that number is large/demotivating, while the tier (where they belong) is downplayed.

Two tier systems coexist in the codebase: ELO ranked tiers (`lib/ranked/tiers.ts`) and score-based leaderboard tiers (`lib/ranked/leaderboardTiers.ts`). **This spec only changes the score-based leaderboard tier presentation.**

## Risks & Design Principles (load-bearing)

These three risks shape the entire design. Implementation must respect each — call out in the implementation plan if any is being violated.

### 1. Stone-tier psychology landmine

**~80% of casual users live in Stone tier.** A naive design (`Top 89% in Stone`) would demotivate the fattest cohort and likely *worsen* leaderboard bounce. The tier card must re-frame for low tiers: hide percentile, show a forward-looking CTA (`Play more to climb to Bronze`) instead of backward-looking ranking. This is not a "nice to have" edge case — it's the dominant case for most sessions.

**How this constrains the design:** Stone branch in `TierPositionPanel` is mandatory before launch, not a follow-up. Tests must cover Stone explicitly.

### 2. Feature flag is cheap insurance

Tier psychology can backfire in subtle ways: low-rank users feel *worse* than before (now they see "Bronze #2,140 of 8,000" where before they saw a tier badge); high-rank users may stop returning if "#1 in Diamond" feels like a finish line; new users may bounce when they realize how far they have to climb.

**How this constrains the design:** ship behind PostHog flag `tier-position-panel` from day one (use existing `lib/experiments.ts` infra per memory `ab-testing-infra`). Kill criteria explicit (bounce worsens >5%). Do **not** flip to 100% without measurement.

### 3. Sentry-noise discipline

The new `get_user_tier_position` RPC will fail occasionally (network, season transition, race conditions, planned downtime). Logging the fallback path as `error` or `warn` would ship every prod failure to Sentry and drown the signal — same mistake we've already corrected twice (memory: `sentry-noise-2026-04-29-batch`, `sentry-translation-warn-demote`).

**How this constrains the design:** error path in `useTierPosition` and `TierPositionPanel` must use `logger.info` (not `warn`/`error`). Fallback renders the existing card without panel — silent degradation is correct here. Real bugs surface via the `tier_position_viewed` event volume dropping in PostHog, not via Sentry.

## Approach (Chosen)

**Sticky "Your Tier" enhancement** in the existing user-rank card on `/leaderboard`. Reorder visual hierarchy so tier-rank becomes the primary number, demote global rank to muted subtitle, and add a peers mini-list (2 above + you + 2 below) inside the same card.

**Rejected alternatives:**

- *Tabs (Global / Your Tier / Daily)* — hides global view, requires extra interaction.
- *Banded global list* — partial-data hole when leaderboard is paginated; rendering-heavy.
- *Filter chip toggle* — loses the always-on "where am I" signal.
- *Animated tier ladder visualization* — token-heavy mobile; doesn't solve the "#1 in tier" ask.
- *Compact one-line strip* — too quiet for the "improve feel" goal; no peer context.

## Architecture

### New files

| Path | Purpose |
|---|---|
| `fe-next/components/leaderboard/TierPositionPanel.tsx` | Renders tier-rank, percentile, and peer list. Used inside the user-rank card. |
| `fe-next/components/leaderboard/__tests__/TierPositionPanel.test.tsx` | Component tests (Vitest + RTL). |
| `fe-next/hooks/useTierPosition.ts` | React Query hook fetching `{ rankInTier, tierPopulation, percentile, neighbors }`, season-aware. |
| `fe-next/hooks/__tests__/useTierPosition.test.ts` | Hook tests (mocked Supabase). |
| `supabase/migrations/<timestamp>_get_user_tier_position.sql` | RPC `get_user_tier_position(p_user_id, p_season_id)`. |

### Modified files

| Path | Change |
|---|---|
| `fe-next/app/[locale]/leaderboard/PageClient.tsx` | Replace right-column block of user-rank card (lines ~287-305) with `<TierPositionPanel>`. Demote global rank styling (lines ~277-279). Pass `tierPosition` from new hook. |
| `fe-next/translations/{en,he,sv,ja,es}.js` | Add 8 new keys under `leaderboard.tier.*`. |

### Data layer — RPC `get_user_tier_position`

```sql
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
  user_row AS (SELECT * FROM ranked WHERE player_id = p_user_id),
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
  SELECT jsonb_build_object(
    'tier_id',         (SELECT tier_id FROM user_row),
    'rank_in_tier',    (SELECT rank_in_tier FROM user_row),
    'tier_population', (SELECT tier_population FROM pop),
    'neighbors',       (SELECT jsonb_agg(neighbors.*) FROM neighbors)
  );
$$;

GRANT EXECUTE ON FUNCTION get_user_tier_position(uuid, int) TO authenticated, anon;
```

**Index requirement:** existing `(season_id, total_score DESC)` covers the partition + order. Verify; add if missing.

**Migration deployment:** use Supabase MCP `apply_migration` (per project memory `feedback-supabase-mcp-for-migrations`), not raw SQL files.

### Hook — `useTierPosition`

```ts
export function useTierPosition(userId?: string, seasonId?: number) {
  return useQuery({
    queryKey: ['tier-position', userId, seasonId ?? 'current'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_tier_position', {
        p_user_id: userId,
        p_season_id: seasonId ?? null,
      });
      if (error) throw error;
      return data as TierPosition;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}
```

**Error path:** on error, `TierPositionPanel` returns `null` so the existing card falls back to current behavior. Log via `logger.info` (not `warn`/`error`) to avoid Sentry noise (memory: `sentry-noise-2026-04-29-batch`).

## Visual Layout

### Mobile (<640px) — stacked

```
┌──────────────────────────────────────────────┐
│ [Avatar lg]  YOUR RANK                       │
│              #4,287 global              ← muted, sm
│              ──────────────────              │
│              🏆 GOLD · #12 of 487       ← primary, 4xl
│              Top 3% in tier             ← pill
│                                              │
│ ▰▰▰▰▰▰▱▱▱▱  340 to Platinum                  │ ← progress bar
├──────────────────────────────────────────────┤
│ Peers in Gold:                               │
│   #10  rivalA      14,200                    │
│   #11  rivalB      13,950                    │
│ ► #12  YOU         13,420  ← highlighted    │
│   #13  rivalC      12,880                    │
│   #14  rivalD      12,510                    │
└──────────────────────────────────────────────┘
```

### Desktop (≥640px) — 2 columns

- Left col: avatar + tier-rank emphasis
- Right col: peers mini-list (5 rows compact)
- Progress bar spans full width below

### Visual hierarchy change

- **Tier-rank `#12 of 487`** is the giant number (was: global rank `#4,287`).
- **Global rank** demoted to muted subtitle.
- **Tier badge** promoted to size="lg" with glow.
- **Peer list** new addition — 5 rows, your row gets `ring-2 tier.ringColor` + tier glow.

### Neo-brutalist treatment

Per `fe-next/.claude/docs/design-system.md`:

- Card: `border-neo-thick` + `shadow-hard-lg` + `bg-neo-navy-light`
- Tier-rank number: `font-neo-display` (Fredoka), `text-4xl`, `tier.textColor`
- Percentile pill: `bg-{tier} text-neo-black border-neo` chip
- Peer rows: hover `bg-neo-navy-light`; your row: `ring-2 tier.ringColor`
- Animations: `animate-neo-pop` on mount; tier-rank counter animates 0 → final (200ms, framer-motion)

### RTL (Hebrew, `?locale=he`)

- Use `me-`/`ms-` (already pattern); shadows auto-flip per design system
- Peer rank numbers use `start` alignment
- i18n strings reorder via translator (Hebrew word order differs)

### Container queries

Per `fe-next/.claude/docs/responsive-design.md`: card root sets `container-type: inline-size`. Peer rows use `@container/card:` variants. Future-proofs reuse on `/profile` and post-game results.

## Edge Cases

| Case | Behavior |
|---|---|
| Stone tier (huge population, low engagement) | Show tier-rank but **hide percentile**. Replace with `Play more to climb to Bronze` chip + CTA → `/singleplayer`. |
| Grandmaster (top tier) | Hide progress bar. Show `Top tier — defend your throne` + distance-to-#1. Crown 👑 overlay on badge. |
| Tier population <5 | Show all neighbors that exist; don't pad. |
| User is #1 of tier | `🏆 #1 in Gold` with `animate-neo-wobble`. Replace "peers above" with `Nobody above you in Gold`. |
| User is last of tier | Show 4 peers above instead of 2/2. |
| New user / no rank | Hide whole card (current `profile && userRank` gate preserved). |
| RPC timeout / network error | Skeleton → fall back to existing card without panel. Log `info` (not error). |
| Season transition | Hook re-fetches on `seasonScope` change. Past-seasons tab hides panel (separate code path: `PastSeasonsLeaderboard`). |

## i18n Keys

5 locales required: en, he, sv, ja, es. Hebrew non-negotiable per project memory `feedback-ai-hebrew-translation`.

```
leaderboard.tier.rankInTier        "#{{rank}} of {{total}} in {{tier}}"
leaderboard.tier.percentile        "Top {{pct}}% in {{tier}}"
leaderboard.tier.tierLeader        "Tier leader"
leaderboard.tier.topTierDefend     "Top tier — defend your throne"
leaderboard.tier.climbToNext       "Play more to climb to {{nextTier}}"
leaderboard.tier.peersInTier       "Peers in {{tier}}"
leaderboard.tier.nobodyAbove       "Nobody above you in {{tier}}"
leaderboard.tier.distanceToFirst   "{{score}} to #1"
```

Use `t(key, { var })` interpolation, never `.replace('{{var}}', ...)` (memory: `feedback-translation-double-brace-replace`).

Imperfect Hebrew acceptable; mark commit `needs native review`.

## Telemetry (PostHog)

| Event | Fires when | Props |
|---|---|---|
| `tier_position_viewed` | Panel mounts (1× per session) | `tier_id`, `rank_in_tier`, `tier_population`, `percentile`, `season_id` |
| `tier_peer_clicked` | User taps a peer row | `tier_id`, `peer_rank_in_tier`, `was_above` |
| `tier_progression_milestone` | User crosses 50% / 90% to next tier | `tier_id`, `milestone_pct`, `score` |

Hypothesis: tier-position panel + peer list will increase leaderboard time-on-page and return-rate. Compare to existing PostHog sweep findings (`posthog-improve-2026-04-29`).

## Tests (TDD mandatory — `.claude/rules/22-tdd-strict.md`)

### Unit / component

- `TierPositionPanel.test.tsx`
  - Stone hides percentile pill, shows climb-to-next CTA
  - Grandmaster hides progress bar, shows distance-to-#1
  - #1-of-tier renders wobble + "nobody above" placeholder
  - Last-of-tier shows 4 peers above
  - RTL snapshot
- `useTierPosition.test.ts`
  - Successful fetch returns parsed shape
  - Error returns null and does not throw
  - Re-fetches when `seasonId` changes
  - Disabled when `userId` is falsy

### SQL

- `backend/__tests__/get_user_tier_position.sql.test.ts`
  - All 7 tier boundaries (0/499/500/2499/2500/9999/10000/29999/30000/79999/80000/199999/200000)
  - Tied scores share `RANK()`
  - `season_id` filter respected (current season vs all-time vs specific season)
  - Neighbors window correct at edges (rank 1, rank N)

### Accessibility

- Tier-rank announced via `aria-label="Rank 12 of 487 in Gold tier"`
- Peer list `role="list"`; rows `role="listitem"`
- Color contrast verified (memory: `contrast-fixer` style — dark-on-dark is the project's recurring bug)

## Rollout

1. Apply migration via Supabase MCP `apply_migration`.
2. Ship behind PostHog feature flag `tier-position-panel` (uses A/B infra: `lib/experiments.ts`, memory `ab-testing-infra`).
3. Monitor for 1 week:
   - `tier_position_viewed` rate
   - Leaderboard bounce rate
   - `cross_promo_click` deltas
   - Sentry RPC error rate
4. Flip flag to 100% on success, or kill if bounce worsens.

## Out of Scope (Future Specs)

- Tier ladder visualization (rejected approach #3).
- Tier card on `/profile` and post-game results (component will be reusable; wiring deferred).
- Season-end peak-tier celebrations (hook into existing `useSeason.season_peak_tier`).
- Promoting tier thresholds to a single SQL view `v_player_tier` (tech-debt item — duplicate CASE in client + server).
- Daily leaderboard tier panel (this spec is global leaderboard only).

## Success Criteria

- **Functional:** all tests green, including 1249-baseline + new tests.
- **Visual:** card renders correctly on mobile + desktop + RTL Hebrew, no layout regressions.
- **Performance:** RPC p95 latency <100ms; component mount adds <16ms TTI.
- **Behavioral (post-rollout):** ≥10% lift in leaderboard time-on-page OR ≥5% reduction in bounce, measured against feature-flag control. Kill criterion: bounce worsens by >5%.

## References

- `fe-next/app/[locale]/leaderboard/PageClient.tsx` — current user-rank card
- `fe-next/lib/ranked/leaderboardTiers.ts` — tier definitions, helpers
- `fe-next/components/ui/TierBadge.tsx` — existing badge component
- `fe-next/components/leaderboard/NearRankIndicator.tsx` — pattern reference for tier panel
- Memory: `ab-testing-infra`, `feedback-supabase-mcp-for-migrations`, `feedback-ai-hebrew-translation`, `feedback-translation-double-brace-replace`, `feedback-top-players-widget-bypass-rpc`, `sentry-noise-2026-04-29-batch`
- Project rules: `.claude/rules/22-tdd-strict.md`, `.claude/rules/10-git.md`
- Design docs: `fe-next/.claude/docs/design-system.md`, `fe-next/.claude/docs/responsive-design.md`
