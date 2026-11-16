/**
 * Tests for PlayerCard — focuses on the chosen-style badge: it appears (emoji +
 * label) when the player picked a player_style, and is absent when they never did
 * (NULL). Heavy children (Avatar, curator control) are mocked so the test stays a
 * pure render assertion. Row actions live in a 3-dots menu so the name keeps its width.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

function renderCard(player: Player, overrides: Partial<React.ComponentProps<typeof PlayerCard>> = {}) {
  return render(
    <PlayerCard
      player={player}
      language="en"
      selected={false}
      onToggleSelect={noop}
      onGift={noop}
      onToggleBlast={noop}
      onToggleBeta={noop}
      onBlock={noop}
      blastLoading={false}
      betaLoading={false}
      blockLoading={false}
      curatorAssignments={[]}
      onAssignCurator={noop}
      onRevokeCurator={noop}
      curatorBusyKey={null}
      {...overrides}
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

async function openMenu() {
  await userEvent.click(screen.getByTestId('player-actions'));
}

describe('PlayerCard — beta tester control', () => {
  it('calls onToggleBeta when the beta item is chosen', async () => {
    const onToggleBeta = vi.fn();
    const player = makePlayer({ is_beta_tester: false });
    renderCard(player, { onToggleBeta });
    await openMenu();
    await userEvent.click(screen.getByTestId('player-beta-toggle'));
    expect(onToggleBeta).toHaveBeenCalledWith(player);
  });

  it('shows the BETA badge for a beta tester and hides it otherwise', () => {
    renderCard(makePlayer({ is_beta_tester: true }));
    expect(screen.getByTestId('player-beta-badge')).toBeInTheDocument();
  });

  it('hides the BETA badge when the player is not a beta tester', () => {
    renderCard(makePlayer({ is_beta_tester: false }));
    expect(screen.queryByTestId('player-beta-badge')).not.toBeInTheDocument();
  });

  it('disables the beta item while a toggle is in flight', async () => {
    renderCard(makePlayer({ is_beta_tester: false }), { betaLoading: true });
    await openMenu();
    expect(screen.getByTestId('player-beta-toggle')).toHaveAttribute('data-disabled');
  });
});

describe('PlayerCard — 3-dots actions', () => {
  it('keeps every action out of the row until the menu opens', () => {
    renderCard(makePlayer());
    expect(screen.getByTestId('player-actions')).toHaveAccessibleName('Player actions');
    expect(screen.queryByRole('menuitem', { name: /Gift/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId('player-beta-toggle')).not.toBeInTheDocument();
  });

  it('fires gift and block from the menu', async () => {
    const onGift = vi.fn();
    const onBlock = vi.fn();
    const player = makePlayer();
    renderCard(player, { onGift, onBlock });
    await openMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: /Gift/ }));
    expect(onGift).toHaveBeenCalledWith(player);
    await openMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: /Block/ }));
    expect(onBlock).toHaveBeenCalledWith(player);
  });

  it('keeps the curator panel folded until its menu item is chosen', async () => {
    renderCard(makePlayer());
    expect(screen.queryByTestId('curator-control')).not.toBeInTheDocument();
    await openMenu();
    await userEvent.click(screen.getByTestId('player-curator-toggle'));
    expect(screen.getByTestId('curator-control')).toBeInTheDocument();
  });

  it('shows how many curator languages a player holds on the menu item', async () => {
    renderCard(makePlayer(), { curatorAssignments: [{ language: 'he', tier: 1 } as never, { language: 'en', tier: 2 } as never] });
    await openMenu();
    expect(screen.getByTestId('player-curator-toggle')).toHaveTextContent('2');
  });
});

describe('PlayerCard — name', () => {
  it('shows the display name with the username beside it', () => {
    renderCard(makePlayer());
    expect(screen.getByRole('link', { name: 'Wordy' })).toBeInTheDocument();
  });

  it('falls back to the username when there is no display name', () => {
    renderCard(makePlayer({ display_name: '', username: 'wordy' }));
    expect(screen.getByRole('link', { name: 'wordy' })).toBeInTheDocument();
  });

  it('never renders an empty name: a nameless profile reads as a guest with its short id', () => {
    renderCard(makePlayer({ id: 'abcdef12-0000', display_name: '', username: '' }));
    expect(screen.getByRole('link', { name: 'Guest abcdef' })).toBeInTheDocument();
  });
});
