/**
 * SegmentedHPBar Component Tests
 *
 * Tests for the 3-segment HP bar that shows boss health with phase thresholds.
 * Segments: 0-33% (red), 33-66% (yellow/lime), 66-100% (green/lime)
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import SegmentedHPBar from './SegmentedHPBar';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock the theme context — defaults match DEFAULT_BOSS_FIGHT_THEME
vi.mock('@/contexts/AdventureThemeContext', () => ({
  useBossFightTheme: () => ({
    hpSegmentColors: ['bg-neo-red', 'bg-neo-orange', 'bg-neo-lime'],
    dialogueBg: 'bg-neo-navy/95',
    dialogueBorder: 'border-neo-white/20',
    bossNameColor: 'text-neo-red',
    telegraphColor: 'bg-neo-red/20',
    telegraphProgressColor: 'bg-neo-red',
    playerHealthNormal: 'bg-neo-lime',
    playerHealthLow: 'bg-neo-red',
    phaseColors: {
      phase1: { bg: 'bg-neo-cyan', text: 'text-neo-black' },
      phase2: { bg: 'bg-neo-lime', text: 'text-neo-black' },
      enraged: { bg: 'bg-neo-red', text: 'text-neo-white' },
    },
    avatarGlow: 'rgba(239, 68, 68, 0.4)',
    victoryGlow: 'rgba(163, 230, 53, 0.6)',
    arenaEffect: 'none',
  }),
}));

// ==============================================
// TEST HELPERS
// ==============================================

interface RenderProps {
  currentHP: number;
  maxHP: number;
  phase?: 'phase1' | 'phase2' | 'enraged';
  bossName?: string;
}

/**
 * Render SegmentedHPBar with LanguageProvider
 */
function renderHPBar({
  currentHP,
  maxHP,
  phase = 'phase1',
  bossName = 'adventure.bosses.msGrammar.name',
}: RenderProps) {
  return render(
    <LanguageProvider initialLanguage="en">
      <SegmentedHPBar
        currentHP={currentHP}
        maxHP={maxHP}
        phase={phase}
        bossName={bossName}
      />
    </LanguageProvider>
  );
}

/**
 * Get the HP bar container by test ID
 */
function getHPBarContainer() {
  return screen.getByTestId('segmented-hp-bar');
}

/**
 * Get all segment elements
 */
function getSegments() {
  const container = getHPBarContainer();
  return container.querySelectorAll('[data-segment]');
}

/**
 * Get a specific segment by index (1, 2, or 3)
 */
function getSegment(index: 1 | 2 | 3) {
  const container = getHPBarContainer();
  return container.querySelector(`[data-segment="${index}"]`);
}

// ==============================================
// TEST SUITES
// ==============================================

