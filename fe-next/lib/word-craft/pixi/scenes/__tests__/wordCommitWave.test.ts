import { describe, expect, it, vi } from 'vitest';
import { playWordCommitWave } from '../wordCommitWave';

vi.mock('pixi.js', () => ({
  Graphics: class {
    circle = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    position = { set: vi.fn() };
    scale = { set: vi.fn() };
    alpha = 1;
    destroy = vi.fn();
  },
  Text: class {
    constructor(_opts: any) {}
    anchor = { set: vi.fn() };
    position = { set: vi.fn() };
    destroy = vi.fn();
  },
}));
vi.mock('gsap', () => ({
  default: { to: vi.fn((_target, opts) => { setTimeout(() => opts.onComplete?.(), 0); return { kill: vi.fn() }; }) },
}));

const fakeCtx = (rm = false) => ({
  app: {} as any,
  ambientLayer: {} as any,
  eventLayer: { addChild: vi.fn() } as any,
  coords: {
    cellRect: vi.fn((r: number, c: number) => ({
      x: c * 40,
      y: r * 40,
      width: 30,
      height: 30,
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      toJSON: () => ({}),
    } as DOMRect)),
    scoreChipRect: vi.fn(() => ({
      x: 300,
      y: 10,
      width: 80,
      height: 30,
      top: 10,
      left: 300,
      bottom: 40,
      right: 380,
      toJSON: () => ({}),
    } as DOMRect)),
  } as any,
  reducedMotion: rm,
});

describe('playWordCommitWave', () => {
  it('plays through all placements + score arc, then resolves', async () => {
    const c = fakeCtx();
    const placements = [
      { row: 5, col: 3, letter: 'Q', value: 10 },
      { row: 5, col: 4, letter: 'U', value: 1 },
    ];
    await expect(playWordCommitWave(c, { placements, totalScore: 22 })).resolves.toBeUndefined();
    expect(c.eventLayer.addChild).toHaveBeenCalled();
  });

  it('skips visuals when reducedMotion=true', async () => {
    const c = fakeCtx(true);
    const dispatchSpy = vi.fn();
    const mockWindow = { dispatchEvent: dispatchSpy };
    vi.stubGlobal('window', mockWindow);
    await playWordCommitWave(c, { placements: [{ row: 0, col: 0, letter: 'A', value: 1 }], totalScore: 1 });
    vi.unstubAllGlobals();
    expect(dispatchSpy).toHaveBeenCalled();
    expect(c.eventLayer.addChild).not.toHaveBeenCalled();
  });
});
