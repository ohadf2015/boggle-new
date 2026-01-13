import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '@/contexts/AuthContext';
import DailyChallengeRouter from '../DailyChallengeRouter';

// Mock dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => key,
  }),
}));

jest.mock('../DailyChallengeLanding', () => ({
  DailyChallengeLanding: ({ onSelectWordHunt }: { onSelectWordHunt: () => void }) => (
    <div data-testid="daily-challenge-landing">
      <button onClick={onSelectWordHunt}>Select Word Hunt</button>
    </div>
  ),
}));

jest.mock('../DailyChallenge', () => ({
  __esModule: true,
  default: () => <div data-testid="daily-challenge-game">Word Hunt Game</div>,
}));

jest.mock('../../buzz/BuzzChallenge', () => ({
  __esModule: true,
  default: () => <div data-testid="buzz-challenge">Buzz Challenge</div>,
}));

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('DailyChallengeRouter - Admin vs Non-Admin Routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('admin users see the landing page with dual challenge selection', () => {
    // Setup: Admin user
    mockUseAuth.mockReturnValue({
      isAdmin: true,
      user: { id: 'admin-123' } as any,
      profile: { is_admin: true } as any,
      loading: false,
    } as any);

    render(<DailyChallengeRouter />);

    // Admin should see the landing page with challenge selection
    expect(screen.getByTestId('daily-challenge-landing')).toBeInTheDocument();
    expect(screen.queryByTestId('daily-challenge-game')).not.toBeInTheDocument();
  });

  test('non-admin users skip landing and go directly to Word Hunt', async () => {
    // Setup: Regular (non-admin) user
    mockUseAuth.mockReturnValue({
      isAdmin: false,
      user: { id: 'user-123' } as any,
      profile: { is_admin: false } as any,
      loading: false,
    } as any);

    render(<DailyChallengeRouter />);

    // Non-admin should NOT see the landing page
    expect(screen.queryByTestId('daily-challenge-landing')).not.toBeInTheDocument();

    // Non-admin should see Word Hunt game directly
    await waitFor(() => {
      expect(screen.getByTestId('daily-challenge-game')).toBeInTheDocument();
    });
  });

  test('guest users (not logged in) skip landing and go directly to Word Hunt', async () => {
    // Setup: Guest user (no auth)
    mockUseAuth.mockReturnValue({
      isAdmin: false,
      user: null,
      profile: null,
      loading: false,
    } as any);

    render(<DailyChallengeRouter />);

    // Guest should NOT see the landing page
    expect(screen.queryByTestId('daily-challenge-landing')).not.toBeInTheDocument();

    // Guest should see Word Hunt game directly
    await waitFor(() => {
      expect(screen.getByTestId('daily-challenge-game')).toBeInTheDocument();
    });
  });
});
