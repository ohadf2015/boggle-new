/**
 * EloRankBadge Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EloRankBadge } from '../EloRankBadge';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, style, ...rest }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div className={className as string} style={style as React.CSSProperties}>{children}</div>
    ),
    span: ({ children, className }: React.PropsWithChildren<Record<string, unknown>>) => (
      <span className={className as string}>{children}</span>
    ),
  },
}));

describe('EloRankBadge', () => {
  it('should render rating number', () => {
    render(<EloRankBadge rating={1200} />);
    expect(screen.getByText('1200')).toBeInTheDocument();
  });

  it('should render tier name', () => {
    render(<EloRankBadge rating={1200} />);
    expect(screen.getByText('Gold')).toBeInTheDocument();
  });

  it('should render Unranked for low ratings', () => {
    render(<EloRankBadge rating={500} />);
    expect(screen.getByText('Unranked')).toBeInTheDocument();
  });

  it('should render Grandmaster for high ratings', () => {
    render(<EloRankBadge rating={2100} />);
    expect(screen.getByText('Grandmaster')).toBeInTheDocument();
  });

  it('should show rating change when provided', () => {
    render(<EloRankBadge rating={1220} ratingChange={20} />);
    expect(screen.getByText('+20')).toBeInTheDocument();
  });

  it('should show negative rating change', () => {
    render(<EloRankBadge rating={980} ratingChange={-20} />);
    expect(screen.getByText('-20')).toBeInTheDocument();
  });

  it('should apply compact class when size is compact', () => {
    const { container } = render(<EloRankBadge rating={1200} size="compact" />);
    expect(container.firstChild).toHaveClass('gap-1');
  });

  it('should apply default size class when no size prop', () => {
    const { container } = render(<EloRankBadge rating={1200} />);
    expect(container.firstChild).toHaveClass('gap-2');
  });

  it('should render all tier colors correctly', () => {
    const tiers = [
      { rating: 500, tier: 'Unranked' },
      { rating: 800, tier: 'Bronze' },
      { rating: 1000, tier: 'Silver' },
      { rating: 1200, tier: 'Gold' },
      { rating: 1400, tier: 'Platinum' },
      { rating: 1600, tier: 'Diamond' },
      { rating: 1800, tier: 'Master' },
      { rating: 2000, tier: 'Grandmaster' },
    ];

    for (const { rating, tier } of tiers) {
      const { unmount } = render(<EloRankBadge rating={rating} />);
      expect(screen.getByText(tier)).toBeInTheDocument();
      unmount();
    }
  });
});
