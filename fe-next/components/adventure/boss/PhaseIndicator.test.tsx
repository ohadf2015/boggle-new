/**
 * PhaseIndicator Component Tests
 *
 * Tests for the phase indicator badge that shows current boss phase (1, 2, or ENRAGED).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import PhaseIndicator from './PhaseIndicator';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock the theme context
vi.mock('@/contexts/AdventureThemeContext', () => ({
  useBossFightTheme: () => ({
    phaseColors: {
      phase1: { bg: 'bg-neo-cyan', text: 'text-neo-black' },
      phase2: { bg: 'bg-neo-lime', text: 'text-neo-black' },
      enraged: { bg: 'bg-neo-red', text: 'text-neo-white' },
    },
    hpSegmentColors: ['bg-neo-red', 'bg-neo-orange', 'bg-neo-lime'],
    dialogueBg: 'bg-neo-navy/95',
    dialogueBorder: 'border-neo-white/20',
    bossNameColor: 'text-neo-red',
    telegraphColor: 'bg-neo-red/20',
    telegraphProgressColor: 'bg-neo-red',
    playerHealthNormal: 'bg-neo-lime',
    playerHealthLow: 'bg-neo-red',
    avatarGlow: 'rgba(239, 68, 68, 0.4)',
    victoryGlow: 'rgba(163, 230, 53, 0.6)',
    arenaEffect: 'none',
  }),
}));

// ==============================================
// TEST HELPERS
// ==============================================

/**
 * Render PhaseIndicator with LanguageProvider
 */
function renderPhaseIndicator(phase: 'phase1' | 'phase2' | 'enraged') {
  return render(
    <LanguageProvider initialLanguage="en">
      <PhaseIndicator phase={phase} />
    </LanguageProvider>
  );
}

/**
 * Get the badge element by role
 */
function getBadge() {
  return screen.getByRole('status');
}

/**
 * Get the text span inside the badge
 */
function getTextSpan() {
  const badge = getBadge();
  return badge.querySelector('span');
}

// ==============================================
// TEST SUITES
// ==============================================

describe('PhaseIndicator', () => {
  describe('Phase 1 rendering', () => {
    it('should render a status element for phase1', () => {
      renderPhaseIndicator('phase1');

      const badge = getBadge();
      expect(badge).toBeInTheDocument();
    });

    it('should have neo-cyan background for phase1', () => {
      renderPhaseIndicator('phase1');

      const badge = getBadge();
      expect(badge).toHaveClass('bg-neo-cyan');
    });

    it('should render with neo-brutalist border styling', () => {
      renderPhaseIndicator('phase1');

      const badge = getBadge();
      expect(badge).toHaveClass('border-3');
      expect(badge).toHaveClass('border-neo-black');
    });

    it('should have text-neo-black color for phase1', () => {
      renderPhaseIndicator('phase1');

      const badge = getBadge();
      expect(badge).toHaveClass('text-neo-black');
    });
  });

  describe('Phase 2 rendering', () => {
    it('should render a status element for phase2', () => {
      renderPhaseIndicator('phase2');

      const badge = getBadge();
      expect(badge).toBeInTheDocument();
    });

    it('should have neo-lime background for phase2', () => {
      renderPhaseIndicator('phase2');

      const badge = getBadge();
      expect(badge).toHaveClass('bg-neo-lime');
    });

    it('should have text-neo-black color for phase2', () => {
      renderPhaseIndicator('phase2');

      const badge = getBadge();
      expect(badge).toHaveClass('text-neo-black');
    });
  });

  describe('Enraged phase rendering', () => {
    it('should render a status element for enraged phase', () => {
      renderPhaseIndicator('enraged');

      const badge = getBadge();
      expect(badge).toBeInTheDocument();
    });

    it('should have neo-red background for enraged phase', () => {
      renderPhaseIndicator('enraged');

      const badge = getBadge();
      expect(badge).toHaveClass('bg-neo-red');
    });

    it('should have animation class for enraged phase', () => {
      renderPhaseIndicator('enraged');

      const badge = getBadge();
      // Enraged badge should have animation (shake or pulse effect)
      expect(badge).toHaveClass('animate-neo-shake');
    });

    it('should have text-neo-white color for enraged phase', () => {
      renderPhaseIndicator('enraged');

      const badge = getBadge();
      expect(badge).toHaveClass('text-neo-white');
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate aria-label for phase1', () => {
      renderPhaseIndicator('phase1');

      const badge = getBadge();
      expect(badge).toHaveAttribute('aria-label', expect.stringContaining('Phase 1'));
    });

    it('should have appropriate aria-label for phase2', () => {
      renderPhaseIndicator('phase2');

      const badge = getBadge();
      expect(badge).toHaveAttribute('aria-label', expect.stringContaining('Phase 2'));
    });

    it('should have appropriate aria-label for enraged', () => {
      renderPhaseIndicator('enraged');

      const badge = getBadge();
      expect(badge).toHaveAttribute('aria-label', expect.stringContaining('Enraged'));
    });

    it('should have role="status"', () => {
      renderPhaseIndicator('phase1');

      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have consistent font styling across phases', () => {
      renderPhaseIndicator('phase1');

      const text = getTextSpan();
      expect(text).toHaveClass('font-neo-display');
      expect(text).toHaveClass('font-bold');
      expect(text).toHaveClass('uppercase');
    });

    it('should have shadow-hard-sm styling', () => {
      renderPhaseIndicator('phase2');

      const badge = getBadge();
      expect(badge).toHaveClass('shadow-hard-sm');
    });

    it('should have rounded-neo border radius', () => {
      renderPhaseIndicator('phase1');

      const badge = getBadge();
      expect(badge).toHaveClass('rounded-neo');
    });

    it('should have tracking-wide for text', () => {
      renderPhaseIndicator('phase1');

      const text = getTextSpan();
      expect(text).toHaveClass('tracking-wide');
    });
  });

  describe('Reduced motion', () => {
    it('should have motion-reduce:animate-none class for enraged', () => {
      renderPhaseIndicator('enraged');

      const badge = getBadge();
      // Should have motion-reduce variant for accessibility
      expect(badge).toHaveClass('motion-reduce:animate-none');
    });

    it('should not have animation classes for phase1', () => {
      renderPhaseIndicator('phase1');

      const badge = getBadge();
      expect(badge).not.toHaveClass('animate-neo-shake');
    });

    it('should not have animation classes for phase2', () => {
      renderPhaseIndicator('phase2');

      const badge = getBadge();
      expect(badge).not.toHaveClass('animate-neo-shake');
    });
  });
});
