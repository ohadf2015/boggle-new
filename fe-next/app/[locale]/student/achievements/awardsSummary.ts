import type { Achievement } from '@/components/education/achievements/AchievementGrid';
import { ACHIEVEMENT_DEFINITIONS } from '@/backend/modules/educationAchievementDefinitions';
import { TIER_THRESHOLDS, type TierName, type TierProgress } from '@/utils/achievementTiers';

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
  /** Up to three awards closest to their next tier, closest first. */
  nexts: NextAward[];
}

export const MAX_NEXT_AWARDS = 3;

const ORDER: TierName[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
const LADDERS = new Map(
  ACHIEVEMENT_DEFINITIONS.map((d) => [
    d.key,
    { BRONZE: d.tiers.bronze, SILVER: d.tiers.silver, GOLD: d.tiers.gold, PLATINUM: d.tiers.platinum } as Record<TierName, number>,
  ]),
);

// Nothing feeds these today: the practice flow sends 0 for four inputs and nothing computes the ten DB-only awards.
// Showing them would be a wall of awards no student can earn.
const NOT_EARNABLE = new Set([
  'boss_slayer', 'combo_master', 'weekly_warrior', 'classroom_contributor',
  'blitz_champion', 'comeback_king', 'duel_champion', 'duel_streak', 'duel_veteran',
  'matching_master', 'mode_master', 'practice_streak', 'speed_dueler', 'spelling_ace',
]);

export const isEarnableAward = (id: string) => !NOT_EARNABLE.has(id);

/** Each award has its own ladder (First Lesson 1/3/10/25, XP Collector 500+); unknown ids use the generic one. */
export function awardTier(id: string, count: number): TierProgress {
  const ladder = LADDERS.get(id) ?? TIER_THRESHOLDS;
  const safe = Math.max(0, count || 0);
  let reached = -1;
  ORDER.forEach((tier, i) => { if (safe >= ladder[tier]) reached = i; });
  const currentTier = reached >= 0 ? ORDER[reached] : null;
  const nextTier = ORDER[reached + 1] ?? null;
  const nextThreshold = nextTier ? ladder[nextTier] : null;
  const floor = currentTier ? ladder[currentTier] : 0;
  const progress = nextThreshold ? Math.min(100, ((safe - floor) / (nextThreshold - floor)) * 100) : 100;
  return { currentTier, nextTier, currentCount: safe, nextThreshold, progress, isMaxTier: !nextTier };
}

export function summarizeAwards(achievements: Record<string, Achievement>): AwardsSummary {
  const tiers: Record<TierName, number> = { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 };
  const candidates: NextAward[] = [];
  let earned = 0;
  const entries = Object.entries(achievements).filter(([id]) => isEarnableAward(id));

  for (const [id, award] of entries) {
    const p = awardTier(id, award.count);
    if (p.currentTier) {
      earned += 1;
      tiers[p.currentTier] += 1;
    }
    // A hidden secret would spoil itself as the "next" target.
    if (award.isSecret && award.count <= 0) continue;
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
  const nexts = candidates.slice(0, MAX_NEXT_AWARDS);
  return { earned, total: entries.length, tiers, next: nexts[0] ?? null, nexts };
}
