import { describe, it, expect } from 'vitest';
import { groupArchiveByMonth, formatArchiveMonth } from '../archiveDates';

describe('archive month groups', () => {
  it('Given November days, Then the group is labelled November in any server timezone', () => {
    const groups = groupArchiveByMonth([
      { date: '2026-11-09', puzzleNumber: 315 },
      { date: '2026-11-01', puzzleNumber: 307 },
      { date: '2026-10-31', puzzleNumber: 306 },
    ]);
    expect(Object.keys(groups)).toEqual(['2026-11', '2026-10']);
    expect(formatArchiveMonth('2026-11', 'en')).toBe('November 2026');
    expect(groups['2026-11'].map(d => d.puzzleNumber)).toEqual([315, 307]);
  });
});
