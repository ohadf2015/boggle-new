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
 * Phone layout: ONE row of seats with horizontal scroll, so the roster stops
 * eating two grid rows and the battle-mode picker gets the vertical space
 * (Ohad, 2026-09-27). Desktop/TV keep the 4×2 grid via display:contents.
 */
describe('PlayerRoster — phone one-row crew strip', () => {
  beforeEach(() => emit.mockClear());

  it('seats render exactly once — no duplicated DOM between the phone strip and the desktop grid', () => {
    render(<PlayerRoster players={room} username="Host" gameCode="ABCD" maxPlayers={8} t={t} />);
    expect(screen.getAllByTestId('lobby-seat')).toHaveLength(3);
    expect(screen.getAllByTestId('lobby-seat-empty')).toHaveLength(5);
  });

  it('the other seats live in a horizontal scroller (one row), not a wrapping grid', () => {
    render(<PlayerRoster players={room} username="Host" gameCode="ABCD" maxPlayers={8} t={t} />);
    const ada = screen.getAllByTestId('lobby-seat').find((el) => el.getAttribute('data-player') === 'Ada')!;
    const scroller = ada.closest('[class*="overflow-x-auto"]');
    expect(scroller).not.toBeNull();
    // Desktop flattens the wrappers back into the 4-column grid.
    expect(scroller!.className).toContain('min-[720px]:contents');
    expect(scroller!.className).not.toContain('grid-cols-4');
  });

  it('phone seats keep a fixed, non-shrinking width inside the scroller; the grid still stretches them at ≥720px', () => {
    render(<PlayerRoster players={room} username="Host" gameCode="ABCD" maxPlayers={8} t={t} />);
    for (const seat of screen.getAllByTestId('lobby-seat')) {
      expect(seat.className).toMatch(/max-\[719px\]:shrink-0/);
      expect(seat.className).toMatch(/min-\[720px\]:w-full/);
    }
  });

  it('my seat is pinned outside the scroller so it — and the emote popup anchored to it — is never scrolled away or clipped', () => {
    render(<PlayerRoster players={room} username="Ada" gameCode="ABCD" maxPlayers={8} t={t} variant="guest" />);
    const mine = screen.getAllByTestId('lobby-seat').find((el) => el.getAttribute('data-me') === 'true')!;
    expect(mine.closest('[class*="overflow-x-auto"]')).toBeNull();
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
    const actions = screen.getByTestId('my-actions');
    const mine = screen.getAllByTestId('lobby-seat').find((el) => el.getAttribute('data-me') === 'true')!;
    expect(mine.contains(actions)).toBe(true);
    // The header row (the h2's flex row) no longer hosts the emote trigger.
    const headerRow = screen.getByRole('heading', { level: 2 }).parentElement!;
    expect(headerRow.contains(actions)).toBe(false);
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
