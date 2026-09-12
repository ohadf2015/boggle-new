/**
 * The screen that used to be a spinner with no exit.
 *
 * A duel that never starts is a real outcome — the opponent closed the tab, the
 * server restarted, the join raced the room. It must look like something a kid
 * can act on, not like a page that is still loading.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DuelWaitingRoom } from '../DuelWaitingRoom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, _f?: string, params?: Record<string, unknown>) =>
      params?.name ? `${key}:${params.name}` : key,
  }),
}));
vi.mock('@/components/ui/Loader', () => ({ Loader: () => <div data-testid="loader" /> }));
vi.mock('../DuelSeriesTally', () => ({
  DuelSeriesTally: () => <div data-testid="series-tally" />,
}));

describe('DuelWaitingRoom', () => {
  const onRetry = vi.fn();
  const onBackToLobby = vi.fn();
  const props = {
    opponentName: 'Maya',
    stalled: false,
    onRetry,
    onBackToLobby,
    series: { mine: 0, theirs: 0, games: 0 },
    seriesStatus: 'open' as const,
  };

  beforeEach(() => vi.clearAllMocks());

  it('names who we are waiting for instead of "opponent"', () => {
    render(<DuelWaitingRoom {...props} />);
    expect(screen.getByTestId('duel-waiting')).toHaveTextContent(
      'education.duels.waitingForName:Maya'
    );
    expect(screen.queryByTestId('duel-waiting-recovery')).not.toBeInTheDocument();
  });

  it('shows the series score while a best-of-3 is running', () => {
    render(<DuelWaitingRoom {...props} series={{ mine: 1, theirs: 0, games: 1 }} />);
    expect(screen.getByTestId('series-tally')).toBeInTheDocument();
  });

  it('offers a way out once the duel plainly is not coming', () => {
    render(<DuelWaitingRoom {...props} stalled />);

    expect(screen.getByTestId('duel-waiting-recovery')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('duel-waiting-retry'));
    expect(onRetry).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('duel-waiting-exit'));
    expect(onBackToLobby).toHaveBeenCalled();
  });

  it('gives both recovery controls a real border (no ghost buttons)', () => {
    render(<DuelWaitingRoom {...props} stalled />);
    expect(screen.getByTestId('duel-waiting-retry').className).toContain('border-[3px]');
    expect(screen.getByTestId('duel-waiting-exit').className).toContain('border-[3px]');
  });
});
