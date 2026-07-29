/**
 * GameHeader Theme Integration Tests
 *
 * Verifies that GameHeader uses HUD theme values from useHUDTheme()
 * instead of hardcoded Tailwind classes.
 */

import { render, screen } from '@testing-library/react';
import { GameHeader } from '../GameHeader';

// Mock the theme context to provide custom theme values
const mockHUDTheme = {
  headerBg: 'bg-emerald-950/90',
  headerBorder: 'border-emerald-800/40',
  sidebarBg: 'bg-emerald-900/40',
  scoreAccent: 'text-emerald-300',
  levelBadgeColor: 'bg-emerald-900/60',
  levelBadgeText: 'text-emerald-400',
  objectiveAccent: 'text-emerald-300',
  hintActiveColor: 'bg-emerald-400',
  hintActiveText: 'text-emerald-950',
};

vi.mock('@/contexts/AdventureThemeContext', () => ({
  useHUDTheme: () => mockHUDTheme,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    locale: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('../../AdventureTimer', () => ({
  __esModule: true,
  default: ({ timeRemaining }: any) => (
    <div data-testid="mock-timer">Time: {timeRemaining}s</div>
  ),
}));

vi.mock('../RollingNumber', () => ({
  RollingNumber: ({ value }: any) => <span data-testid="mock-rolling">{value.toLocaleString('en-US')}</span>,
}));

describe('GameHeader — HUD Theme Integration', () => {
  const defaultProps = {
    worldNumber: 1,
    levelNumber: 3,
    score: 500,
    timeRemaining: 60,
    isPaused: false,
    onPauseToggle: vi.fn(),
    onExit: vi.fn(),
  };

  it('should apply headerBg from theme to header element', () => {
    const { container } = render(<GameHeader {...defaultProps} />);
    const header = container.querySelector('header');
    expect(header?.className).toContain('bg-emerald-950/90');
    expect(header?.className).not.toContain('bg-neo-navy/90');
  });

  it('should apply headerBorder from theme', () => {
    const { container } = render(<GameHeader {...defaultProps} />);
    const header = container.querySelector('header');
    expect(header?.className).toContain('border-emerald-800/40');
    expect(header?.className).not.toContain('border-neo-black/40');
  });

  it('should apply levelBadgeColor from theme to level badge', () => {
    const { container } = render(<GameHeader {...defaultProps} />);
    // Level badge is the div containing MapPin + level numbers
    const badges = container.querySelectorAll('[class*="emerald-900/60"]');
    expect(badges.length).toBeGreaterThan(0);
  });

});
