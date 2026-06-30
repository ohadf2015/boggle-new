/**
 * Score-based tier system for leaderboards.
 *
 * Separate from ELO-based ranked tiers (lib/ranked/tiers.ts).
 * These tiers apply to:
 *   - Global leaderboard (based on total_score)
 *   - Daily challenge leaderboard (based on per-game score)
 *
 * Distribution approximates LoL/Valorant-style:
 *   Stone: ~30% | Bronze: ~25% | Silver: ~17% | Gold: ~13%
 *   Platinum: ~8% | Diamond: ~5% | Grandmaster: ~2%
 */

export const LEADERBOARD_TIER_IDS = [
  'stone',
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
  'grandmaster',
] as const;

export type LeaderboardTierId = (typeof LEADERBOARD_TIER_IDS)[number];

export interface LeaderboardTierDef {
  id: LeaderboardTierId;
  name: string;
  /** Primary hex color for the tier */
  color: string;
  /** Tailwind gradient classes (from-X to-Y) */
  gradient: string;
  /** Tailwind text color class */
  textColor: string;
  /** Minimum score to enter this tier (inclusive) */
  minScore: number;
  /** Maximum score in this tier (inclusive). Infinity for the top tier. */
  maxScore: number;
  /** Path to badge image (transparent WebP) */
  imagePath: string;
  /** CSS rgba glow color for the tier badge */
  glowColor: string;
  /** Tailwind ring color for tier borders/accents */
  ringColor: string;
}

// ──────────────────────────────────────────────
// GLOBAL LEADERBOARD TIERS  (based on total_score)
// Score ranges: 0-499 / 500-2499 / 2500-9999 / 10000-29999 /
//               30000-79999 / 80000-199999 / 200000+
// ──────────────────────────────────────────────
export const GLOBAL_LEADERBOARD_TIERS: LeaderboardTierDef[] = [
  {
    id: 'stone',
    name: 'Stone',
    color: '#9CA3AF',
    gradient: 'from-slate-400 to-slate-500',
    textColor: 'text-slate-400',
    minScore: 0,
    maxScore: 499,
    imagePath: '/images/tiers/tier-stone.webp',
    glowColor: 'rgba(156,163,175,0.35)',
    ringColor: 'ring-slate-400',
  },
  {
    id: 'bronze',
    name: 'Bronze',
    color: '#CD7F32',
    gradient: 'from-amber-700 to-amber-600',
    textColor: 'text-amber-600',
    minScore: 500,
    maxScore: 2499,
    imagePath: '/images/tiers/tier-bronze.webp',
    glowColor: 'rgba(205,127,50,0.4)',
    ringColor: 'ring-amber-600',
  },
  {
    id: 'silver',
    name: 'Silver',
    color: '#C0C0C0',
    gradient: 'from-slate-300 to-slate-400',
    textColor: 'text-slate-300',
    minScore: 2500,
    maxScore: 9999,
    imagePath: '/images/tiers/tier-silver.webp',
    glowColor: 'rgba(192,192,192,0.4)',
    ringColor: 'ring-slate-300',
  },
  {
    id: 'gold',
    name: 'Gold',
    color: '#FFD700',
    gradient: 'from-yellow-400 to-amber-500',
    textColor: 'text-yellow-400',
    minScore: 10000,
    maxScore: 29999,
    imagePath: '/images/tiers/tier-gold.webp',
    glowColor: 'rgba(255,215,0,0.5)',
    ringColor: 'ring-yellow-400',
  },
  {
    id: 'platinum',
    name: 'Platinum',
    color: '#93C5FD',
    gradient: 'from-sky-200 to-slate-300',
    textColor: 'text-sky-300',
    minScore: 30000,
    maxScore: 79999,
    imagePath: '/images/tiers/tier-platinum.webp',
    glowColor: 'rgba(147,197,253,0.5)',
    ringColor: 'ring-sky-300',
  },
  {
    id: 'diamond',
    name: 'Diamond',
    color: '#67E8F9',
    gradient: 'from-cyan-300 to-blue-400',
    textColor: 'text-cyan-300',
    minScore: 80000,
    maxScore: 199999,
    imagePath: '/images/tiers/tier-diamond.webp',
    glowColor: 'rgba(103,232,249,0.55)',
    ringColor: 'ring-cyan-300',
  },
  {
    id: 'grandmaster',
    name: 'Grandmaster',
    color: '#A855F7',
    gradient: 'from-purple-500 to-violet-600',
    textColor: 'text-purple-400',
    minScore: 200000,
    maxScore: Infinity,
    imagePath: '/images/tiers/tier-grandmaster.webp',
    glowColor: 'rgba(168,85,247,0.6)',
    ringColor: 'ring-purple-500',
  },
];

