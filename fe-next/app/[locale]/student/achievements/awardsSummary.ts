import type { Achievement } from '@/components/education/achievements/AchievementGrid';
import { calculateTier, getTierProgress, type TierName } from '@/utils/achievementTiers';

export interface NextAward {
  id: string;
  award: Achievement;
  count: number;
  threshold: number;
  nextTier: TierName;
  left: number;
  /** 0..1 of the way to `threshold`. */
  pct: number;
}

export interface AwardsSummary {
  earned: number;
  total: number;
  tiers: Record<TierName, number>;
  next: NextAward | null;
}

export function summarizeAwards(achievements: Record<string, Achievement>): AwardsSummary {
  const tiers: Record<TierName, number> = { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 };
  const candidates: NextAward[] = [];
  let earned = 0;
  const entries = Object.entries(achievements);

  for (const [id, award] of entries) {
    const tier = calculateTier(award.count);
    if (tier) {
      earned += 1;
      tiers[tier] += 1;
    }
    // A hidden secret would spoil itself as the "next" target.
    if (award.isSecret && award.count <= 0) continue;
    const p = getTierProgress(award.count);
    if (p.isMaxTier || !p.nextTier || !p.nextThreshold) continue;
    const count = Math.max(0, award.count || 0);
    candidates.push({
      id,
      award,
      count,
      threshold: p.nextThreshold,
      nextTier: p.nextTier,
      left: p.nextThreshold - count,
      pct: Math.min(1, count / p.nextThreshold),
    });
  }

  candidates.sort((x, y) => y.pct - x.pct || x.left - y.left || x.id.localeCompare(y.id));
  return { earned, total: entries.length, tiers, next: candidates[0] ?? null };
}
