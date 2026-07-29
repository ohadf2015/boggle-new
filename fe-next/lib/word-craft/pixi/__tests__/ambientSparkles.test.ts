import { describe, expect, it, vi } from 'vitest';
import { mountAmbientSparkles } from '../ambientSparkles';

vi.mock('pixi.js', () => ({
  Container: class { children: any[] = []; addChild(c: any) { this.children.push(c); } destroy = vi.fn(); },
  Graphics: class {
    circle = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    position = { set: vi.fn() };
    alpha = 1;
    destroy = vi.fn();
  },
}));

vi.mock('gsap', () => ({
  default: { to: vi.fn(() => ({ kill: vi.fn() })), killTweensOf: vi.fn() },
}));

const fakeCtx = (rm = false) => ({
  app: { stage: {} } as any,
  ambientLayer: { addChild: vi.fn(), children: [], removeChildren: vi.fn() } as any,
  eventLayer: {} as any,
  coords: {
    cellRect: vi.fn((r: number, c: number) => ({
      x: c * 40,
      y: r * 40,
      width: 40,
      height: 40,
      top: r * 40,
      left: c * 40,
      bottom: 0,
      right: 0,
      toJSON: () => ({}),
    } as DOMRect)),
    scoreChipRect: vi.fn(),
    bagRect: vi.fn(),
    subscribe: vi.fn(() => () => {}),
  } as any,
  reducedMotion: rm,
});

describe('mountAmbientSparkles', () => {
  it('mounts one sparkle per premium cell', () => {
    const ctx = fakeCtx();
    const cells = [
      { row: 0, col: 0, kind: 'TW' as const },
      { row: 0, col: 10, kind: 'TW' as const },
      { row: 5, col: 1, kind: 'TL' as const },
    ];
    const handle = mountAmbientSparkles(ctx, cells);
    expect(ctx.ambientLayer.addChild).toHaveBeenCalledTimes(3);
    handle.destroy();
  });

  it('no-op when reducedMotion=true', () => {
    const ctx = fakeCtx(true);
    const handle = mountAmbientSparkles(ctx, [{ row: 0, col: 0, kind: 'TW' as const }]);
    expect(ctx.ambientLayer.addChild).not.toHaveBeenCalled();
    handle.destroy();
  });
});
