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

  return {
    motion: {
      div: createMockMotion('div'),
      button: createMockMotion('button'),
      h2: createMockMotion('h2'),
      p: createMockMotion('p'),
    },
    AnimatePresence: ({ children }: any) => children,
  };
});

jest.mock('next/image', () => {
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
const mockParallaxValues = { x: 10, y: 5, isGyroActive: false };
jest.mock('@/hooks/useParallax', () => ({
  useParallax: () => mockParallaxValues,
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
          onLevelSelect={jest.fn()}
        />
      );

      // THEN - should have fixed parallax container
      const fixedContainer = container.querySelector('.fixed.inset-0.pointer-events-none');
      expect(fixedContainer).toBeInTheDocument();
    });

    it('should render base world image as blurred background layer', () => {
      // GIVEN
      const mockWorld = createMockWorld(1, 'alphabetMeadows');

      // WHEN
      render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={3}
          onLevelSelect={jest.fn()}
        />
      );

      // THEN - should have blurred world image
      const worldImages = screen.getAllByTestId('world-image');
      const blurredImage = worldImages.find((img) =>
        img.className?.includes('blur-xl')
      );
      expect(blurredImage).toBeInTheDocument();
    });

    it('should render glow orb elements for atmospheric effect', () => {
      // GIVEN
      const mockWorld = createMockWorld(1, 'alphabetMeadows');

      // WHEN
      const { container } = render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={3}
          onLevelSelect={jest.fn()}
        />
      );

      // THEN - should have glow orb elements
      const glowOrbs = container.querySelectorAll('.level-grid-glow-orb');
      expect(glowOrbs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('World-specific Parallax Layers', () => {
    it('should render parallax image layers for Meadows (world 1)', () => {
      // GIVEN
      const mockWorld = createMockWorld(1, 'alphabetMeadows');

      // WHEN
      render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={3}
          onLevelSelect={jest.fn()}
        />
      );

      // THEN - should have parallax layer images for meadows
      const parallaxImages = screen.queryAllByTestId('parallax-layer-image');
      // Meadows has 2 layers: hills (far) and grass (near)
      expect(parallaxImages.length).toBeGreaterThanOrEqual(1);
    });

    it('should render parallax image layers for Springs (world 2)', () => {
      // GIVEN
      const mockWorld = createMockWorld(2, 'synonymSprings', 'neo-cyan');

      // WHEN
      render(
        <LevelGrid
          world={mockWorld}
          completions={[]}
          totalStars={0}
          onLevelSelect={jest.fn()}
        />
      );

      // THEN - should have parallax layer images for springs
      const parallaxImages = screen.queryAllByTestId('parallax-layer-image');
      // Springs has 3 layers: rocks (far), waterfall (mid), mist (near)
      expect(parallaxImages.length).toBeGreaterThanOrEqual(1);
    });

    it('should render parallax image layers for Caverns (world 3)', () => {
      // GIVEN
      const mockWorld = createMockWorld(3, 'rootCaverns', 'neo-purple');

      // WHEN
      render(
        <LevelGrid
          world={mockWorld}
          completions={[]}
          totalStars={0}
          onLevelSelect={jest.fn()}
        />
      );

      // THEN - should have parallax layer images for caverns
      const parallaxImages = screen.queryAllByTestId('parallax-layer-image');
      // Caverns has 3 layers: crystals-far, stalactites, crystals-near
      expect(parallaxImages.length).toBeGreaterThanOrEqual(1);
    });

    it('should gracefully handle worlds without custom parallax layers', () => {
      // GIVEN - World 4 (Archipelago) has no custom parallax images yet
      const mockWorld = createMockWorld(4, 'idiomArchipelago', 'neo-orange');

      // WHEN
      render(
        <LevelGrid
          world={mockWorld}
          completions={[]}
          totalStars={0}
          onLevelSelect={jest.fn()}
        />
      );

      // THEN - should still render without errors (no parallax images, but particles exist)
      const levelGrid = screen.getByTestId('level-grid');
      expect(levelGrid).toBeInTheDocument();
    });
  });

  describe('Foreground Depth Frame', () => {
    it('should render top edge shadow element', () => {
      // GIVEN
      const mockWorld = createMockWorld(1, 'alphabetMeadows');

      // WHEN
      const { container } = render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={3}
          onLevelSelect={jest.fn()}
        />
      );

      // THEN - should have top edge element
      const topEdge = container.querySelector('.level-grid-foreground-edge--top');
      expect(topEdge).toBeInTheDocument();
    });

    it('should render bottom edge shadow element with world glow color', () => {
      // GIVEN
      const mockWorld = createMockWorld(1, 'alphabetMeadows');

      // WHEN
      const { container } = render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={3}
          onLevelSelect={jest.fn()}
        />
      );

      // THEN - should have bottom edge element
      const bottomEdge = container.querySelector('.level-grid-foreground-edge--bottom');
      expect(bottomEdge).toBeInTheDocument();
    });

    it('should render vignette overlay for depth effect', () => {
      // GIVEN
      const mockWorld = createMockWorld(1, 'alphabetMeadows');

      // WHEN
      const { container } = render(
        <LevelGrid
          world={mockWorld}
          completions={mockCompletions}
          totalStars={3}
          onLevelSelect={jest.fn()}
        />
      );

      // THEN - should have vignette element
      const vignette = container.querySelector('.level-grid-foreground-vignette');
      expect(vignette).toBeInTheDocument();
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
          onLevelSelect={jest.fn()}
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
          onLevelSelect={jest.fn()}
        />
      );

      const { container: nebulaContainer } = render(
        <LevelGrid
          world={nebulaWorld}
          completions={[]}
          totalStars={0}
          onLevelSelect={jest.fn()}
        />
      );

      // THEN - different worlds should have different particle counts
      const meadowsParticles = meadowsContainer.querySelectorAll('.level-grid-particle');
      const nebulaParticles = nebulaContainer.querySelectorAll('.level-grid-particle');

      expect(meadowsParticles.length).toBe(10);
      expect(nebulaParticles.length).toBe(14);
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
          onLevelSelect={jest.fn()}
        />
      );

      // THEN - parallax layers should have transform styles applied
      const parallaxLayers = container.querySelectorAll('.level-grid-parallax-layer');
      parallaxLayers.forEach((layer) => {
        const style = (layer as HTMLElement).style;
        expect(style.transform).toBeTruthy();
      });
    });
  });
});
