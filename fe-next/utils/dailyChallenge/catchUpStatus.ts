import { getCatchUpDates } from './catchUp';
import { getPuzzleNumber } from './dateUtils';
import type { DailyPlayMode } from './missedDayAction';

export const CATCH_UP_MODES: DailyPlayMode[] = ['word-hunt', 'word-wheel'];

export interface CatchUpDay {
  date: string;
  puzzleNumber: number;
  played: Record<DailyPlayMode, boolean>;
}

interface ResolveInput {
  today: string;
  playedLocally: (mode: DailyPlayMode, date: string) => boolean;
  /** Missed dates per mode from the server; null = the server could not answer for that mode. */
  serverMissed?: Partial<Record<DailyPlayMode, string[] | null>>;
}

export function resolveCatchUpDays({ today, playedLocally, serverMissed }: ResolveInput): CatchUpDay[] {
  return getCatchUpDates(today).map(date => {
    const played = {} as Record<DailyPlayMode, boolean>;
    for (const mode of CATCH_UP_MODES) {
      const missed = serverMissed?.[mode];
      played[mode] = playedLocally(mode, date) || (Array.isArray(missed) && !missed.includes(date));
    }
    return { date, puzzleNumber: getPuzzleNumber(date), played };
  });
}
