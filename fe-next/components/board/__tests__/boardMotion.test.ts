import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { playSubmitMotion, SETTLE_STAGGER_MS, SETTLE_DURATION_MS, INVALID_DURATION_MS } from '../boardMotion';

function tileWithAnimate() {
  const el = document.createElement('div');
  const animate = vi.fn(() => ({ cancel: vi.fn() }));
  Object.defineProperty(el, 'animate', { value: animate, configurable: true });
  return { el, animate };
}

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('playSubmitMotion', () => {
  beforeEach(() => mockReducedMotion(false));
  afterEach(() => vi.restoreAllMocks());

  it('given an accepted word, settles each tile once with a stagger that follows path order', () => {
    const a = tileWithAnimate();
    const b = tileWithAnimate();
    const c = tileWithAnimate();
    playSubmitMotion([a.el, b.el, c.el], 'accepted');
    expect(a.animate).toHaveBeenCalledTimes(1);
    expect(b.animate).toHaveBeenCalledTimes(1);
    expect(c.animate).toHaveBeenCalledTimes(1);
    const delays = [a, b, c].map((t) => t.animate.mock.calls[0][1].delay);
    expect(delays).toEqual([0, SETTLE_STAGGER_MS, SETTLE_STAGGER_MS * 2]);
    expect(a.animate.mock.calls[0][1].duration).toBe(SETTLE_DURATION_MS);
  });

  it('given an accepted word, the settle keyframes lift the tile and return it to rest', () => {
    const a = tileWithAnimate();
    playSubmitMotion([a.el], 'accepted');
    const frames = a.animate.mock.calls[0][0] as Array<{ transform: string }>;
    expect(frames[0].transform).toContain('translateY(0');
    expect(frames.some((f) => f.transform.includes('translateY(-'))).toBe(true);
    expect(frames[frames.length - 1].transform).toContain('translateY(0');
  });

  it('given a rejected word, shakes sideways only with no vertical lift', () => {
    const a = tileWithAnimate();
    playSubmitMotion([a.el], 'rejected');
    expect(a.animate).toHaveBeenCalledTimes(1);
    const [frames, opts] = a.animate.mock.calls[0] as unknown as [Array<{ transform: string }>, { duration: number }];
    expect(opts.duration).toBe(INVALID_DURATION_MS);
    expect(frames.every((f) => !f.transform.includes('translateY(-'))).toBe(true);
    expect(frames.some((f) => f.transform.includes('translateX(-'))).toBe(true);
  });

  it('given a duplicate word, uses the same gentle shake as a rejected word', () => {
    const a = tileWithAnimate();
    playSubmitMotion([a.el], 'duplicate');
    const frames = a.animate.mock.calls[0][0] as Array<{ transform: string }>;
    expect(frames.some((f) => f.transform.includes('translateX('))).toBe(true);
  });

  it('given reduced motion, animates nothing', () => {
    mockReducedMotion(true);
    const a = tileWithAnimate();
    playSubmitMotion([a.el], 'accepted');
    expect(a.animate).not.toHaveBeenCalled();
  });

  it('given an element without the Web Animations API, skips it without throwing', () => {
    const plain = document.createElement('div');
    expect(() => playSubmitMotion([plain], 'accepted')).not.toThrow();
  });
});
