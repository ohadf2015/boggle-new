import { describe, it, expect } from 'vitest';
import { NIGHT_SECONDS, OIL_MAX, newOil, oilAccept, oilBound, oilTick } from '../oil';
import { precheck, wordPoints } from '../letters';

const run = (s: ReturnType<typeof newOil>, secs: number, step = 0.1) => {
  for (let t = 0; t < secs; t += step) s = oilTick(s, step);
  return s;
};

const untilMiracle = () => {
  let s = newOil();
  for (let i = 0; i < 1000 && s.miracle !== 'active'; i++) s = oilTick(s, 0.1);
  return s;
};

describe('Oil for 8 Nights', () => {
  it('Given a fresh lamp, when time passes, then oil drains and the night advances', () => {
    const s = run(newOil(), NIGHT_SECONDS[0] + 0.2);
    expect(s.oil).toBeLessThan(OIL_MAX);
    expect(s.night).toBe(2);
    expect(s.score).toBe(50);
  });

  it('Given a valid word, when accepted, then oil refills by length and the word scores', () => {
    const drained = run(newOil(), 5);
    const s = oilAccept(drained, 'LATKE', 5);
    expect(s.oil).toBeGreaterThan(drained.oil);
    expect(s.oil).toBeLessThanOrEqual(OIL_MAX);
    expect(s.score).toBe(drained.score + wordPoints(5));
    expect(s.words).toContain('LATKE');
  });

  it('Given the oil runs dry the first time, then the miracle holds it for 3 seconds, and the next time the run ends', () => {
    let s = untilMiracle();
    expect(s.over).toBe(false);
    expect(s.miracle).toBe('active');
    expect(s.oil).toBe(0);
    s = run(s, 2.9);
    expect(s.over).toBe(false);
    s = run(s, 1);
    expect(s.miracle).toBe('used');
    expect(s.over).toBe(true);
    expect(s.won).toBe(false);
  });

  it('Given the miracle is active, when a word lands, then the lamp is saved and the miracle is spent', () => {
    let s = untilMiracle();
    s = oilAccept(s, 'CANDLE', 6);
    expect(s.miracle).toBe('used');
    expect(s.oil).toBeGreaterThan(0);
  });

  it('Given all 8 nights survive, then the run is won with the full bonus', () => {
    let s = newOil();
    for (let i = 0; i < 2000 && !s.over; i++) {
      s = oilTick(s, 0.1);
      if (s.oil < 40) s = oilAccept(s, `W${i}`, 8);
    }
    expect(s.won).toBe(true);
    expect(s.night).toBe(8);
    expect(s.score).toBeLessThanOrEqual(oilBound(s.words.map(() => 8)));
  });

  it('Given an over run, when ticking or accepting, then nothing changes', () => {
    const over = { ...newOil(), over: true };
    expect(oilTick(over, 1)).toBe(over);
    expect(oilAccept(over, 'X', 4)).toBe(over);
  });

  it('Given words to check, then precheck rejects short, duplicate and off-rack words', () => {
    const rack = ['L', 'A', 'T', 'K', 'E', 'S', 'O', 'I', 'N'];
    expect(precheck('at', rack, 'en', new Set())).toBe('short');
    expect(precheck('zoo', rack, 'en', new Set())).toBe('letters');
    expect(precheck('oil', rack, 'en', new Set(['OIL']))).toBe('dup');
    expect(precheck('oil', rack, 'en', new Set())).toBe('ok');
  });
});
