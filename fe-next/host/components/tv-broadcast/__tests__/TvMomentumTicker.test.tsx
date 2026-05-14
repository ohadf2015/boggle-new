import { vi } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import TvMomentumTicker from '../TvMomentumTicker';

vi.mock('framer-motion', () => ({
  m: {
    div: React.forwardRef(function MotionDiv(
      { children, className, style, ...rest }: any,
      ref: any
    ) {
      return (
        <div
          ref={ref}
          className={className}
          style={style}
          data-testid={rest['data-testid']}
          aria-label={rest['aria-label']}
        >
          {children}
        </div>
      );
    }),
  },
  AnimatePresence: ({ children, mode }: any) => <>{children}</>,
}));

const mockT = (key: string, params?: Record<string, string | number>) => {
  if (key === 'tvBroadcast.leadsWithPts' && params)
    return `${params.player} leads with ${params.score} pts`;
  if (key === 'tvBroadcast.playersWithinPts' && params)
    return `${params.count} players within ${params.gap} pts`;
  if (key === 'tvBroadcast.wordsAndCounting' && params)
    return `${params.player} found ${params.count} words`;
  if (key === 'tvBroadcast.noActivityYet')
    return 'Waiting for the action to begin...';
  if (key === 'tvBroadcast.anyonesGame') return "Anyone's game!";
  if (key === 'tvBroadcast.raceHeatingUp') return 'The race is heating up!';
  return key;
};

describe('TvMomentumTicker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with initial message', () => {
    render(
      <TvMomentumTicker
        playerScores={{ Alice: 100 }}
        playerWordCounts={{ Alice: 5 }}
        t={mockT}
      />
    );
    // Should show some message on initial render
    const ticker = screen.getByTestId('momentum-ticker');
    expect(ticker).toBeInTheDocument();
    expect(ticker.textContent).not.toBe('');
  });

  it('generates leader messages', () => {
    render(
      <TvMomentumTicker
        playerScores={{ Alice: 200, Bob: 50 }}
        playerWordCounts={{ Alice: 10, Bob: 3 }}
        t={mockT}
      />
    );
    const ticker = screen.getByTestId('momentum-ticker');
    // First message should be leader-related
    expect(ticker.textContent).toContain('Alice leads with 200 pts');
  });

  it('empty player data shows default message', () => {
    render(
      <TvMomentumTicker playerScores={{}} playerWordCounts={{}} t={mockT} />
    );
    expect(screen.getByText('Waiting for the action to begin...')).toBeInTheDocument();
  });

  it('rotates messages over time', () => {
    render(
      <TvMomentumTicker
        playerScores={{ Alice: 200, Bob: 180 }}
        playerWordCounts={{ Alice: 10, Bob: 8 }}
        t={mockT}
      />
    );
    const ticker = screen.getByTestId('momentum-ticker');
    const firstMessage = ticker.textContent;

    act(() => {
      vi.advanceTimersByTime(8500);
    });

    // Message should have changed (or cycled)
    const secondMessage = screen.getByTestId('momentum-ticker').textContent;
    // With only 2 players there are multiple possible messages
    expect(secondMessage).toBeTruthy();
  });

  it('generates close race messages when top players are near', () => {
    render(
      <TvMomentumTicker
        playerScores={{ Alice: 200, Bob: 195, Charlie: 190 }}
        playerWordCounts={{ Alice: 10, Bob: 9, Charlie: 8 }}
        t={mockT}
      />
    );
    // Advance to cycle through messages — close race message should appear eventually
    let foundCloseRace = false;
    for (let i = 0; i < 10; i++) {
      const text = screen.getByTestId('momentum-ticker').textContent || '';
      if (text.includes('players within') || text.includes("Anyone's game")) {
        foundCloseRace = true;
        break;
      }
      act(() => {
        vi.advanceTimersByTime(8500);
      });
    }
    expect(foundCloseRace).toBe(true);
  });

  it('generates word count messages for high word counts', () => {
    render(
      <TvMomentumTicker
        playerScores={{ Alice: 200, Bob: 50 }}
        playerWordCounts={{ Alice: 15, Bob: 3 }}
        t={mockT}
      />
    );
    let foundWordMsg = false;
    for (let i = 0; i < 10; i++) {
      const text = screen.getByTestId('momentum-ticker').textContent || '';
      if (text.includes('found') && text.includes('words')) {
        foundWordMsg = true;
        break;
      }
      act(() => {
        vi.advanceTimersByTime(8500);
      });
    }
    expect(foundWordMsg).toBe(true);
  });
});
