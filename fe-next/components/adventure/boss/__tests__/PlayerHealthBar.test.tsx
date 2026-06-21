/**
 * PlayerHealthBar Component Tests
 *
 * TDD tests for player health bar visibility, HP display, low health indicator,
 * damage flash effects, and accessibility.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import PlayerHealthBar from '../PlayerHealthBar';
import { LanguageProvider } from '../../../../contexts/LanguageContext';
import type { PlayerHealthState } from '../../../../hooks/usePlayerHealth';

/**
 * Helper: Render PlayerHealthBar with LanguageProvider
 */
function renderPlayerHealthBar(
  healthState: PlayerHealthState,
  className?: string
) {
  return render(
    <LanguageProvider>
      <PlayerHealthBar healthState={healthState} className={className} />
    </LanguageProvider>
  );
}

/**
 * Helper: Create mock player health state
 */
function createHealthState(
  currentHP: number,
  maxHP: number,
  options: {
    isDead?: boolean;
    isLowHealth?: boolean;
    totalDamageTaken?: number;
  } = {}
): PlayerHealthState {
  const { isDead = false, isLowHealth = false, totalDamageTaken = 0 } = options;
  return {
    currentHP,
    maxHP,
    isDead,
    isLowHealth,
    totalDamageTaken,
  };
}

describe('PlayerHealthBar', () => {
  describe('Visibility', () => {
    it('should be visible when player is alive', () => {
      const healthState = createHealthState(100, 100);
      renderPlayerHealthBar(healthState);

      // HP bar should be present
      expect(screen.getByText(/100 \/ 100/)).toBeInTheDocument();
    });

    it('should be visible when player is at low health', () => {
      const healthState = createHealthState(20, 100, { isLowHealth: true });
      renderPlayerHealthBar(healthState);

      // HP bar should be present
      expect(screen.getByText(/20 \/ 100/)).toBeInTheDocument();
    });

    it('should be hidden when player is dead', () => {
      const healthState = createHealthState(0, 100, { isDead: true });
      const { container } = renderPlayerHealthBar(healthState);

      // Component should not render anything
      expect(container.firstChild).toBeNull();
    });
  });

  describe('HP display', () => {
    it('should display current and max HP', () => {
      const healthState = createHealthState(75, 100);
      renderPlayerHealthBar(healthState);

      expect(screen.getByText(/75 \/ 100/)).toBeInTheDocument();
    });

    it('should display HP when at maximum', () => {
      const healthState = createHealthState(150, 150);
      renderPlayerHealthBar(healthState);

      expect(screen.getByText(/150 \/ 150/)).toBeInTheDocument();
    });

    it('should display HP when near zero', () => {
      const healthState = createHealthState(5, 100, { isLowHealth: true });
      renderPlayerHealthBar(healthState);

      expect(screen.getByText(/5 \/ 100/)).toBeInTheDocument();
    });

    it('should show correct HP percentage in progress bar', () => {
      const healthState = createHealthState(50, 100);
      renderPlayerHealthBar(healthState);

      // The progress bar should exist and show the percentage
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('Low health indicator', () => {
    it('should show low health warning when HP below 25%', () => {
      const healthState = createHealthState(20, 100, { isLowHealth: true });
      renderPlayerHealthBar(healthState);

      expect(screen.getByText(/danger|low health/i)).toBeInTheDocument();
    });

    it('should not show low health warning when HP above 25%', () => {
      const healthState = createHealthState(50, 100, { isLowHealth: false });
      renderPlayerHealthBar(healthState);

      expect(screen.queryByText(/danger|low health/i)).not.toBeInTheDocument();
    });

    it('should not show low health warning at exactly 25%', () => {
      const healthState = createHealthState(25, 100, { isLowHealth: false });
      renderPlayerHealthBar(healthState);

      expect(screen.queryByText(/danger|low health/i)).not.toBeInTheDocument();
    });
  });

  describe('Player label', () => {
    it('should display player label', () => {
      const healthState = createHealthState(80, 100);
      renderPlayerHealthBar(healthState);

      // Should show some indication this is player health
      expect(screen.getByText(/health|hp|life/i)).toBeInTheDocument();
    });
  });

  describe('Visual styling', () => {
    it('should apply custom className', () => {
      const healthState = createHealthState(100, 100);
      const { container } = renderPlayerHealthBar(healthState, 'custom-class');

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should have different styling when low health', () => {
      const healthState = createHealthState(20, 100, { isLowHealth: true });
      const { container } = renderPlayerHealthBar(healthState);

      // Should have some visual indicator of danger
      const dangerIndicator = container.querySelector('[data-low-health="true"]');
      expect(dangerIndicator).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have role="progressbar"', () => {
      const healthState = createHealthState(75, 100);
      renderPlayerHealthBar(healthState);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    it('should have aria-valuenow with current HP', () => {
      const healthState = createHealthState(60, 100);
      renderPlayerHealthBar(healthState);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '60');
    });

    it('should have aria-valuemax with max HP', () => {
      const healthState = createHealthState(60, 100);
      renderPlayerHealthBar(healthState);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should have aria-valuemin of 0', () => {
      const healthState = createHealthState(60, 100);
      renderPlayerHealthBar(healthState);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    });

    it('should have aria-label for screen readers', () => {
      const healthState = createHealthState(75, 100);
      renderPlayerHealthBar(healthState);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label');
      expect(progressBar.getAttribute('aria-label')).toContain('75');
    });
  });
});

describe('PlayerHealthBar neo-brutalist hard chrome (no blur)', () => {
  it('uses hard shadow on the HP fill, not a soft 0 0 glow (low health)', () => {
    const { container } = renderPlayerHealthBar(createHealthState(20, 100, { isLowHealth: true }));
    expect(container.innerHTML).not.toContain('shadow-[0_0');
  });

  it('normal-health HP fill also avoids soft glow', () => {
    const { container } = renderPlayerHealthBar(createHealthState(80, 100));
    expect(container.innerHTML).not.toContain('shadow-[0_0');
  });
});
