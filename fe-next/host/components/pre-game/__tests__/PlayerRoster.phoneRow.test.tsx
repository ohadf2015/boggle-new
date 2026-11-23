// @vitest-environment happy-dom
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PlayerRoster } from '../PlayerRoster';

const emit = vi.fn();
vi.mock('../../../../components/Avatar', () => ({ default: () => <div data-testid="avatar" /> }));
vi.mock('../../../../utils/SocketContext', () => ({
  useSocket: () => ({ socket: { emit, on: vi.fn(), off: vi.fn() } }),
  useSocketOptional: () => ({ socket: { emit, on: vi.fn(), off: vi.fn() } }),
}));
vi.mock('../../../../components/ui/ConfirmationDialog', () => ({ ConfirmationDialog: () => null }));

const t = (k: string) => k;
const room = [{ username: 'Host', isHost: true }, { username: 'Ada' }, { username: 'Bot1', isBot: true }];

/**
 * Phone layout: a 4-column grid so all 8 chairs (and every "+ BOT" slot) fit
 * without a clipped horizontal strip (Ohad, 2026-11-18). Desktop/TV keep their
 * own column counts via min-[720px] / TV wall classes.
 */
describe('PlayerRoster — phone 4-column crew grid', () => {
  beforeEach(() => emit.mockClear());

  it('seats render exactly once — no duplicated DOM between phone and desktop layouts', () => {
    render(<PlayerRoster players={room} username="Host" gameCode="ABCD" maxPlayers={8} t={t} />);
    expect(screen.getAllByTestId('lobby-seat')).toHaveLength(3);
    expect(screen.getAllByTestId('lobby-seat-empty')).toHaveLength(1);
  });

  it('the roster is a 4-column grid on the phone, not a horizontal scroller', () => {
    render(<PlayerRoster players={room} username="Host" gameCode="ABCD" maxPlayers={8} t={t} />);
    const grid = screen.getByTestId('roster-grid');
    expect(grid.className).toMatch(/max-\[719px\]:grid-cols-4/);
    expect(grid.className).not.toContain('overflow-x-auto');
    expect(screen.queryByTestId('roster-strip')).toBeNull();
    expect(screen.queryByTestId('roster-more-cue')).toBeNull();
  });

  it('every seat, including empty "+ BOT" chairs, is a direct grid child so none clip off-screen', () => {
    render(<PlayerRoster players={room} username="Host" gameCode="ABCD" maxPlayers={8} t={t} />);
    const grid = screen.getByTestId('roster-grid');
    for (const seat of [...screen.getAllByTestId('lobby-seat'), ...screen.getAllByTestId('lobby-seat-empty')]) {
      expect(seat.parentElement).toBe(grid);
      expect(seat.className).toMatch(/\bw-full\b/);
    }
  });

  it('self actions (the emote tray) sit once in the squad header at every width, so my seat stays one row tall', () => {
    render(
      <PlayerRoster
        players={room}
        username="Host"
        gameCode="ABCD"
        maxPlayers={8}
        t={t}
        selfActions={<span data-testid="my-actions" />}
      />,
    );
    const copies = screen.getAllByTestId('my-actions');
    expect(copies).toHaveLength(1);
    const header = screen.getByTestId('self-header-actions');
    expect(header.contains(copies[0])).toBe(true);
    expect(header.className).not.toMatch(/hidden/);
  });

  it('the emote trigger carries its label so it reads as "emotes" at a glance', () => {
    render(
      <PlayerRoster
        players={room}
        username="Host"
        gameCode="ABCD"
        maxPlayers={8}
        t={t}
        selfActions={<button type="button" data-testid="emote-trigger" />}
      />,
    );
    expect(screen.getByTestId('self-header-actions')).toHaveTextContent('lobby.emote.title');
  });
});
