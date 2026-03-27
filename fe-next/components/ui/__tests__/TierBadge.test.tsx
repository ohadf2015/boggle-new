import React from 'react';
import { render, screen } from '@testing-library/react';
import { TierBadge, TierPill } from '../TierBadge';
import { GLOBAL_LEADERBOARD_TIERS } from '@/lib/ranked/leaderboardTiers';

const goldTier = GLOBAL_LEADERBOARD_TIERS.find((t) => t.id === 'gold')!;
const gmTier = GLOBAL_LEADERBOARD_TIERS.find((t) => t.id === 'grandmaster')!;

describe('TierBadge', () => {
  it('renders with correct data-testid', () => {
    render(<TierBadge tier={goldTier} />);
    expect(screen.getByTestId('tier-badge-gold')).toBeInTheDocument();
  });

  it('shows tier name as title attribute', () => {
    render(<TierBadge tier={goldTier} />);
    expect(screen.getByTitle('Gold')).toBeInTheDocument();
  });

  it('renders label when showLabel=true', () => {
    render(<TierBadge tier={goldTier} showLabel />);
    expect(screen.getByText('Gold')).toBeInTheDocument();
  });

  it('does not render label by default', () => {
    render(<TierBadge tier={goldTier} />);
    expect(screen.queryByText('Gold')).not.toBeInTheDocument();
  });

  it('renders grandmaster tier correctly', () => {
    render(<TierBadge tier={gmTier} showLabel />);
    expect(screen.getByTestId('tier-badge-grandmaster')).toBeInTheDocument();
    expect(screen.getByText('Grandmaster')).toBeInTheDocument();
  });

  it('accepts className prop', () => {
    render(<TierBadge tier={goldTier} className="extra-class" />);
    const el = screen.getByTestId('tier-badge-gold');
    expect(el).toHaveClass('extra-class');
  });
});

describe('TierPill', () => {
  it('renders tier name for valid tierId', () => {
    render(<TierPill tierId="gold" />);
    expect(screen.getByText('Gold')).toBeInTheDocument();
  });

  it('renders nothing for unknown tierId', () => {
    const { container } = render(<TierPill tierId={'unknown' as any} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows tier name as title', () => {
    render(<TierPill tierId="grandmaster" />);
    expect(screen.getByTitle('Grandmaster')).toBeInTheDocument();
  });
});
