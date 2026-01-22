/**
 * AdventureTimer Tests
 *
 * Tests for countdown timer display in adventure mode
 * Following TDD: Write tests FIRST, then implement
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import AdventureTimer from '../AdventureTimer';

// ==============================================
// TESTS
// ==============================================

describe('AdventureTimer', () => {
  describe('Time Formatting', () => {
    it('should display time in MM:SS format', () => {
      // GIVEN
      const timeInSeconds = 125; // 2:05

      // WHEN
      render(<AdventureTimer timeRemaining={timeInSeconds} />);

      // THEN
      expect(screen.getByText('2:05')).toBeInTheDocument();
    });

    it('should pad seconds with leading zero', () => {
      // GIVEN
      const timeInSeconds = 65; // 1:05

      // WHEN
      render(<AdventureTimer timeRemaining={timeInSeconds} />);

      // THEN
      expect(screen.getByText('1:05')).toBeInTheDocument();
    });

    it('should display 0:00 when time is zero', () => {
      // GIVEN
      const timeInSeconds = 0;

      // WHEN
      render(<AdventureTimer timeRemaining={timeInSeconds} />);

      // THEN
      expect(screen.getByText('0:00')).toBeInTheDocument();
    });

    it('should handle single digit minutes correctly', () => {
      // GIVEN
      const timeInSeconds = 540; // 9:00

      // WHEN
      render(<AdventureTimer timeRemaining={timeInSeconds} />);

      // THEN
      expect(screen.getByText('9:00')).toBeInTheDocument();
    });
  });

  describe('Urgency States', () => {
    it('should apply normal color when time is adequate (>30s)', () => {
      // GIVEN
      const timeInSeconds = 60;

      // WHEN
      const { container } = render(
        <AdventureTimer timeRemaining={timeInSeconds} />
      );

      // THEN
      expect(container.firstChild).toHaveClass('timer-normal');
      expect(container.firstChild).not.toHaveClass('timer-warning');
      expect(container.firstChild).not.toHaveClass('timer-danger');
    });

    it('should apply warning color when <30 seconds', () => {
      // GIVEN
      const timeInSeconds = 25;

      // WHEN
      const { container } = render(
        <AdventureTimer timeRemaining={timeInSeconds} />
      );

      // THEN
      expect(container.firstChild).toHaveClass('timer-warning');
      expect(container.firstChild).not.toHaveClass('timer-normal');
      expect(container.firstChild).not.toHaveClass('timer-danger');
    });

    it('should apply danger color when <10 seconds', () => {
      // GIVEN
      const timeInSeconds = 8;

      // WHEN
      const { container } = render(
        <AdventureTimer timeRemaining={timeInSeconds} />
      );

      // THEN
      expect(container.firstChild).toHaveClass('timer-danger');
      expect(container.firstChild).not.toHaveClass('timer-normal');
      expect(container.firstChild).not.toHaveClass('timer-warning');
    });

    it('should apply danger color at exactly 10 seconds', () => {
      // GIVEN
      const timeInSeconds = 10;

      // WHEN
      const { container } = render(
        <AdventureTimer timeRemaining={timeInSeconds} />
      );

      // THEN - 10 seconds should still be warning (danger is <10)
      expect(container.firstChild).toHaveClass('timer-warning');
    });
  });

  describe('Visual Effects', () => {
    it('should show pulse animation when in danger zone', () => {
      // GIVEN
      const timeInSeconds = 5;

      // WHEN
      const { container } = render(
        <AdventureTimer timeRemaining={timeInSeconds} />
      );

      // THEN
      expect(container.querySelector('.timer-pulse')).toBeInTheDocument();
    });

    it('should NOT show pulse animation when time is adequate', () => {
      // GIVEN
      const timeInSeconds = 60;

      // WHEN
      const { container } = render(
        <AdventureTimer timeRemaining={timeInSeconds} />
      );

      // THEN
      expect(container.querySelector('.timer-pulse')).not.toBeInTheDocument();
    });

    it('should display timer icon', () => {
      // GIVEN
      const timeInSeconds = 60;

      // WHEN
      render(<AdventureTimer timeRemaining={timeInSeconds} />);

      // THEN
      expect(screen.getByTestId('timer-icon')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible role', () => {
      // GIVEN
      const timeInSeconds = 60;

      // WHEN
      render(<AdventureTimer timeRemaining={timeInSeconds} />);

      // THEN
      expect(screen.getByRole('timer')).toBeInTheDocument();
    });

    it('should have accessible label with time remaining', () => {
      // GIVEN
      const timeInSeconds = 90;

      // WHEN
      render(<AdventureTimer timeRemaining={timeInSeconds} />);

      // THEN
      const timer = screen.getByRole('timer');
      expect(timer).toHaveAttribute(
        'aria-label',
        expect.stringContaining('90')
      );
    });

    it('should indicate urgency in aria-live region when in danger', () => {
      // GIVEN
      const timeInSeconds = 5;

      // WHEN
      render(<AdventureTimer timeRemaining={timeInSeconds} />);

      // THEN
      const timer = screen.getByRole('timer');
      expect(timer).toHaveAttribute('aria-live', 'assertive');
    });

    it('should NOT use assertive aria-live when time is adequate', () => {
      // GIVEN
      const timeInSeconds = 60;

      // WHEN
      render(<AdventureTimer timeRemaining={timeInSeconds} />);

      // THEN
      const timer = screen.getByRole('timer');
      expect(timer).not.toHaveAttribute('aria-live', 'assertive');
    });
  });

  describe('Size Variants', () => {
    it('should support compact size', () => {
      // GIVEN
      const timeInSeconds = 60;

      // WHEN
      const { container } = render(
        <AdventureTimer timeRemaining={timeInSeconds} size="compact" />
      );

      // THEN
      expect(container.firstChild).toHaveClass('timer-compact');
    });

    it('should support large size', () => {
      // GIVEN
      const timeInSeconds = 60;

      // WHEN
      const { container } = render(
        <AdventureTimer timeRemaining={timeInSeconds} size="large" />
      );

      // THEN
      expect(container.firstChild).toHaveClass('timer-large');
    });
  });
});
