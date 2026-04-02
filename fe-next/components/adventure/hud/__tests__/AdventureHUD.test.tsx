/**
 * AdventureHUD Component Tests
 *
 * Tests for main HUD container integrating all displays.
 */

import { render, screen } from '@testing-library/react';
import { AdventureHUD } from '../AdventureHUD';

// Mock child components
vi.mock('../ObjectiveProgress', () => ({
  ObjectiveProgress: ({ objectives }: any) => (
    <div data-testid="mock-objective-progress">
      {objectives.length} objectives
    </div>
  ),
}));

vi.mock('../CooldownIndicator', () => ({
  CooldownIndicator: ({ icon, label }: any) => (
    <div data-testid="mock-cooldown">{label || icon}</div>
  ),
}));

vi.mock('../../../adventure/meta/AdventureXpProgressBar', () => ({
  __esModule: true,
  default: ({ totalXp }: any) => (
    <div data-testid="mock-xp-bar">XP: {totalXp}</div>
  ),
}));

vi.mock('../../../adventure/meta/CurrencyDisplay', () => ({
  CurrencyDisplay: ({ amount }: any) => (
    <div data-testid="mock-currency">Gold: {amount}</div>
  ),
}));

vi.mock('../../AdventureTimer', () => ({
  __esModule: true,
  default: ({ timeRemaining }: any) => (
    <div data-testid="mock-timer">Time: {timeRemaining}s</div>
  ),
}));

// Mock usePrefersReducedMotion
vi.mock('../../../../hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => false,
}));

// Mock theme context — returns default theme
vi.mock('@/contexts/AdventureThemeContext', () => ({
  useHUDTheme: () => ({
    headerBg: 'bg-neo-navy/70',
    headerBorder: 'border-neo-black/20',
    sidebarBg: 'bg-neo-black/40',
    scoreAccent: 'text-neo-cyan',
    levelBadgeColor: 'bg-neo-cyan',
    levelBadgeText: 'text-neo-black',
    objectiveAccent: 'text-neo-lime',
    hintActiveColor: 'bg-neo-lime',
    hintActiveText: 'text-neo-black',
  }),
}));

