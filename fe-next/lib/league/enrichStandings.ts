/**
 * Maps raw `league_members` rows (snake_case, no rank) from the my-league API
 * query into the enriched, ranked shape the client expects.
 *
 * The my-league route previously returned raw rows (`user_id`, `weekly_xp`),
 * but `useLeague` indexes standings by `userId` and reads `position`/`zone` —
 * so `myPosition` was always null and the league badge never rendered. This
 * helper is the single source of that mapping (position + zone), shared by the
 * API and unit-tested independently.
 */
export type LeagueZone = 'promotion' | 'safe' | 'relegation';

export interface EnrichedStanding {
  userId: string;
  displayName: string;
  weeklyXp: number;
  position: number;
  zone: LeagueZone;
  avatar: string | null;
}

interface RawProfile {
  username?: string | null;
  display_name?: string | null;
  avatar_image?: string | null;
}

export interface RawStandingRow {
  user_id: string;
  weekly_xp: number | null;
  // Supabase embeds a !inner relation as an object, but can surface an array.
  profiles?: RawProfile | RawProfile[] | null;
}

export interface EnrichOptions {
  promotionCount?: number;
  relegationCount?: number;
}

const DEFAULT_PROMOTION_COUNT = 10;
const DEFAULT_RELEGATION_COUNT = 5;

function firstProfile(p: RawStandingRow['profiles']): RawProfile {
  if (!p) return {};
  return Array.isArray(p) ? (p[0] ?? {}) : p;
}

/**
 * Rows MUST already be ordered by weekly_xp DESC (the API query does this) —
 * position is derived from array index.
 */
export function enrichLeagueStandings(
  rows: RawStandingRow[] | null | undefined,
  { promotionCount = DEFAULT_PROMOTION_COUNT, relegationCount = DEFAULT_RELEGATION_COUNT }: EnrichOptions = {}
): EnrichedStanding[] {
  if (!rows || rows.length === 0) return [];
  const total = rows.length;
  const relegationLine = total - relegationCount + 1;

  return rows.map((row, index) => {
    const position = index + 1;
    let zone: LeagueZone = 'safe';
    if (position <= promotionCount) zone = 'promotion';
    else if (position >= relegationLine) zone = 'relegation';

    const profile = firstProfile(row.profiles);
    return {
      userId: row.user_id,
      displayName: profile.display_name || profile.username || 'Player',
      weeklyXp: row.weekly_xp ?? 0,
      position,
      zone,
      avatar: profile.avatar_image ?? null,
    };
  });
}
