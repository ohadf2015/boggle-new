/**
 * Tests for PlayerCard — focuses on the chosen-style badge: it appears (emoji +
 * label) when the player picked a player_style, and is absent when they never did
 * (NULL). Heavy children (Avatar, curator control) are mocked so the test stays a
 * pure render assertion.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('@/components/Avatar', () => ({
  default: () => <div data-testid="avatar" />,
}));
vi.mock('../PlayerCuratorControl', () => ({
  PlayerCuratorControl: () => <div data-testid="curator-control" />,
}));

import { PlayerCard } from '../PlayerCard';
import type { Player } from '../playerManagerTypes';

const noop = () => {};

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'u1',
    username: 'wordy',
    display_name: 'Wordy',
    avatar_emoji: '🦊',
    avatar_color: '#fff',
    total_games: 10,
    total_score: 12000,
    ranked_mmr: 1100,
    casual_games: 5,
    ranked_games: 5,
    last_game_at: '2026-06-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function renderCard(player: Player) {
  return render(
    <PlayerCard
      player={player}
      language="en"
      selected={false}
      onToggleSelect={noop}
      onGift={noop}
      onToggleBlast={noop}
      onBlock={noop}
      blastLoading={false}
      blockLoading={false}
      curatorAssignments={[]}
      onAssignCurator={noop}
      onRevokeCurator={noop}
      curatorBusyKey={null}
    />,
  );
}

describe('PlayerCard — chosen style badge', () => {
  it('shows the style badge (emoji + label) when the player chose one', () => {
    renderCard(makePlayer({ player_style: 'hasidic' }));
    const badge = screen.getByTestId('player-style-badge');
    expect(badge).toHaveTextContent('Hasidic');
    expect(badge).toHaveTextContent('🎻');
  });

  it('renders no style badge when the player never chose a style', () => {
    renderCard(makePlayer({ player_style: null }));
    expect(screen.queryByTestId('player-style-badge')).not.toBeInTheDocument();
  });
});
