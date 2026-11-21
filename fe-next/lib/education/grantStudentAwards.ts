// Service role, because the guard trigger reverts tier changes made by students; a failed grant is retried from totals on the next completion.
import type { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/utils/logger';
import { PROGRESS_UPSERT_CONFLICT } from '@/lib/education/achievementProgress';
import {
  planAwardGrant,
  SERVER_AWARD_KEYS,
  serverAwardValues,
  tiersBelow,
  type AwardDelta,
  type AwardTier,
  type AwardUnlock,
  type LessonXpRow,
} from '@/lib/education/studentAwards';

export const AWARD_READ_TIMEOUT_MS = 1500;

export interface AwardState {
  admin: SupabaseClient;
  lessons: LessonXpRow[];
  stored: Map<string, AwardTier>;
  definitionIds: Map<string, string>;
}

type TierRow = { achievement_id: string; current_tier: AwardTier };

let cachedDefinitionIds: Map<string, string> | null = null;

async function definitionIds(admin: SupabaseClient, signal: AbortSignal): Promise<Map<string, string>> {
  if (cachedDefinitionIds) return cachedDefinitionIds;
  const { data, error } = await admin.from('achievement_definitions').select('id, key').in('key', [...SERVER_AWARD_KEYS]).abortSignal(signal);
  if (error) throw new Error(`achievement_definitions: ${error.message}`);
  const ids = new Map((data as Array<{ id: string; key: string }>).map((d) => [d.key, d.id]));
  const missing = SERVER_AWARD_KEYS.filter((key) => !ids.has(key));
  if (missing.length) logger.error(`achievement_definitions has no row for ${missing.join(', ')}; those awards cannot be granted`);
  else cachedDefinitionIds = ids;
  return ids;
}

async function readWithin(admin: SupabaseClient, studentId: string, signal: AbortSignal): Promise<AwardState> {
  const [lessons, stored, ids] = await Promise.all([
    admin.from('student_lesson_progress').select('lesson_id, total_xp, total_practice_sessions').eq('student_id', studentId).abortSignal(signal),
    admin.from('student_achievements').select('achievement_id, current_tier').eq('student_id', studentId).abortSignal(signal),
    definitionIds(admin, signal),
  ]);
  if (lessons.error) throw new Error(`student_lesson_progress: ${lessons.error.message}`);
  if (stored.error) throw new Error(`student_achievements: ${stored.error.message}`);
  const keyById = new Map([...ids].map(([key, id]) => [id, key]));
  const storedTiers = new Map<string, AwardTier>();
  for (const row of (stored.data ?? []) as TierRow[]) {
    const key = keyById.get(row.achievement_id);
    if (key) storedTiers.set(key, row.current_tier);
  }
  return { admin, lessons: (lessons.data ?? []) as LessonXpRow[], stored: storedTiers, definitionIds: ids };
}

export async function readAwardState(getAdmin: () => SupabaseClient | null, studentId: string): Promise<AwardState | null> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const admin = getAdmin();
    if (!admin) throw new Error('service-role client unavailable');
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error(`timed out after ${AWARD_READ_TIMEOUT_MS}ms`));
      }, AWARD_READ_TIMEOUT_MS);
    });
    return await Promise.race([readWithin(admin, studentId, controller.signal), deadline]);
  } catch (err) {
    logger.error('Award state read failed; the next completed practice retries it:', err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Insert-if-absent and upgrade-only-from-lower keep the tier monotonic under racing completions; only rows this call changed are announced.
export async function writeAwards(state: AwardState, studentId: string, delta: AwardDelta | null): Promise<AwardUnlock[] | null> {
  const { achievementRows, progressRows, unlocks } = planAwardGrant({
    studentId,
    values: serverAwardValues(state.lessons, delta),
    stored: state.stored,
    definitionIds: state.definitionIds,
    nowIso: new Date().toISOString(),
  });
  const table = () => state.admin.from('student_achievements');
  const fresh = achievementRows.filter((_, i) => !unlocks[i].isUpgrade);
  const upgrades = achievementRows.filter((_, i) => unlocks[i].isUpgrade);
  try {
    const [inserted, upgraded, progress] = await Promise.all([
      fresh.length
        ? table().upsert(fresh, { onConflict: 'student_id,achievement_id', ignoreDuplicates: true }).select('achievement_id, current_tier')
        : { data: [], error: null },
      Promise.all(
        upgrades.map((row) =>
          table()
            .update({ current_tier: row.current_tier, progress_value: row.progress_value, last_tier_unlock: row.last_tier_unlock })
            .eq('student_id', studentId)
            .eq('achievement_id', row.achievement_id)
            .in('current_tier', tiersBelow(row.current_tier))
            .select('achievement_id, current_tier'),
        ),
      ),
      progressRows.length ? state.admin.from('student_achievements_progress').upsert(progressRows, { onConflict: PROGRESS_UPSERT_CONFLICT }) : null,
    ]);
    if (progress?.error) logger.error('Award progress write failed:', progress.error);
    const results = [inserted, ...upgraded];
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(`student_achievements: ${failed.error.message}`);
    const changed = new Set(results.flatMap((r) => ((r.data ?? []) as TierRow[]).map((row) => `${row.achievement_id}:${row.current_tier}`)));
    return unlocks.filter((_, i) => changed.has(`${achievementRows[i].achievement_id}:${achievementRows[i].current_tier}`));
  } catch (err) {
    logger.error('Award write failed; the next completed practice retries it:', err);
    return null;
  }
}
