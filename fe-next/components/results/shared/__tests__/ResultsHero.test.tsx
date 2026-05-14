import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, transition, whileHover, whileTap, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    span: ({ children, ...props }: any) => {
      const { initial, animate, transition, ...rest } = props;
      return <span {...rest}>{children}</span>;
    },
    h1: ({ children, ...props }: any) => {
      const { initial, animate, transition, ...rest } = props;
      return <h1 {...rest}>{children}</h1>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useReducedMotion: vi.fn(() => false),
}));

// Mock ScoreCountUp to render final value immediately
vi.mock('../ScoreCountUp', () => ({
  ScoreCountUp: ({ to, className }: any) => (
    <span className={className} aria-label={`Score: ${to}`} aria-live="polite">
      {to.toLocaleString()}
    </span>
  ),
}));

import { ResultsHero } from '../ResultsHero';
import type { StatCardItem } from '../StatsCardGrid';

const defaultStats: StatCardItem[] = [
  { label: 'Words', value: 23 },
  { label: 'Streak', value: 7, icon: '🔥' },
  { label: 'Time', value: '2:34' },
];

describe('ResultsHero', () => {
  it('renders outcome label', () => {
    render(
      <ResultsHero
        outcomeLabel="YOU WON"
        score={4820}
        stats={defaultStats}
      />
    );
    expect(screen.getByText('YOU WON')).toBeInTheDocument();
  });

  it('renders score with ScoreCountUp', () => {
    render(
      <ResultsHero
        outcomeLabel="COMPLETED"
        score={4820}
        stats={defaultStats}
      />
    );
    expect(screen.getByLabelText('Score: 4820')).toBeInTheDocument();
  });

  it('renders stats row', () => {
    render(
      <ResultsHero
        outcomeLabel="2ND PLACE"
        score={3000}
        stats={defaultStats}
      />
    );
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('Words')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(
      <ResultsHero
        outcomeLabel="COMPLETED"
        score={847}
        subtitle="Puzzle #142"
        stats={defaultStats}
      />
    );
    expect(screen.getByText('Puzzle #142')).toBeInTheDocument();
  });

  it('renders points label', () => {
    render(
      <ResultsHero
        outcomeLabel="COMPLETED"
        score={100}
        pointsLabel="points"
        stats={defaultStats}
      />
    );
    expect(screen.getByText('points')).toBeInTheDocument();
  });

  it('renders outcome badge with milestone variant', () => {
    render(
      <ResultsHero
        outcomeLabel="YOU WON"
        score={5000}
        stats={defaultStats}
        badge={{ text: '🔥 7 Day Streak!', variant: 'milestone' }}
      />
    );
    expect(screen.getByText('🔥 7 Day Streak!')).toBeInTheDocument();
  });

  it('applies win variant styling', () => {
    const { container } = render(
      <ResultsHero
        outcomeLabel="YOU WON"
        score={5000}
        stats={defaultStats}
        variant="win"
      />
    );
    const hero = container.querySelector('[data-testid="results-hero"]');
    expect(hero).toBeInTheDocument();
  });

  it('calls onScoreClick when score is clicked', async () => {
    const handleClick = vi.fn();
    render(
      <ResultsHero
        outcomeLabel="COMPLETED"
        score={100}
        stats={defaultStats}
        onScoreClick={handleClick}
      />
    );
    await userEvent.click(screen.getByTestId('score-area'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders the outcome label as h1 for accessibility', () => {
    render(
      <ResultsHero
        outcomeLabel="YOU WON"
        score={100}
        stats={defaultStats}
      />
    );
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('YOU WON');
  });

  it('renders without stats when none provided', () => {
    render(
      <ResultsHero
        outcomeLabel="COMPLETED"
        score={100}
        stats={[]}
      />
    );
    expect(screen.getByLabelText('Score: 100')).toBeInTheDocument();
  });
});