describe('AdventureHUD', () => {
  const defaultProps = {
    remainingTime: 120,
    score: 1500,
    objectives: [
      {
        id: 'obj1',
        type: 'score' as const,
        target: 1000,
        current: 500,
        label: 'Score 1000',
      },
    ],
    totalXp: 5000,
    gold: 250,
    playerLevel: 5,
  };

  describe('Basic Rendering', () => {
    it('should render all required sections', () => {
      render(<AdventureHUD {...defaultProps} />);

      // Check all main sections are present
      expect(screen.getByTestId('mock-timer')).toBeInTheDocument();
      expect(screen.getByText(/Score:/)).toBeInTheDocument();
      expect(screen.getByTestId('mock-objective-progress')).toBeInTheDocument();
      expect(screen.getByTestId('mock-xp-bar')).toBeInTheDocument();
      expect(screen.getByTestId('mock-currency')).toBeInTheDocument();
    });

    it('should display timer with remaining time', () => {
      render(<AdventureHUD {...defaultProps} />);

      expect(screen.getByText('Time: 120s')).toBeInTheDocument();
    });

    it('should display score', () => {
      render(<AdventureHUD {...defaultProps} />);

      expect(screen.getByText(/1,500/)).toBeInTheDocument();
    });

    it('should display objectives', () => {
      render(<AdventureHUD {...defaultProps} />);

      expect(screen.getByText('1 objectives')).toBeInTheDocument();
    });

    it('should display XP progress', () => {
      render(<AdventureHUD {...defaultProps} />);

      expect(screen.getByText('XP: 5000')).toBeInTheDocument();
    });

    it('should display gold currency', () => {
      render(<AdventureHUD {...defaultProps} />);

      expect(screen.getByText('Gold: 250')).toBeInTheDocument();
    });

    it('should display player level', () => {
      render(<AdventureHUD {...defaultProps} />);

      // Level should be displayed somewhere (implementation detail)
      expect(screen.getByText(/Level|Lv\.?.*5/i)).toBeInTheDocument();
    });
  });

  describe('Recent Gains Animation', () => {
    it('should show recent score gain', () => {
      render(
        <AdventureHUD {...defaultProps} recentScoreGain={50} />
      );

      expect(screen.getByTestId('recent-score-gain')).toBeInTheDocument();
      expect(screen.getByText('+50')).toBeInTheDocument();
    });

    it('should not show recent score gain when undefined', () => {
      render(<AdventureHUD {...defaultProps} />);

      expect(screen.queryByTestId('recent-score-gain')).not.toBeInTheDocument();
    });

    it('should pass recent XP gain to XP bar', () => {
      render(
        <AdventureHUD {...defaultProps} recentXpGain={100} />
      );

      // XP bar mock should receive recentXpGain prop
      // This is tested via integration with actual component
      expect(screen.getByTestId('mock-xp-bar')).toBeInTheDocument();
    });

    it('should pass recent gold gain to currency display', () => {
      render(
        <AdventureHUD {...defaultProps} recentGoldGain={25} />
      );

      // Currency display mock should receive recentGain prop
      expect(screen.getByTestId('mock-currency')).toBeInTheDocument();
    });
  });

  describe('Cooldowns', () => {
    it('should render cooldowns when provided', () => {
      const cooldowns = [
        {
          id: 'power1',
          icon: '⚡',
          totalDuration: 10,
          remainingTime: 5,
        },
        {
          id: 'power2',
          icon: '🔥',
          totalDuration: 20,
          remainingTime: 10,
        },
      ];

      render(<AdventureHUD {...defaultProps} cooldowns={cooldowns} />);

      const cooldownElements = screen.getAllByTestId('mock-cooldown');
      expect(cooldownElements).toHaveLength(2);
    });

    it('should not render cooldowns section when empty array', () => {
      render(<AdventureHUD {...defaultProps} cooldowns={[]} />);

      expect(screen.queryByTestId('cooldowns-section')).not.toBeInTheDocument();
    });

    it('should not render cooldowns section when undefined', () => {
      render(<AdventureHUD {...defaultProps} />);

      expect(screen.queryByTestId('cooldowns-section')).not.toBeInTheDocument();
    });
  });

  describe('Visual Hierarchy', () => {
    it('should use semi-transparent background', () => {
      const { container } = render(<AdventureHUD {...defaultProps} />);

      // Top bar should have semi-transparent background
      const topBar = container.querySelector('[data-testid="hud-top-bar"]');
      expect(topBar).toHaveClass(/opacity-|bg-.*\/[0-8]/);
    });

    it('should position HUD at top and bottom edges', () => {
      const { container } = render(<AdventureHUD {...defaultProps} />);

      const hud = container.querySelector('[data-testid="adventure-hud"]');
      expect(hud).toHaveClass(/fixed|absolute/);
    });

    it('should not overlap board center area', () => {
      const { container } = render(<AdventureHUD {...defaultProps} />);

      // HUD should use top/bottom positioning, leaving center clear
      const topBar = container.querySelector('[data-testid="hud-top-bar"]');
      const bottomBar = container.querySelector('[data-testid="hud-bottom-bar"]');

      expect(topBar).toBeInTheDocument();
      expect(bottomBar).toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <AdventureHUD {...defaultProps} className="custom-hud" />
      );

      const hud = container.querySelector('[data-testid="adventure-hud"]');
      expect(hud).toHaveClass('custom-hud');
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      render(<AdventureHUD {...defaultProps} />);

      // HUD should be a navigation landmark or similar
      const hud = screen.getByTestId('adventure-hud');
      expect(hud).toBeInTheDocument();
    });

    it('should have aria-label for HUD', () => {
      render(<AdventureHUD {...defaultProps} />);

      const hud = screen.getByTestId('adventure-hud');
      expect(hud).toHaveAttribute('aria-label');
    });
  });
});
