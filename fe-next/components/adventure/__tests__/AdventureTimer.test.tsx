/**
 * AdventureTimer Tests
 *
 * Tests for countdown timer display in adventure mode
 * Tests behavior and accessibility, not implementation details
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import AdventureTimer from '../AdventureTimer';

// Mock theme context — returns default theme (matches old hardcoded values)
vi.mock('@/contexts/AdventureThemeContext', () => ({
  useTimerTheme: () => ({
    normal: { bg: 'bg-neo-navy/80', text: 'text-neo-white', shadow: '' },
    warning: { bg: 'bg-neo-orange/20', text: 'text-neo-orange', shadow: '' },
    danger: { bg: 'bg-neo-red/20', text: 'text-neo-red', shadow: '' },
    critical: { bg: 'bg-neo-red/30', text: 'text-neo-red', shadow: '' },
  }),
  useHUDTheme: () => ({
    headerBg: 'bg-neo-navy/90',
    headerBorder: 'border-neo-black/40',
    sidebarBg: 'bg-neo-black/40',
    scoreAccent: 'text-neo-cyan',
    levelBadgeColor: 'bg-neo-black/40',
    levelBadgeText: 'text-neo-cyan',
    objectiveAccent: 'text-neo-lime',
    hintActiveColor: 'bg-neo-lime',
    hintActiveText: 'text-neo-black',
  }),
  useBossFightTheme: () => ({
    dialogueBg: 'bg-neo-navy/95',
    dialogueBorder: 'border-neo-white/20',
    bossNameColor: 'text-neo-red',
    hpSegmentColors: ['bg-neo-red', 'bg-neo-orange', 'bg-neo-lime'],
    telegraphColor: 'bg-neo-red/20',
    telegraphProgressColor: 'bg-neo-red',
    playerHealthNormal: 'bg-neo-lime',
    playerHealthLow: 'bg-neo-red',
    phaseColors: {
      phase1: { bg: 'bg-neo-lime/20', text: 'text-neo-lime' },
      phase2: { bg: 'bg-neo-orange/20', text: 'text-neo-orange' },
      enraged: { bg: 'bg-neo-red/20', text: 'text-neo-red' },
    },
    avatarGlow: 'rgba(239, 68, 68, 0.4)',
    victoryGlow: 'rgba(163, 230, 53, 0.6)',
    arenaEffect: 'none',
  }),
}));

// ==============================================
// TESTS
// ==============================================

describe('AdventureTimer', () => {
  describe('Time Display', () => {
    it('should display timer role element', () => {
      // GIVEN
      const timeInSeconds = 125; // 2:05

      // WHEN
      render(<AdventureTimer timeRemaining={timeInSeconds} />);

      // THEN
      expect(screen.getByRole('timer')).toBeInTheDocument();
    });

    it('should display minutes and seconds digits', () => {
      // GIVEN
      const timeInSeconds = 125; // 2:05

      // WHEN
      const { container } = render(<AdventureTimer timeRemaining={timeInSeconds} />);

      // THEN - Each digit is rendered separately
      // Minutes: 0, 2 and Seconds: 0, 5
      const digitSpans = container.querySelectorAll('.font-mono span');
      expect(digitSpans.length).toBeGreaterThanOrEqual(4);
    });

    it('should display zero time correctly', () => {
      // GIVEN
      const timeInSeconds = 0;

      // WHEN
      render(<AdventureTimer timeRemaining={timeInSeconds} />);

      // THEN
      const timer = screen.getByRole('timer');
      expect(timer).toHaveAttribute('aria-label', '0 seconds remaining');
    });

    it('should include colon separator', () => {
      // GIVEN
      const timeInSeconds = 60;

      // WHEN
      render(<AdventureTimer timeRemaining={timeInSeconds} />);

      // THEN
      expect(screen.getByText(':')).toBeInTheDocument();
    });
  });

  describe('Urgency States', () => {
    it('should apply normal styling when time is adequate (>30s)', () => {
      // GIVEN
      const timeInSeconds = 60;

      // WHEN
      const { container } = render(
        <AdventureTimer timeRemaining={timeInSeconds} />
      );

      // THEN - Normal state uses navy background
      const timer = container.firstChild as HTMLElement;
      expect(timer.className).toContain('bg-neo-navy');
      expect(timer.className).toContain('text-neo-white');
    });

    it('should apply warning styling when <30 seconds', () => {
      // GIVEN
      const timeInSeconds = 25;

      // WHEN
      const { container } = render(
        <AdventureTimer timeRemaining={timeInSeconds} />
      );

      // THEN - Warning state uses orange styling
      const timer = container.firstChild as HTMLElement;
      expect(timer.className).toContain('bg-neo-orange');
      expect(timer.className).toContain('text-neo-orange');
    });

    it('should apply danger styling when <10 seconds', () => {
      // GIVEN
      const timeInSeconds = 8;

      // WHEN
      const { container } = render(
        <AdventureTimer timeRemaining={timeInSeconds} />
      );

      // THEN - Danger state uses red styling
      const timer = container.firstChild as HTMLElement;
      expect(timer.className).toContain('bg-neo-red');
      expect(timer.className).toContain('text-neo-red');
    });

    it('should apply danger styling at exactly 10 seconds', () => {
      // GIVEN
      const timeInSeconds = 10;

      // WHEN
      const { container } = render(
        <AdventureTimer timeRemaining={timeInSeconds} />
      );

      // THEN - 10 seconds is danger (threshold is <=10)
      const timer = container.firstChild as HTMLElement;
      expect(timer.className).toContain('bg-neo-red');
    });

    it('should apply critical styling when <=5 seconds', () => {
      // GIVEN
      const timeInSeconds = 5;

      // WHEN
      const { container } = render(
        <AdventureTimer timeRemaining={timeInSeconds} />
      );

      // THEN - Critical state uses intense red
      const timer = container.firstChild as HTMLElement;
      expect(timer.className).toContain('bg-neo-red');
    });
  });

  describe('Visual Elements', () => {
    it('should display clock icon in normal state', () => {
      // GIVEN
      const timeInSeconds = 60;

      // WHEN
      const { container } = render(
        <AdventureTimer timeRemaining={timeInSeconds} />
      );

      // THEN - Should have an SVG icon (Clock from lucide)
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should display alert icon in critical state', () => {
      // GIVEN
      const timeInSeconds = 3;

      // WHEN
      const { container } = render(
        <AdventureTimer timeRemaining={timeInSeconds} />
      );

      // THEN - Should have an SVG icon (AlertTriangle from lucide)
      expect(container.querySelector('svg')).toBeInTheDocument();
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

    it('should indicate urgency with assertive aria-live when in danger', () => {
      // GIVEN
      const timeInSeconds = 5;

      // WHEN
      render(<AdventureTimer timeRemaining={timeInSeconds} />);

      // THEN
      const timer = screen.getByRole('timer');
      expect(timer).toHaveAttribute('aria-live', 'assertive');
    });

    it('should use polite aria-live when time is adequate', () => {
      // GIVEN
      const timeInSeconds = 60;

      // WHEN
      render(<AdventureTimer timeRemaining={timeInSeconds} />);

      // THEN
      const timer = screen.getByRole('timer');
      expect(timer).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Size Variants', () => {
    it('should support compact size with smaller text', () => {
      // GIVEN
      const timeInSeconds = 60;

      // WHEN
      const { container } = render(
        <AdventureTimer timeRemaining={timeInSeconds} size="compact" />
      );

      // THEN - Compact uses smaller text classes
      const timer = container.firstChild as HTMLElement;
      expect(timer.className).toContain('text-sm');
    });

    it('should support normal size with medium text', () => {
      // GIVEN
      const timeInSeconds = 60;

      // WHEN
      const { container } = render(
        <AdventureTimer timeRemaining={timeInSeconds} size="normal" />
      );

      // THEN - Normal uses medium text classes
      const timer = container.firstChild as HTMLElement;
      expect(timer.className).toContain('text-lg');
    });

    it('should support large size with larger text', () => {
      // GIVEN
      const timeInSeconds = 60;

      // WHEN
      const { container } = render(
        <AdventureTimer timeRemaining={timeInSeconds} size="large" />
      );

      // THEN - Large uses larger text classes
      const timer = container.firstChild as HTMLElement;
      expect(timer.className).toContain('text-3xl');
    });

    it('should default to normal size', () => {
      // GIVEN
      const timeInSeconds = 60;

      // WHEN
      const { container } = render(
        <AdventureTimer timeRemaining={timeInSeconds} />
      );

      // THEN - Default is normal size
      const timer = container.firstChild as HTMLElement;
      expect(timer.className).toContain('text-lg');
    });
  });

  describe('Custom className', () => {
    it('should accept custom className prop', () => {
      // GIVEN
      const timeInSeconds = 60;
      const customClass = 'my-custom-class';

      // WHEN
      const { container } = render(
        <AdventureTimer timeRemaining={timeInSeconds} className={customClass} />
      );

      // THEN
      const timer = container.firstChild as HTMLElement;
      expect(timer.className).toContain(customClass);
    });
  });
});
