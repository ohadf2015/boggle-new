import { describe, expect, it, vi } from 'vitest';
import { playTilePlaceRipple } from '../tilePlaceRipple';

vi.mock('pixi.js', () => ({
  Graphics: class {
    circle = vi.fn().mockReturnThis();
    stroke = vi.fn().mockReturnThis();
    position = { set: vi.fn() };
    alpha = 1;
    scale = { set: vi.fn(), x: 1, y: 1 };
    destroy = vi.fn();
  },
}));
vi.mock('gsap', () => ({
  default: { to: vi.fn((_target, opts) => { setTimeout(() => opts.onComplete?.(), 0); return { kill: vi.fn() }; }) },
}));

const ctx = (rm = false) => ({
  eventLayer: { addChild: vi.fn(), removeChildren: vi.fn() } as any,
  ambientLayer: {} as any,
  app: {} as any,
  coords: {
    cellRect: vi.fn(() => ({
      x: 100,
      y: 100,
      width: 30,
      height: 30,
      top: 100,
      left: 100,
      bottom: 130,
      right: 130,
      toJSON: () => ({}),
    } as DOMRect)),
  } as any,
  reducedMotion: rm,
});

describe('playTilePlaceRipple', () => {
  it('resolves without throwing for a valid cell', async () => {
    await expect(playTilePlaceRipple(ctx(), { row: 5, col: 5 })).resolves.toBeUndefined();
  });
  it('short-circuits to instant resolve when reducedMotion=true', async () => {
    const c = ctx(true);
    await expect(playTilePlaceRipple(c, { row: 5, col: 5 })).resolves.toBeUndefined();
    expect(c.eventLayer.addChild).not.toHaveBeenCalled();
  });
});
