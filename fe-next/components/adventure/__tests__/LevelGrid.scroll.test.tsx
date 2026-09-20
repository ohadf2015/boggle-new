/**
 * LevelGrid Scroll and Parallax Tests
 *
 * Tests that the level grid is scrollable and has proper parallax depth layering.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import LevelGrid from '../LevelGrid';
import type { WorldConfig } from '@/lib/adventure';

// ==============================================
// MOCKS
// ==============================================

vi.mock('framer-motion', () => {
  const React = require('react');

  const createMockMotion = (element: string) => {
    const MockComponent = React.forwardRef(
      ({ children, variants, initial, animate, whileHover, whileTap, ...props }: any, ref: any) =>
        React.createElement(element, { ...props, ref }, children)
    );
    MockComponent.displayName = `MockMotion${element.charAt(0).toUpperCase() + element.slice(1)}`;
    return MockComponent;
  };

  // Mock useMotionValue with get/set methods
  const useMotionValue = (initial: any) => ({
    get: () => initial,
    set: vi.fn(),
    onChange: vi.fn(),
    current: initial,
  });

  // Mock useTransform
  const useTransform = (...args: any[]) => ({
    get: () => 0,
    set: vi.fn(),
    onChange: vi.fn(),
    current: 0,
  });

  // Mock useSpring
  const useSpring = (initial: any) => ({
    get: () => initial,
    set: vi.fn(),
    onChange: vi.fn(),
    current: initial,
  });

  return {
    m: {
      div: createMockMotion('div'),
      button: createMockMotion('button'),
      h2: createMockMotion('h2'),
      p: createMockMotion('p'),
    },
    AnimatePresence: ({ children }: any) => children,
    useMotionValue,
    useTransform,
    useSpring,
  };
});

vi.mock('next/image', () => {
  const MockImage = ({ src, alt, ...props }: any) => {
    return React.createElement('img', { src, alt, ...props });
  };
  MockImage.displayName = 'MockImage';
  return { __esModule: true, default: MockImage };
});

// Mock useParallax hook
const mockMotionValue = (v: number) => ({ get: () => v, set: () => {}, on: () => () => {} });
vi.mock('@/hooks/useParallax', () => ({
  useParallax: () => ({
    x: mockMotionValue(10),
    y: mockMotionValue(10),
    isGyroActive: false,
  }),
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
    locale: 'en',
  }),
}));

// ==============================================
// TEST FIXTURES
// ==============================================

const mockWorld: WorldConfig = {
  id: 1,
  name: 'alphabetMeadows',
  theme: 'sunny-pastoral',
  mechanic: null,
  bossName: 'msGrammar',
  colorPrimary: 'neo-lime',
  colorSecondary: 'neo-lime-light',
  description: 'worldDescAlphabetMeadows',
};

const mockCompletions = [
  { world: 1, level: 1, stars: 3 },
  { world: 1, level: 2, stars: 2 },
  { world: 1, level: 3, stars: 1 },
];

// ==============================================
// TESTS
// ==============================================

describe('LevelGrid Scroll Behavior', () => {
  describe('Scrollability', () => {
    it('should have overflow-y-auto on the scrollable content layer', () => {
      // GIVEN / WHEN
      render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={6}
          onLevelSelect={vi.fn()}
        />
      );

      // THEN - the scroll container is a child of level-grid (not level-grid itself)
      // This separation prevents fixed-inside-overflow bugs on mobile
      const levelGrid = screen.getByTestId('level-grid');
      const scrollLayer = levelGrid.querySelector('.overflow-y-auto');

      expect(scrollLayer).toBeInTheDocument();
      expect(scrollLayer?.className).not.toMatch(/overflow-hidden/);
    });

    it('should have proper height constraint to enable scroll', () => {
      // GIVEN / WHEN
      render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={6}
          onLevelSelect={vi.fn()}
        />
      );

      // THEN
      const levelGrid = screen.getByTestId('level-grid');

      // Should have h-full to take parent's height, not min-h-full which expands
      expect(levelGrid.className).toMatch(/h-full/);
    });
  });

  describe('Parallax Depth Layers', () => {
    it('should have parallax background layers with proper z-index stacking', () => {
      // GIVEN / WHEN
      const { container } = render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={6}
          onLevelSelect={vi.fn()}
        />
      );

      // THEN - check for parallax layers
      // Background layers should use 'absolute' positioning instead of 'fixed'
      // to stay within the scrollable container
      const levelGrid = screen.getByTestId('level-grid');

      // Find parallax layers by checking for transform styles
      const parallaxLayers = container.querySelectorAll('[style*="transform"]');
      expect(parallaxLayers.length).toBeGreaterThan(0);

      // Main content should have z-10 or higher to be above parallax layers
      const mainContent = levelGrid.querySelector('.z-10');
      expect(mainContent).toBeInTheDocument();
    });

    it('should have background parallax layers that move at different speeds', () => {
      // GIVEN / WHEN
      const { container } = render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={6}
          onLevelSelect={vi.fn()}
        />
      );

      // THEN - parallax layers use CSS custom properties (--parallax-depth) for GPU-driven transforms
      // instead of inline JS transforms, avoiding React re-renders on every animation frame
      const cssParallaxLayers = container.querySelectorAll('.level-grid-parallax-css, .level-grid-parallax-css-scaled');
      expect(cssParallaxLayers.length).toBeGreaterThanOrEqual(2);

      // Each layer should have a different --parallax-depth value for varied speeds
      const depths = Array.from(cssParallaxLayers).map(el =>
        (el as HTMLElement).style.getPropertyValue('--parallax-depth')
      );
      const uniqueDepths = new Set(depths);
      expect(uniqueDepths.size).toBeGreaterThanOrEqual(2);
    });

    it('should have parallax layers in an absolute container separate from scroll layer', () => {
      // GIVEN / WHEN
      render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={6}
          onLevelSelect={vi.fn()}
        />
      );

      // THEN
      const levelGrid = screen.getByTestId('level-grid');

      // Background uses absolute (not fixed) to avoid fixed-inside-overflow bugs
      // The background and scroll layer are siblings, not nested
      const bgContainer = levelGrid.querySelector(':scope > .absolute');
      expect(bgContainer).toBeInTheDocument();
      expect(bgContainer?.className).toContain('overflow-hidden');
      expect(bgContainer?.className).toContain('pointer-events-none');

      // Parallax layers inside the background container
      const absoluteLayers = bgContainer?.querySelectorAll('.absolute');
      expect(absoluteLayers?.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Auto-scroll to current level (must not scroll the window)', () => {
    let scrollIntoViewSpy: ReturnType<typeof vi.fn>;
    let scrollBySpy: ReturnType<typeof vi.fn>;
    let scrollToSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.useFakeTimers();
      scrollIntoViewSpy = vi.fn();
      scrollBySpy = vi.fn();
      scrollToSpy = vi.fn();
      Object.defineProperty(Element.prototype, 'scrollIntoView', { value: scrollIntoViewSpy, writable: true, configurable: true });
      Object.defineProperty(Element.prototype, 'scrollBy', { value: scrollBySpy, writable: true, configurable: true });
      Object.defineProperty(Element.prototype, 'scrollTo', { value: scrollToSpy, writable: true, configurable: true });
    });

    afterEach(() => {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    });

    it('scrolls the inner scroll container, never calling Element.scrollIntoView (which bubbles to the window)', () => {
      // GIVEN a world with a current (first unlocked, 0-star) level below the fold
      render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={6}
          onLevelSelect={vi.fn()}
        />
      );

      // WHEN the mount auto-scroll timer fires
      act(() => {
        vi.advanceTimersByTime(700);
      });

      // THEN it must NOT use scrollIntoView — that scrolls every ancestor incl. the
      // document, dragging the page down to the footer.
      expect(scrollIntoViewSpy).not.toHaveBeenCalled();
      // AND it scrolls the container itself (scrollBy keeps movement inside the panel).
      expect(scrollBySpy).toHaveBeenCalled();
    });
  });

  describe('Auto-scroll when the page owns the scroll (phone layout)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      Object.defineProperty(Element.prototype, 'scrollIntoView', { value: vi.fn(), writable: true, configurable: true });
      Object.defineProperty(Element.prototype, 'scrollBy', { value: vi.fn(), writable: true, configurable: true });
    });
    afterEach(() => {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    });

    it('Given the current node is below the fold and the panel does not overflow, When mounted, Then the window scrolls just enough to center it', () => {
      const winScroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
      const rectSpy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
        const isNode = (this as HTMLElement).dataset?.testid?.startsWith('level-card-');
        return { top: isNode ? 1200 : 0, bottom: isNode ? 1280 : 0, height: isNode ? 80 : 0, left: 0, right: 0, width: 80, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
      });
      render(<LevelGrid world={mockWorld} completions={mockCompletions} totalStars={6} onLevelSelect={vi.fn()} />);
      act(() => { vi.advanceTimersByTime(700); });
      expect(winScroll).toHaveBeenCalledTimes(1);
      const arg = winScroll.mock.calls[0][0] as ScrollToOptions;
      expect(arg.top).toBe(1200 - (window.innerHeight - 80) / 2);
      rectSpy.mockRestore();
      winScroll.mockRestore();
    });
  });

  describe('Level Grid Content', () => {
    it('should render all 7 levels for the world', () => {
      // GIVEN / WHEN
      render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={6}
          onLevelSelect={vi.fn()}
        />
      );

      // THEN - 7 levels per world (LEVELS_PER_WORLD constant)
      for (let i = 1; i <= 7; i++) {
        expect(screen.getByTestId(`level-card-${i}`)).toBeInTheDocument();
      }
    });

    it('should have scrollable content when many levels are present', () => {
      // GIVEN / WHEN
      const { container } = render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={6}
          onLevelSelect={vi.fn()}
        />
      );

      // THEN - scrollbar styling is on the scroll layer child
      const levelGrid = screen.getByTestId('level-grid');
      const scrollLayer = levelGrid.querySelector('.overflow-y-auto');

      expect(scrollLayer).toBeInTheDocument();
      expect(scrollLayer?.className).toContain('scrollbar');
    });
  });
});
