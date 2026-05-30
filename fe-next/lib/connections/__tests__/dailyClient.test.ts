import { describe, it, expect } from 'vitest';
import { dailyShareText } from '../dailyClient';

describe('dailyShareText — shareable daily result', () => {
  it('includes title, date, solved/total, streak and rank', () => {
    const txt = dailyShareText({
      title: 'Word Bridge',
      dateISO: '2026-05-30',
      puzzlesSolved: 4,
      total: 5,
      streak: 3,
      rank: 12,
    });
    expect(txt).toContain('Word Bridge');
    expect(txt).toContain('2026-05-30');
    expect(txt).toContain('4/5');
    expect(txt).toContain('3');
    expect(txt).toContain('#12');
  });

  it('omits the rank fragment when rank is null', () => {
    const txt = dailyShareText({
      title: 'Word Bridge',
      dateISO: '2026-05-30',
      puzzlesSolved: 5,
      total: 5,
      streak: 1,
      rank: null,
    });
    expect(txt).not.toContain('#');
    expect(txt).toContain('5/5');
  });
});
