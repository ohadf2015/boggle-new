/**
 * Achievement Tier System
 * Transforms flat achievement counts into tiered progression (Bronze → Silver → Gold → Platinum)
 */

/**
 * Hall of Fame achievements - elite achievements that require exceptional skill or dedication
 * These are displayed separately from regular achievements on the profile page
 */
export const HALL_OF_FAME_ACHIEVEMENTS = new Set([
  // Elite gameplay achievements (very difficult to earn)
  'RARE_GEM',           // 9+ letter word (extremely rare)
  'COMBO_GOD',          // 35+ combo streak (insanely hard)
  'VOCABULARY_TITAN',   // 85+ valid words in a game
  'WORD_ARCHITECT',     // 7 words of 7+ letters in a game
  'SPEED_LEGEND',       // 50 words in first half of game
  'LONG_WORD_CHAIN',    // 4 consecutive 6+ letter words
  'PRECISION_MASTER',   // 45+ words with 100% accuracy
  'ANAGRAM_ARTIST',     // 2 consecutive anagram words (luck + skill)

  // Rare "word feat" achievements (clever + very hard)
  'CONSONANT_CULT',     // 4+ letter word with no vowels
  'VOWEL_HOARDER',      // one word with every vowel A,E,I,O,U
  'ROGUE_Q',            // a Q with no U
  'LEVIATHAN',          // a 12+ letter word
  'NO_REPEATS',         // 8+ letter isogram
  'FLAWLESS_VICTORY',   // won with zero invalid submissions

  // Top-tier lifetime achievements (require significant dedication)
  'LEGEND',             // 100 wins total
  'CENTURION',          // 100 games played
  'WORD_HOARDER',       // 5000 total words found
  'POINT_KING',         // 50,000 total points
  'LOYAL_PLAYER',       // Played on 30 different days
]);

/**
 * Check if an achievement is a Hall of Fame achievement
 */
export function isHallOfFameAchievement(achievementKey: string): boolean {
  return HALL_OF_FAME_ACHIEVEMENTS.has(achievementKey);
}

// Tier thresholds - number of times achievement must be earned to reach tier
export const TIER_THRESHOLDS = {
  BRONZE: 1,
  SILVER: 15,
  GOLD: 75,
  PLATINUM: 300,
} as const;

export type TierName = keyof typeof TIER_THRESHOLDS;

export interface TierColors {
  bg: string;
  border: string;
  text: string;
  glow: string;
}

// Tier display colors — neo-brutalist electric palette, not literal metals.
// Cool→hot rarity ladder (orange→cyan→yellow→purple) so rarer reads as more
// special, while the medal icons (🥉🥈🥇💎) carry the bronze/silver/gold/platinum
// metaphor. Black ink + black borders are the brand signature (white text is
// invisible on these fills; see DESIGN.md contrast rule).
export const TIER_COLORS: Record<TierName, TierColors> = {
  BRONZE: {
    bg: '#FF6B35', // neo-orange — warm, coppery, the most common tier
    border: '#000000',
    text: '#000000',
    glow: 'rgba(255, 107, 53, 0.5)',
  },
  SILVER: {
    bg: '#00FFFF', // neo-cyan
    border: '#000000',
    text: '#000000',
    glow: 'rgba(0, 255, 255, 0.5)',
  },
  GOLD: {
    bg: '#FFE135', // neo-yellow — gold tier, celebration semantic
    border: '#000000',
    text: '#000000',
    glow: 'rgba(255, 225, 53, 0.55)',
  },
  PLATINUM: {
    bg: '#8B5CF6', // neo-purple — rarest, premium
    border: '#000000',
    text: '#000000',
    glow: 'rgba(139, 92, 246, 0.6)',
  },
};

// Tier icons for display
export const TIER_ICONS: Record<TierName, string> = {
  BRONZE: '🥉',
  SILVER: '🥈',
  GOLD: '🥇',
  PLATINUM: '💎',
};

