import { describe, expect, it } from 'vitest';
import { weekClassRows } from '../weekClassRows';

const DAY = 86_400_000;
const NOW = Date.parse('2026-11-04T15:00:00');
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();
const classes = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
  { id: 'c', name: 'C' },
  { id: 'd', name: 'D' },
];

describe('weekClassRows', () => {
  it('Given mixed activity, Then most recent class comes first and never-played classes keep their order at the end', () => {
    const { rows } = weekClassRows(classes, { c: iso(2 * DAY), b: iso(3_600_000) }, NOW, 5);
    expect(rows.map((r) => r.id)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('Then a game earlier today is "today", 1-6 calendar days is "week", older or never is "idle"', () => {
    const { rows } = weekClassRows(classes, { a: iso(3_600_000), b: iso(6 * DAY), c: iso(8 * DAY) }, NOW, 5);
    const tone = Object.fromEntries(rows.map((r) => [r.id, r.tone]));
    expect(tone).toEqual({ a: 'today', b: 'week', c: 'idle', d: 'idle' });
  });

  it('Then an idle row carries no date, an active row carries its timestamp', () => {
    const { rows } = weekClassRows(classes, { a: iso(DAY), c: iso(9 * DAY) }, NOW, 5);
    expect(rows.find((r) => r.id === 'a')!.playedAt).toBe(iso(DAY));
    expect(rows.find((r) => r.id === 'c')!.playedAt).toBeNull();
  });

  it('Given more classes than fit, Then it caps the rows and counts the rest', () => {
    const { rows, hidden } = weekClassRows(classes, {}, NOW, 3);
    expect(rows).toHaveLength(3);
    expect(hidden).toBe(1);
  });

  it('Given the selected class would be cut off, Then it stays visible in place of the last row', () => {
    const { rows, hidden } = weekClassRows(classes, { a: iso(DAY) }, NOW, 2, 'd');
    expect(rows.map((r) => r.id)).toEqual(['a', 'd']);
    expect(hidden).toBe(2);
  });

  it('Given an unparseable timestamp, Then the class reads idle instead of throwing', () => {
    const { rows } = weekClassRows([{ id: 'a', name: 'A' }], { a: 'not-a-date' }, NOW, 5);
    expect(rows[0].tone).toBe('idle');
  });
});
