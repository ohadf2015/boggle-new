// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createCascadeDropTween } from '../effects/blastGsapTimelines';

const ORIG_MATCHMEDIA = typeof window !== 'undefined' ? window.matchMedia : undefined;

describe('createCascadeDropTween', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    if (ORIG_MATCHMEDIA) window.matchMedia = ORIG_MATCHMEDIA;
  });

  it('staggers via columnIndex (delay = columnIndex * 0.04)', () => {
    const el = document.createElement('div');
    const tl = createCascadeDropTween(el, { fromY: -200, columnIndex: 3 });
    expect(tl.delay()).toBeCloseTo(0.12, 2);
    tl.kill();
  });

  it('uses bounce.out for the position tween', () => {
    const el = document.createElement('div');
    const tl = createCascadeDropTween(el, { fromY: -200, columnIndex: 0 });
    const yChild = tl.getChildren().find((c) => {
      const v = c.vars as Record<string, unknown>;
      return v.y !== undefined || v.fromVars !== undefined;
    });
    const ease = (yChild?.vars as Record<string, unknown> | undefined)?.ease;
    expect(typeof ease === 'string' ? ease : (ease as { name?: string } | undefined)?.name).toBe('bounce.out');
    tl.kill();
  });

  it('reduced-motion snaps to final position (duration ~0)', () => {
    window.matchMedia = vi.fn((q: string) => ({
      matches: q.includes('reduced'),
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as MediaQueryList)) as typeof window.matchMedia;

    const el = document.createElement('div');
    const tl = createCascadeDropTween(el, { fromY: -200, columnIndex: 0 });
    expect(tl.duration()).toBeLessThan(0.05);
    tl.kill();
  });
});
