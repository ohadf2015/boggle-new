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

jest.mock('framer-motion', () => {
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
    set: jest.fn(),
    onChange: jest.fn(),
    current: initial,
  });

  // Mock useTransform
  const useTransform = (...args: any[]) => ({
    get: () => 0,
    set: jest.fn(),
    onChange: jest.fn(),
    current: 0,
  });

  // Mock useSpring
  const useSpring = (initial: any) => ({
    get: () => initial,
    set: jest.fn(),
    onChange: jest.fn(),
    current: initial,
  });

  return {
    motion: {
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

jest.mock('next/image', () => {
  const MockImage = ({ src, alt, ...props }: any) => {
    return React.createElement('img', { src, alt, ...props });
  };
  MockImage.displayName = 'MockImage';
  return { __esModule: true, default: MockImage };
});

// Mock useParallax hook
const mockMotionValue = (v: number) => ({ get: () => v, set: () => {}, on: () => () => {} });
jest.mock('@/hooks/useParallax', () => ({
  useParallax: () => ({
    x: mockMotionValue(10),
    y: mockMotionValue(10),
    isGyroActive: false,
  }),
}));

// Mock LanguageContext
jest.mock('@/contexts/LanguageContext', () => ({
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
    it('should have overflow-y-auto on the container to enable scrolling', () => {
      // GIVEN / WHEN
      render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={6}
          onLevelSelect={jest.fn()}
        />
      );

      // THEN - find the scrollable container
      const levelGrid = screen.getByTestId('level-grid');

      // The level-grid should have overflow-y-auto for scrolling
      // It should NOT have overflow-hidden which prevents scrolling
      expect(levelGrid.className).toMatch(/overflow-y-auto|overflow-auto/);
      expect(levelGrid.className).not.toMatch(/overflow-hidden/);
    });

    it('should have proper height constraint to enable scroll', () => {
      // GIVEN / WHEN
      render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={6}
          onLevelSelect={jest.fn()}
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
          onLevelSelect={jest.fn()}
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
          onLevelSelect={jest.fn()}
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

    it('should have parallax layers contained within the scroll container', () => {
      // GIVEN / WHEN
      const { container } = render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={6}
          onLevelSelect={jest.fn()}
        />
      );

      // THEN
      const levelGrid = screen.getByTestId('level-grid');

      // Parallax layers should be inside a fixed container with overflow-hidden
      // This keeps parallax stationary while content scrolls
      const parallaxContainer = levelGrid.querySelector('.fixed');
      expect(parallaxContainer).toBeInTheDocument();
      expect(parallaxContainer?.className).toContain('overflow-hidden');

      // Parallax layers inside the fixed container use absolute positioning
      const absoluteLayers = parallaxContainer?.querySelectorAll('.absolute');
      expect(absoluteLayers?.length).toBeGreaterThanOrEqual(3); // background, glow, particles
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
          onLevelSelect={jest.fn()}
        />
      );

      // THEN - 7 levels per world (LEVELS_PER_WORLD constant)
      for (let i = 1; i <= 7; i++) {
        expect(screen.getByTestId(`level-button-${i}`)).toBeInTheDocument();
      }
    });

    it('should have scrollable content when many levels are present', () => {
      // GIVEN / WHEN
      const { container } = render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={6}
          onLevelSelect={jest.fn()}
        />
      );

      // THEN - should have scrollbar-related classes for smooth scrolling
      const levelGrid = screen.getByTestId('level-grid');

      // Check for scrollbar styling classes
      const hasScrollbarStyling = levelGrid.className.includes('scrollbar');

      // If no scrollbar classes, at least overflow should be set
      if (!hasScrollbarStyling) {
        expect(levelGrid.className).toMatch(/overflow/);
      }
    });
  });
});
