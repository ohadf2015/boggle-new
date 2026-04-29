/**
 * DailyChallengeInvite Component Tests
 *
 * Post-game CTA that drives D1 retention by inviting players to the
 * Daily Challenge with outcome-aware messaging. Behaves differently
 * on CrazyGames embed vs main site.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const mockT = vi.fn((
  key: string,
  fallbackOrParams?: string | Record<string, string | number>,
  paramsWhenFallback?: Record<string, string | number>
) => {
  const translations: Record<string, string> = {
    'dailyInvite.titleWon': 'Sharp brain today',
    'dailyInvite.titleLost': 'Shake it off',
    'dailyInvite.bodyWon': 'Daily Challenge waiting — one puzzle, one shot.',
    'dailyInvite.bodyLost': 'Daily Challenge — your redemption shot.',
    'dailyInvite.bodyCgComeBack': 'New puzzle every day. Bookmark and return tomorrow.',
    'dailyInvite.streak': 'Day {{count}} streak — keep it alive',
    'dailyInvite.playNow': 'Play Daily',
    'dailyInvite.dismiss': 'Maybe later',
  };
  const tpl = translations[key] || key;
  const params = typeof fallbackOrParams === 'object' && fallbackOrParams !== null
    ? fallbackOrParams
    : (paramsWhenFallback || {});
  return Object.entries(params).reduce(
    (s, [k, v]) => s.replace(`{{${k}}}`, String(v)).replace(`{${k}}`, String(v)),
    tpl
  );
});

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT, language: 'en', dir: 'ltr' }),
}));

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseWordOfTheDay = vi.fn();
vi.mock('@/hooks/useWordOfTheDay', () => ({
  useWordOfTheDay: () => mockUseWordOfTheDay(),
}));

const mockUseEngagementStatus = vi.fn();
vi.mock('@/hooks/useEngagementStatus', () => ({
  useEngagementStatus: () => mockUseEngagementStatus(),
}));

const mockUseCrazyGames = vi.fn();
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => mockUseCrazyGames(),
}));

import { DailyChallengeInvite } from '../DailyChallengeInvite';

describe('DailyChallengeInvite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    mockUseWordOfTheDay.mockReturnValue({ playerFound: false, loading: false, word: 'crystal' });
    mockUseEngagementStatus.mockReturnValue({ streak: 0 });
    mockUseCrazyGames.mockReturnValue({ isOnCrazyGamesPlatform: false });
    sessionStorage.clear();
  });

  it('renders nothing for unauthenticated users', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
    const { container } = render(<DailyChallengeInvite isWinner={true} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing if player already completed today', () => {
    mockUseWordOfTheDay.mockReturnValue({ playerFound: true, loading: false, word: 'crystal' });
    const { container } = render(<DailyChallengeInvite isWinner={true} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing while WOTD loading', () => {
    mockUseWordOfTheDay.mockReturnValue({ playerFound: false, loading: true, word: '' });
    const { container } = render(<DailyChallengeInvite isWinner={true} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows winner-flavored copy when isWinner=true', () => {
    render(<DailyChallengeInvite isWinner={true} />);
    expect(screen.getByText('Sharp brain today')).toBeInTheDocument();
    expect(screen.getByText(/one shot/i)).toBeInTheDocument();
  });

  it('shows loser-flavored copy when isWinner=false', () => {
    render(<DailyChallengeInvite isWinner={false} />);
    expect(screen.getByText('Shake it off')).toBeInTheDocument();
    expect(screen.getByText(/redemption shot/i)).toBeInTheDocument();
  });

  it('shows CG come-back-tomorrow copy on CrazyGames embed', () => {
    mockUseCrazyGames.mockReturnValue({ isOnCrazyGamesPlatform: true });
    render(<DailyChallengeInvite isWinner={true} />);
    expect(screen.getByText(/bookmark and return tomorrow/i)).toBeInTheDocument();
  });

  it('renders link to /daily with correct testid', () => {
    render(<DailyChallengeInvite isWinner={true} />);
    const link = screen.getByTestId('daily-challenge-invite-cta');
    expect(link.getAttribute('href')).toBe('/daily');
  });

  it('hides after dismiss is clicked (session-scoped)', () => {
    const { rerender, container } = render(<DailyChallengeInvite isWinner={true} />);
    fireEvent.click(screen.getByTestId('daily-challenge-invite-dismiss'));
    rerender(<DailyChallengeInvite isWinner={true} />);
    expect(container.firstChild).toBeNull();
  });

  it('persists dismiss across remount via sessionStorage', () => {
    sessionStorage.setItem('dailyChallengeInvite:dismissed', '1');
    const { container } = render(<DailyChallengeInvite isWinner={true} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows streak line when live engagement streak > 0', () => {
    mockUseEngagementStatus.mockReturnValue({ streak: 4 });
    render(<DailyChallengeInvite isWinner={true} />);
    expect(screen.getByText(/Day 4 streak/)).toBeInTheDocument();
  });

  it('omits streak line when live streak is 0', () => {
    mockUseEngagementStatus.mockReturnValue({ streak: 0 });
    render(<DailyChallengeInvite isWinner={true} />);
    expect(screen.queryByText(/streak/i)).not.toBeInTheDocument();
  });

  it('prop streakDays overrides live engagement streak', () => {
    mockUseEngagementStatus.mockReturnValue({ streak: 4 });
    render(<DailyChallengeInvite isWinner={true} streakDays={9} />);
    expect(screen.getByText(/Day 9 streak/)).toBeInTheDocument();
  });
});
