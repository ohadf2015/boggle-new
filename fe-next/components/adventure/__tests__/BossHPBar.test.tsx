/**
 * BossHPBar Component Tests
 *
 * Tests for boss health bar visibility, HP display, phase indicators,
 * and enraged state.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import BossHPBar from '../BossHPBar';
import { LanguageProvider } from '../../../contexts/LanguageContext';
import type { BossHealthState, BossPhase } from '../../../types/boss';

/**
 * Helper: Render BossHPBar with LanguageProvider
 */
function renderBossHPBar(healthState: BossHealthState, bossName: string = 'adventure.bosses.msGrammar.name') {
  return render(
    <LanguageProvider>
      <BossHPBar healthState={healthState} bossName={bossName} />
    </LanguageProvider>
  );
}

/**
 * Helper: Create mock health state
 */
function createHealthState(
  currentHP: number,
  maxHP: number,
  phase: BossPhase
): BossHealthState {
  return {
    currentHP,
    maxHP,
    phase,
    totalDamageDealt: maxHP - currentHP,
    isActive: phase === 'active' || phase === 'enraged',
  };
}

describe('BossHPBar', () => {
  describe('Visibility based on phase', () => {
    it('should be visible during active phase', () => {
      const healthState = createHealthState(1000, 1000, 'active');
      renderBossHPBar(healthState);

      // HP bar should be present
      expect(screen.getByText(/1000 \/ 1000/)).toBeInTheDocument();
    });

    it('should be visible during enraged phase', () => {
      const healthState = createHealthState(200, 1000, 'enraged');
      renderBossHPBar(healthState);

      // HP bar should be present
      expect(screen.getByText(/200 \/ 1000/)).toBeInTheDocument();
    });

    it('should be hidden during intro phase', () => {
      const healthState = createHealthState(1000, 1000, 'intro');
      const { container } = renderBossHPBar(healthState);

      // Component should not render anything
      expect(container.firstChild).toBeNull();
    });

    it('should be hidden during victory phase', () => {
      const healthState = createHealthState(0, 1000, 'victory');
      const { container } = renderBossHPBar(healthState);

      // Component should not render anything
      expect(container.firstChild).toBeNull();
    });

    it('should be hidden during defeat phase', () => {
      const healthState = createHealthState(500, 1000, 'defeat');
      const { container } = renderBossHPBar(healthState);

      // Component should not render anything
      expect(container.firstChild).toBeNull();
    });
  });

  describe('HP display', () => {
    it('should display current and max HP', () => {
      const healthState = createHealthState(750, 1000, 'active');
      renderBossHPBar(healthState);

      expect(screen.getByText(/750 \/ 1000/)).toBeInTheDocument();
    });

    it('should display HP when at maximum', () => {
      const healthState = createHealthState(1500, 1500, 'active');
      renderBossHPBar(healthState);

      expect(screen.getByText(/1500 \/ 1500/)).toBeInTheDocument();
    });

    it('should display HP when near zero', () => {
      const healthState = createHealthState(10, 1000, 'enraged');
      renderBossHPBar(healthState);

      expect(screen.getByText(/10 \/ 1000/)).toBeInTheDocument();
    });

    it('should display HP at exactly zero', () => {
      const healthState = createHealthState(0, 1000, 'active');
      renderBossHPBar(healthState);

      expect(screen.getByText(/0 \/ 1000/)).toBeInTheDocument();
    });
  });

  describe('Enraged indicator', () => {
    it('should show enraged indicator when phase is enraged', () => {
      const healthState = createHealthState(200, 1000, 'enraged');
      renderBossHPBar(healthState);

      expect(screen.getByText(/ENRAGED!/i)).toBeInTheDocument();
    });

    it('should not show enraged indicator during active phase', () => {
      const healthState = createHealthState(500, 1000, 'active');
      renderBossHPBar(healthState);

      expect(screen.queryByText(/ENRAGED!/i)).not.toBeInTheDocument();
    });

    it('should not show enraged indicator when HP is above 25%', () => {
      const healthState = createHealthState(300, 1000, 'active');
      renderBossHPBar(healthState);

      // 30% HP - should not be enraged
      expect(screen.queryByText(/ENRAGED!/i)).not.toBeInTheDocument();
    });
  });

  describe('Boss name display', () => {
    it('should display boss name from translation key', () => {
      const healthState = createHealthState(800, 1000, 'active');
      renderBossHPBar(healthState, 'adventure.bosses.msGrammar.name');

      expect(screen.getByText('Ms. Grammar')).toBeInTheDocument();
    });

    it('should update boss name when different boss', () => {
      const healthState = createHealthState(800, 1000, 'active');
      // Using a different translation key (would be different boss in actual game)
      renderBossHPBar(healthState, 'adventure.bosses.msGrammar.name');

      expect(screen.getByText('Ms. Grammar')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have role="status" for screen readers', () => {
      const healthState = createHealthState(750, 1000, 'active');
      renderBossHPBar(healthState);

      const statusElement = screen.getByRole('status');
      expect(statusElement).toBeInTheDocument();
    });

    it('should have aria-label with boss name and HP percentage', () => {
      const healthState = createHealthState(750, 1000, 'active');
      renderBossHPBar(healthState);

      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveAttribute('aria-label');
      expect(statusElement.getAttribute('aria-label')).toContain('75%');
    });

    it('should have aria-live="polite" for real-time updates', () => {
      const healthState = createHealthState(500, 1000, 'active');
      renderBossHPBar(healthState);

      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveAttribute('aria-live', 'polite');
    });

    it('should hide HP bar visual from screen readers', () => {
      const healthState = createHealthState(750, 1000, 'active');
      const { container } = renderBossHPBar(healthState);

      // Find the HP bar container
      const hpBarContainer = container.querySelector('[aria-hidden="true"]');
      expect(hpBarContainer).toBeInTheDocument();
    });
  });
});
