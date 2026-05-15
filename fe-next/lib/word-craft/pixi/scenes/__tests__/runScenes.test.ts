import { describe, expect, it, vi } from 'vitest';
import { playCardRevealPop } from '../cardRevealPop';
import { playMultiplierPop } from '../multiplierPop';
import { playTargetHitBurst } from '../targetHitBurst';
import type { SceneCtx } from '../../sceneCtx';

vi.mock('pixi.js', () => ({
  Graphics: class {
    rect = vi.fn().mockReturnThis();
    circle = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    position = { set: vi.fn() };
    scale = { set: vi.fn(), x: 1, y: 1 };
    alpha = 1;
    destroy = vi.fn();
  },
  Text: class {
    anchor = { set: vi.fn() };
    position = { set: vi.fn() };
    scale = { set: vi.fn(), x: 1, y: 1 };
    alpha = 1;
    destroy = vi.fn();
  },
}));
vi.mock('gsap', () => ({
  default: {
    to: vi.fn((_target, opts) => {
      setTimeout(() => opts.onComplete?.(), 0);
      return { kill: vi.fn() };
    }),
  },
}));

const reducedCtx = (): SceneCtx => ({
  app: {
    screen: { width: 320, height: 320 },
    renderer: { width: 320, height: 320 },
  } as SceneCtx['app'],
  ambientLayer: { addChild: vi.fn() } as unknown as SceneCtx['ambientLayer'],
  eventLayer: { addChild: vi.fn() } as unknown as SceneCtx['eventLayer'],
  coords: { cellRect: () => null } as unknown as SceneCtx['coords'],
  reducedMotion: true,
});

describe('run-mode pixi scenes', () => {
  it('cardRevealPop resolves immediately under reduced motion', async () => {
    const ctx = reducedCtx();
    await expect(playCardRevealPop(ctx)).resolves.toBeUndefined();
  });

  it('multiplierPop resolves immediately under reduced motion', async () => {
    const ctx = reducedCtx();
    await expect(playMultiplierPop(ctx, { chips: 10, mult: 3 })).resolves.toBeUndefined();
  });

  it('targetHitBurst resolves immediately under reduced motion', async () => {
    const ctx = reducedCtx();
    await expect(playTargetHitBurst(ctx)).resolves.toBeUndefined();
  });
});
