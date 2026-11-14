import { describe, it, expect } from 'vitest';
import { dailySummaryNotice } from '../adminEvents';

const day = (games: number, signups: number, teachers: number) => ({ games, signups, teachers });

describe('dailySummaryNotice', () => {
  it('reads yesterday against the day before, one dedupe key per day', () => {
    expect(dailySummaryNotice({ day: '2026-11-13', current: day(262, 10, 3), previous: day(23, 18, 1) })).toEqual({
      kind: 'daily_summary',
      severity: 'normal',
      title: 'Yesterday: 262 games, up from 23',
      body: '10 signups, down from 18 · 3 teacher signups, up from 1',
      link: '/admin',
      dedupeKey: 'daily-summary:2026-11-13',
    });
  });

  it('says when nothing moved and uses the singular for one', () => {
    const n = dailySummaryNotice({ day: '2026-11-13', current: day(1, 0, 1), previous: day(1, 0, 1) });
    expect(n.title).toBe('Yesterday: 1 game, same as the day before');
    expect(n.body).toBe('0 signups, same as the day before · 1 teacher signup, same as the day before');
  });
});
