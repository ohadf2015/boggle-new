import { describe, expect, it, vi } from 'vitest';
import { playBotMoveReveal } from '../botMoveReveal';

vi.mock('pixi.js', () => ({
  Graphics: class {
    rect = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    position = { set: vi.fn() };
    alpha = 1;
    scale = { set: vi.fn() };
    destroy = vi.fn();
  },
}));
vi.mock('gsap', () => ({
  default: { to: vi.fn((_target, opts) => { setTimeout(() => opts.onComplete?.(), 0); return { kill: vi.fn() }; }) },
}));

const fake = (rm = false) => ({
  app: {} as any,
  ambientLayer: {} as any,
  eventLayer: { addChild: vi.fn() } as any,
  coords: {
    cellRect: vi.fn(() => ({
      x: 0,
      y: 0,
      width: 30,
      height: 30,
      top: 0,
      left: 0,
      bottom: 30,
      right: 30,
      toJSON: () => ({}),
    } as DOMRect)),
  } as any,
  reducedMotion: rm,
});

describe('playBotMoveReveal', () => {
  it('reveals 3 tiles with stagger and resolves', async () => {
    const c = fake();
    await expect(
      playBotMoveReveal(c, [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }]),
    ).resolves.toBeUndefined();
    expect(c.eventLayer.addChild).toHaveBeenCalledTimes(3);
  });
  it('dispatches per-tile reveal events even with RM', async () => {
    const events: string[] = [];
    const listener = (e: any) => events.push(`${e.detail.row},${e.detail.col}`);
    const mockWindow = {
      dispatchEvent: vi.fn((e: any) => {
        if (e.type === 'wordcraft:bot-tile-revealed') {
          listener(e);
        }
      }),
    };
    vi.stubGlobal('window', mockWindow);
    const c = fake(true);
    await playBotMoveReveal(c, [{ row: 1, col: 1 }, { row: 1, col: 2 }]);
    vi.unstubAllGlobals();
    expect(events).toEqual(['1,1', '1,2']);
  });
});
