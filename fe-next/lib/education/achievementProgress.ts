/**
 * The `student_achievements_progress` table, in one place.
 *
 * Its columns are `current_count` / `target_count` / `tier`, unique on
 * (student_id, achievement_key, tier). The student page used to select a
 * column named `count` — PostgREST reads a bare `count` as the aggregate and
 * Postgres answers 42803 "must appear in the GROUP BY clause"
 * (Sentry JAVASCRIPT-NEXTJS-243) — while the check route wrote
 * `current_value` / `target_value` against a two-column conflict target, so
 * every upsert failed and progress never persisted. Reader and writer share
 * these helpers so the column names cannot drift apart again.
 */
import type { AchievementProgress } from '@/backend/modules/educationAchievementManager';
import type { Achievement } from '@/components/education/achievements/AchievementGrid';
import type { AchievementCategory } from '@/lib/supabase/education/types';

export const STUDENT_PROGRESS_SELECT = 'achievement_key, current_count';
export const PROGRESS_UPSERT_CONFLICT = 'student_id,achievement_key,tier';

type Tier = 'bronze' | 'silver' | 'gold' | 'platinum';
const TIER_ORDER: Tier[] = ['bronze', 'silver', 'gold', 'platinum'];

/** The tier a student is working toward, given the one already unlocked. */
function trackedTier(current: Tier | null): Tier {
  if (!current) return 'bronze';
  return TIER_ORDER[TIER_ORDER.indexOf(current) + 1] ?? 'platinum';
}

export interface AchievementDefinitionRow {
  key: string;
  category: string;
  icon: string;
  is_secret: boolean;
  base_name_key: string;
  base_description_key: string;
}

export interface StudentProgressRow {
  achievement_key: string;
  current_count: number | null;
}

export function buildAchievementsRecord(
  definitions: AchievementDefinitionRow[],
  progress: StudentProgressRow[]
): Record<string, Achievement> {
  // One row per tier being tracked — the grid shows the furthest one.
  const best = new Map<string, number>();
  for (const row of progress) {
    const count = row.current_count ?? 0;
    if (count > (best.get(row.achievement_key) ?? -1)) best.set(row.achievement_key, count);
  }

  const record: Record<string, Achievement> = {};
  for (const def of definitions) {
    record[def.key] = {
      count: best.get(def.key) ?? 0,
      category: def.category as AchievementCategory,
      icon: def.icon,
      nameKey: def.base_name_key,
      descriptionKey: def.base_description_key,
      isSecret: def.is_secret,
    };
  }
  return record;
}

export function toProgressUpsertRows(
  progress: AchievementProgress[],
  studentId: string,
  updatedAt: string = new Date().toISOString()
) {
  return progress
    .filter((ap) => ap.progress_value > 0)
    .map((ap) => ({
      student_id: studentId,
      achievement_key: ap.key,
      current_count: ap.progress_value,
      target_count: ap.next_threshold ?? ap.progress_value,
      tier: trackedTier(ap.current_tier),
      updated_at: updatedAt,
    }));
}
