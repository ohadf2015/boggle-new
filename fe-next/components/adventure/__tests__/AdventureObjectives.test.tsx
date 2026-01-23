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
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => mockTranslations[key] || key,
    language: 'en',
    dir: 'ltr',
  }),
}));

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

    it('should display correct icon for each objective type', () => {
      // GIVEN
      const objectives: LevelObjective[] = [
        createObjective({ type: 'wordCount' }),
        createObjective({ type: 'longWords', isPrimary: false }),
        createObjective({ type: 'clearIce', isPrimary: false }),
      ];

      // WHEN
      render(<AdventureObjectives objectives={objectives} />);

      // THEN
      expect(screen.getByTestId('icon-wordCount')).toBeInTheDocument();
      expect(screen.getByTestId('icon-longWords')).toBeInTheDocument();
      expect(screen.getByTestId('icon-clearIce')).toBeInTheDocument();
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

    it('should show progress bar with correct fill percentage', () => {
      // GIVEN
      const objectives: LevelObjective[] = [
        createObjective({ type: 'wordCount', target: 10, current: 3 }),
      ];

      // WHEN
      render(<AdventureObjectives objectives={objectives} />);

      // THEN
      const progressBar = screen.getByTestId('progress-bar-wordCount');
      // 3/10 = 30%
      expect(progressBar).toHaveStyle({ width: '30%' });
    });

    it('should cap progress bar at 100%', () => {
      // GIVEN - Current exceeds target
      const objectives: LevelObjective[] = [
        createObjective({ type: 'wordCount', target: 10, current: 15 }),
      ];

      // WHEN
      render(<AdventureObjectives objectives={objectives} />);

      // THEN
      const progressBar = screen.getByTestId('progress-bar-wordCount');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });
  });

  describe('Completion State', () => {
    it('should mark completed objectives with checkmark', () => {
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
      expect(screen.getByTestId('checkmark-wordCount')).toBeInTheDocument();
    });

    it('should NOT show checkmark for incomplete objectives', () => {
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
      render(<AdventureObjectives objectives={objectives} />);

      // THEN
      expect(
        screen.queryByTestId('checkmark-wordCount')
      ).not.toBeInTheDocument();
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
