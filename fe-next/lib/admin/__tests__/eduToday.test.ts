import { describe, it, expect } from 'vitest';
import { buildEduToday } from '../eduToday';

const NOW = Date.parse('2026-11-10T12:00:00Z');
const r = (teacher: string, players: number, iso: string) => ({ teacher_id: teacher, player_count: players, completed_at: iso });

describe('buildEduToday', () => {
  it('is unavailable while classroom_rounds is not migrated', () => {
    expect(buildEduToday(null, NOW)).toEqual({ available: false });
  });

  it('counts class games, distinct teachers and student seats for today and yesterday', () => {
    const t = buildEduToday(
      [r('a', 10, '2026-11-10T08:00:00Z'), r('a', 12, '2026-11-10T09:00:00Z'), r('b', 5, '2026-11-10T10:00:00Z'), r('a', 20, '2026-11-09T08:00:00Z'), r('c', 4, '2026-11-09T09:00:00Z')],
      NOW,
    );
    expect(t).toMatchObject({
      available: true,
      rounds: { current: 3, prior: 2 },
      teachers: { current: 2, prior: 2 },
      seats: { current: 27, prior: 24 },
    });
  });

  it('pace and percent follow the share of the day passed', () => {
    const t = buildEduToday([r('a', 10, '2026-11-10T08:00:00Z'), r('a', 10, '2026-11-09T08:00:00Z'), r('a', 10, '2026-11-09T09:00:00Z')], NOW);
    expect(t.available && t.rounds).toMatchObject({ projected: 2, pct: 0 });
  });

  it('gives a 7-day spark of games per day, oldest first, and ignores older rounds', () => {
    const t = buildEduToday([r('a', 1, '2026-11-10T08:00:00Z'), r('a', 1, '2026-11-04T08:00:00Z'), r('a', 1, '2026-10-01T08:00:00Z')], NOW);
    expect(t.available && t.rounds.spark).toEqual([1, 0, 0, 0, 0, 0, 1]);
  });
});
