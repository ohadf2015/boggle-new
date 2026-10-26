import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import { SUGGESTION_WINDOW, type SuggestionRound } from '@/lib/education/modeSuggestion';

const READ_TIMEOUT_MS = 4000;

/** The teacher's latest rounds, newest first, read under their own RLS. Any failure reads as "no rounds". */
export async function fetchRecentTeacherRounds(
  teacherId: string,
  client: typeof supabase = supabase,
  timeoutMs = READ_TIMEOUT_MS,
): Promise<SuggestionRound[]> {
  if (!client || !teacherId) return [];
  const read = (async () => {
    const { data, error } = await client
      .from('classroom_rounds')
      .select('game_mode, player_count')
      .eq('teacher_id', teacherId)
      .order('completed_at', { ascending: false })
      .limit(SUGGESTION_WINDOW);
    if (error) throw error;
    return ((data ?? []) as { game_mode: string; player_count: number }[]).map((r) => ({
      gameMode: r.game_mode,
      playerCount: r.player_count ?? 0,
    }));
  })();
  const timeout = new Promise<SuggestionRound[]>((resolve) => setTimeout(() => resolve([]), timeoutMs));
  try {
    return await Promise.race([read, timeout]);
  } catch (err) {
    logger.info('[mode-suggestion] rounds read failed', err);
    return [];
  }
}
