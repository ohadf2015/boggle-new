import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SeasonClaimModal } from '../SeasonClaimModal';

vi.mock('framer-motion', () => {
  const Pass = ({ children, className, ...rest }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('div', { className: className as string, ...rest }, children);
  const PassSpan = ({ children, className, ...rest }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('span', { className: className as string, ...rest }, children);
  const PassButton = ({ children, className, ...rest }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('button', { className: className as string, ...rest }, children);
  // CounterTicker uses these — stub them so the component mounts in jsdom.
  const useMotionValue = (initial: number) => {
    let v = initial;
    return {
      get: () => v,
      set: (n: number) => { v = n; },
      on: () => () => {},
    };
  };
  const useSpring = (mv: { on: () => () => void }) => mv;
  const animate = () => ({ stop: () => {} });
  return {
    m: { div: Pass, h2: Pass, p: Pass, span: PassSpan, button: PassButton },
    AnimatePresence: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
    useReducedMotion: () => false,
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
        'season.peakTier': `Peak: ${params?.tier ?? ''}`,
        'season.tierLabel': 'Tier',
        'season.claim': 'Claim',
        'season.claimRewards': 'Claim Rewards',
        'season.alreadyClaimed': 'Already claimed',
        'season.rewardEarned': `You earned ${params?.coins ?? 0} coins!`,
        'season.continue': 'Continue',
        'seasonBadges.modal.headline': `You finished #${params?.rank ?? ''}!`,
        'seasonBadges.modal.subhead': `${params?.theme ?? ''} placement unlocked`,
        'seasonBadges.modal.collectible': 'Permanent collectible',
        'seasonBadges.recap.title': 'Season Recap',
        'seasonBadges.recap.peakTier': 'Peak Tier',
        'seasonBadges.recap.bestRank': 'Best Rank',
        'seasonBadges.recap.totalGames': 'Games Played',
        'seasonBadges.recap.finalScore': 'Final Score',
        'seasonBadges.title.rank1': 'Champion',
        'seasonBadges.title.rank2': 'Runner-Up',
        'seasonBadges.title.rank3': 'Bronze Medalist',
        'seasonBadges.title.rank4': 'Top 5 Finisher',
        'seasonBadges.title.rank5': 'Top 5 Finisher',
      };
      return map[key] ?? key;
    },
  }),
}));

describe('SeasonClaimModal', () => {
  // Default: rank 12 → medal path (no top-5 badge override)
  const baseProps = {
    seasonId: 1,
    seasonName: 'Season 1: Word Warriors',
    tier: 'Gold',
    rankPosition: 12,
    rewards: {
      coins: 500,
      badges: [{ id: 'gold-season-1', name: 'Gold Season 1' }],
      exclusives: [],
    },
    isClaiming: false,
    isClaimed: false,
    onClaim: vi.fn(),
    onClose: vi.fn(),
  };

  it('renders season name + tier when unclaimed', () => {
    render(<SeasonClaimModal {...baseProps} />);
    expect(screen.getByRole('dialog')).toHaveTextContent('Season 1: Word Warriors');
    expect(screen.getByText('Gold')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Claim Rewards/i })).toBeInTheDocument();
  });

  it('renders the tier-specific medal image when rank > 5', () => {
    render(<SeasonClaimModal {...baseProps} />);
    const medal = screen.getByTestId('season-medal');
    expect(medal).toHaveAttribute('src', '/seasons/medals/medal-gold.png');
    expect(medal).toHaveAttribute('alt', 'Gold season medal');
  });

  it('falls back to bronze medal when tier is unknown', () => {
    render(<SeasonClaimModal {...baseProps} tier="Mystery" />);
    expect(screen.getByTestId('season-medal')).toHaveAttribute('src', '/seasons/medals/medal-bronze.png');
  });

  it('renders placement-badge image (not medal) when rank is top-5', () => {
    render(<SeasonClaimModal {...baseProps} rankPosition={1} />);
    expect(screen.queryByTestId('season-medal')).not.toBeInTheDocument();
    const badge = screen.getByTestId('season-placement-badge');
    expect(badge).toHaveAttribute('src', '/badges/season-1-rank-1.png');
    expect(badge).toHaveAttribute('data-rank', '1');
  });

  it('omits the verbose "Permanent collectible" pill for top-5 placements (trimmed copy)', () => {
    render(<SeasonClaimModal {...baseProps} rankPosition={3} />);
    expect(screen.queryByText('Permanent collectible')).not.toBeInTheDocument();
  });

  it('renders claim error message when claimError set', () => {
    render(<SeasonClaimModal {...baseProps} claimError="Database unavailable" />);
    expect(screen.getByTestId('season-claim-error')).toHaveTextContent('Database unavailable');
  });

  it('renders recap stats grid (with icons + animated counters) when recap data present', () => {
    render(
      <SeasonClaimModal
        {...baseProps}
        recap={{ totalScore: 12345, gamesPlayed: 42, gamesWon: 18 }}
      />,
    );
    // Labels are stable; numeric values flow through CounterTicker which drives a
    // spring animation in real browsers. Asserting labels keeps the test resilient
    // to the animated count-up (mocks animate() as a no-op so values start at 0).
    expect(screen.getByText('Games Played')).toBeInTheDocument();
    expect(screen.getByText('Final Score')).toBeInTheDocument();
    expect(screen.getByText('Peak Tier')).toBeInTheDocument();
  });

  it('invokes onClaim when claim button pressed', () => {
    const onClaim = vi.fn();
    render(<SeasonClaimModal {...baseProps} onClaim={onClaim} />);
    fireEvent.click(screen.getByRole('button', { name: /Claim Rewards/i }));
    expect(onClaim).toHaveBeenCalledTimes(1);
  });

  it('disables the claim button while claiming', () => {
    render(<SeasonClaimModal {...baseProps} isClaiming />);
    const btn = screen.getByRole('button', { name: /Claim Rewards/i });
    expect(btn).toBeDisabled();
  });

  it('shows reward-earned message and Continue when already claimed', () => {
    const onClose = vi.fn();
    render(<SeasonClaimModal {...baseProps} isClaimed onClose={onClose} />);
    expect(screen.getByText(/earned 500 coins/i)).toBeInTheDocument();
    const continueBtn = screen.getByRole('button', { name: /Continue/i });
    fireEvent.click(continueBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not show claim button after claim', () => {
    render(<SeasonClaimModal {...baseProps} isClaimed />);
    expect(screen.queryByRole('button', { name: /Claim Rewards/i })).not.toBeInTheDocument();
  });
});
