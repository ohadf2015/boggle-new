/**
 * AdventureObjectives Tests
 *
 * Tests for displaying objective progress in adventure mode
 * Following TDD: Write tests FIRST, then implement
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import AdventureObjectives from '../AdventureObjectives';
import type { LevelObjective } from '@/types/adventure';

// Mock translation function that returns English text for test assertions
const mockTranslations: Record<string, string> = {
  'adventure.objectives.wordCount': 'Find words',
  'adventure.objectives.scoreTarget': 'Reach score',
  'adventure.objectives.longWords': 'Long words (5+)',
  'adventure.objectives.clearIce': 'Clear ice',
  'adventure.objectives.timeBonus': 'Time remaining',
  'adventure.objectives.collectGems': 'Collect gems',
};

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => mockTranslations[key] || key,
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => {
  const React = require('react');
  const createMockMotion = (element: string) => {
    const MockComponent = React.forwardRef(
      ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }, ref: unknown) => {
        // Filter out framer-motion specific props
        const filteredProps: Record<string, unknown> = {};
        Object.keys(props).forEach(key => {
          if (!['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'variants', 'custom', 'onAnimationComplete'].includes(key)) {
            filteredProps[key] = props[key];
          }
        });
        return React.createElement(element, { ...filteredProps, ref }, children);
      }
    );
    MockComponent.displayName = `MockMotion${element.charAt(0).toUpperCase() + element.slice(1)}`;
    return MockComponent;
  };

  return {
    m: {
      div: createMockMotion('div'),
      ul: createMockMotion('ul'),
      li: createMockMotion('li'),
      span: createMockMotion('span'),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

// ==============================================
// TEST FIXTURES
// ==============================================

function createObjective(overrides?: Partial<LevelObjective>): LevelObjective {
  return {
    type: 'wordCount',
    target: 10,
    current: 0,
    isPrimary: true,
    isComplete: false,
    ...overrides,
  };
}

// ==============================================
// TESTS
// ==============================================

describe('AdventureObjectives', () => {
  describe('Rendering', () => {
    it('should display all objectives', () => {
      // GIVEN
      const objectives: LevelObjective[] = [
        createObjective({ type: 'wordCount', target: 10 }),
        createObjective({ type: 'scoreTarget', target: 500, isPrimary: false }),
      ];

      // WHEN
      render(<AdventureObjectives objectives={objectives} />);

      // THEN
      expect(screen.getByTestId('objective-wordCount')).toBeInTheDocument();
      expect(screen.getByTestId('objective-scoreTarget')).toBeInTheDocument();
    });

    it('should display icons for each objective type', () => {
      // GIVEN
      const objectives: LevelObjective[] = [
        createObjective({ type: 'wordCount' }),
        createObjective({ type: 'longWords', isPrimary: false }),
        createObjective({ type: 'clearIce', isPrimary: false }),
      ];

      // WHEN
      const { container } = render(<AdventureObjectives objectives={objectives} />);

      // THEN - Icons are rendered via lucide-react (look for SVG elements)
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Progress Display', () => {
    it('should show progress as fraction (current/target)', () => {
      // GIVEN
      const objectives: LevelObjective[] = [
        createObjective({ type: 'wordCount', target: 10, current: 5 }),
      ];

      // WHEN
      render(<AdventureObjectives objectives={objectives} />);

      // THEN
      expect(screen.getByText('5/10')).toBeInTheDocument();
    });

    it('should show progress bar element', () => {
      // GIVEN
      const objectives: LevelObjective[] = [
        createObjective({ type: 'wordCount', target: 10, current: 3 }),
      ];

      // WHEN
      render(<AdventureObjectives objectives={objectives} />);

      // THEN - Progress bar element exists (animation sets width via framer-motion)
      const progressBar = screen.getByTestId('progress-bar-wordCount');
      expect(progressBar).toBeInTheDocument();
    });

    it('should render progress bar for objectives that exceed target', () => {
      // GIVEN - Current exceeds target
      const objectives: LevelObjective[] = [
        createObjective({ type: 'wordCount', target: 10, current: 15 }),
      ];

      // WHEN
      render(<AdventureObjectives objectives={objectives} />);

      // THEN - Progress bar element is rendered (framer-motion handles animation)
      const progressBar = screen.getByTestId('progress-bar-wordCount');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Completion State', () => {
    it('should mark completed objectives with checkmark icon', () => {
      // GIVEN
      const objectives: LevelObjective[] = [
        createObjective({
          type: 'wordCount',
          target: 10,
          current: 10,
          isComplete: true,
        }),
      ];

      // WHEN
      const { container } = render(<AdventureObjectives objectives={objectives} />);

      // THEN - Check icon is rendered for completed objectives
      const checkIcon = container.querySelector('.lucide-check');
      expect(checkIcon).toBeInTheDocument();
    });

    it('should NOT show checkmark icon for incomplete objectives', () => {
      // GIVEN
      const objectives: LevelObjective[] = [
        createObjective({
          type: 'wordCount',
          target: 10,
          current: 5,
          isComplete: false,
        }),
      ];

      // WHEN
      const { container } = render(<AdventureObjectives objectives={objectives} />);

      // THEN - No Check icon for incomplete objectives
      const checkIcon = container.querySelector('.lucide-check');
      expect(checkIcon).not.toBeInTheDocument();
    });

    it('should apply completed styling to finished objectives', () => {
      // GIVEN
      const objectives: LevelObjective[] = [
        createObjective({
          type: 'wordCount',
          target: 10,
          current: 10,
          isComplete: true,
        }),
      ];

      // WHEN
      render(<AdventureObjectives objectives={objectives} />);

      // THEN
      const objectiveElement = screen.getByTestId('objective-wordCount');
      expect(objectiveElement).toHaveClass('objective-complete');
    });
  });

  describe('Primary vs Secondary Objectives', () => {
    it('should highlight primary objectives', () => {
      // GIVEN
      const objectives: LevelObjective[] = [
        createObjective({ type: 'wordCount', isPrimary: true }),
        createObjective({ type: 'scoreTarget', isPrimary: false }),
      ];

      // WHEN
      render(<AdventureObjectives objectives={objectives} />);

      // THEN
      const primaryObjective = screen.getByTestId('objective-wordCount');
      expect(primaryObjective).toHaveClass('objective-primary');
    });

    it('should show secondary objectives with different styling', () => {
      // GIVEN
      const objectives: LevelObjective[] = [
        createObjective({ type: 'wordCount', isPrimary: true }),
        createObjective({ type: 'longWords', isPrimary: false }),
      ];

      // WHEN
      render(<AdventureObjectives objectives={objectives} />);

      // THEN
      const secondaryObjective = screen.getByTestId('objective-longWords');
      expect(secondaryObjective).not.toHaveClass('objective-primary');
      expect(secondaryObjective).toHaveClass('objective-secondary');
    });
  });

  describe('Objective Labels', () => {
    it('should display readable label for wordCount', () => {
      // GIVEN
      const objectives: LevelObjective[] = [
        createObjective({ type: 'wordCount', target: 8 }),
      ];

      // WHEN
      render(<AdventureObjectives objectives={objectives} />);

      // THEN
      expect(screen.getByText(/words/i)).toBeInTheDocument();
    });

    it('should display readable label for longWords', () => {
      // GIVEN
      const objectives: LevelObjective[] = [
        createObjective({ type: 'longWords', target: 3, isPrimary: false }),
      ];

      // WHEN
      render(<AdventureObjectives objectives={objectives} />);

      // THEN
      expect(screen.getByText(/long/i)).toBeInTheDocument();
    });

    it('should display readable label for clearIce', () => {
      // GIVEN
      const objectives: LevelObjective[] = [
        createObjective({ type: 'clearIce', target: 5, isPrimary: false }),
      ];

      // WHEN
      render(<AdventureObjectives objectives={objectives} />);

      // THEN
      expect(screen.getByText(/ice/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible container role', () => {
      // GIVEN
      const objectives: LevelObjective[] = [
        createObjective({ type: 'wordCount' }),
      ];

      // WHEN
      render(<AdventureObjectives objectives={objectives} />);

      // THEN
      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('should have accessible progress information', () => {
      // GIVEN
      const objectives: LevelObjective[] = [
        createObjective({ type: 'wordCount', target: 10, current: 5 }),
      ];

      // WHEN
      render(<AdventureObjectives objectives={objectives} />);

      // THEN
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '5');
      expect(progressBar).toHaveAttribute('aria-valuemax', '10');
    });
  });
});
