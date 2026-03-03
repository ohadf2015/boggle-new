/**
 * GameSidebar Theme Integration Tests
 *
 * Verifies that GameSidebar uses HUD theme values from useHUDTheme()
 * instead of hardcoded Tailwind classes.
 */

import { render, screen } from '@testing-library/react';
import { GameSidebar } from '../GameSidebar';

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

jest.mock('@/contexts/AdventureThemeContext', () => ({
  useHUDTheme: () => mockHUDTheme,
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    locale: 'en',
    dir: 'ltr',
  }),
}));

jest.mock('../../AdventureObjectives', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-objectives" />,
}));

describe('GameSidebar — HUD Theme Integration', () => {
  const defaultProps = {
    objectives: [],
    hasHintsAvailable: true,
    onHintClick: jest.fn(),
    showAutoHint: false,
    currentHint: null,
    hintLevel: 'none' as const,
  };

  it('should apply sidebarBg from theme to aside element', () => {
    const { container } = render(<GameSidebar {...defaultProps} />);
    const aside = container.querySelector('aside');
    expect(aside?.className).toContain('bg-emerald-900/40');
    expect(aside?.className).not.toContain('bg-neo-navy/60');
  });

  it('should apply hintActiveColor from theme to active hint button', () => {
    const { container } = render(<GameSidebar {...defaultProps} />);
    // Active hint buttons should use theme color instead of bg-neo-yellow
    const buttons = container.querySelectorAll('button');
    const activeButtons = Array.from(buttons).filter(b => !b.disabled);
    const hasThemeColor = activeButtons.some(b => b.className.includes('bg-emerald-400'));
    expect(hasThemeColor).toBe(true);
  });

  it('should apply hintActiveText from theme to active hint button', () => {
    const { container } = render(<GameSidebar {...defaultProps} />);
    const buttons = container.querySelectorAll('button');
    const activeButtons = Array.from(buttons).filter(b => !b.disabled);
    const hasThemeText = activeButtons.some(b => b.className.includes('text-emerald-950'));
    expect(hasThemeText).toBe(true);
  });

  it('should apply objectiveAccent from theme to objective header icon', () => {
    const { container } = render(<GameSidebar {...defaultProps} />);
    // The Target icon and header text use objectiveAccent
    const elements = container.querySelectorAll('[class*="text-emerald-300"]');
    expect(elements.length).toBeGreaterThan(0);
  });

  it('should apply sidebarBg from theme to objective card background', () => {
    const { container } = render(<GameSidebar {...defaultProps} />);
    // Desktop objectives card uses sidebarBg
    const elements = container.querySelectorAll('[class*="bg-emerald-900/40"]');
    expect(elements.length).toBeGreaterThan(0);
  });
});
