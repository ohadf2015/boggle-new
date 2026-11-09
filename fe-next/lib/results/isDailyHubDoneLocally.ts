import type { Language } from '@/types';
import { DAILY_MODES, requiredDailyModes, type DailyModeId } from '@/lib/dailyModes';
import {
  hasPlayedWordHuntToday,
  hasPlayedWordWheelToday,
} from '@/utils/dailyChallenge/storage';

/**
 * Client-only probe: have today's *required* daily hub quests been cleared on
 * this device? Optional modes (Connections, Word Tower) do not block "done".
 * Uses the same localStorage writers the games already update — no new API.
 */
export function isDailyHubDoneLocally(language: Language): boolean {
  return requiredDailyModes(DAILY_MODES).every((mode) => isRequiredModePlayed(mode.id, language));
}

function isRequiredModePlayed(id: DailyModeId, language: Language): boolean {
  switch (id) {
    case 'word-hunt':
      return hasPlayedWordHuntToday(language);
    case 'word-wheel':
      return hasPlayedWordWheelToday(language);
    // Optional modes are filtered by requiredDailyModes; defensive fallback.
    default:
      return true;
  }
}
