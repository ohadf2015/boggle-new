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

// Rank badge imagery lives in the leaderboard tier defs (single source for the
// tier .webp art + brand hex + glow). The season ladder shares the same 7 ids,
// so we look the visual up there rather than duplicating asset paths here.
// `lib/seasons/__tests__/scoreTier.test.ts` asserts every TierId resolves to an
// existing image, keeping the two lists locked together.
import { tierById } from '@/lib/ranked/leaderboardTiers';

/** Path to the tier's badge .webp (e.g. `/images/tiers/tier-diamond.webp`). */
export const tierImagePath = (tier: TierId): string => tierById(tier).imagePath;

/** Tier badge visual: image path, brand hex color, and rgba glow. */
export function tierVisual(tier: TierId): { imagePath: string; color: string; glowColor: string } {
  const def = tierById(tier);
  return { imagePath: def.imagePath, color: def.color, glowColor: def.glowColor };
}

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
