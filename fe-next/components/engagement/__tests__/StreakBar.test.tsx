/**
 * StreakBar Component Tests
 *
 * Tests for the persistent engagement bar showing
 * streak, XP progress, and gold balance.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock useEngagementStatus
const mockEngagementStatus = vi.fn();
vi.mock('@/hooks/useEngagementStatus', () => ({
  useEngagementStatus: () => mockEngagementStatus(),
}));

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'streakBar.streak': `${params?.count ?? 0} day streak`,
        'streakBar.streakAtRisk': 'Streak ends tonight!',
        'streakBar.level': `Lvl ${params?.level ?? 1}`,
      };
      return translations[key] ?? key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock useReducedMotion
vi.mock('@/hooks/useReducedMotion', () => ({
  __esModule: true,
  default: vi.fn(() => false),
}));

// Mock framer-motion
vi.mock('framer-motion', () => {
  const MockMotionDiv = React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) =>
    React.createElement('div', { ...props, ref, 'data-testid': props['data-testid'] }, children)
  );
  MockMotionDiv.displayName = 'MockMotionDiv';
  return {
    m: { div: MockMotionDiv },
    AnimatePresence: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
  };
});

import { StreakBar } from '../StreakBar';

const defaultStatus = {
  streak: 7,
  longestStreak: 14,
  freezesAvailable: 2,
  level: 3,
  xp: 350,
  xpProgress: 0.4,
  xpToNextLevel: 150,
  gold: 1500,
  gamesToday: 3,
  streakAtRisk: false,
  loading: false,
};

describe('StreakBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'test' }, isAuthenticated: true });
    mockEngagementStatus.mockReturnValue(defaultStatus);
  });

  it('should render streak count', () => {
    render(<StreakBar />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('should render level', () => {
    render(<StreakBar />);
    expect(screen.getByText('Lvl 3')).toBeInTheDocument();
  });

  it('should render gold amount', () => {
    render(<StreakBar />);
    expect(screen.getByText('1,500')).toBeInTheDocument();
  });

  it('should render XP progress bar', () => {
    render(<StreakBar />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '40');
  });

  it('should show at-risk state when streak is endangered', () => {
    mockEngagementStatus.mockReturnValue({
      ...defaultStatus,
      streakAtRisk: true,
    });
    render(<StreakBar />);
    const bar = screen.getByTestId('streak-bar');
    expect(bar.className).toContain('streak-at-risk');
  });

  it('should not render for unauthenticated users with no streak', () => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false });
    mockEngagementStatus.mockReturnValue({
      ...defaultStatus,
      streak: 0,
      level: 1,
      gold: 0,
      loading: false,
    });
    const { container } = render(<StreakBar />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render while loading', () => {
    mockEngagementStatus.mockReturnValue({
      ...defaultStatus,
      loading: true,
    });
    const { container } = render(<StreakBar />);
    expect(container.firstChild).toBeNull();
  });

  it('should render flame icon', () => {
    render(<StreakBar />);
    expect(screen.getByTestId('streak-flame')).toBeInTheDocument();
  });

  it('should render coin icon', () => {
    render(<StreakBar />);
    expect(screen.getByTestId('streak-gold')).toBeInTheDocument();
  });

  it('should format large gold numbers with commas', () => {
    mockEngagementStatus.mockReturnValue({
      ...defaultStatus,
      gold: 12345,
    });
    render(<StreakBar />);
    expect(screen.getByText('12,345')).toBeInTheDocument();
  });
});
