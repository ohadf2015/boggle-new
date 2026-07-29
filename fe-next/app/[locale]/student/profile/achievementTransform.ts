import type { StudentAchievement } from '@/types/education';

const TIER_ORDER: Record<string, number> = { bronze: 1, silver: 2, gold: 3, platinum: 4 };

interface AchievementTierRow {
  tier: string;
  threshold: number;
  tier_order: number;
}

interface AchievementDefRow {
  key: string;
  category: string;
  icon: string;
  is_secret: boolean;
  achievement_tiers?: AchievementTierRow[];
}

export interface AchievementDbRow {
  current_tier: string;
  progress_value: number;
  is_pinned: boolean;
  achievement_definitions: AchievementDefRow;
}

export function transformAchievementRow(row: AchievementDbRow): StudentAchievement {
  const def = row.achievement_definitions;
  const currentOrder = TIER_ORDER[row.current_tier] ?? 0;
  const tiers = def.achievement_tiers ?? [];

  const nextTier = tiers
    .filter(t => t.tier_order > currentOrder)
    .sort((a, b) => a.tier_order - b.tier_order)[0];

  const nextThreshold = nextTier?.threshold ?? null;
  const percentComplete = nextThreshold
    ? Math.min(100, Math.round((row.progress_value / nextThreshold) * 100))
    : 100;

  return {
    achievementKey: def.key,
    currentTier: row.current_tier as StudentAchievement['currentTier'],
    progressValue: row.progress_value,
    nextThreshold,
    percentComplete,
    isPinned: row.is_pinned,
    isSecret: def.is_secret,
    category: def.category as StudentAchievement['category'],
    icon: def.icon,
  };
}
