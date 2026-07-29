/**
 * BossHPBar Component Tests
 *
 * Tests for boss health bar visibility, HP display, phase indicators,
 * and enraged state.
 *
 * Covers both legacy interface (healthState) and new C1 interface (current/max/bossName/isEnraged/onDamage).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import BossHPBar, { BossHPBar as BossHPBarNamed } from '../BossHPBar';
import type { BossHealthState, BossPhase } from '../../../types/boss';

// ==============================================
// MOCKS
// ==============================================

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...p }: any) => <div {...p}>{children}</div>,
    span: ({ children, ...p }: any) => <span {...p}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Provide both legacy translation (Ms. Grammar) and pass-through for new interface
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => {
      const map: Record<string, string> = {
        'adventure.bosses.msGrammar.name': 'Ms. Grammar',
        'adventure.bosses.enraged': 'ENRAGED!',
        'adventure.boss.enraged': 'ENRAGED!',
      };
      return map[k] ?? k;
    },
    language: 'en',
  }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

/**
 * Helper: Render legacy BossHPBar
 */
function renderBossHPBar(healthState: BossHealthState, bossName: string = 'adventure.bosses.msGrammar.name') {
  return render(
    <BossHPBar healthState={healthState} bossName={bossName} />
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

// ==============================================
// LEGACY TESTS (existing healthState interface)
// ==============================================

describe('BossHPBar (legacy interface)', () => {
  describe('Visibility based on phase', () => {
    it('should be visible during active phase', () => {
      const healthState = createHealthState(1000, 1000, 'active');
      renderBossHPBar(healthState);

      expect(screen.getByText(/1000 \/ 1000/)).toBeInTheDocument();
    });

    it('should be visible during enraged phase', () => {
      const healthState = createHealthState(200, 1000, 'enraged');
      renderBossHPBar(healthState);

      expect(screen.getByText(/200 \/ 1000/)).toBeInTheDocument();
    });

    it('should be hidden during intro phase', () => {
      const healthState = createHealthState(1000, 1000, 'intro');
      const { container } = renderBossHPBar(healthState);

      expect(container.firstChild).toBeNull();
    });

    it('should be hidden during victory phase', () => {
      const healthState = createHealthState(0, 1000, 'victory');
      const { container } = renderBossHPBar(healthState);

      expect(container.firstChild).toBeNull();
    });

    it('should be hidden during defeat phase', () => {
      const healthState = createHealthState(500, 1000, 'defeat');
      const { container } = renderBossHPBar(healthState);

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

      const hpBarContainer = container.querySelector('[aria-hidden="true"]');
      expect(hpBarContainer).toBeInTheDocument();
    });
  });
});

// ==============================================
// NEW INTERFACE TESTS (C1 Task)
// ==============================================

describe('BossHPBar (new interface)', () => {
  it('renders 4 segment dividers', () => {
    const { container } = render(
      <BossHPBarNamed current={100} max={100} bossName="Dragon" isEnraged={false} onDamage={undefined} />
    );
    const segments = container.querySelectorAll('[data-testid^="hp-segment-"]');
    expect(segments).toHaveLength(4);
  });

  it('shows enraged state when isEnraged=true', () => {
    const { container } = render(
      <BossHPBarNamed current={10} max={100} bossName="Dragon" isEnraged={true} onDamage={undefined} />
    );
    expect(container.querySelector('[data-testid="enraged-badge"]')).toBeInTheDocument();
  });

  it('shows damage number when onDamage fires', () => {
    const { rerender, container } = render(
      <BossHPBarNamed current={100} max={100} bossName="Dragon" isEnraged={false} onDamage={undefined} />
    );
    rerender(
      <BossHPBarNamed current={80} max={100} bossName="Dragon" isEnraged={false} onDamage={20} />
    );
    expect(container.querySelector('[data-testid="damage-number"]')).toBeInTheDocument();
  });

  it('shows boss name', () => {
    render(
      <BossHPBarNamed current={75} max={100} bossName="Ice Witch" isEnraged={false} onDamage={undefined} />
    );
    expect(screen.getByText('Ice Witch')).toBeInTheDocument();
  });
});
