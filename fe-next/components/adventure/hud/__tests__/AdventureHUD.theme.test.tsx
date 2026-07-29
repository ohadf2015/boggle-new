/**
 * AdventureHUD Theme Integration Tests
 *
 * Verifies that AdventureHUD uses HUD theme values from useHUDTheme()
 * instead of hardcoded Tailwind classes.
 */

import { render, screen } from '@testing-library/react';
import { AdventureHUD } from '../AdventureHUD';

const mockHUDTheme = {
  headerBg: 'bg-emerald-950/70',
  headerBorder: 'border-emerald-800/20',
  sidebarBg: 'bg-emerald-900/40',
  scoreAccent: 'text-emerald-300',
  levelBadgeColor: 'bg-emerald-500',
  levelBadgeText: 'text-emerald-950',
  objectiveAccent: 'text-emerald-300',
  hintActiveColor: 'bg-emerald-400',
  hintActiveText: 'text-emerald-950',
};

vi.mock('@/contexts/AdventureThemeContext', () => ({
  useHUDTheme: () => mockHUDTheme,
}));

// Mock child components
vi.mock('../ObjectiveProgress', () => ({
  ObjectiveProgress: ({ objectives }: any) => (
    <div data-testid="mock-objective-progress">
      {objectives.length} objectives
    </div>
  ),
}));

vi.mock('../CooldownIndicator', () => ({
  CooldownIndicator: ({ icon }: any) => (
    <div data-testid="mock-cooldown">{icon}</div>
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

vi.mock('../../../../hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => false,
}));

describe('AdventureHUD — Theme Integration', () => {
  const defaultProps = {
    remainingTime: 120,
    score: 1500,
    objectives: [
      { id: 'obj1', type: 'score' as const, target: 1000, current: 500, label: 'Score 1000' },
    ],
    totalXp: 5000,
    gold: 250,
    playerLevel: 5,
  };

  it('should apply headerBg from theme to top bar', () => {
    render(<AdventureHUD {...defaultProps} />);
    const topBar = screen.getByTestId('hud-top-bar');
    expect(topBar.className).toContain('bg-emerald-950/70');
    expect(topBar.className).not.toContain('bg-neo-navy/70');
  });

  it('should apply headerBorder from theme to top bar', () => {
    render(<AdventureHUD {...defaultProps} />);
    const topBar = screen.getByTestId('hud-top-bar');
    expect(topBar.className).toContain('border-emerald-800/20');
  });

  it('should apply headerBg from theme to bottom bar', () => {
    render(<AdventureHUD {...defaultProps} />);
    const bottomBar = screen.getByTestId('hud-bottom-bar');
    expect(bottomBar.className).toContain('bg-emerald-950/70');
  });

  it('should apply levelBadgeColor from theme to level badge', () => {
    const { container } = render(<AdventureHUD {...defaultProps} />);
    const badges = container.querySelectorAll('[class*="bg-emerald-500"]');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('should apply levelBadgeText from theme to level badge', () => {
    const { container } = render(<AdventureHUD {...defaultProps} />);
    const badges = container.querySelectorAll('[class*="text-emerald-950"]');
    expect(badges.length).toBeGreaterThan(0);
  });
});
