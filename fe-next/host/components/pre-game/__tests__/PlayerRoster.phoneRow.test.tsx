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
    expect(screen.getAllByTestId('lobby-seat-empty')).toHaveLength(5);
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

  it('self actions (the emote tray) sit on MY seat, under my name — not in the roster header row', () => {
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
    const mine = screen.getAllByTestId('lobby-seat').find((el) => el.getAttribute('data-me') === 'true')!;
    const copies = screen.getAllByTestId('my-actions');
    expect(copies.filter((el) => mine.contains(el))).toHaveLength(1);
    // The other copy is the ≥720px header placement; on a phone it is hidden.
    expect(screen.getByTestId('self-header-actions').contains(copies.find((el) => !mine.contains(el))!)).toBe(true);
    expect(screen.getByTestId('self-header-actions').className).toMatch(/max-\[719px\]:hidden/);
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
    const mine = screen.getAllByTestId('lobby-seat').find((el) => el.getAttribute('data-me') === 'true')!;
    expect(mine).toHaveTextContent('lobby.emote.title');
  });
});
