import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('framer-motion', () => {
  const Pass = ({ children, className, ...rest }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('div', { className: className as string, ...rest }, children);
  const PassSpan = ({ children, className, ...rest }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('span', { className: className as string, ...rest }, children);
  const PassButton = ({ children, className, ...rest }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('button', { className: className as string, ...rest }, children);
  const useMotionValue = (initial: number) => {
    let v = initial;
    return { get: () => v, set: (n: number) => { v = n; }, on: () => () => {} };
  };
  const useSpring = (mv: { on: () => () => void }) => mv;
  const animate = () => ({ stop: () => {} });
  return {
    m: { div: Pass, h2: Pass, p: Pass, span: PassSpan, button: PassButton },
    AnimatePresence: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
    useReducedMotion: () => true,
    useMotionValue,
    useSpring,
    animate,
  };
});

vi.mock('next/image', () => ({
  default: ({ src, alt, ...rest }: { src: string; alt: string } & Record<string, unknown>) =>
    React.createElement('img', { src, alt, ...rest }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'season.complete': 'Season Complete!',
        'season.tierLabel': 'Tier',
        'season.claim': 'Claim',
        'season.claimRewards': 'Claim Rewards',
        'season.alreadyClaimed': 'Already claimed',
        'season.rewardEarned': `You earned ${params?.coins ?? 0} coins!`,
        'season.continue': 'Continue',
        'season.rankedAt': `Rank #${params?.position ?? ''}`,
      };
      return map[key] ?? key;
    },
  }),
}));

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseCrazyGames = vi.fn(() => ({ isOnCrazyGamesPlatform: false }));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => mockUseCrazyGames(),
}));

const mockClaim = vi.fn();
const mockUseSeasonClaim = vi.fn();
vi.mock('@/hooks/useSeasonClaim', () => ({
  useSeasonClaim: () => mockUseSeasonClaim(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    leaderboard: {
      getSeasonRecap: {
        useQuery: () => ({ data: null, isLoading: false }),
      },
    },
  },
}));

import { SeasonClaimContainer } from '../SeasonClaimContainer';

const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(global, 'sessionStorage', { value: sessionStorageMock, writable: true });

describe('SeasonClaimContainer', () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    mockClaim.mockReset();
    mockUseAuth.mockReset();
    mockUseSeasonClaim.mockReset();
    mockUseCrazyGames.mockReturnValue({ isOnCrazyGamesPlatform: false });
  });

  it('renders nothing on CrazyGames embed even with unclaimed season', () => {
    mockUseCrazyGames.mockReturnValue({ isOnCrazyGamesPlatform: true });
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, isAuthenticated: true });
    mockUseSeasonClaim.mockReturnValue({
      next: {
        seasonId: 1, tier: 'Gold', rankPosition: 4,
        rewards: { coins: 500, badges: [], exclusives: [] },
      },
      unclaimedSeasons: [],
      isLoading: false, isClaiming: false, claim: mockClaim,
    });

    const { container } = render(<SeasonClaimContainer />);
    expect(container.querySelector('[data-testid="season-claim-modal"]')).toBeNull();
  });

  it('renders nothing when not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false });
    mockUseSeasonClaim.mockReturnValue({
      next: null, unclaimedSeasons: [], isLoading: false, isClaiming: false, claim: mockClaim,
    });

    const { container } = render(<SeasonClaimContainer />);
    expect(container.querySelector('[data-testid="season-claim-modal"]')).toBeNull();
  });

  it('renders nothing when no unclaimed seasons', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, isAuthenticated: true });
    mockUseSeasonClaim.mockReturnValue({
      next: null, unclaimedSeasons: [], isLoading: false, isClaiming: false, claim: mockClaim,
    });

    const { container } = render(<SeasonClaimContainer />);
    expect(container.querySelector('[data-testid="season-claim-modal"]')).toBeNull();
  });

  it('renders modal when an unclaimed season exists', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, isAuthenticated: true });
    mockUseSeasonClaim.mockReturnValue({
      next: {
        seasonId: 1, tier: 'Gold', rankPosition: 4,
        rewards: { coins: 500, badges: [{ id: 'gold-season-1', name: 'Gold Season 1' }], exclusives: [] },
      },
      unclaimedSeasons: [],
      isLoading: false, isClaiming: false, claim: mockClaim,
    });

    render(<SeasonClaimContainer />);
    expect(screen.getByTestId('season-claim-modal')).toBeInTheDocument();
    expect(screen.getByText('Gold')).toBeInTheDocument();
  });

  it('hides modal after dismiss + persists in sessionStorage', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, isAuthenticated: true });
    mockUseSeasonClaim.mockReturnValue({
      next: { seasonId: 7, tier: 'Diamond', rewards: { coins: 2000, badges: [], exclusives: [] } },
      unclaimedSeasons: [],
      isLoading: false, isClaiming: false, claim: mockClaim,
    });

    const { rerender } = render(<SeasonClaimContainer />);
    // Backdrop click (the outer test-id'd div) dismisses
    fireEvent.click(screen.getByTestId('season-claim-modal'));
    expect(sessionStorage.getItem('season-claim-dismissed:7')).toBe('1');
    rerender(<SeasonClaimContainer />);
    expect(screen.queryByTestId('season-claim-modal')).toBeNull();
  });

  it('calls claim then shows isClaimed state', async () => {
    mockClaim.mockResolvedValue({ success: true, alreadyClaimed: false });
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, isAuthenticated: true });
    mockUseSeasonClaim.mockReturnValue({
      next: { seasonId: 9, tier: 'Master', rewards: { coins: 1500, badges: [], exclusives: [] } },
      unclaimedSeasons: [],
      isLoading: false, isClaiming: false, claim: mockClaim,
    });

    render(<SeasonClaimContainer />);
    fireEvent.click(screen.getByRole('button', { name: /Claim Rewards/i }));
    await new Promise((r) => setTimeout(r, 0));
    expect(mockClaim).toHaveBeenCalledWith(9);
    expect(sessionStorage.getItem('season-claim-success:9')).toBe('1');
  });
});
