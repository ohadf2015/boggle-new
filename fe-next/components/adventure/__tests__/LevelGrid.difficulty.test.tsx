/**
 * LevelGrid Difficulty Indicator Tests
 *
 * Tests that the level cards display meaningful difficulty indicators
 * instead of confusing single letters.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
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
  const MockImage = ({ src, alt, ...props }: any) => {
    return React.createElement('img', { src, alt, ...props });
  };
  MockImage.displayName = 'MockImage';
  return { __esModule: true, default: MockImage };
});

// Mock useParallax hook
jest.mock('@/hooks/useParallax', () => ({
  useParallax: () => ({
    x: 10,
    y: 10,
    isGyroActive: false,
  }),
}));

// Mock LanguageContext
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      // Return translated difficulty labels for testing
      const translations: Record<string, string> = {
        'difficulty.easy': 'Easy',
        'difficulty.medium': 'Medium',
        'difficulty.hard': 'Hard',
      };
      return translations[key] || key;
    },
    dir: 'ltr',
    locale: 'en',
  }),
}));

// ==============================================
// TEST FIXTURES
// ==============================================

const createMockWorld = (id: number): WorldConfig => ({
  id,
  name: id <= 3 ? 'alphabetMeadows' : id <= 6 ? 'crystalCaverns' : 'dragonPeaks',
  theme: 'sunny-pastoral',
  mechanic: null,
  bossName: 'msGrammar',
  colorPrimary: 'neo-lime',
  colorSecondary: 'neo-lime-light',
  description: 'worldDesc',
});

const mockCompletions = [
  { world: 1, level: 1, stars: 3 },
  { world: 1, level: 2, stars: 2 },
];

// ==============================================
// TESTS
// ==============================================

describe('LevelGrid Difficulty Indicator', () => {
  describe('Difficulty Badge Display', () => {
    it('should NOT display cryptic single letters like "E", "M", "H" for difficulty', () => {
      // GIVEN / WHEN
      render(
        <LevelGrid
          world={createMockWorld(1)}
          completions={mockCompletions}
          totalStars={5}
          onLevelSelect={jest.fn()}
        />
      );

      // THEN - should NOT have standalone "E", "M", or "H" as difficulty indicators
      // The text should be more descriptive or use visual indicators
      const levelButtons = screen.getAllByTestId(/level-button-/);

      levelButtons.forEach((button) => {
        // Find the difficulty badge (top-right corner element)
        const difficultyBadge = button.querySelector('.absolute.top-2.right-2, .absolute.top-2.rtl\\:left-2');

        if (difficultyBadge) {
          const text = difficultyBadge.textContent?.trim();
          // Should NOT be a single cryptic letter
          expect(text).not.toBe('E');
          expect(text).not.toBe('M');
          expect(text).not.toBe('H');
        }
      });
    });

    it('should display visual difficulty indicators for EASY levels', () => {
      // GIVEN - World 1 has EASY difficulty
      render(
        <LevelGrid
          world={createMockWorld(1)}
          completions={mockCompletions}
          totalStars={5}
          onLevelSelect={jest.fn()}
        />
      );

      // THEN - should have visual indicators (dots, bars, or icons)
      const levelButton = screen.getByTestId('level-button-1');
      const difficultyIndicator = levelButton.querySelector('[data-testid="difficulty-indicator"]');

      expect(difficultyIndicator).toBeInTheDocument();
      // Easy should have 1 filled indicator
      const filledIndicators = difficultyIndicator?.querySelectorAll('[data-filled="true"]');
      expect(filledIndicators?.length).toBe(1);
    });

    it('should display visual difficulty indicators for MEDIUM levels', () => {
      // GIVEN - World 5 has MEDIUM difficulty
      render(
        <LevelGrid
          world={createMockWorld(5)}
          completions={[]}
          totalStars={0}
          onLevelSelect={jest.fn()}
        />
      );

      // THEN - should have visual indicators
      const levelButton = screen.getByTestId('level-button-1');
      const difficultyIndicator = levelButton.querySelector('[data-testid="difficulty-indicator"]');

      expect(difficultyIndicator).toBeInTheDocument();
      // Medium should have 2 filled indicators
      const filledIndicators = difficultyIndicator?.querySelectorAll('[data-filled="true"]');
      expect(filledIndicators?.length).toBe(2);
    });

    it('should display visual difficulty indicators for HARD levels', () => {
      // GIVEN - World 8 has HARD difficulty
      render(
        <LevelGrid
          world={createMockWorld(8)}
          completions={[]}
          totalStars={0}
          onLevelSelect={jest.fn()}
        />
      );

      // THEN - should have visual indicators
      const levelButton = screen.getByTestId('level-button-1');
      const difficultyIndicator = levelButton.querySelector('[data-testid="difficulty-indicator"]');

      expect(difficultyIndicator).toBeInTheDocument();
      // Hard should have 3 filled indicators
      const filledIndicators = difficultyIndicator?.querySelectorAll('[data-filled="true"]');
      expect(filledIndicators?.length).toBe(3);
    });

    it('should use appropriate colors for each difficulty level', () => {
      // GIVEN - World 1 (EASY)
      const { rerender } = render(
        <LevelGrid
          world={createMockWorld(1)}
          completions={mockCompletions}
          totalStars={5}
          onLevelSelect={jest.fn()}
        />
      );

      // THEN - EASY should have lime/green color
      let levelButton = screen.getByTestId('level-button-1');
      let indicator = levelButton.querySelector('[data-testid="difficulty-indicator"]');
      expect(indicator?.className).toMatch(/neo-lime/);

      // WHEN - World 5 (MEDIUM)
      rerender(
        <LevelGrid
          world={createMockWorld(5)}
          completions={[]}
          totalStars={0}
          onLevelSelect={jest.fn()}
        />
      );

      // THEN - MEDIUM should have orange color
      levelButton = screen.getByTestId('level-button-1');
      indicator = levelButton.querySelector('[data-testid="difficulty-indicator"]');
      expect(indicator?.className).toMatch(/neo-orange/);

      // WHEN - World 8 (HARD)
      rerender(
        <LevelGrid
          world={createMockWorld(8)}
          completions={[]}
          totalStars={0}
          onLevelSelect={jest.fn()}
        />
      );

      // THEN - HARD should have red color
      levelButton = screen.getByTestId('level-button-1');
      indicator = levelButton.querySelector('[data-testid="difficulty-indicator"]');
      expect(indicator?.className).toMatch(/neo-red/);
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label describing the difficulty level', () => {
      // GIVEN / WHEN
      render(
        <LevelGrid
          world={createMockWorld(1)}
          completions={mockCompletions}
          totalStars={5}
          onLevelSelect={jest.fn()}
        />
      );

      // THEN - difficulty indicator should have accessible label
      const levelButton = screen.getByTestId('level-button-1');
      const indicator = levelButton.querySelector('[data-testid="difficulty-indicator"]');

      expect(indicator).toHaveAttribute('aria-label');
      expect(indicator?.getAttribute('aria-label')).toMatch(/easy|difficulty/i);
    });
  });
});
