/**
 * WorldMap Auto-Scroll Tests
 *
 * The world map renders top=last world, bottom=World 1, and auto-scrolls to the
 * bottom on mount so the player starts at World 1. It MUST do this by scrolling
 * its own overflow container — never via Element.scrollIntoView, which scrolls
 * every scrollable ancestor including the document and drags the whole page down
 * to the footer (the "page opens at the footer" bug).
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import WorldMap from '../WorldMap';

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

vi.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => false,
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

const completions = [{ world: 1, level: 1, stars: 3 }];

describe('WorldMap auto-scroll (must not scroll the window)', () => {
  let scrollIntoViewSpy: ReturnType<typeof vi.fn>;
  let scrollToSpy: ReturnType<typeof vi.fn>;
  let scrollBySpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    scrollIntoViewSpy = vi.fn();
    scrollToSpy = vi.fn();
    scrollBySpy = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', { value: scrollIntoViewSpy, writable: true, configurable: true });
    Object.defineProperty(Element.prototype, 'scrollTo', { value: scrollToSpy, writable: true, configurable: true });
    Object.defineProperty(Element.prototype, 'scrollBy', { value: scrollBySpy, writable: true, configurable: true });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('scrolls its own container to the bottom on mount, never via Element.scrollIntoView', () => {
    render(
      <WorldMap
        totalStars={3}
        completions={completions}
        onWorldSelect={vi.fn()}
      />
    );

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // The container is present
    expect(screen.getByTestId('world-map')).toBeInTheDocument();
    // It must NOT use scrollIntoView (bubbles to the document → page lands at footer)
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
    // It scrolls the container itself to the bottom
    expect(scrollToSpy).toHaveBeenCalled();
  });
});
