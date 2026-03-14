/**
 * BlastComboStreakBadge - Tests for combo streak badge component.
 * TDD: written before implementation (RED phase).
 *
 * Given-When-Then pattern throughout.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ComboStreakState } from '../hooks/useBlastComboStreak';

// ---- Mocks ----

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest },
  m: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useReducedMotion: () => false,
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

// Import AFTER mocks
import { BlastComboStreakBadge } from '../BlastComboStreakBadge';

// ==================== Helpers ====================

function makeStreak(overrides: Partial<ComboStreakState> = {}): ComboStreakState {
  return {
    level: 0,
    timeRemaining: 0,
    isActive: false,
    multiplier: 1,
    ...overrides,
  };
}

// ==================== Tests ====================

describe('BlastComboStreakBadge — inactive streak', () => {
  it('renders nothing when streak is inactive (level 0)', () => {
    // Given an inactive streak
    const streak = makeStreak({ level: 0, isActive: false });

    // When rendered
    const { container } = render(<BlastComboStreakBadge streak={streak} />);

    // Then nothing is rendered
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when isActive is false regardless of level', () => {
    // Given a streak with level > 0 but marked inactive (decay transition)
    const streak = makeStreak({ level: 2, isActive: false });

    // When rendered
    const { container } = render(<BlastComboStreakBadge streak={streak} />);

    // Then nothing is rendered
    expect(container.firstChild).toBeNull();
  });
});

describe('BlastComboStreakBadge — active streak rendering', () => {
  it('renders combo badge when streak is active', () => {
    // Given an active streak at level 2
    const streak = makeStreak({ level: 2, isActive: true, timeRemaining: 3000, multiplier: 1.5 });

    // When rendered
    render(<BlastComboStreakBadge streak={streak} />);

    // Then badge is present
    expect(screen.getByTestId('combo-streak-badge')).toBeInTheDocument();
  });

  it('renders "x2" text for level 2 streak', () => {
    // Given streak at level 2
    const streak = makeStreak({ level: 2, isActive: true, timeRemaining: 3000, multiplier: 1.5 });

    // When rendered
    render(<BlastComboStreakBadge streak={streak} />);

    // Then "x2" is shown (combo numbers are exempt from i18n)
    expect(screen.getByText('x2')).toBeInTheDocument();
  });

  it('renders "x5" text for level 5 streak', () => {
    // Given streak at level 5
    const streak = makeStreak({ level: 5, isActive: true, timeRemaining: 2000, multiplier: 2.25 });

    // When rendered
    render(<BlastComboStreakBadge streak={streak} />);

    // Then "x5" is shown
    expect(screen.getByText('x5')).toBeInTheDocument();
  });

  it('renders "x10" text at max level 10', () => {
    // Given max streak
    const streak = makeStreak({ level: 10, isActive: true, timeRemaining: 1000, multiplier: 3.5 });

    // When rendered
    render(<BlastComboStreakBadge streak={streak} />);

    // Then "x10" is shown
    expect(screen.getByText('x10')).toBeInTheDocument();
  });

  it('renders SVG countdown arc', () => {
    // Given an active streak
    const streak = makeStreak({ level: 3, isActive: true, timeRemaining: 3000, multiplier: 1.75 });

    // When rendered
    render(<BlastComboStreakBadge streak={streak} />);

    // Then SVG is present for countdown
    const svg = screen.getByTestId('combo-streak-badge').querySelector('svg');
    expect(svg).not.toBeNull();
  });
});

describe('BlastComboStreakBadge — color tiers', () => {
  it('applies green tier class/data for level 1 (x1)', () => {
    // Given level 1 streak (tier: green)
    const streak = makeStreak({ level: 1, isActive: true, timeRemaining: 4000, multiplier: 1.25 });

    // When rendered
    render(<BlastComboStreakBadge streak={streak} />);

    // Then badge has green tier attribute
    const badge = screen.getByTestId('combo-streak-badge');
    expect(badge.getAttribute('data-tier')).toBe('green');
  });

  it('applies green tier for level 2 (x2)', () => {
    // Given level 2 streak
    const streak = makeStreak({ level: 2, isActive: true, timeRemaining: 4000, multiplier: 1.5 });

    // When rendered
    render(<BlastComboStreakBadge streak={streak} />);

    // Then green tier
    expect(screen.getByTestId('combo-streak-badge').getAttribute('data-tier')).toBe('green');
  });

  it('applies yellow tier for level 3 (x3)', () => {
    // Given level 3 streak
    const streak = makeStreak({ level: 3, isActive: true, timeRemaining: 4000, multiplier: 1.75 });

    // When rendered
    render(<BlastComboStreakBadge streak={streak} />);

    // Then yellow tier
    expect(screen.getByTestId('combo-streak-badge').getAttribute('data-tier')).toBe('yellow');
  });

  it('applies yellow tier for level 4 (x4)', () => {
    // Given level 4 streak
    const streak = makeStreak({ level: 4, isActive: true, timeRemaining: 4000, multiplier: 2.0 });

    // When rendered
    render(<BlastComboStreakBadge streak={streak} />);

    // Then yellow tier
    expect(screen.getByTestId('combo-streak-badge').getAttribute('data-tier')).toBe('yellow');
  });

  it('applies red tier for level 5 (x5)', () => {
    // Given level 5 streak
    const streak = makeStreak({ level: 5, isActive: true, timeRemaining: 4000, multiplier: 2.25 });

    // When rendered
    render(<BlastComboStreakBadge streak={streak} />);

    // Then red tier (orange/red for x5+)
    expect(screen.getByTestId('combo-streak-badge').getAttribute('data-tier')).toBe('red');
  });

  it('applies red tier for level 10 (x10)', () => {
    // Given max level streak
    const streak = makeStreak({ level: 10, isActive: true, timeRemaining: 4000, multiplier: 3.5 });

    // When rendered
    render(<BlastComboStreakBadge streak={streak} />);

    // Then red tier
    expect(screen.getByTestId('combo-streak-badge').getAttribute('data-tier')).toBe('red');
  });
});

describe('BlastComboStreakBadge — reduced motion', () => {
  it('still renders badge when reduced motion is active', () => {
    // Override the framer-motion mock for this test
    jest.mock('framer-motion', () => ({
      motion: {
        div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
      },
      AnimatePresence: ({ children }: any) => <>{children}</>,
      useReducedMotion: () => true, // reduced motion ON
    }));

    // Given active streak
    const streak = makeStreak({ level: 3, isActive: true, timeRemaining: 2000, multiplier: 1.75 });

    // When rendered (even with reduced motion, badge still shows)
    render(<BlastComboStreakBadge streak={streak} />);

    // Then badge is present (gameplay continues, only animations skip)
    expect(screen.getByTestId('combo-streak-badge')).toBeInTheDocument();
  });
});
