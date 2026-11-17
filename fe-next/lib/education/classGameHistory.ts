/**
 * "Has this teacher run a class game yet?": a completed live round with 2+ real players
 * (`classroom_rounds.player_count >= REAL_CLASS_MIN_PLAYERS`), the same predicate that
 * restarts the trial at the first class game. A teacher who has not is still waiting for
 * their 14 days to start, so no "trial ending/ended" message is true for them yet.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { REAL_CLASS_MIN_PLAYERS } from './teacherUsagePrompt';

/** The subset of `teacherIds` who ran at least one real class game. Throws on a failed read. */
export async function teacherIdsWithClassGame(
  db: Pick<SupabaseClient, 'from'>,
  teacherIds: readonly string[],
): Promise<Set<string>> {
  const played = new Set<string>();
  const ids = [...new Set(teacherIds.filter(Boolean))];
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { data, error } = await db
      .from('classroom_rounds')
      .select('teacher_id')
      .in('teacher_id', chunk)
      .gte('player_count', REAL_CLASS_MIN_PLAYERS);
    if (error) throw new Error(`classroom_rounds select failed: ${error.message}`);
    for (const r of (data ?? []) as Array<{ teacher_id: string | null }>) if (r.teacher_id) played.add(r.teacher_id);
  }
  return played;
}

/**
 * Waiting = has a free access window (live or ended) but never ran a class game, and is
 * not on a card trial. Unknown history (null) is never waiting, so a failed read keeps
 * the old behaviour rather than hiding a real deadline.
 */
export function isWaitingForFirstClassGame({
  hasAccessWindow,
  ranClassGame,
  onCardTrial,
}: {
  hasAccessWindow: boolean;
  ranClassGame: boolean | null;
  onCardTrial: boolean;
}): boolean {
  return hasAccessWindow && ranClassGame === false && !onCardTrial;
}
