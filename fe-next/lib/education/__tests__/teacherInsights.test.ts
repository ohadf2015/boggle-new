import { describe, it, expect } from 'vitest';
import { buildTeacherInsights } from '../teacherInsights';

// Noon UTC, a Wednesday: far from any day boundary in any timezone.
const NOW = Date.parse('2026-10-21T12:00:00Z');
const DAY = 86_400_000;
const ago = (d: number) => new Date(NOW - d * DAY).toISOString();
const classes = [
  { id: 'a', name: 'Alpha', member_count: 20 },
  { id: 'b', name: 'Beta', member_count: 10 },
];
const row = (classroom_id: string, d: number, code: string) => ({ classroom_id, completed_at: ago(d), game_code: code });
const ids = (rows: ReturnType<typeof row>[]) => buildTeacherInsights(rows, classes, NOW, 'en').map((i) => i.id);

describe('buildTeacherInsights', () => {
  it('Given no games, Then nothing is invented', () => {
    expect(buildTeacherInsights([], classes, NOW, 'en')).toEqual([]);
  });

  it('Given more games than last week, Then momentum shows the real difference', () => {
    const rows = [row('a', 1, 'g1'), row('a', 2, 'g2'), row('a', 3, 'g3'), row('a', 9, 'g4')];
    const m = buildTeacherInsights(rows, classes, NOW, 'en').find((i) => i.id === 'momentum');
    expect(m?.value).toBe(2);
  });

  it('Given fewer games than last week, Then no momentum claim is made', () => {
    expect(ids([row('a', 1, 'g1'), row('a', 8, 'g2'), row('a', 9, 'g3')])).not.toContain('momentum');
  });

  it('Given games on consecutive days up to today, Then the streak counts them', () => {
    const s = buildTeacherInsights([row('a', 0, 'g1'), row('a', 1, 'g2'), row('a', 2, 'g3'), row('a', 4, 'g4')], classes, NOW, 'en').find((i) => i.id === 'streak');
    expect(s?.value).toBe(3);
  });

  it('Given two classes played this week, Then the busiest class is named with its game count', () => {
    const t = buildTeacherInsights([row('a', 1, 'g1'), row('b', 1, 'g2'), row('b', 2, 'g3')], classes, NOW, 'en').find((i) => i.id === 'topClass');
    expect(t).toMatchObject({ value: 2, params: { name: 'Beta' } });
  });

  it('Given one active class only, Then there is no "busiest class" claim', () => {
    expect(ids([row('a', 1, 'g1'), row('a', 2, 'g2')])).not.toContain('topClass');
  });

  it('Given a long quiet spell, Then a nudge carries the real day count', () => {
    const q = buildTeacherInsights([row('a', 6, 'g1')], classes, NOW, 'en').find((i) => i.id === 'quiet');
    expect(q?.value).toBe(6);
  });

  it('Given enough history, Then the busiest weekday is a localized name', () => {
    const rows = [row('a', 7, 'g1'), row('a', 14, 'g2'), row('a', 21, 'g3'), row('a', 1, 'g4'), row('a', 2, 'g5')];
    const b = buildTeacherInsights(rows, classes, NOW, 'en').find((i) => i.id === 'busiest');
    expect(b?.value).toBe('Wednesday');
  });

  it('Given any games, Then the student reach and 30-day total are always available', () => {
    const list = buildTeacherInsights([row('a', 1, 'g1')], classes, NOW, 'en');
    expect(list.find((i) => i.id === 'reach')?.value).toBe(30);
    expect(list.find((i) => i.id === 'month')?.value).toBe(1);
  });
});
