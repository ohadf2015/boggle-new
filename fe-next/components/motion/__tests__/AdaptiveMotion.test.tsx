/**
 * AdaptiveMotion skip-path contract.
 *
 * When useSkipAnimations() is true (cosy mode, low-end device, app reduced-motion)
 * AdaptiveMotion renders a static element instead of a framer-motion one. Two
 * historical defects on that path:
 *   1. onAnimationComplete was DROPPED — components that dismiss/remove themselves
 *      via that callback (combo flash, score flies, floating coins) hung forever.
 *   2. onAnimationComplete leaked onto the real DOM element → React
 *      "Unknown event handler property `onAnimationComplete`" warning.
 *
 * Contract: the skip path must fire onAnimationComplete exactly once on mount
 * ("animation completed instantly") and must NOT pass framer-only handlers to the
 * DOM element.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// Force the skip decision deterministically without depending on jsdom matchMedia
// or device heuristics; SkipAnimationsProvider still drives the actual skip flag.
vi.mock('@/contexts/AccessibilityContext', () => ({ useShouldReduceMotion: () => false }));
vi.mock('@/components/grid/performanceUtils', () => ({
  getPerformanceConfig: () => ({ isLowEnd: false, enableComplexAnimations: true }),
}));

import { AdaptiveMotion, SkipAnimationsProvider } from '../AdaptiveMotion';

describe('AdaptiveMotion skip path', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fires onAnimationComplete exactly once on mount when animations are skipped', () => {
    const onComplete = vi.fn();
    render(
      <SkipAnimationsProvider skip>
        <AdaptiveMotion.div onAnimationComplete={onComplete} data-testid="el">hi</AdaptiveMotion.div>
      </SkipAnimationsProvider>,
    );
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not leak framer onAnimationComplete onto the DOM element when skipping', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <SkipAnimationsProvider skip>
        <AdaptiveMotion.div onAnimationComplete={() => {}} data-testid="el2">x</AdaptiveMotion.div>
      </SkipAnimationsProvider>,
    );
    const leaked = errSpy.mock.calls.some((c) =>
      /onAnimationComplete|unknown event handler|does not recognize/i.test(String(c[0])),
    );
    expect(leaked).toBe(false);
    errSpy.mockRestore();
  });

  it('still renders the underlying element with its children and props when skipping', () => {
    const { getByTestId } = render(
      <SkipAnimationsProvider skip>
        <AdaptiveMotion.div data-testid="el3" className="foo">content</AdaptiveMotion.div>
      </SkipAnimationsProvider>,
    );
    const el = getByTestId('el3');
    expect(el.className).toContain('foo');
    expect(el.textContent).toBe('content');
  });
});
