/**
 * Tests for CreatorProfileStats component
 * TDD: RED phase — tests written before implementation
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import CreatorProfileStats from '../CreatorProfileStats';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
    language: 'en',
  }),
}));

const defaultStats = {
  boardsCreated: 5,
  totalPlays: 120,
  totalRatings: 40,
  averageRating: 4.2,
};

describe('CreatorProfileStats', () => {
  it('renders creator stats heading', () => {
    render(<CreatorProfileStats stats={defaultStats} />);
    expect(screen.getByText('ugc.creator.stats')).toBeInTheDocument();
  });

  it('shows boards created count', () => {
    render(<CreatorProfileStats stats={defaultStats} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('ugc.creator.boardsCreated')).toBeInTheDocument();
  });

  it('shows total plays received', () => {
    render(<CreatorProfileStats stats={defaultStats} />);
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('ugc.creator.totalPlays')).toBeInTheDocument();
  });

  it('shows average rating', () => {
    render(<CreatorProfileStats stats={defaultStats} />);
    expect(screen.getByText('4.2')).toBeInTheDocument();
    expect(screen.getByText('ugc.creator.avgRating')).toBeInTheDocument();
  });

  it('shows creator badge tier based on boardsCreated', () => {
    render(<CreatorProfileStats stats={defaultStats} />);
    // 5 boards => PUZZLE_MAKER tier
    expect(screen.getByTestId('creator-tier-badge')).toBeInTheDocument();
    expect(screen.getByText('ugc.creator.tier.puzzleMaker')).toBeInTheDocument();
  });

  it('shows CROWD_PLEASER tier when totalPlays >= 100', () => {
    render(
      <CreatorProfileStats
        stats={{ boardsCreated: 1, totalPlays: 100, totalRatings: 10, averageRating: 4.0 }}
      />
    );
    expect(screen.getByText('ugc.creator.tier.crowdPleaser')).toBeInTheDocument();
  });

  it('renders nothing when boardsCreated is 0', () => {
    const { container } = render(
      <CreatorProfileStats
        stats={{ boardsCreated: 0, totalPlays: 0, totalRatings: 0, averageRating: 0 }}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('links My Boards to /community?tab=mine', () => {
    render(<CreatorProfileStats stats={defaultStats} />);
    const link = screen.getByRole('link', { name: /ugc\.creator\.myBoards/i });
    expect(link).toHaveAttribute('href', '/community?tab=mine');
  });
});
