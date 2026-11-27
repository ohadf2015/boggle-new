import type { SupabaseClient } from '@supabase/supabase-js';
import { getCachedDailyPuzzle } from '@/backend/redisClient';
import { isWordValidForDailyChallenge, normalizeWordForComparison } from '@/backend/routes/dailyChallenge/utils';
import { generateDailyPuzzleAsync } from '@/utils/dailyChallenge/gridGeneration.server';
import type { Language, LetterGrid } from '@/types';
import logger from '@/utils/logger';
import { settleHolidayDaily, type HolidaySettlement } from './dailyBonus.server';

function wordsOf(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((w) => (typeof w === 'string' ? w : (w as { word?: unknown } | null)?.word))
    .filter((w): w is string => typeof w === 'string' && w.length > 0 && w.length <= 20)
    .slice(0, 300);
}

export async function holidayDailyForSubmit(i: {
  supabase: SupabaseClient;
  playerId: string | null | undefined;
  holiday: unknown;
  puzzleDate: string;
  language: string;
  wordsDiscovered: unknown;
  attemptWords: unknown;
  isCatchup: boolean;
}): Promise<HolidaySettlement | null> {
  if (!i.playerId || !i.holiday) return null;
  try {
    const lang = i.language as Language;
    const cached = (await getCachedDailyPuzzle(i.puzzleDate, i.language)) as { grid?: LetterGrid } | null;
    const grid = cached?.grid?.length ? cached.grid : (await generateDailyPuzzleAsync(i.puzzleDate, lang)).grid;
    return await settleHolidayDaily({
      supabase: i.supabase,
      userId: i.playerId,
      holiday: i.holiday,
      puzzleDate: i.puzzleDate,
      language: i.language,
      grid,
      words: [...wordsOf(i.wordsDiscovered), ...wordsOf(i.attemptWords)],
      isCatchup: i.isCatchup,
      isValidWord: (w) => isWordValidForDailyChallenge(normalizeWordForComparison(w, lang), lang),
    });
  } catch (e) {
    logger.error('HOLIDAY_DAILY', `settle failed for ${i.playerId} ${i.puzzleDate}: ${(e as Error).message}`);
    return null;
  }
}
