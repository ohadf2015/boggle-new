// @vitest-environment happy-dom
import type { Options } from 'canvas-confetti';

const fired: Options[] = [];
vi.mock('canvas-confetti', () => ({
  default: { create: () => Object.assign((o: Options) => { fired.push(o); return null; }, { reset() {} }) },
}));

import { fireConfetti, cleanupConfetti, NEO_BRUTALIST_COLORS, RANK_COLORS } from '../confettiUtils';

const NEO_HEX = ['#BFFF00', '#FF1493', '#00FFFF', '#8B5CF6', '#FFE135', '#FF6B35'];

function fireWith(rand: number, opts: Options) {
  vi.spyOn(Math, 'random').mockReturnValue(rand);
  fireConfetti(opts);
  return fired[fired.length - 1];
}

describe('fireConfetti variety', () => {
  beforeEach(() => {
    fired.length = 0;
    vi.spyOn(window, 'matchMedia').mockImplementation(() => ({ matches: false }) as MediaQueryList);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupConfetti();
  });

  it('given two volleys with different rolls, then spread, angle and origin differ but the particle count does not', () => {
    const base = { particleCount: 30, spread: 80, origin: { x: 0.5, y: 0.6 } };
    const a = fireWith(0.1, base);
    const b = fireWith(0.9, base);
    expect(a.particleCount).toBe(30);
    expect(b.particleCount).toBe(30);
    expect(a.spread).not.toBe(b.spread);
    expect(a.angle).not.toBe(b.angle);
    expect(a.origin).not.toEqual(b.origin);
    expect(Math.abs(a.spread! - 80)).toBeLessThanOrEqual(12);
    expect(Math.abs(a.angle! - 90)).toBeLessThanOrEqual(8);
  });

  it('given the default palette, then each volley draws a subset of neo colours', () => {
    const a = fireWith(0.1, { colors: NEO_BRUTALIST_COLORS });
    const b = fireWith(0.9, {});
    for (const c of [...a.colors!, ...b.colors!]) expect(NEO_HEX).toContain(c);
    expect(a.colors!.length).toBeGreaterThanOrEqual(3);
    expect(a.colors).not.toEqual(b.colors);
  });

  it('given a meaningful palette like a rank, then it keeps exactly those colours', () => {
    const out = fireWith(0.3, { colors: RANK_COLORS[3] });
    expect([...out.colors!].sort()).toEqual([...RANK_COLORS[3]].sort());
  });

  it('given origins at the screen edge, then jitter keeps them on screen', () => {
    const out = fireWith(0, { origin: { x: 0, y: 1 } });
    expect(out.origin!.x).toBeGreaterThanOrEqual(0);
    expect(out.origin!.y).toBeLessThanOrEqual(1);
  });

  it('given reduced motion, then nothing fires', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(() => ({ matches: true }) as MediaQueryList);
    expect(fireConfetti({ particleCount: 10 })).toBeNull();
    expect(fired).toHaveLength(0);
  });
});
