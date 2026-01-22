/**
 * LevelCompleteModal Tests
 *
 * Tests for the level completion modal in adventure mode
 * Following TDD: Write tests FIRST, then implement
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LevelCompleteModal from '../LevelCompleteModal';
import type { LevelObjective } from '@/types/adventure';

// ==============================================
// TEST FIXTURES
// ==============================================

const mockObjectives: LevelObjective[] = [
  { type: 'wordCount', target: 10, current: 10, isPrimary: true, isComplete: true },
  { type: 'scoreTarget', target: 500, current: 650, isPrimary: false, isComplete: true },
  { type: 'longWords', target: 3, current: 2, isPrimary: false, isComplete: false },
];

const defaultProps = {
  isOpen: true,
  stars: 2,
  score: 1250,
  objectives: mockObjectives,
  levelNumber: 5,
  worldNumber: 1,
  onContinue: jest.fn(),
  onRetry: jest.fn(),
  onExit: jest.fn(),
};

// ==============================================
// TESTS
// ==============================================

describe('LevelCompleteModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} />);

      // THEN
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should NOT render when isOpen is false', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} isOpen={false} />);

      // THEN
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should display level complete title', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} />);

      // THEN
      expect(screen.getByText(/level complete/i)).toBeInTheDocument();
    });

    it('should display level number', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} />);

      // THEN
      expect(screen.getByText(/level 5/i)).toBeInTheDocument();
    });
  });

  describe('Star Display', () => {
    it('should display correct number of filled stars for 1 star', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} stars={1} />);

      // THEN
      const filledStars = screen.getAllByTestId('star-filled');
      const emptyStars = screen.getAllByTestId('star-empty');
      expect(filledStars.length).toBe(1);
      expect(emptyStars.length).toBe(2);
    });

    it('should display correct number of filled stars for 2 stars', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} stars={2} />);

      // THEN
      const filledStars = screen.getAllByTestId('star-filled');
      const emptyStars = screen.getAllByTestId('star-empty');
      expect(filledStars.length).toBe(2);
      expect(emptyStars.length).toBe(1);
    });

    it('should display correct number of filled stars for 3 stars', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} stars={3} />);

      // THEN
      const filledStars = screen.getAllByTestId('star-filled');
      expect(filledStars.length).toBe(3);
      expect(screen.queryByTestId('star-empty')).not.toBeInTheDocument();
    });

    it('should animate stars sequentially', () => {
      // GIVEN / WHEN
      const { container } = render(<LevelCompleteModal {...defaultProps} stars={3} />);

      // THEN
      const stars = container.querySelectorAll('[data-testid^="star-"]');
      expect(stars[0]).toHaveClass('star-animate-1');
      expect(stars[1]).toHaveClass('star-animate-2');
      expect(stars[2]).toHaveClass('star-animate-3');
    });
  });

  describe('Score Display', () => {
    it('should display the score', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} score={1250} />);

      // THEN
      expect(screen.getByText('1,250')).toBeInTheDocument();
    });

    it('should display score label', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} />);

      // THEN
      // Use exact match for the score section label
      expect(screen.getByText('Score')).toBeInTheDocument();
    });

    it('should format large scores with commas', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} score={12500} />);

      // THEN
      expect(screen.getByText('12,500')).toBeInTheDocument();
    });
  });

  describe('Objectives Summary', () => {
    it('should display completed objectives count', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} />);

      // THEN
      // 2 of 3 objectives completed in mockObjectives
      expect(screen.getByText(/Objectives: 2\/3/)).toBeInTheDocument();
    });

    it('should show checkmark for completed objectives', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} />);

      // THEN
      const completedItems = screen.getAllByTestId('objective-complete');
      expect(completedItems.length).toBe(2);
    });

    it('should show X for incomplete objectives', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} />);

      // THEN
      const incompleteItems = screen.getAllByTestId('objective-incomplete');
      expect(incompleteItems.length).toBe(1);
    });
  });

  describe('Action Buttons', () => {
    it('should call onContinue when continue button is clicked', () => {
      // GIVEN
      const onContinue = jest.fn();
      render(<LevelCompleteModal {...defaultProps} onContinue={onContinue} />);

      // WHEN
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // THEN
      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry when retry button is clicked', () => {
      // GIVEN
      const onRetry = jest.fn();
      render(<LevelCompleteModal {...defaultProps} onRetry={onRetry} />);

      // WHEN
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));

      // THEN
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should call onExit when exit button is clicked', () => {
      // GIVEN
      const onExit = jest.fn();
      render(<LevelCompleteModal {...defaultProps} onExit={onExit} />);

      // WHEN
      fireEvent.click(screen.getByRole('button', { name: /exit/i }));

      // THEN
      expect(onExit).toHaveBeenCalledTimes(1);
    });

    it('should highlight continue button as primary action', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} />);

      // THEN
      const continueButton = screen.getByRole('button', { name: /continue/i });
      expect(continueButton).toHaveClass('btn-primary');
    });
  });

  describe('Perfect Score', () => {
    it('should show celebration effect for 3 stars', () => {
      // GIVEN / WHEN
      const { container } = render(
        <LevelCompleteModal {...defaultProps} stars={3} />
      );

      // THEN
      expect(container.querySelector('.celebration-effect')).toBeInTheDocument();
    });

    it('should NOT show celebration effect for less than 3 stars', () => {
      // GIVEN / WHEN
      const { container } = render(
        <LevelCompleteModal {...defaultProps} stars={2} />
      );

      // THEN
      expect(container.querySelector('.celebration-effect')).not.toBeInTheDocument();
    });

    it('should display "Perfect!" text for 3 stars', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} stars={3} />);

      // THEN
      expect(screen.getByText(/perfect/i)).toBeInTheDocument();
    });
  });

  describe('Level Failed State', () => {
    it('should display level failed message when stars is 0', () => {
      // GIVEN
      const failedObjectives = mockObjectives.map((o) => ({
        ...o,
        isComplete: false,
        current: 0,
      }));

      // WHEN
      render(
        <LevelCompleteModal
          {...defaultProps}
          stars={0}
          objectives={failedObjectives}
        />
      );

      // THEN
      expect(screen.getByText(/try again/i)).toBeInTheDocument();
    });

    it('should hide continue button when level is failed', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} stars={0} />);

      // THEN
      expect(
        screen.queryByRole('button', { name: /continue/i })
      ).not.toBeInTheDocument();
    });

    it('should show retry as primary action when level is failed', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} stars={0} />);

      // THEN
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toHaveClass('btn-primary');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible dialog role', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} />);

      // THEN
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have accessible dialog title', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} />);

      // THEN
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('should trap focus within modal when open', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} />);

      // THEN
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });
  });

  describe('High Score', () => {
    it('should display new high score indicator when isHighScore is true', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} isHighScore />);

      // THEN
      expect(screen.getByText(/new high score/i)).toBeInTheDocument();
    });

    it('should NOT display high score indicator when isHighScore is false', () => {
      // GIVEN / WHEN
      render(<LevelCompleteModal {...defaultProps} isHighScore={false} />);

      // THEN
      expect(screen.queryByText(/new high score/i)).not.toBeInTheDocument();
    });
  });
});
