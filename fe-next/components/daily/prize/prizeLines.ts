import type { DayPrize, DayPrizeTier } from '@/lib/daily/dayPrize';

/** How many lines each tier has under `daily.dayPrize.lines.<tier>.<n>`. */
export const PRIZE_LINE_COUNT: Record<DayPrizeTier, number> = { common: 3, lucky: 2, jackpot: 2 };

/** A line that changes from day to day but stays put for one box (no re-render flicker). */
export function prizeLineKey(prize: Pick<DayPrize, 'tier' | 'coins' | 'kind'>, date: string = new Date().toISOString().slice(0, 10)): string {
  const day = Number(date.slice(8, 10)) || 0;
  const index = (day + prize.coins + (prize.kind === 'perfect' ? 1 : 0)) % PRIZE_LINE_COUNT[prize.tier];
  return `daily.dayPrize.lines.${prize.tier}.${index}`;
}
