// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import type { BlastTileType } from '../types';
import { createJellyClearTween, JELLY_CLEAR_DURATION_MS } from '../effects/blastGsapTimelines';

// Save the real matchMedia at module-load so per-test mutations restore cleanly
// and don't leak into subsequent test files (happy-dom shares globals across files).
const ORIG_MATCHMEDIA = typeof window !== 'undefined' ? window.matchMedia : undefined;

const ALL_TYPES: BlastTileType[] = [
  'standard', 'gold', 'bomb', 'lightning', 'prism', 'rainbow', 'ice',
  'gem', 'frozen', 'magnet', 'diamond', 'countdown', 'shuffle', 'magma',
  'portal', 'catalyst', 'crystal', 'fuse', 'locked', 'key', 'anchor',
];

describe('createJellyClearTween', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    if (ORIG_MATCHMEDIA) window.matchMedia = ORIG_MATCHMEDIA;
  });

  it.each(ALL_TYPES)('returns a non-null timeline for %s with positive duration', (type) => {
    const el = document.createElement('div');
    const tl = createJellyClearTween(el, type);
    expect(tl).not.toBeNull();
    expect(JELLY_CLEAR_DURATION_MS[type]).toBeGreaterThan(0);
    tl?.kill();
  });

  it('reduced-motion shortens duration to <= base / 3', () => {
    window.matchMedia = vi.fn((q: string) => ({
      matches: q.includes('reduced'),
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as MediaQueryList)) as typeof window.matchMedia;

    const el = document.createElement('div');
    const tl = createJellyClearTween(el, 'bomb');
    expect(tl?.duration() ?? 0).toBeLessThanOrEqual(JELLY_CLEAR_DURATION_MS.bomb / 3 / 1000 + 0.01);
    tl?.kill();
  });
});

describe('spawnTypedBurst', () => {
  it('returns 0 particles under reduced-motion', async () => {
    window.matchMedia = vi.fn((q: string) => ({
      matches: q.includes('reduced'),
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as MediaQueryList)) as typeof window.matchMedia;

    const { spawnTypedBurst } = await import('../effects/blastJuiceKit');
    const stage = { addChild: vi.fn() } as unknown as Parameters<typeof spawnTypedBurst>[0];
    const handle = spawnTypedBurst(stage, 'bomb', 100, 100, 1);
    expect(handle.particleCount).toBe(0);
    expect(handle.hasShockwave).toBe(false);
  });

  it('spawns 8 particles for combo 1, 16 + shockwave for combo >= 3', async () => {
    window.matchMedia = vi.fn(() => ({
      matches: false, addEventListener: () => {}, removeEventListener: () => {},
    } as unknown as MediaQueryList)) as typeof window.matchMedia;

    const { spawnTypedBurst } = await import('../effects/blastJuiceKit');
    const stage = { addChild: vi.fn() } as unknown as Parameters<typeof spawnTypedBurst>[0];
    const solo = spawnTypedBurst(stage, 'bomb', 0, 0, 1);
    expect(solo.particleCount).toBe(8);
    expect(solo.hasShockwave).toBe(false);

    const combo = spawnTypedBurst(stage, 'bomb', 0, 0, 3);
    expect(combo.particleCount).toBe(16);
    expect(combo.hasShockwave).toBe(true);
  });
});
