import { describe, it, expect, beforeEach } from 'vitest';
import {
  PROGRESS_KEY,
  RANKS,
  loadProgress,
  recordBridge,
  recordPlayDay,
  rankFor,
  weekStrip,
} from '../progress';

describe('rankFor — lifetime bridges map to a rank ladder', () => {
  it('starts on the first rank with a full span to the next', () => {
    const r = rankFor(0);
    expect(r.rank.id).toBe(RANKS[0].id);
    expect(r.next?.id).toBe(RANKS[1].id);
    expect(r.intoRank).toBe(0);
    expect(r.span).toBe(RANKS[1].min);
    expect(r.ratio).toBe(0);
  });

  it('promotes exactly at a threshold', () => {
    expect(rankFor(RANKS[1].min - 1).rank.id).toBe(RANKS[0].id);
    expect(rankFor(RANKS[1].min).rank.id).toBe(RANKS[1].id);
    expect(rankFor(RANKS[1].min).intoRank).toBe(0);
  });

  it('reports partial progress inside a rank', () => {
    const mid = RANKS[1].min + Math.floor((RANKS[2].min - RANKS[1].min) / 2);
    const r = rankFor(mid);
    expect(r.ratio).toBeGreaterThan(0.4);
    expect(r.ratio).toBeLessThan(0.6);
  });

  it('tops out with no next rank and a full bar', () => {
    const top = RANKS[RANKS.length - 1];
    const r = rankFor(top.min + 999);
    expect(r.rank.id).toBe(top.id);
    expect(r.next).toBeNull();
    expect(r.ratio).toBe(1);
  });

  it('treats junk input as zero', () => {
    expect(rankFor(Number.NaN).rank.id).toBe(RANKS[0].id);
    expect(rankFor(-5).rank.id).toBe(RANKS[0].id);
  });

  it('has strictly increasing thresholds starting at 0', () => {
    expect(RANKS[0].min).toBe(0);
    RANKS.forEach((r, i) => i > 0 && expect(r.min).toBeGreaterThan(RANKS[i - 1].min));
  });
});

describe('progress store', () => {
  beforeEach(() => window.localStorage.clear());

  it('defaults to nothing built', () => {
    expect(loadProgress()).toEqual({ bridges: 0, days: [] });
  });

  it('counts bridges and reports a rank-up on the crossing bridge only', () => {
    let crossed = 0;
    for (let i = 0; i < RANKS[1].min; i++) {
      const res = recordBridge();
      if (res.rankedUp) crossed += 1;
    }
    expect(crossed).toBe(1);
    expect(loadProgress().bridges).toBe(RANKS[1].min);
  });

  it('records each play day once, newest last, capped', () => {
    recordPlayDay('2026-10-01');
    recordPlayDay('2026-10-01');
    recordPlayDay('2026-10-02');
    expect(loadProgress().days).toEqual(['2026-10-01', '2026-10-02']);
    for (let d = 1; d <= 60; d++) recordPlayDay(`2027-01-${String((d % 28) + 1).padStart(2, '0')}-${d}`);
    expect(loadProgress().days.length).toBeLessThanOrEqual(45);
  });

  it('survives corrupt storage', () => {
    window.localStorage.setItem(PROGRESS_KEY, '{nope');
    expect(loadProgress()).toEqual({ bridges: 0, days: [] });
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify({ bridges: 'x', days: [1, 'a'] }));
    expect(loadProgress()).toEqual({ bridges: 0, days: ['a'] });
  });
});

describe('weekStrip — the last 7 UTC days ending today', () => {
  it('marks played days and flags today', () => {
    const strip = weekStrip(['2026-10-21', '2026-10-23'], '2026-10-23');
    expect(strip).toHaveLength(7);
    expect(strip[6]).toEqual({ date: '2026-10-23', played: true, isToday: true });
    expect(strip[5]).toEqual({ date: '2026-10-22', played: false, isToday: false });
    expect(strip[4].played).toBe(true);
    expect(strip[0].date).toBe('2026-10-17');
  });

  it('crosses month and year boundaries', () => {
    const strip = weekStrip([], '2027-01-02');
    expect(strip.map((d) => d.date)).toEqual([
      '2026-12-27', '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02',
    ]);
  });
});
