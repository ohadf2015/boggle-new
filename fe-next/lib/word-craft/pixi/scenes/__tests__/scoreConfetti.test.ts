import { describe, expect, it, vi } from 'vitest';
import { playScoreConfetti } from '../scoreConfetti';

vi.mock('pixi.js', () => ({
  Graphics: class {
    rect = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    position = { set: vi.fn() };
    rotation = 0;
    alpha = 1;
    destroy = vi.fn();
  },
}));
vi.mock('gsap', () => ({
  default: { to: vi.fn((_target, opts) => { setTimeout(() => opts.onComplete?.(), 0); return { kill: vi.fn() }; }) },
}));

const ctx = (rm = false) => ({
  eventLayer: { addChild: vi.fn() } as any,
  app: { renderer: { width: 320, height: 320 } } as any,
  ambientLayer: {} as any,
  coords: {
    cellRect: vi.fn(() => ({
      x: 0,
      y: 0,
      width: 400,
      height: 400,
      top: 0,
      left: 0,
      bottom: 400,
      right: 400,
      toJSON: () => ({}),
    } as DOMRect)),
  } as any,
  reducedMotion: rm,
});

describe('playScoreConfetti', () => {
  it('spawns 60 particles and resolves', async () => {
    const c = ctx();
    await expect(playScoreConfetti(c)).resolves.toBeUndefined();
    expect(c.eventLayer.addChild).toHaveBeenCalledTimes(60);
  });
  it('no-op when reducedMotion=true', async () => {
    const c = ctx(true);
    await playScoreConfetti(c);
    expect(c.eventLayer.addChild).not.toHaveBeenCalled();
  });
});
