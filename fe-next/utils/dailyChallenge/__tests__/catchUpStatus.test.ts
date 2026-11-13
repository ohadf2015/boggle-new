import { describe, it, expect } from 'vitest';
import { resolveCatchUpDays } from '../catchUpStatus';

const today = '2026-05-12';
const none = () => false;

describe('resolveCatchUpDays', () => {
  it('Given a guest with nothing stored, Then all three past days are open in both modes, newest first', () => {
    const days = resolveCatchUpDays({ today, playedLocally: none });
    expect(days.map(d => d.date)).toEqual(['2026-05-11', '2026-05-10', '2026-05-09']);
    expect(days.every(d => !d.played['word-hunt'] && !d.played['word-wheel'])).toBe(true);
  });

  it('Given a day stored on this device, Then that mode reads played', () => {
    const days = resolveCatchUpDays({
      today,
      playedLocally: (mode, date) => mode === 'word-wheel' && date === '2026-05-10',
    });
    expect(days[1].played).toEqual({ 'word-hunt': false, 'word-wheel': true });
  });

  it('Given the server lists missed days, Then every other day in the window reads played', () => {
    const days = resolveCatchUpDays({
      today,
      playedLocally: none,
      serverMissed: { 'word-hunt': ['2026-05-11'], 'word-wheel': ['2026-05-11', '2026-05-10', '2026-05-09'] },
    });
    expect(days.map(d => d.played['word-hunt'])).toEqual([false, true, true]);
    expect(days.map(d => d.played['word-wheel'])).toEqual([false, false, false]);
  });

  it('Given the server could not answer for a mode, Then that mode falls back to this device only', () => {
    const days = resolveCatchUpDays({ today, playedLocally: none, serverMissed: { 'word-hunt': null, 'word-wheel': [] } });
    expect(days.map(d => d.played['word-hunt'])).toEqual([false, false, false]);
    expect(days.map(d => d.played['word-wheel'])).toEqual([true, true, true]);
  });

  it('carries the puzzle number for each day', () => {
    const [first, second] = resolveCatchUpDays({ today, playedLocally: none });
    expect(second.puzzleNumber).toBe(first.puzzleNumber - 1);
  });
});