export interface TierProgress {
  currentTier: TierName | null;
  nextTier: TierName | null;
  currentCount: number;
  nextThreshold: number | null;
  progress: number;
  isMaxTier: boolean;
}

export interface TierDisplay {
  name: TierName;
  colors: TierColors;
  icon: string;
}

export interface AchievementTierInfo extends TierProgress {
  count: number;
  display: TierDisplay | null;
}

/**
 * Calculate tier from achievement count
 * @param count - Number of times achievement has been earned
 * @returns Tier name ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM') or null if not earned
 */
export function calculateTier(count: number): TierName | null {
  if (!count || count < TIER_THRESHOLDS.BRONZE) return null;
  if (count >= TIER_THRESHOLDS.PLATINUM) return 'PLATINUM';
  if (count >= TIER_THRESHOLDS.GOLD) return 'GOLD';
  if (count >= TIER_THRESHOLDS.SILVER) return 'SILVER';
  return 'BRONZE';
}

/**
 * Get detailed tier progress information
 * @param count - Number of times achievement has been earned
 * @returns Tier progress details
 */
export function getTierProgress(count: number): TierProgress {
  const currentTier = calculateTier(count);
  const safeCount = count || 0;

  if (!currentTier) {
    return {
      currentTier: null,
      nextTier: 'BRONZE',
      currentCount: safeCount,
      nextThreshold: TIER_THRESHOLDS.BRONZE,
      progress: 0,
      isMaxTier: false,
    };
  }

  // Determine next tier and threshold
  let nextTier: TierName | null = null;
  let nextThreshold: number | null = null;
  const currentThreshold = TIER_THRESHOLDS[currentTier];

  switch (currentTier) {
    case 'BRONZE':
      nextTier = 'SILVER';
      nextThreshold = TIER_THRESHOLDS.SILVER;
      break;
    case 'SILVER':
      nextTier = 'GOLD';
      nextThreshold = TIER_THRESHOLDS.GOLD;
      break;
    case 'GOLD':
      nextTier = 'PLATINUM';
      nextThreshold = TIER_THRESHOLDS.PLATINUM;
      break;
    case 'PLATINUM':
      // Max tier reached
      return {
        currentTier,
        nextTier: null,
        currentCount: safeCount,
        nextThreshold: null,
        progress: 100,
        isMaxTier: true,
      };
  }

  // Calculate progress to next tier
  const progressInTier = safeCount - currentThreshold;
  const tierRange = nextThreshold - currentThreshold;
  const progress = Math.min(Math.round((progressInTier / tierRange) * 100), 99);

  return {
    currentTier,
    nextTier,
    currentCount: safeCount,
    nextThreshold,
    progress,
    isMaxTier: false,
  };
}

/**
 * Visual intensifiers for the achievement toast keyed by tier rarity.
 * Drives sparkle count, pulse radius, shine repetitions, confetti volume,
 * and the colored hard-shadow Tailwind class — so rarer tiers feel rarer.
 *
 * `shadowClass` always returns a known token from tailwind.config.js.
 * Falls back to `shadow-hard-yellow` for unknown / null tiers (the
 * neo-brutalist-fixes test depends on this default).
 */
export interface TierToastStyle {
  shadowClass: 'shadow-hard-yellow' | 'shadow-hard-cyan' | 'shadow-hard-purple';
  sparkleCount: number;
  pulseRadius: number;
  shineRepeat: number;
  confettiCount: number;
  confettiSpread: number;
  showRarityBadge: boolean;
}

