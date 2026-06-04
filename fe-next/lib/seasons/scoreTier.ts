/**
 * Score-based season tier ladder.
 *
 * Single source of truth for tier thresholds + colors, shared by RankTierChip,
 * SeasonRankCard and the side-nav tier dot.
 *
 * Thresholds MIRROR the SQL in migration 20260604200000_current_season_rank_rpc.sql
 * (and get_user_tier_position). If you change one, change both.
 */

export type TierId = 'stone' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'grandmaster';

export const TIER_ORDER: readonly TierId[] = [
  'stone', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'grandmaster',
] as const;

export function scoreTier(score: number | null | undefined): TierId {
  const s = typeof score === 'number' && score > 0 ? score : 0;
  if (s >= 200000) return 'grandmaster';
  if (s >= 80000) return 'diamond';
  if (s >= 30000) return 'platinum';
  if (s >= 10000) return 'gold';
  if (s >= 2500) return 'silver';
  if (s >= 500) return 'bronze';
  return 'stone';
}

// Literal Tailwind classes only — Tailwind 3.4 cannot see `text-${tier}` interpolations.
const TIER_TEXT: Record<TierId, string> = {
  stone: 'text-neo-white/60',
  bronze: 'text-neo-orange',
  silver: 'text-neo-white',
  gold: 'text-neo-yellow',
  platinum: 'text-neo-cyan',
  diamond: 'text-neo-purple',
  grandmaster: 'text-neo-pink',
};

const TIER_BORDER: Record<TierId, string> = {
  stone: 'border-neo-white/40',
  bronze: 'border-neo-orange',
  silver: 'border-neo-white',
  gold: 'border-neo-yellow',
  platinum: 'border-neo-cyan',
  diamond: 'border-neo-purple',
  grandmaster: 'border-neo-pink',
};

const TIER_DOT: Record<TierId, string> = {
  stone: 'bg-neo-white/40',
  bronze: 'bg-neo-orange',
  silver: 'bg-neo-white',
  gold: 'bg-neo-yellow',
  platinum: 'bg-neo-cyan',
  diamond: 'bg-neo-purple',
  grandmaster: 'bg-neo-pink',
};

export const tierTextClass = (tier: TierId): string => TIER_TEXT[tier];
export const tierBorderClass = (tier: TierId): string => TIER_BORDER[tier];
export const tierDotClass = (tier: TierId): string => TIER_DOT[tier];

/**
 * Tier to surface as the side-nav dot, or null to show nothing.
 * Only on the profile/account route, and never for 'stone' (don't label newcomers).
 */
export function navTierForPath(cleanPath: string, totalScore: number | null | undefined): TierId | null {
  const isProfile = cleanPath.startsWith('/profile') || cleanPath.startsWith('/account');
  if (!isProfile) return null;
  const tier = scoreTier(totalScore);
  return tier === 'stone' ? null : tier;
}
