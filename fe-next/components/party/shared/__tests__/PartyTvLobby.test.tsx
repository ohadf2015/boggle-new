import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PartyTvLobby from '../PartyTvLobby';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));

const gameDef = {
  id: 'caption-clash',
  nameKey: 'party.captionClash.name',
  descriptionKey: 'party.captionClash.description',
  category: 'party',
  minPlayers: 3,
  maxPlayers: 10,
  defaultRounds: 7,
  defaultRoundTime: 45,
  accentColor: 'neo-pink',
  icon: '🖼️',
} as const;

function room(players: Record<string, unknown>) {
  return {
    roomCode: 'ABCD',
    players,
    spectators: {},
    hostSocketId: 'host',
  } as never;
}

const hostPlayer = { socketId: 'host', username: 'Host', isHost: true };

describe('PartyTvLobby — solo / add bots', () => {
  it('shows a Play Solo button to the host and calls onAddBots when clicked', () => {
    const onAddBots = vi.fn();
    render(
      <PartyTvLobby
        room={room({ host: hostPlayer })}
        gameDef={gameDef}
        isHost
        onStartGame={vi.fn()}
        onAddBots={onAddBots}
        error={null}
      />,
    );
    const btn = screen.getByRole('button', { name: /party\.playSolo/i });
    fireEvent.click(btn);
    expect(onAddBots).toHaveBeenCalledTimes(1);
  });

  it('does not show the Play Solo button to non-hosts', () => {
    render(
      <PartyTvLobby
        room={room({ host: hostPlayer })}
        gameDef={gameDef}
        isHost={false}
        onStartGame={vi.fn()}
        onAddBots={vi.fn()}
        error={null}
      />,
    );
    expect(screen.queryByRole('button', { name: /party\.playSolo/i })).toBeNull();
  });

  it('hides Play Solo once the room is full', () => {
    const full: Record<string, unknown> = { host: hostPlayer };
    for (let i = 0; i < 10; i++) full[`p${i}`] = { socketId: `p${i}`, username: `P${i}`, isHost: false };
    render(
      <PartyTvLobby
        room={room(full)}
        gameDef={gameDef}
        isHost
        onStartGame={vi.fn()}
        onAddBots={vi.fn()}
        error={null}
      />,
    );
    expect(screen.queryByRole('button', { name: /party\.playSolo/i })).toBeNull();
  });
});
