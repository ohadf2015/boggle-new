import { describe, it, expect } from 'vitest';
import type { DailyModePlayState } from '@/lib/dailyModes';
import { finishingClearsDay, prizeToPop } from '../prizeEligibility';

const none: DailyModePlayState = { wordWheel: 'new', wordHunt: 'new', wordTower: false, connections: false };
const two: DailyModePlayState = { ...none, wordWheel: 'played', wordHunt: 'won' };
const four: DailyModePlayState = { ...two, wordTower: true, connections: true };

describe('prizeToPop', () => {
  it('pops the day-clear box on the results of the second required quest', () => {
    expect(prizeToPop(two, 'word-hunt')).toBe('clear');
    expect(prizeToPop(two, 'word-wheel')).toBe('clear');
  });
  it('pops nothing after only one required quest', () => {
    expect(prizeToPop({ ...none, wordWheel: 'played' }, 'word-wheel')).toBeNull();
  });
  it('a bonus finished after the day was cleared pops nothing', () => {
    expect(prizeToPop({ ...two, connections: true }, 'connections')).toBeNull();
  });
  it('the fourth quest pops the perfect-day box', () => {
    expect(prizeToPop(four, 'word-tower')).toBe('perfect');
  });
});

describe('finishingClearsDay', () => {
  it('is true for the last required quest still open', () => {
    expect(finishingClearsDay({ ...none, wordWheel: 'played' }, 'word-hunt')).toBe(true);
  });
  it('is false with both still open, for bonuses, and once cleared', () => {
    expect(finishingClearsDay(none, 'word-wheel')).toBe(false);
    expect(finishingClearsDay({ ...none, wordWheel: 'played' }, 'connections')).toBe(false);
    expect(finishingClearsDay(two, 'word-hunt')).toBe(false);
  });
});
