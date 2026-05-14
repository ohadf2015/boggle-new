/**
 * Tests for SeriesStandingsBanner component
 *
 * Displays accumulated scores, positions, and session stats
 * across multiple multiplayer games in a row.
 */
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import SeriesStandingsBanner from '../SeriesStandingsBanner';
import type { SeriesStanding } from '@/hooks/useSeriesTracker';

// Mock framer-motion — components must be defined inside the factory to avoid
// Jest hoisting the vi.mock() call above the const declarations (TDZ error).
vi.mock('framer-motion', () => {
  const React = require('react');
  const MockDiv = React.forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} {...props}>{children}</div>
  ));
  MockDiv.displayName = 'MockMotionDiv';
  const MockSpan = React.forwardRef(({ children, ...props }: any, ref: any) => (
    <span ref={ref} {...props}>{children}</span>
  ));
  MockSpan.displayName = 'MockMotionSpan';
  return {
    m: { div: MockDiv, span: MockSpan },
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
  };
});

const mockT = (key: string, params?: Record<string, string | number>) => {
  const translations: Record<string, string> = {
    'results.series.title': 'Session Standings',
    'results.series.gameCount': `Game {{count}}`,
    'results.series.totalScore': 'Total',
    'results.series.positionUp': 'Up {{count}}',
    'results.series.positionDown': 'Down {{count}}',
  };
  let result = translations[key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      result = result.replace(`{{${k}}}`, String(v));
    });
  }
  return result;
};

const makeStandings = (players: Array<{
  username: string;
  totalScore: number;
  roundScores: number[];
  currentRank: number;
  rankChange: number;
  roundWins?: number;
}>): SeriesStanding[] =>
  players.map(p => ({
    ...p,
    roundWins: p.roundWins ?? 0,
    avatar: { emoji: '🎮', color: '#FF0000' },
  }));

describe('SeriesStandingsBanner', () => {
  it('should not render when there is only one round', () => {
    const { container } = render(
      <SeriesStandingsBanner
        standings={makeStandings([
          { username: 'Alice', totalScore: 100, roundScores: [100], currentRank: 1, rankChange: 0 },
        ])}
        roundNumber={1}
        currentUsername="Alice"
        t={mockT}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render standings for multiple rounds', () => {
    render(
      <SeriesStandingsBanner
        standings={makeStandings([
          { username: 'Bob', totalScore: 200, roundScores: [80, 120], currentRank: 1, rankChange: 1 },
          { username: 'Alice', totalScore: 150, roundScores: [100, 50], currentRank: 2, rankChange: -1 },
        ])}
        roundNumber={2}
        currentUsername="Alice"
        t={mockT}
      />
    );

    // Should show the title
    expect(screen.getByText('Session Standings')).toBeInTheDocument();

    // Should show player names and total scores within their rows
    const bobRow = screen.getByTestId('series-player-Bob');
    expect(within(bobRow).getByText('Bob')).toBeInTheDocument();
    expect(within(bobRow).getByText('200')).toBeInTheDocument();

    const aliceRow = screen.getByTestId('series-player-Alice');
    expect(within(aliceRow).getByText('Alice')).toBeInTheDocument();
    expect(within(aliceRow).getByText('150')).toBeInTheDocument();
  });

  it('should highlight the current player', () => {
    render(
      <SeriesStandingsBanner
        standings={makeStandings([
          { username: 'Bob', totalScore: 200, roundScores: [80, 120], currentRank: 1, rankChange: 0 },
          { username: 'Alice', totalScore: 150, roundScores: [100, 50], currentRank: 2, rankChange: 0 },
        ])}
        roundNumber={2}
        currentUsername="Alice"
        t={mockT}
      />
    );

    // Alice's row should have the "you" marker
    const aliceRow = screen.getByTestId('series-player-Alice');
    expect(aliceRow).toHaveClass('border-neo-cyan');
  });

  it('should show rank change indicators', () => {
    render(
      <SeriesStandingsBanner
        standings={makeStandings([
          { username: 'Bob', totalScore: 200, roundScores: [80, 120], currentRank: 1, rankChange: 2 },
          { username: 'Alice', totalScore: 150, roundScores: [100, 50], currentRank: 2, rankChange: -1 },
        ])}
        roundNumber={2}
        currentUsername="Alice"
        t={mockT}
      />
    );

    // Should show up arrow for Bob (positive rankChange)
    expect(screen.getByTestId('rank-up-Bob')).toBeInTheDocument();
    // Should show down arrow for Alice (negative rankChange)
    expect(screen.getByTestId('rank-down-Alice')).toBeInTheDocument();
  });

  it('should show round score pills', () => {
    render(
      <SeriesStandingsBanner
        standings={makeStandings([
          { username: 'Alice', totalScore: 170, roundScores: [90, 80], currentRank: 1, rankChange: 0 },
        ])}
        roundNumber={2}
        currentUsername="Alice"
        t={mockT}
      />
    );

    // Should show individual round scores within the player row
    const playerRow = screen.getByTestId('series-player-Alice');
    expect(within(playerRow).getByText('90')).toBeInTheDocument();
    expect(within(playerRow).getByText('80')).toBeInTheDocument();
    // And the accumulated total
    expect(within(playerRow).getByText('170')).toBeInTheDocument();
  });
});
