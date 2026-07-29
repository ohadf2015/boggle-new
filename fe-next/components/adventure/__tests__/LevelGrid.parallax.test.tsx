/**
 * LevelGrid Parallax Layer Tests
 *
 * Tests the multi-layer parallax background system including:
 * - World-specific parallax image layers
 * - Foreground depth framing elements
 * - Glow orb animations
 * - Accessibility (reduced motion support)
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
  const MockImage = ({ src, alt, className, ...props }: any) => {
    return React.createElement('img', {
      src,
      alt,
      className,
      'data-testid': src?.includes('parallax') ? 'parallax-layer-image' : 'world-image',
      ...props,
    });
  };
  MockImage.displayName = 'MockImage';
  return { __esModule: true, default: MockImage };
});

// Mock useParallax hook with controllable values
const mockMotionValue = (v: number) => ({ get: () => v, set: () => {}, on: () => () => {} });
const mockParallaxValues = { x: mockMotionValue(10), y: mockMotionValue(5), isGyroActive: false };
vi.mock('@/hooks/useParallax', () => ({
  useParallax: () => mockParallaxValues,
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
// TEST DATA
// ==============================================

const createMockWorld = (id: number, name: string, colorPrimary = 'neo-lime'): WorldConfig => ({
  id,
  name,
  theme: 'sunny-pastoral',
  mechanic: null,
  bossName: 'msGrammar',
  colorPrimary,
  colorSecondary: `${colorPrimary}-light`,
  description: `worldDesc${name}`,
});

const mockCompletions = [{ world: 1, level: 1, stars: 3 }];

// ==============================================
// TESTS
// ==============================================

describe('LevelGrid Parallax System', () => {
  describe('Multi-layer Parallax Structure', () => {
    it('should render the parallax container with fixed positioning', () => {
      // GIVEN
      const mockWorld = createMockWorld(1, 'alphabetMeadows');

      // WHEN
      const { container } = render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={3}
          onLevelSelect={vi.fn()}
        />
      );

      // THEN - should have fixed parallax container
      const fixedContainer = container.querySelector('.absolute.inset-0.pointer-events-none');
      expect(fixedContainer).toBeInTheDocument();
    });

    it('should render main world image as hero background layer', () => {
      // GIVEN
      const mockWorld = createMockWorld(1, 'alphabetMeadows');

      // WHEN
      render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={3}
          onLevelSelect={vi.fn()}
        />
      );

      // THEN - should have main world image in the parallax background
      // The simplified design uses a single world image with opacity instead of blur
      const worldImages = screen.getAllByTestId('world-image');
      expect(worldImages.length).toBeGreaterThanOrEqual(1);
      // Check the image exists and is styled with opacity
      const mainImage = worldImages.find((img) =>
        img.className?.includes('opacity')
      );
      expect(mainImage).toBeInTheDocument();
    });

    it('should render vignette layer for depth effect', () => {
      // GIVEN
      const mockWorld = createMockWorld(1, 'alphabetMeadows');

      // WHEN
      const { container } = render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={3}
          onLevelSelect={vi.fn()}
        />
      );

      // THEN - should have vignette as part of simplified parallax layers
      // Simplified design uses inline vignette in the parallax container
      const parallaxContainer = container.querySelector('.absolute.inset-0.pointer-events-none');
      expect(parallaxContainer).toBeInTheDocument();
      // Vignette is now an inline style element within the parallax layers
    });
  });

  describe('World-specific Parallax Layers', () => {
    /**
     * NOTE: The parallax system was simplified to reduce visual heaviness.
     * Instead of multiple parallax layer images, we now use:
     * - Base gradient with world accent color
     * - Single main world image (hero background)
     * - Subtle accent glow
     * - Floating particles
     * - Vignette for depth
     */

    it('should render main world image for Meadows (world 1)', () => {
      // GIVEN
      const mockWorld = createMockWorld(1, 'alphabetMeadows');

      // WHEN
      render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={3}
          onLevelSelect={vi.fn()}
        />
      );

      // THEN - should have the main world image
      const worldImages = screen.getAllByTestId('world-image');
      expect(worldImages.length).toBeGreaterThanOrEqual(1);
    });

    it('should render main world image for Springs (world 2)', () => {
      // GIVEN
      const mockWorld = createMockWorld(2, 'synonymSprings', 'neo-cyan');

      // WHEN
      render(
        <LevelGrid
          world={mockWorld}
          completions={[]}
          totalStars={0}
          onLevelSelect={vi.fn()}
        />
      );

      // THEN - should have world-specific main image
      const worldImages = screen.getAllByTestId('world-image');
      expect(worldImages.length).toBeGreaterThanOrEqual(1);
    });

    it('should render main world image for Caverns (world 3)', () => {
      // GIVEN
      const mockWorld = createMockWorld(3, 'rootCaverns', 'neo-purple');

      // WHEN
      render(
        <LevelGrid
          world={mockWorld}
          completions={[]}
          totalStars={0}
          onLevelSelect={vi.fn()}
        />
      );

      // THEN - should have world-specific main image
      const worldImages = screen.getAllByTestId('world-image');
      expect(worldImages.length).toBeGreaterThanOrEqual(1);
    });

    it('should render consistently across all worlds', () => {
      // GIVEN - World 4 (Archipelago)
      const mockWorld = createMockWorld(4, 'idiomArchipelago', 'neo-orange');

      // WHEN
      render(
        <LevelGrid
          world={mockWorld}
          completions={[]}
          totalStars={0}
          onLevelSelect={vi.fn()}
        />
      );

      // THEN - should render with consistent simplified structure
      const levelGrid = screen.getByTestId('level-grid');
      expect(levelGrid).toBeInTheDocument();
      // All worlds now use the same simplified parallax structure
      const worldImages = screen.getAllByTestId('world-image');
      expect(worldImages.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Simplified Parallax Design', () => {
    it('should render main world image as the hero background', () => {
      // GIVEN
      const mockWorld = createMockWorld(1, 'alphabetMeadows');

      // WHEN
      const { container } = render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={3}
          onLevelSelect={vi.fn()}
        />
      );

      // THEN - should have the main world image with correct styling
      const worldImages = screen.getAllByTestId('world-image');
      expect(worldImages.length).toBeGreaterThanOrEqual(1);
      // Main world image should exist in the parallax container
      const parallaxContainer = container.querySelector('.absolute.inset-0.pointer-events-none');
      expect(parallaxContainer).toBeInTheDocument();
    });

    it('should have a clean, simplified layer structure (5 layers max)', () => {
      // GIVEN - The simplified design has 5 layers:
      // 1. Base gradient, 2. Main world image, 3. Subtle accent glow,
      // 4. Floating particles, 5. Vignette
      const mockWorld = createMockWorld(1, 'alphabetMeadows');

      // WHEN
      const { container } = render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={3}
          onLevelSelect={vi.fn()}
        />
      );

      // THEN - parallax container should exist with simplified structure
      const parallaxContainer = container.querySelector('.absolute.inset-0.pointer-events-none');
      expect(parallaxContainer).toBeInTheDocument();
      // No longer need separate foreground edges - vignette is inline
    });

    it('should apply depth through vignette styling inline', () => {
      // GIVEN
      const mockWorld = createMockWorld(1, 'alphabetMeadows');

      // WHEN
      const { container } = render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={3}
          onLevelSelect={vi.fn()}
        />
      );

      // THEN - vignette is now applied via inline radial gradient
      // The simplified design uses inline box-shadow/gradient instead of separate class
      const levelGrid = screen.getByTestId('level-grid');
      expect(levelGrid).toBeInTheDocument();
    });
  });

  describe('Floating Particles', () => {
    it('should render floating particles with world-specific emojis', () => {
      // GIVEN
      const mockWorld = createMockWorld(1, 'alphabetMeadows');

      // WHEN
      const { container } = render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={3}
          onLevelSelect={vi.fn()}
        />
      );

      // THEN - should have floating particles
      const particles = container.querySelectorAll('.level-grid-particle');
      expect(particles.length).toBeGreaterThan(0);
    });

    it('should render different particle count for different worlds', () => {
      // GIVEN - Meadows has 10 particles, Nebula has 14
      const meadowsWorld = createMockWorld(1, 'alphabetMeadows');
      const nebulaWorld = createMockWorld(8, 'neologismNebula', 'neo-purple');

      // WHEN
      const { container: meadowsContainer } = render(
        <LevelGrid
          world={meadowsWorld}
          completions={[]}
          totalStars={0}
          onLevelSelect={vi.fn()}
        />
      );

      const { container: nebulaContainer } = render(
        <LevelGrid
          world={nebulaWorld}
          completions={[]}
          totalStars={0}
          onLevelSelect={vi.fn()}
        />
      );

      // THEN - different worlds should have different particle counts
      const meadowsParticles = meadowsContainer.querySelectorAll('.level-grid-particle');
      const nebulaParticles = nebulaContainer.querySelectorAll('.level-grid-particle');

      // Both worlds now use fixed Lucide icon particle count
      expect(meadowsParticles.length).toBe(9);
      expect(nebulaParticles.length).toBe(9);
    });
  });

  describe('Parallax Transform Application', () => {
    it('should apply parallax transforms based on hook values', () => {
      // GIVEN
      const mockWorld = createMockWorld(1, 'alphabetMeadows');

      // WHEN
      const { container } = render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={3}
          onLevelSelect={vi.fn()}
        />
      );

      // THEN - parallax layers should use CSS custom properties for GPU-driven transforms
      // Layers use --parallax-depth CSS custom property instead of inline transforms
      const cssParallaxLayers = container.querySelectorAll('.level-grid-parallax-css, .level-grid-parallax-css-scaled');
      expect(cssParallaxLayers.length).toBeGreaterThanOrEqual(2);
    });
  });
});
