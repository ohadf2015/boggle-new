import { describe, it, expect } from 'vitest';
import { boltKeyframes, castRow, castTiming, flightKeyframes, letterGems, recoilKeyframes } from '../castPath';

describe('castRow', () => {
  it('given a short word, when laid out, then the letters form one centred row at the waypoint height', () => {
    const row = castRow(3, 80, 390, 200);
    expect(row).toHaveLength(3);
    expect(row.every((p) => p.y === 200)).toBe(true);
    // Centred on the viewport: middle letter sits on the centre line.
    expect(row[1].x).toBe(195);
    expect(row[0].x).toBeLessThan(row[1].x);
    expect(row[2].x).toBeGreaterThan(row[1].x);
  });

  it('given a long word, when laid out, then the row shrinks to fit the screen with a 16px gutter', () => {
    const row = castRow(9, 80, 390, 200);
    const half = row[0].size / 2;
    expect(row[0].x - half).toBeGreaterThanOrEqual(16);
    expect(row[8].x + half).toBeLessThanOrEqual(390 - 16);
    expect(row[0].size).toBeLessThan(80);
  });

  it('given an RTL language, when laid out, then the first letter sits rightmost so the banner reads right-to-left', () => {
    const row = castRow(3, 80, 390, 0, true);
    expect(row[0].x).toBeGreaterThan(row[2].x);
    expect(row[1].x).toBe(195);
  });

  it('given a short word, when laid out, then the hanging word is OVERSIZED (bigger than a board tile) but capped for TV', () => {
    expect(castRow(2, 60, 390, 0)[0].size).toBe(69);
    expect(castRow(2, 120, 1600, 0)[0].size).toBe(96);
  });
});

describe('castTiming', () => {
  it('given a multi-letter word, when timed, then the letters land one by one over ~100-150ms so the word visibly ASSEMBLES without delaying the hit', () => {
    for (const n of [3, 5, 8]) {
      const { stagger } = castTiming(n, false);
      const span = stagger * (n - 1);
      expect(span).toBeGreaterThanOrEqual(100);
      expect(span).toBeLessThanOrEqual(150);
      expect(stagger).toBeLessThanOrEqual(90);
    }
  });

  it('given any word, when timed, then assembly finishes before the bolts dive, impact is FRONT-LOADED (<=0.34s), and the decay runs to ~1.15s', () => {
    for (const n of [1, 3, 5, 8, 16]) {
      const { snapMs, diveAt, impactMs, holdMs } = castTiming(n, false);
      expect(snapMs).toBeLessThanOrEqual(diveAt);
      expect(diveAt).toBeLessThan(impactMs);
      expect(impactMs).toBeGreaterThanOrEqual(150);
      expect(impactMs).toBeLessThanOrEqual(340);
      expect(holdMs - impactMs).toBeGreaterThanOrEqual(550);
      expect(holdMs).toBeLessThanOrEqual(1200);
    }
  });

  it('given reduced motion, when timed, then impact is immediate', () => {
    expect(castTiming(5, true).impactMs).toBe(0);
  });
});

describe('flightKeyframes', () => {
  it('given a letter, when choreographed, then it lifts off its tile, snaps into the banner slot and STAYS there (the word hangs in the air)', () => {
    const k = flightKeyframes({ wx: 10, wy: -80, ws: 0.8, rot: 8 }, 0.15);
    expect(k[0].transform).toContain('translate(0px, 0px)');
    const held = k.filter((f) => String(f.transform).includes('translate(10px, -80px)'));
    expect(held.length).toBeGreaterThanOrEqual(2);
    const offs = k.map((f) => f.offset as number);
    expect(offs).toEqual([...offs].sort((a, b) => a - b));
    expect(offs[0]).toBe(0);
    expect(offs[offs.length - 1]).toBe(1);
    // Fades only at the very end.
    expect(k[k.length - 1].opacity).toBe(0);
    expect(k[k.length - 2].opacity ?? 1).toBe(1);
  });
});

describe('boltKeyframes', () => {
  it('given a banner letter, when it fires, then its bolt travels from the slot and ends ON the target', () => {
    const k = boltKeyframes({ dx: 40, dy: -300 });
    expect(k[0].transform).toContain('translate(0px, 0px)');
    expect(k[k.length - 1].transform).toContain('translate(40px, -300px)');
  });
});

describe('letterGems', () => {
  it('given any word, when coloured, then every letter gets its own gem and neighbours never share a colour', () => {
    for (const w of ['DIM', 'CAT', 'TETHER', 'EEEE', 'שלום']) {
      const g = letterGems(Array.from(w));
      expect(g).toHaveLength(Array.from(w).length);
      for (let i = 1; i < g.length; i++) expect(g[i].fill).not.toBe(g[i - 1].fill);
    }
    expect(new Set(letterGems(Array.from('DIM')).map((x) => x.fill)).size).toBe(3);
  });

  it('given a rare letter (Q, Z, X, J), when coloured, then it gets the rare gold gem', () => {
    const g = letterGems(['Q', 'U', 'I', 'Z']);
    expect(g[0].rare).toBe(true);
    expect(g[3].rare).toBe(true);
    expect(g[1].rare).toBe(false);
  });

  it('given a gem, then its glow is a saturated partner of its fill (per-letter glow, not one tier hue)', () => {
    const g = letterGems(Array.from('SMASH'));
    expect(new Set(g.map((x) => x.glow)).size).toBeGreaterThanOrEqual(3);
    g.forEach((x) => expect(x.glow).not.toBe(x.fill));
  });
});

describe('recoilKeyframes', () => {
  it('given a hit, when the target recoils, then it flashes hard, pulses again, and is still settling late (visible through the whole window)', () => {
    const { frames, duration } = recoilKeyframes({ kx: 0, ky: -1 }, 20, 0.5);
    expect(duration).toBeGreaterThanOrEqual(700);
    expect(duration).toBeLessThanOrEqual(900);
    const flashes = frames.filter((f) => String(f.filter).includes('brightness'));
    expect(flashes.length).toBeGreaterThanOrEqual(3);
    const late = frames.filter((f) => (f.offset as number) >= 0.6 && f.filter !== 'none');
    expect(late.length).toBeGreaterThanOrEqual(1);
    expect(frames[frames.length - 1].transform).toBe('none');
  });

  it('given a hit, when the target recoils, then it HOLDS a knocked-back, tinted pose through the first half (no frame returns to rest before 0.5)', () => {
    const { frames } = recoilKeyframes({ kx: 1, ky: 0 }, 20, 0.5);
    const held = frames.filter((f) => (f.offset as number) > 0 && (f.offset as number) <= 0.5);
    expect(held.length).toBeGreaterThanOrEqual(3);
    held.forEach((f) => {
      expect(f.transform).not.toBe('none');
      expect(f.filter).not.toBe('none');
      // Knocked AWAY along the travel direction (positive x), never snapping back through rest.
      const x = Number(/translate\((-?\d+)px/.exec(String(f.transform))?.[1] ?? 0);
      expect(x).toBeGreaterThan(0);
    });
  });

  it('given a bigger hit, when the target recoils, then it is knocked further', () => {
    const peak = (p: number) => Number(/translate\((-?\d+)px/.exec(String(recoilKeyframes({ kx: 1, ky: 0 }, 30, p).frames[1].transform))?.[1]);
    expect(peak(1)).toBeGreaterThanOrEqual(peak(0));
  });
});
