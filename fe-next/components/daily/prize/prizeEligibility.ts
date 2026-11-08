import type { DailyModeId, DailyModePlayState } from '@/lib/dailyModes';
import type { DayPrizeKind } from '@/lib/daily/dayPrize';

const REQUIRED: readonly DailyModeId[] = ['word-wheel', 'word-hunt'];

function requiredDone(state: DailyModePlayState): boolean {
  return state.wordWheel === 'played' && state.wordHunt === 'won';
}

function allDone(state: DailyModePlayState): boolean {
  return requiredDone(state) && state.wordTower && state.connections;
}

/**
 * Which prize box a results screen should pop, if any: the perfect-day box when
 * this game finished all four, else the day-clear box when this game was the
 * second of today's two. Finishing a bonus after the day was already cleared
 * pops nothing; that box waits on the hub.
 */
export function prizeToPop(state: DailyModePlayState, justFinished: DailyModeId): DayPrizeKind | null {
  if (allDone(state)) return 'perfect';
  if (requiredDone(state) && REQUIRED.includes(justFinished)) return 'clear';
  return null;
}

/** True when `next` is the last of today's two still open, so finishing it opens the prize box. */
export function finishingClearsDay(state: DailyModePlayState, next: DailyModeId): boolean {
  if (!REQUIRED.includes(next)) return false;
  const open = REQUIRED.filter((id) => (id === 'word-wheel' ? state.wordWheel !== 'played' : state.wordHunt === 'new'));
  return open.length === 1 && open[0] === next;
}
