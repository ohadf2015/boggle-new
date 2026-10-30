import { describe, it, expect } from 'vitest';
import { WHEEL_RANKS, rankThresholds, rankProgress, praiseFor, wheelRankLadder } from '../rankLadder';

describe('rankLadder', () => {
  it('starts at zero and climbs strictly', () => {
    const th = rankThresholds(120);
    expect(th).toHaveLength(WHEEL_RANKS.length);
    expect(th[0]).toBe(0);
    for (let i = 1; i < th.length; i++) expect(th[i]).toBeGreaterThan(th[i - 1]);
  });

  it('lets a single 3-letter word (12 pts) reach the second rank in a 2-minute game', () => {
    expect(rankProgress(12, rankThresholds(120)).index).toBe(1);
  });

  it('scales thresholds with a shorter clock but never below one 3-letter word', () => {
    const short = rankThresholds(60);
    expect(short[1]).toBe(12);
    expect(short[short.length - 1]).toBeLessThan(rankThresholds(120)[short.length - 1]);
  });

  it('places the bubble between rank dots so every accepted word moves it', () => {
    const th = rankThresholds(120);
    const a = rankProgress(30, th);
    const b = rankProgress(42, th);
    expect(b.position).toBeGreaterThan(a.position);
    expect(a.position).toBeGreaterThan(0);
    expect(a.toNext).toBe(th[a.index + 1] - 30);
  });

  it('pins to the top rank and full track at or past the last threshold', () => {
    const th = rankThresholds(120);
    const p = rankProgress(th[th.length - 1] + 500, th);
    expect(p.index).toBe(th.length - 1);
    expect(p.position).toBe(1);
    expect(p.toNext).toBe(0);
  });

  it('picks praise by word length, with the full-wheel word on top', () => {
    expect(praiseFor('CAT', false)).toBe('nice');
    expect(praiseFor('CATS', false)).toBe('great');
    expect(praiseFor('CRATE', false)).toBe('superb');
    expect(praiseFor('CRATES', false)).toBe('brilliant');
    expect(praiseFor('CRATE', true)).toBe('fullWheel');
  });

  it('stretches the Hebrew ladder so Legend sits near the top 5% like English', () => {
    const he = rankThresholds(120, 'he');
    expect(he[he.length - 1]).toBe(1698);
    expect(he[WHEEL_RANKS.indexOf('wizard')]).toBe(1200);
    expect(he[1]).toBe(12);
    expect(rankThresholds(120, 'en')).toEqual(rankThresholds(120));
    for (const v of he) expect(v % 6).toBe(0);
  });

  it('composes duration, language and bonus-day scale in one ladder', () => {
    expect(wheelRankLadder({ puzzleDate: '2026-10-30', language: 'he' })).toEqual(rankThresholds(120, 'he'));
    const bonusHe = wheelRankLadder({ puzzleDate: '2026-11-05', language: 'he' });
    expect(bonusHe[bonusHe.length - 1]).toBe(2292);
    const bonusEn = wheelRankLadder({ puzzleDate: '2026-11-05', language: 'en' });
    expect(bonusEn[bonusEn.length - 1]).toBe(1152);
    expect(wheelRankLadder({ durationSec: 60, puzzleDate: '', language: 'en' })).toEqual(rankThresholds(60));
  });
});
