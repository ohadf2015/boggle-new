/**
 * Tests for ChaseBanner — the one-line "who to beat" banner above the daily
 * leaderboard. Renders the closable gap that a rank number alone cannot express.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ChaseBanner from '../ChaseBanner';
import type { ChaseParticipant } from '../chaseTarget';

const t = (key: string) => {
  const dict: Record<string, string> = {
    'daily.chaseChasing': '{points} behind {name}',
    'daily.chaseChasingCta': 'One good word passes them',
    'daily.chaseLeading': 'You lead {name} by {points}',
    'daily.chaseLeadingCta': 'Hold the top spot',
    'daily.chaseRank': '#{rank} of {total}',
    'daily.chaseChasingNoGap': '{name} is next',
    'daily.chaseLeadingNoGap': '{name} is right behind you',
  };
  return dict[key] ?? key;
};

function p(over: Partial<ChaseParticipant> & { rank_position: number }): ChaseParticipant {
  return {
    player_id: null,
    guest_fingerprint: null,
    display_name: `P${over.rank_position}`,
    score: 0,
    ...over,
  };
}

const chasingBoard: ChaseParticipant[] = [
  p({ rank_position: 1, player_id: 'a', display_name: 'Maya', score: 340 }),
  p({ rank_position: 2, player_id: 'me', score: 298 }),
];

describe('ChaseBanner', () => {
  it('renders nothing while the board is still loading', () => {
    const { container } = render(
      <ChaseBanner participants={[]} playerId="me" loading t={t} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when the player is not on the board', () => {
    const { container } = render(
      <ChaseBanner participants={chasingBoard} playerId="stranger" t={t} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('names the player ahead and the exact gap when chasing', () => {
    render(<ChaseBanner participants={chasingBoard} playerId="me" t={t} />);
    expect(screen.getByText('42 behind Maya')).toBeInTheDocument();
    expect(screen.getByText('One good word passes them')).toBeInTheDocument();
    expect(screen.getByText('#2 of 2')).toBeInTheDocument();
  });

  it('flips to defending the lead when the player is first', () => {
    const board: ChaseParticipant[] = [
      p({ rank_position: 1, player_id: 'me', score: 300 }),
      p({ rank_position: 2, player_id: 'b', display_name: 'Tom', score: 288 }),
    ];
    render(<ChaseBanner participants={board} playerId="me" t={t} />);
    expect(screen.getByText('You lead Tom by 12')).toBeInTheDocument();
    expect(screen.getByText('Hold the top spot')).toBeInTheDocument();
  });

  it('names the target without a number when the board metric cannot explain the ranking', () => {
    // Word-hunt board: ranked on `solved` first, so the leader can show a lower
    // efficiency score than the player chasing them.
    const board: ChaseParticipant[] = [
      p({ rank_position: 1, player_id: 'a', display_name: 'Maya', score: 0, efficiency_score: 10 }),
      p({ rank_position: 2, player_id: 'me', score: 0, efficiency_score: 50 }),
    ];
    render(<ChaseBanner participants={board} playerId="me" t={t} />);
    expect(screen.getByText('Maya is next')).toBeInTheDocument();
    expect(screen.queryByText(/behind Maya/)).not.toBeInTheDocument();
  });

  it('reports the full board size rather than the rows it was handed', () => {
    render(<ChaseBanner participants={chasingBoard} playerId="me" totalPlayers={37} t={t} />);
    expect(screen.getByText('#2 of 37')).toBeInTheDocument();
  });

  it('is announced to assistive tech as a status, not a decoration', () => {
    render(<ChaseBanner participants={chasingBoard} playerId="me" t={t} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
