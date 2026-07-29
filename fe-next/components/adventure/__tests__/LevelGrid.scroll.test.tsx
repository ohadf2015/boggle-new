/**
 * LevelGrid Scroll and Parallax Tests
 *
 * Tests that the level grid is scrollable and has proper parallax depth layering.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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