describe('SegmentedHPBar', () => {
  describe('Structure', () => {
    it('should render 3 segments', () => {
      renderHPBar({ currentHP: 1000, maxHP: 1000 });

      const segments = getSegments();
      expect(segments).toHaveLength(3);
    });

    it('should render a container with role="progressbar"', () => {
      renderHPBar({ currentHP: 500, maxHP: 1000 });

      const container = screen.getByRole('progressbar');
      expect(container).toBeInTheDocument();
    });

    it('should have aria-valuemin and aria-valuemax attributes', () => {
      renderHPBar({ currentHP: 500, maxHP: 1000 });

      const container = screen.getByRole('progressbar');
      expect(container).toHaveAttribute('aria-valuemin', '0');
      expect(container).toHaveAttribute('aria-valuemax', '100');
    });

    it('should have aria-valuenow reflecting current HP percentage', () => {
      renderHPBar({ currentHP: 500, maxHP: 1000 });

      const container = screen.getByRole('progressbar');
      expect(container).toHaveAttribute('aria-valuenow', '50');
    });
  });

  describe('Full HP (100%)', () => {
    it('should fill all 3 segments when HP is 100%', () => {
      renderHPBar({ currentHP: 1000, maxHP: 1000 });

      const segment1 = getSegment(1);
      const segment2 = getSegment(2);
      const segment3 = getSegment(3);

      // All segments should have fill indicators (100% filled)
      expect(segment1).toHaveAttribute('data-fill', '100');
      expect(segment2).toHaveAttribute('data-fill', '100');
      expect(segment3).toHaveAttribute('data-fill', '100');
    });
  });

  describe('Phase 1 HP (66-100%)', () => {
    it('should have segment 3 partially filled at 80% HP', () => {
      // 80% HP: segments 1&2 full (66%), segment 3 partial
      // Segment 3 covers 66-100% (34% range)
      // At 80%: (80-66) / 34 * 100 = 41% fill in segment 3
      renderHPBar({ currentHP: 800, maxHP: 1000 });

      const segment3 = getSegment(3);
      const fill = parseInt(segment3?.getAttribute('data-fill') || '0', 10);
      // Approximately 41-42% fill
      expect(fill).toBeGreaterThan(35);
      expect(fill).toBeLessThan(50);
    });

    it('should have segment 3 exactly at threshold when HP is 66%', () => {
      renderHPBar({ currentHP: 660, maxHP: 1000 });

      const segment1 = getSegment(1);
      const segment2 = getSegment(2);
      const segment3 = getSegment(3);

      expect(segment1).toHaveAttribute('data-fill', '100');
      expect(segment2).toHaveAttribute('data-fill', '100');
      // Segment 3 should be at 0% (just at threshold)
      expect(segment3).toHaveAttribute('data-fill', '0');
    });
  });

  describe('Phase 2 HP (33-66%)', () => {
    it('should have segment 2 partially filled at 50% HP', () => {
      // 50% HP: segment 1 full (33%), segment 2 partial
      // Segment 2 covers 33-66% (33% range)
      // At 50%: (50-33) / 33 * 100 = ~51.5% fill
      renderHPBar({ currentHP: 500, maxHP: 1000 });

      const segment2 = getSegment(2);
      const fill = parseInt(segment2?.getAttribute('data-fill') || '0', 10);
      expect(fill).toBeGreaterThan(45);
      expect(fill).toBeLessThan(60);
    });

    it('should have segment 3 empty when HP is 50%', () => {
      renderHPBar({ currentHP: 500, maxHP: 1000 });

      const segment3 = getSegment(3);
      expect(segment3).toHaveAttribute('data-fill', '0');
    });

    it('should have segment 1 full when HP is 50%', () => {
      renderHPBar({ currentHP: 500, maxHP: 1000 });

      const segment1 = getSegment(1);
      expect(segment1).toHaveAttribute('data-fill', '100');
    });
  });

  describe('Enraged HP (0-33%)', () => {
    it('should have only segment 1 with HP at 20%', () => {
      renderHPBar({ currentHP: 200, maxHP: 1000 });

      const segment1 = getSegment(1);
      const segment2 = getSegment(2);
      const segment3 = getSegment(3);

      // Segment 1: 20% / 33% * 100 = ~60.6%
      const fill1 = parseInt(segment1?.getAttribute('data-fill') || '0', 10);
      expect(fill1).toBeGreaterThan(55);
      expect(fill1).toBeLessThan(70);

      expect(segment2).toHaveAttribute('data-fill', '0');
      expect(segment3).toHaveAttribute('data-fill', '0');
    });

    it('should have all segments empty when HP is 0', () => {
      renderHPBar({ currentHP: 0, maxHP: 1000 });

      const segment1 = getSegment(1);
      const segment2 = getSegment(2);
      const segment3 = getSegment(3);

      expect(segment1).toHaveAttribute('data-fill', '0');
      expect(segment2).toHaveAttribute('data-fill', '0');
      expect(segment3).toHaveAttribute('data-fill', '0');
    });
  });

  describe('Segment Colors', () => {
    it('should have red color for segment 1 (enraged zone)', () => {
      renderHPBar({ currentHP: 200, maxHP: 1000 });

      const segment1 = getSegment(1);
      // Check for red color class on the fill element inside segment
      const fill = segment1?.querySelector('[data-fill-bar]');
      expect(fill).toHaveClass('bg-neo-red');
    });

    it('should have theme color for segment 2 (phase 2 zone)', () => {
      renderHPBar({ currentHP: 500, maxHP: 1000 });

      const segment2 = getSegment(2);
      const fill = segment2?.querySelector('[data-fill-bar]');
      expect(fill).toHaveClass('bg-neo-orange');
    });

    it('should have theme color for segment 3 (phase 1 zone)', () => {
      renderHPBar({ currentHP: 1000, maxHP: 1000 });

      const segment3 = getSegment(3);
      const fill = segment3?.querySelector('[data-fill-bar]');
      expect(fill).toHaveClass('bg-neo-lime');
    });
  });

  describe('Segment Dividers', () => {
    it('should have dividers between segments', () => {
      renderHPBar({ currentHP: 1000, maxHP: 1000 });

      const container = getHPBarContainer();
      const dividers = container.querySelectorAll('[data-divider]');
      // 2 dividers between 3 segments
      expect(dividers).toHaveLength(2);
    });

    it('should show 33% marker on divider', () => {
      renderHPBar({ currentHP: 1000, maxHP: 1000 });

      // Dividers should be positioned at 33% and 66%
      const container = getHPBarContainer();
      const dividers = container.querySelectorAll('[data-divider]');

      // First divider at 33%
      expect(dividers[0]).toHaveAttribute('data-threshold', '33');
      // Second divider at 66%
      expect(dividers[1]).toHaveAttribute('data-threshold', '66');
    });
  });

  describe('HP Display', () => {
    it('should display current/max HP text', () => {
      renderHPBar({ currentHP: 750, maxHP: 1000 });

      expect(screen.getByText('750 / 1000')).toBeInTheDocument();
    });

    it('should update HP text when HP changes', () => {
      const { rerender } = renderHPBar({ currentHP: 1000, maxHP: 1000 });
      expect(screen.getByText('1000 / 1000')).toBeInTheDocument();

      rerender(
        <LanguageProvider initialLanguage="en">
          <SegmentedHPBar
            currentHP={500}
            maxHP={1000}
            phase="phase2"
            bossName="adventure.bosses.msGrammar.name"
          />
        </LanguageProvider>
      );

      expect(screen.getByText('500 / 1000')).toBeInTheDocument();
    });
  });

  describe('Neo-Brutalist Styling', () => {
    it('should have border-3 and border-neo-black', () => {
      renderHPBar({ currentHP: 1000, maxHP: 1000 });

      const container = getHPBarContainer();
      expect(container).toHaveClass('border-3');
      expect(container).toHaveClass('border-neo-black');
    });

    it('should have shadow-hard styling', () => {
      renderHPBar({ currentHP: 1000, maxHP: 1000 });

      const container = getHPBarContainer();
      expect(container).toHaveClass('shadow-hard');
    });

    it('should have rounded-neo styling', () => {
      renderHPBar({ currentHP: 1000, maxHP: 1000 });

      const container = getHPBarContainer();
      expect(container).toHaveClass('rounded-neo');
    });
  });

  describe('Phase Indicator Integration', () => {
    it('should show PhaseIndicator component', () => {
      renderHPBar({ currentHP: 1000, maxHP: 1000, phase: 'phase1' });

      const phaseIndicator = screen.getByRole('status');
      expect(phaseIndicator).toBeInTheDocument();
    });

    it('should update PhaseIndicator when phase changes', () => {
      const { rerender } = renderHPBar({ currentHP: 600, maxHP: 1000, phase: 'phase1' });

      let indicator = screen.getByRole('status');
      expect(indicator).toHaveClass('bg-neo-cyan');

      rerender(
        <LanguageProvider initialLanguage="en">
          <SegmentedHPBar
            currentHP={300}
            maxHP={1000}
            phase="enraged"
            bossName="adventure.bosses.msGrammar.name"
          />
        </LanguageProvider>
      );

      indicator = screen.getByRole('status');
      expect(indicator).toHaveClass('bg-neo-red');
    });
  });

  describe('Animation', () => {
    it('should have motion-safe animation classes', () => {
      renderHPBar({ currentHP: 800, maxHP: 1000 });

      const segments = getSegments();
      // Each segment should have transition classes for smooth animation
      segments.forEach(segment => {
        const fill = segment.querySelector('[data-fill-bar]');
        expect(fill).toHaveClass('transition-all');
      });
    });

    it('should respect reduced motion preference', () => {
      renderHPBar({ currentHP: 800, maxHP: 1000 });

      const segments = getSegments();
      segments.forEach(segment => {
        const fill = segment.querySelector('[data-fill-bar]');
        expect(fill).toHaveClass('motion-reduce:transition-none');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle 0 maxHP gracefully', () => {
      renderHPBar({ currentHP: 0, maxHP: 0 });

      const container = screen.getByRole('progressbar');
      expect(container).toHaveAttribute('aria-valuenow', '0');
    });

    it('should clamp HP percentage to 100% if currentHP > maxHP', () => {
      renderHPBar({ currentHP: 1500, maxHP: 1000 });

      const segment1 = getSegment(1);
      const segment2 = getSegment(2);
      const segment3 = getSegment(3);

      // All segments should be 100% filled
      expect(segment1).toHaveAttribute('data-fill', '100');
      expect(segment2).toHaveAttribute('data-fill', '100');
      expect(segment3).toHaveAttribute('data-fill', '100');
    });

    it('should handle negative HP gracefully', () => {
      renderHPBar({ currentHP: -100, maxHP: 1000 });

      const segment1 = getSegment(1);
      const segment2 = getSegment(2);
      const segment3 = getSegment(3);

      // All segments should be empty
      expect(segment1).toHaveAttribute('data-fill', '0');
      expect(segment2).toHaveAttribute('data-fill', '0');
      expect(segment3).toHaveAttribute('data-fill', '0');
    });
  });
});
