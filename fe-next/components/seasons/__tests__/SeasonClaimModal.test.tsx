import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SeasonClaimModal } from '../SeasonClaimModal';

vi.mock('framer-motion', () => {
  const Pass = ({ children, className, ...rest }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('div', { className: className as string, ...rest }, children);
  const PassSpan = ({ children, className, ...rest }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('span', { className: className as string, ...rest }, children);
  return {
    motion: { div: Pass, h2: Pass, p: Pass, span: PassSpan },
    AnimatePresence: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
    useReducedMotion: () => false,
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
      };
      return map[key] ?? key;
    },
  }),
}));

describe('SeasonClaimModal', () => {
  const baseProps = {
    seasonId: 1,
    seasonName: 'Season 1: Word Warriors',
    tier: 'Gold',
    rankPosition: 4,
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

  it('renders the tier-specific medal image', () => {
    render(<SeasonClaimModal {...baseProps} />);
    const medal = screen.getByTestId('season-medal');
    expect(medal).toHaveAttribute('src', '/seasons/medals/medal-gold.png');
    expect(medal).toHaveAttribute('alt', 'Gold season medal');
  });

  it('falls back to bronze medal when tier is unknown', () => {
    render(<SeasonClaimModal {...baseProps} tier="Mystery" />);
    expect(screen.getByTestId('season-medal')).toHaveAttribute('src', '/seasons/medals/medal-bronze.png');
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
