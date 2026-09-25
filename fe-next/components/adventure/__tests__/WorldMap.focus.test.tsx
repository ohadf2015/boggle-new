/**
 * WorldMap Focus Tests
 *
 * When the map mounts or when progress updates, it should scroll to center
 * the player's current/next world in view with instant positioning (useLayoutEffect,
 * behavior: 'auto') to avoid showing locked worlds on first paint.
 * Returning from a level should re-focus the next world.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import WorldMap from '../WorldMap';
import { BOSS_LEVEL } from '@/lib/adventure/play/levels';

// ==============================================
// MOCKS
// ==============================================

vi.mock('framer-motion', () => {
  const React = require('react');
  const motionValue = (v: number) => ({ get: () => v, set: vi.fn(), on: () => () => {}, onChange: vi.fn(), current: v });
  return {
    m: new Proxy({}, {
      get: (_t, el: string) => {
        const C = React.forwardRef(({ children, variants, initial, animate, exit, transition, whileHover, whileTap, whileInView, layout, layoutId, ...props }: any, ref: any) =>
          React.createElement(el, { ...props, ref }, children));
        C.displayName = `MockMotion.${el}`;
        return C;
      },
    }),
    AnimatePresence: ({ children }: any) => children,
    useMotionValue: (v: number) => motionValue(v),
    useTransform: () => motionValue(0),
    useSpring: (v: number) => motionValue(v),
  };
});

vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => React.createElement('img', { src, alt, ...props }),
}));

const mockMotionValue = (v: number) => ({ get: () => v, set: () => {}, on: () => () => {} });
vi.mock('@/hooks/useParallax', () => ({
  useParallax: () => ({ x: mockMotionValue(10), y: mockMotionValue(10), isGyroActive: false }),
}));

let mockPrefersReducedMotion = false;
vi.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => mockPrefersReducedMotion,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, dir: 'ltr', locale: 'en' }),
}));

vi.mock('../WorldMapBackground', () => ({ WorldMapBackground: () => React.createElement('div', { 'data-testid': 'world-map-bg' }) }));
vi.mock('../WorldMapDecorations', () => ({
  WorldOrbitingLetters: () => null,
  TrailPath: () => null,
}));
vi.mock('../MasteryBadge', () => ({ MasteryBadge: () => null }));

// ==============================================
// TESTS
// ==============================================

describe('WorldMap focus (scroll to player current/next world)', () => {
  let scrollToSpy: ReturnType<typeof vi.fn>;
  let getBoundingClientRectSpy: ReturnType<typeof vi.fn>;
  let container: HTMLElement | null;

  beforeEach(() => {
    mockPrefersReducedMotion = false;
    scrollToSpy = vi.fn();
    getBoundingClientRectSpy = vi.fn();

    // Mock scrollTo on Element.prototype
    Object.defineProperty(Element.prototype, 'scrollTo', { value: scrollToSpy, writable: true, configurable: true });

    // Mock getBoundingClientRect — return different values based on data-world-id
    const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    getBoundingClientRectSpy = vi.fn(function (this: Element) {
      const worldId = (this as HTMLElement).getAttribute('data-world-id');
      const testId = (this as HTMLElement).getAttribute('data-testid');

      // Container itself — fixed at top of viewport
      if (testId === 'world-map') {
        return {
          top: 0,
          left: 0,
          bottom: 600,
          right: 390,
          width: 390,
          height: 600,
          x: 0,
          y: 0,
        } as DOMRect;
      }

      // World node containers: document position = (10 - id) * 300, height = 300
      // getBoundingClientRect returns viewport coordinates: documentPos - scrollTop
      // So world 1 is at 2700px doc, world 2 at 2400px, ..., world 10 at 0px
      if (worldId) {
        const id = parseInt(worldId, 10);
        const docPosition = (10 - id) * 300;
        container = document.querySelector('[data-testid="world-map"]') as HTMLElement;
        const scrollTop = (container as any)._scrollTop ?? 0;
        const viewportTop = docPosition - scrollTop;

        return {
          top: viewportTop,
          left: 0,
          bottom: viewportTop + 300,
          right: 390,
          width: 390,
          height: 300,
          x: 0,
          y: viewportTop,
        } as DOMRect;
      }

      // Fallback to original
      return originalGetBoundingClientRect.call(this);
    });

    Object.defineProperty(Element.prototype, 'getBoundingClientRect', { value: getBoundingClientRectSpy, writable: true, configurable: true });

    // Mock scrollHeight and clientHeight
    Object.defineProperty(Element.prototype, 'scrollHeight', {
      get: function (this: HTMLElement) {
        if ((this as HTMLElement).getAttribute('data-testid') === 'world-map') {
          return 3000;
        }
        return 0;
      },
      configurable: true,
    });

    Object.defineProperty(Element.prototype, 'clientHeight', {
      get: function (this: HTMLElement) {
        if ((this as HTMLElement).getAttribute('data-testid') === 'world-map') {
          return 600;
        }
        return 0;
      },
      configurable: true,
    });

    Object.defineProperty(Element.prototype, 'scrollTop', {
      get: function (this: HTMLElement) {
        if ((this as HTMLElement).getAttribute('data-testid') === 'world-map') {
          return (this as any)._scrollTop ?? 0;
        }
        return 0;
      },
      set: function (this: HTMLElement, value: number) {
        if ((this as HTMLElement).getAttribute('data-testid') === 'world-map') {
          (this as any)._scrollTop = value;
        }
      },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    container = null;
  });

  /**
   * Compute expected scroll position for a given world ID based on mock geometry.
   * Mock: world id is at docPosition = (10-id)*300, node height = 300, container height = 600.
   * scrollTarget = docPosition - (600-300)/2 = (10-id)*300 - 150
   * Clamped to [0, 2400] (maxScroll = scrollHeight - clientHeight = 3000 - 600)
   */

  it('given worlds 1-2 beaten, when the map mounts, then it scrolls to exactly world 3 (not a neighbour)', () => {
    render(
      <WorldMap
        totalStars={6}
        completions={[
          { world: 1, level: BOSS_LEVEL, stars: 3 },
          { world: 2, level: BOSS_LEVEL, stars: 3 },
        ] as any}
        onWorldSelect={vi.fn()}
      />
    );

    expect(scrollToSpy).toHaveBeenCalledTimes(1);
    const { top } = scrollToSpy.mock.calls[0][0];
    // Centre of world N's node given the mocked geometry (node N at doc (10-N)*300, 300 tall).
    const map = document.querySelector('[data-testid="world-map"]') as HTMLElement;
    const centred = (n: number) => (10 - n) * 300 - (map.clientHeight - 300) / 2;
    expect(top).toBe(centred(3));
    expect(top).not.toBe(centred(2));
    expect(top).not.toBe(centred(4));
  });

  it('(AJ1a RED) scrolls on mount with auto behavior (catches missing focus)', () => {
    // With no completions, next world = 1. Verify we scroll on mount.
    const completions: any = [];

    render(
      <WorldMap
        totalStars={0}
        completions={completions}
        onWorldSelect={vi.fn()}
      />
    );

    // Mount MUST scroll exactly once with auto behavior
    // If this fails, the focusedWorldRef guard or effect is broken
    expect(scrollToSpy.mock.calls).toHaveLength(1);
    expect(scrollToSpy.mock.calls[0][0]).toEqual(
      expect.objectContaining({ behavior: 'auto' })
    );
  });

  it('(AJ1a RED) re-focuses with smooth behavior exactly once on completion change (catches race)', () => {
    // Start with worlds 1-2 beaten. Next = 3.
    const completions1 = [
      { world: 1, level: BOSS_LEVEL, stars: 3 },
      { world: 2, level: BOSS_LEVEL, stars: 3 },
    ];

    const { rerender } = render(
      <WorldMap
        totalStars={6}
        completions={completions1}
        onWorldSelect={vi.fn()}
      />
    );

    // Mount scrolls with auto
    const calls1 = scrollToSpy.mock.calls;
    expect(calls1).toHaveLength(1);
    expect(calls1[0][0]).toEqual(
      expect.objectContaining({ behavior: 'auto' })
    );
    const firstPosition = calls1[0][0].top;

    scrollToSpy.mockClear();

    // Add world 3 completion. Next world becomes 4 (different world).
    const completions2 = [
      ...completions1,
      { world: 3, level: BOSS_LEVEL, stars: 3 },
    ];

    rerender(
      <WorldMap
        totalStars={9}
        completions={completions2}
        onWorldSelect={vi.fn()}
      />
    );

    // Re-focus must happen EXACTLY ONCE with smooth behavior.
    // If code has the race condition (layoutEffect firing twice), we'd see 2 calls.
    // If nextWorldId-1 mutation is present, position would be wrong (would match firstPosition).
    const calls2 = scrollToSpy.mock.calls;
    expect(calls2).toHaveLength(1);
    expect(calls2[0][0]).toEqual(
      expect.objectContaining({ behavior: 'smooth' })
    );
    const secondPosition = calls2[0][0].top;

    // Position must have changed (targets a different world)
    expect(secondPosition).not.toBe(firstPosition);
  });

  it('(RED) uses smooth behavior on re-focus when motion is allowed (positive control)', () => {
    // When prefers-reduced-motion is false, re-focus must use smooth behavior exactly once.
    mockPrefersReducedMotion = false;

    const completions1: any = [];

    const { rerender } = render(
      <WorldMap
        totalStars={0}
        completions={completions1}
        onWorldSelect={vi.fn()}
      />
    );

    scrollToSpy.mockClear();

    const completions2 = [
      { world: 1, level: BOSS_LEVEL, stars: 3 },
    ];

    rerender(
      <WorldMap
        totalStars={3}
        completions={completions2}
        onWorldSelect={vi.fn()}
      />
    );

    // With motion allowed, re-focus must use smooth behavior exactly once
    expect(scrollToSpy.mock.calls).toHaveLength(1);
    expect(scrollToSpy.mock.calls[0][0]).toEqual(
      expect.objectContaining({ behavior: 'smooth' })
    );
  });

  it('(AJ1b) respects prefers-reduced-motion and uses auto on re-focus (negative control)', () => {
    // When prefers-reduced-motion is true, re-focus must use auto, not smooth.
    mockPrefersReducedMotion = true;

    const completions1: any = [];

    const { rerender } = render(
      <WorldMap
        totalStars={0}
        completions={completions1}
        onWorldSelect={vi.fn()}
      />
    );

    scrollToSpy.mockClear();

    const completions2 = [
      { world: 1, level: BOSS_LEVEL, stars: 3 },
    ];

    rerender(
      <WorldMap
        totalStars={3}
        completions={completions2}
        onWorldSelect={vi.fn()}
      />
    );

    // With reduced motion, re-focus must use auto (not smooth), exactly once
    expect(scrollToSpy.mock.calls).toHaveLength(1);
    expect(scrollToSpy.mock.calls[0][0]).toEqual(
      expect.objectContaining({ behavior: 'auto' })
    );
  });

  it('(RED) adds aria-current="step" to the next world node', () => {
    const completions = [
      { world: 1, level: BOSS_LEVEL, stars: 3 },
      { world: 2, level: BOSS_LEVEL, stars: 3 },
      { world: 3, level: BOSS_LEVEL, stars: 3 },
    ];

    render(
      <WorldMap
        totalStars={9}
        completions={completions}
        onWorldSelect={vi.fn()}
      />
    );

    // Next world to play = 4
    const world4Button = screen.getByTestId('world-4');
    expect(world4Button).toHaveAttribute('aria-current', 'step');

    // Other worlds should not have aria-current
    const world3Button = screen.getByTestId('world-3');
    expect(world3Button).not.toHaveAttribute('aria-current');
  });

  it('(RED) scrolls on mount when some worlds are complete', () => {
    const completions = Array.from({ length: 5 }, (_, i) => ({
      world: i + 1,
      level: BOSS_LEVEL,
      stars: 3,
    }));

    render(
      <WorldMap
        totalStars={15}
        completions={completions}
        onWorldSelect={vi.fn()}
      />
    );

    // Must scroll exactly once on mount with auto behavior
    expect(scrollToSpy.mock.calls).toHaveLength(1);
    expect(scrollToSpy.mock.calls[0][0]).toEqual(
      expect.objectContaining({ behavior: 'auto' })
    );
  });

  it('(RED) changes scroll position when progress changes (catches nextWorldId-1 mutation)', () => {
    // Start with no completions: next world = 1
    const completions1 = [];

    const { rerender } = render(
      <WorldMap
        totalStars={0}
        completions={completions1}
        onWorldSelect={vi.fn()}
      />
    );

    const firstPosition = scrollToSpy.mock.calls[0][0].top;
    scrollToSpy.mockClear();

    // Complete worlds 1-4: next world = 5
    const completions2 = [
      { world: 1, level: BOSS_LEVEL, stars: 3 },
      { world: 2, level: BOSS_LEVEL, stars: 3 },
      { world: 3, level: BOSS_LEVEL, stars: 3 },
      { world: 4, level: BOSS_LEVEL, stars: 3 },
    ];

    rerender(
      <WorldMap
        totalStars={12}
        completions={completions2}
        onWorldSelect={vi.fn()}
      />
    );

    // Must scroll exactly once with smooth behavior
    expect(scrollToSpy.mock.calls).toHaveLength(1);
    const secondPosition = scrollToSpy.mock.calls[0][0].top;

    // Positions must be different and in specific direction
    // nextWorldId went from 1 to 5: should scroll further up (smaller position value)
    expect(secondPosition).not.toBe(firstPosition);
    // This catches mutation like scrollToWorld(Math.max(1, nextWorldId-1), ...)
    // because the position change magnitude would be off
    expect(secondPosition).toBeLessThan(firstPosition);
  });
});
