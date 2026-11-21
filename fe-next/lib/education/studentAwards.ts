// Inputs are only columns students cannot write (total_xp, total_practice_sessions); awards needing anything else stay unearned.
import { ACHIEVEMENT_DEFINITIONS, type AchievementDefinition } from '@/backend/modules/educationAchievementDefinitions';
import { getLevelFromXp } from '@/backend/modules/xpManager';
import { toProgressUpsertRows, type AchievementProgress } from '@/lib/education/achievementProgress';

export type AwardTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export const SERVER_AWARD_KEYS = ['first_lesson', 'lesson_collector', 'level_climber', 'xp_collector', 'practice_veteran'] as const;
export type ServerAwardKey = (typeof SERVER_AWARD_KEYS)[number];

export interface LessonXpRow {
  lesson_id: string;
  total_xp: number | null;
  total_practice_sessions: number | null;
}

/** Mirrors what `award_education_xp` adds for this completion: the XP and one session. */
export interface AwardDelta {
  lessonId: string;
  xp: number;
}

export interface AwardUnlock {
  achievementKey: string;
  tier: AwardTier;
  icon: string;
  isNew: boolean;
  isUpgrade: boolean;
}

const TIERS: AwardTier[] = ['bronze', 'silver', 'gold', 'platinum'];
const rank = (tier: AwardTier | null | undefined) => (tier ? TIERS.indexOf(tier) + 1 : 0);
export const tiersBelow = (tier: AwardTier): AwardTier[] => TIERS.slice(0, TIERS.indexOf(tier));
const DEFINITIONS = new Map(ACHIEVEMENT_DEFINITIONS.map((d) => [d.key, d]));

export function serverAwardValues(rows: LessonXpRow[], delta?: AwardDelta | null): Record<ServerAwardKey, number> {
  const lessons = rows.map((r) => ({ id: r.lesson_id, xp: r.total_xp ?? 0, sessions: r.total_practice_sessions ?? 0 }));
  if (delta && delta.xp > 0) {
    const row = lessons.find((l) => l.id === delta.lessonId);
    if (row) {
      row.xp += delta.xp;
      row.sessions += 1;
    } else {
      lessons.push({ id: delta.lessonId, xp: delta.xp, sessions: 1 });
    }
  }
  const practiced = lessons.filter((l) => l.sessions > 0).length;
  return {
    first_lesson: practiced,
    lesson_collector: practiced,
    level_climber: lessons.reduce((best, l) => Math.max(best, getLevelFromXp(l.xp)), 0),
    xp_collector: lessons.reduce((sum, l) => sum + l.xp, 0),
    practice_veteran: lessons.reduce((sum, l) => sum + l.sessions, 0),
  };
}

function tierFor(def: AchievementDefinition, value: number): AwardTier | null {
  let reached: AwardTier | null = null;
  for (const tier of TIERS) if (value >= def.tiers[tier]) reached = tier;
  return reached;
}

export function planAwardGrant({
  studentId,
  values,
  stored,
  definitionIds,
  nowIso,
}: {
  studentId: string;
  values: Record<string, number>;
  stored: Map<string, AwardTier>;
  definitionIds: Map<string, string>;
  nowIso: string;
}) {
  const achievementRows: Array<{
    student_id: string;
    achievement_id: string;
    current_tier: AwardTier;
    progress_value: number;
    last_tier_unlock: string;
  }> = [];
  const unlocks: AwardUnlock[] = [];
  const progress: AchievementProgress[] = [];

  for (const key of SERVER_AWARD_KEYS) {
    const def = DEFINITIONS.get(key);
    if (!def || values[key] === undefined) continue;
    const storedTier = stored.get(key) ?? null;
    const value = Math.max(values[key], storedTier ? def.tiers[storedTier] : 0);
    const computed = tierFor(def, value);
    const tier = rank(computed) > rank(storedTier) ? computed : storedTier;
    const nextTier = TIERS[rank(tier)] ?? null;
    progress.push({
      key,
      current_tier: tier,
      progress_value: value,
      next_threshold: nextTier ? def.tiers[nextTier] : null,
      percent_complete: 0,
      isSecret: def.isSecret,
    });

    const achievementId = definitionIds.get(key);
    if (!computed || tier === storedTier || !achievementId) continue;
    achievementRows.push({ student_id: studentId, achievement_id: achievementId, current_tier: computed, progress_value: value, last_tier_unlock: nowIso });
    unlocks.push({ achievementKey: key, tier: computed, icon: def.icon, isNew: storedTier === null, isUpgrade: storedTier !== null });
  }

  return { achievementRows, unlocks, progressRows: toProgressUpsertRows(progress, studentId, nowIso) };
}
