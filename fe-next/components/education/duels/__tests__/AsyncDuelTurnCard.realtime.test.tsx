/**
 * A real-time challenge is not "your move".
 *
 * Measured live 2026-09-12: S1 sent S2 a REAL-TIME challenge and S2's lobby
 * rendered the async card — "YOUR MOVE VS OPPONENT … PLAY MY TURN / Skip".
 * Both duel types were pouring through one card, so the student had no way to
 * know the other player was sitting there waiting with a 180-second clock about
 * to start. Same surface, two meanings (recurring-pitfalls Class 3).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import { AsyncDuelTurnCard } from '../AsyncDuelTurnCard';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, _fb?: unknown, params?: Record<string, unknown>) =>
      params ? `${key}:${Object.values(params).join(',')}` : key,
    language: 'en',
  }),
}));

const baseProps = {
  duelId: 'duel-1',
  opponentName: 'Ada',
  lessonName: 'Duel Words A',
  opponentScore: 0,
  onAccept: vi.fn(),
  onDecline: vi.fn(),
  onTaunt: vi.fn(),
};

describe('AsyncDuelTurnCard — real-time invite', () => {
  it('says someone is waiting live, not that it is your turn', () => {
    render(<AsyncDuelTurnCard {...baseProps} duelType="realtime" />);

    const card = screen.getByTestId('duel-turn-card');
    expect(card.dataset.duelType).toBe('realtime');
    expect(screen.getByTestId('duel-turn-live-badge')).toBeInTheDocument();
    expect(screen.getByText('education.duels.turnLiveInvite:Ada')).toBeInTheDocument();
    expect(screen.queryByText(/turnFirstMove/)).not.toBeInTheDocument();
  });

  it('labels the primary button as joining a live duel', () => {
    render(<AsyncDuelTurnCard {...baseProps} duelType="realtime" />);

    expect(screen.getByTestId('duel-turn-play')).toHaveTextContent(
      'education.duels.turnAcceptLive'
    );
  });

  it('still hands the duel id to onAccept', async () => {
    const onAccept = vi.fn();
    render(<AsyncDuelTurnCard {...baseProps} duelType="realtime" onAccept={onAccept} />);

    await userEvent.click(screen.getByTestId('duel-turn-play'));

    expect(onAccept).toHaveBeenCalledWith('duel-1');
  });

  it('keeps the async wording when the duel is async', () => {
    render(<AsyncDuelTurnCard {...baseProps} duelType="async" />);

    expect(screen.getByTestId('duel-turn-card').dataset.duelType).toBe('async');
    expect(screen.queryByTestId('duel-turn-live-badge')).not.toBeInTheDocument();
    expect(screen.getByTestId('duel-turn-play')).toHaveTextContent('education.duels.turnPlay');
  });

  it('defaults to async so an unknown duel type never claims to be live', () => {
    render(<AsyncDuelTurnCard {...baseProps} />);

    expect(screen.queryByTestId('duel-turn-live-badge')).not.toBeInTheDocument();
  });
});