const TIER_TOAST_STYLE: Record<TierName, TierToastStyle> = {
  BRONZE: {
    shadowClass: 'shadow-hard-yellow',
    sparkleCount: 3,
    pulseRadius: 7,
    shineRepeat: 1,
    confettiCount: 28,
    confettiSpread: 55,
    showRarityBadge: false,
  },
  SILVER: {
    shadowClass: 'shadow-hard-cyan',
    sparkleCount: 4,
    pulseRadius: 8,
    shineRepeat: 1,
    confettiCount: 36,
    confettiSpread: 65,
    showRarityBadge: false,
  },
  GOLD: {
    shadowClass: 'shadow-hard-yellow',
    sparkleCount: 5,
    pulseRadius: 10,
    shineRepeat: 2,
    confettiCount: 48,
    confettiSpread: 80,
    showRarityBadge: true,
  },
  PLATINUM: {
    shadowClass: 'shadow-hard-purple',
    sparkleCount: 6,
    pulseRadius: 13,
    shineRepeat: 2,
    confettiCount: 64,
    confettiSpread: 95,
    showRarityBadge: true,
  },
};

const DEFAULT_TIER_TOAST_STYLE: TierToastStyle = {
  shadowClass: 'shadow-hard-yellow',
  sparkleCount: 3,
  pulseRadius: 7,
  shineRepeat: 1,
  confettiCount: 28,
  confettiSpread: 55,
  showRarityBadge: false,
};

export function getTierToastStyle(tier: TierName | null | undefined): TierToastStyle {
  if (!tier) return DEFAULT_TIER_TOAST_STYLE;
  return TIER_TOAST_STYLE[tier] ?? DEFAULT_TIER_TOAST_STYLE;
}

/**
 * Get tier display information (colors, icon, name)
 * @param tier - Tier name
 * @returns Display information for the tier
 */
export function getTierDisplay(tier: TierName | null): TierDisplay | null {
  if (!tier || !TIER_COLORS[tier]) {
    return null;
  }

  return {
    name: tier,
    colors: TIER_COLORS[tier],
    icon: TIER_ICONS[tier],
  };
}

export interface AchievementGroupItem {
  key: string;
  count: number;
  locked: boolean;
}

export interface AchievementTierGroup {
  /** Earned tier name, or 'locked' for not-yet-earned achievements. */
  tier: TierName | 'locked';
  items: AchievementGroupItem[];
}

// Rarest tier first; locked always trails.
const TIER_GROUP_ORDER: TierName[] = ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE'];

/**
 * Group a flat achievement list into ordered tier buckets (Platinum→Bronze, then
 * Locked) for a scannable progression ladder. Empty buckets are omitted; input
 * order is preserved within each bucket. Reuses calculateTier — no new metadata.
 */
export function groupAchievementsByTier(
  items: AchievementGroupItem[],
): AchievementTierGroup[] {
  const byTier = new Map<TierName, AchievementGroupItem[]>();
  const locked: AchievementGroupItem[] = [];

  for (const item of items) {
    if (item.locked) {
      locked.push(item);
      continue;
    }
    const tier = calculateTier(item.count) ?? 'BRONZE';
    const bucket = byTier.get(tier) ?? [];
    bucket.push(item);
    byTier.set(tier, bucket);
  }

  const groups: AchievementTierGroup[] = [];
  for (const tier of TIER_GROUP_ORDER) {
    const bucket = byTier.get(tier);
    if (bucket && bucket.length) groups.push({ tier, items: bucket });
  }
  if (locked.length) groups.push({ tier: 'locked', items: locked });
  return groups;
}

/**
 * Get all achievements with their tier information
 * @param achievementCounts - Object mapping achievement keys to counts
 * @returns Object mapping achievement keys to tier info
 */
export function getAchievementTiers(
  achievementCounts: Record<string, number>
): Record<string, AchievementTierInfo> {
  if (!achievementCounts) return {};

  const result: Record<string, AchievementTierInfo> = {};

  for (const [key, count] of Object.entries(achievementCounts)) {
    result[key] = {
      count,
      ...getTierProgress(count),
      display: getTierDisplay(calculateTier(count)),
    };
  }

  return result;
}
