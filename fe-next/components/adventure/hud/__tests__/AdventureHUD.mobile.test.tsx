/**
 * AdventureHUD Mobile Visibility Tests
 *
 * Verifies that the XP progress bar is visible on all screen sizes,
 * not hidden on mobile with `hidden sm:block`.
 */

import { render, screen } from '@testing-library/react';
import { AdventureHUD } from '../AdventureHUD';

jest.mock('../ObjectiveProgress', () => ({
  ObjectiveProgress: ({ objectives }: any) => (
    <div data-testid="mock-objective-progress">{objectives.length} objectives</div>
  ),
}));

jest.mock('../CooldownIndicator', () => ({
  CooldownIndicator: ({ icon }: any) => <div data-testid="mock-cooldown">{icon}</div>,
}));

jest.mock('../../../adventure/meta/AdventureXpProgressBar', () => ({
  __esModule: true,
  default: ({ totalXp }: any) => <div data-testid="mock-xp-bar">XP: {totalXp}</div>,
}));

jest.mock('../../../adventure/meta/CurrencyDisplay', () => ({
  CurrencyDisplay: ({ amount }: any) => <div data-testid="mock-currency">Gold: {amount}</div>,
}));

jest.mock('../../AdventureTimer', () => ({
  __esModule: true,
  default: ({ timeRemaining }: any) => <div data-testid="mock-timer">Time: {timeRemaining}s</div>,
}));

jest.mock('../../../../hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => false,
}));

jest.mock('@/contexts/AdventureThemeContext', () => ({
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

const defaultProps = {
  remainingTime: 120,
  score: 1500,
  objectives: [{ id: 'obj1', type: 'score' as const, target: 1000, current: 500, label: 'Score 1000' }],
  totalXp: 5000,
  gold: 250,
  playerLevel: 5,
};

describe('AdventureHUD mobile visibility', () => {
  it('XP bar wrapper should NOT use hidden class (always visible on mobile)', () => {
    const { container } = render(<AdventureHUD {...defaultProps} />);
    const xpBarWrapper = container.querySelector('[data-testid="mock-xp-bar"]')?.parentElement;
    expect(xpBarWrapper).not.toHaveClass('hidden');
    expect(xpBarWrapper?.className).not.toMatch(/\bhidden\b/);
  });

  it('XP bar should be present in the DOM on all viewports', () => {
    render(<AdventureHUD {...defaultProps} />);
    expect(screen.getByTestId('mock-xp-bar')).toBeInTheDocument();
  });
});