// ──────────────────────────────────────────────
// DAILY LEADERBOARD TIERS  (based on per-game score)
// Score ranges: 0-99 / 100-249 / 250-499 / 500-799 /
//               800-1199 / 1200-1799 / 1800+
// ──────────────────────────────────────────────
export const DAILY_LEADERBOARD_TIERS: LeaderboardTierDef[] = GLOBAL_LEADERBOARD_TIERS.map(
  (tier, i) => {
    const dailyRanges: [number, number][] = [
      [0, 99],
      [100, 249],
      [250, 499],
      [500, 799],
      [800, 1199],
      [1200, 1799],
      [1800, Infinity],
    ];
    const [minScore, maxScore] = dailyRanges[i];
    return { ...tier, minScore, maxScore };
  }
);

// ──────────────────────────────────────────────
// HELPER FUNCTIONS
// ──────────────────────────────────────────────

/**
 * Look up a tier def by its id. Returns Stone as a safe fallback for an
 * unknown id (callers that pass a validated LeaderboardTierId never hit it).
 */
export function tierById(id: LeaderboardTierId): LeaderboardTierDef {
  return GLOBAL_LEADERBOARD_TIERS.find((t) => t.id === id) ?? GLOBAL_LEADERBOARD_TIERS[0];
}

/**
 * Get the leaderboard tier for a global total_score.
 * Returns the appropriate tier, never undefined.
 */
export function getGlobalLeaderboardTier(totalScore: number): LeaderboardTierDef {
  const score = Math.max(0, totalScore);
  for (let i = GLOBAL_LEADERBOARD_TIERS.length - 1; i >= 0; i--) {
    if (score >= GLOBAL_LEADERBOARD_TIERS[i].minScore) {
      return GLOBAL_LEADERBOARD_TIERS[i];
    }
  }
  return GLOBAL_LEADERBOARD_TIERS[0];
}

/**
 * Get the leaderboard tier for a daily challenge score.
 * Returns the appropriate tier, never undefined.
 */
export function getDailyLeaderboardTier(score: number): LeaderboardTierDef {
  const s = Math.max(0, score);
  for (let i = DAILY_LEADERBOARD_TIERS.length - 1; i >= 0; i--) {
    if (s >= DAILY_LEADERBOARD_TIERS[i].minScore) {
      return DAILY_LEADERBOARD_TIERS[i];
    }
  }
  return DAILY_LEADERBOARD_TIERS[0];
}

/**
 * Progress within the current tier as a value 0–1.
 * Returns 1 for the top tier (Grandmaster).
 */
export function getLeaderboardTierProgress(
  score: number,
  tiers: LeaderboardTierDef[]
): number {
  const s = Math.max(0, score);
  const tier = tiers.find((t) => s >= t.minScore && s <= t.maxScore) ?? tiers[0];
  if (tier.maxScore === Infinity) return 1;
  const range = tier.maxScore - tier.minScore + 1;
  return Math.min(1, (s - tier.minScore) / range);
}

/**
 * Returns the score needed to reach the next tier, or null if already at top.
 */
export function getNextTierThreshold(
  score: number,
  tiers: LeaderboardTierDef[]
): number | null {
  const s = Math.max(0, score);
  const idx = tiers.findIndex((t) => s >= t.minScore && s <= t.maxScore);
  if (idx === -1 || idx === tiers.length - 1) return null;
  return tiers[idx + 1].minScore;
}

/**
 * Compare two tier IDs by prestige level.
 * Returns positive if a > b, negative if a < b, 0 if equal.
 */
export function compareTierIds(a: LeaderboardTierId, b: LeaderboardTierId): number {
  return LEADERBOARD_TIER_IDS.indexOf(a) - LEADERBOARD_TIER_IDS.indexOf(b);
}
