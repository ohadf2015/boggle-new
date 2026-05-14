/**
 * LevelGrid Header Image Tests
 *
 * Tests that the level grid header displays the correct world images
 * with valid file paths that match the actual assets.
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
    return React.createElement('img', { src, alt, 'data-testid': 'world-image', ...props });
  };
  MockImage.displayName = 'MockImage';
  return { __esModule: true, default: MockImage };
});

// Mock useParallax hook
const mockMotionValue = (v: number) => ({ get: () => v, set: () => {}, on: () => () => {} });
vi.mock('@/hooks/useParallax', () => ({
  useParallax: () => ({
    x: mockMotionValue(0),
    y: mockMotionValue(0),
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
// TEST DATA
// ==============================================

const createMockWorld = (id: number, name: string): WorldConfig => ({
  id,
  name,
  theme: 'sunny-pastoral',
  mechanic: null,
  bossName: 'msGrammar',
  colorPrimary: 'neo-lime',
  colorSecondary: 'neo-lime-light',
  description: `worldDesc${name}`,
});

const mockCompletions = [{ world: 1, level: 1, stars: 3 }];

// ==============================================
// TESTS
// ==============================================

describe('LevelGrid Header Images', () => {
  describe('World Image File Extensions', () => {
    it('should use .webp extension for world images (not .png)', () => {
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

      // THEN - all world images should use .webp extension
      const worldImages = screen.getAllByTestId('world-image');

      worldImages.forEach((img) => {
        const src = img.getAttribute('src');
        if (src && src.includes('world-') && src.includes('-3d')) {
          expect(src).toMatch(/\.webp$/);
          expect(src).not.toMatch(/\.png$/);
        }
      });
    });

    it.each([
      [1, 'alphabetMeadows', 'world-meadows-3d.webp'],
      [2, 'synonymSprings', 'world-springs-3d.webp'],
      [3, 'rootCaverns', 'world-caverns-3d.webp'],
      [4, 'idiomArchipelago', 'world-archipelago-3d.webp'],
      [5, 'compoundCanyon', 'world-canyon-3d.webp'],
      [6, 'anagramLabyrinth', 'world-labyrinth-3d.webp'],
      [7, 'mirrorPalace', 'world-palace-3d.webp'],
      [8, 'neologismNebula', 'world-nebula-3d.webp'],
      [9, 'polyglotPeaks', 'world-peaks-3d.webp'],
      [10, 'lexiconThrone', 'world-throne-3d.webp'],
    ])(
      'should display correct image path for world %i (%s)',
      (worldId, worldName, expectedFileName) => {
        // GIVEN
        const mockWorld = createMockWorld(worldId, worldName);

        // WHEN
        render(
          <LevelGrid
            world={mockWorld}
            completions={[]}
            totalStars={0}
            onLevelSelect={vi.fn()}
          />
        );

        // THEN - should find an image with the correct .webp path
        const worldImages = screen.getAllByTestId('world-image');
        const hasCorrectImage = worldImages.some((img) => {
          const src = img.getAttribute('src');
          return src && src.includes(expectedFileName);
        });

        expect(hasCorrectImage).toBe(true);
      }
    );
  });

  describe('Header World Image Display', () => {
    it('should display a world image in the header section', () => {
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

      // THEN - should have at least one world image
      const worldImages = screen.getAllByTestId('world-image');
      expect(worldImages.length).toBeGreaterThanOrEqual(1);
    });
  });
});
