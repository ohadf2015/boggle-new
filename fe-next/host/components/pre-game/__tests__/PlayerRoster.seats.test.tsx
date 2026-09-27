import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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

describe('PlayerRoster — the 8-seat lobby grid', () => {
  beforeEach(() => emit.mockClear());

  it('always shows 8 chairs: players first, then dashed empty seats', () => {
    render(<PlayerRoster players={room} username="Host" gameCode="ABCD" maxPlayers={8} t={t} />);
    expect(screen.getAllByTestId('lobby-seat')).toHaveLength(3);
    expect(screen.getAllByTestId('lobby-seat-empty')).toHaveLength(5);
  });

  it('marks my own seat', () => {
    render(<PlayerRoster players={room} username="Ada" gameCode="ABCD" maxPlayers={8} t={t} variant="guest" />);
    const mine = screen.getAllByTestId('lobby-seat').find((el) => el.getAttribute('data-me') === 'true');
    expect(mine).toHaveTextContent('Ada');
  });

  it('host: an empty seat is a "+ BOT" button that seats one bot', () => {
    render(<PlayerRoster players={room} username="Host" gameCode="ABCD" maxPlayers={8} t={t} />);
    const empty = screen.getAllByTestId('lobby-seat-empty')[0];
    expect(empty.tagName).toBe('BUTTON');
    fireEvent.click(empty);
    expect(emit).toHaveBeenCalledWith('addBot', { difficulty: 'medium', gameCode: 'ABCD' });
  });

  it('guest: empty seats invite ("Join") and cannot add bots or kick', () => {
    render(<PlayerRoster players={room} username="Ada" gameCode="ABCD" maxPlayers={8} t={t} variant="guest" />);
    const empty = screen.getAllByTestId('lobby-seat-empty');
    expect(empty[0].tagName).not.toBe('BUTTON');
    expect(screen.getAllByText('common.join').length).toBe(5);
    expect(screen.queryByLabelText('hostView.kickPlayer')).toBeNull();
    expect(screen.queryByLabelText('hostView.removeBot')).toBeNull();
  });

  it('a long name is clipped to its own column instead of running into the next seat (390px phone)', () => {
    // Given a seat whose name is wider than a quarter of a phone card
    render(<PlayerRoster players={[...room, { username: 'Puzzle Pro Bot 87', isBot: true }]} username="Host" gameCode="ABCD" maxPlayers={8} t={t} />);
    const seat = screen.getAllByTestId('lobby-seat').find((el) => el.getAttribute('data-player') === 'Puzzle Pro Bot 87')!;
    const grid = seat.parentElement!;
    // Then the grid stretches items to their 1fr column (justify-items-center would size them to max-content)
    expect(grid.className).not.toMatch(/\bjustify-items-center\b/);
    // And the seat fills its column so the name wraps/clamps at that width
    expect(seat.className).toMatch(/\bw-full\b/);
    expect(seat.className).toMatch(/\bmin-w-0\b/);
  });

  it('a seat name wraps onto two lines instead of a one-line ellipsis ("LobHo…" at 390px)', () => {
    // Given a 12-char name in a ~78px phone column
    render(<PlayerRoster players={[...room, { username: 'LobJoin03xyz' }]} username="Host" gameCode="ABCD" maxPlayers={8} t={t} />);
    const name = screen.getByText('LobJoin03xyz');
    // Then it is clamped to two lines, never single-line truncated
    expect(name.className).not.toMatch(/\btruncate\b/);
    expect(name.className).toMatch(/\bline-clamp-2\b/);
    // And it wraps only at its natural seams (camel humps, letter→digit), balanced —
    // not at ANY character: overflow-wrap:anywhere orphaned "0p" under "LobJoinTp4s".
    expect(name.className).not.toMatch(/overflow-wrap:anywhere/);
    expect(name.className).toMatch(/\btext-balance\b/);
    expect(name.querySelectorAll('wbr')).toHaveLength(2);
  });

  it('a spaced (e.g. Hebrew) name wraps on whole words — no forced break inside a word', () => {
    render(<PlayerRoster players={[...room, { username: 'אוהד פישר' }]} username="Host" gameCode="ABCD" maxPlayers={8} t={t} />);
    const name = screen.getByText('אוהד פישר');
    expect(name.querySelectorAll('wbr')).toHaveLength(0);
    expect(name.className).not.toMatch(/overflow-wrap:anywhere/);
    expect(name).toHaveAttribute('dir', 'auto');
  });

  it('my editable name uses the whole column: no inline pencil icon stealing width', () => {
    // Given I am a guest who can rename myself
    render(<PlayerRoster players={[{ username: 'LobHost03xyz', isHost: true }]} username="LobHost03xyz" gameCode="ABCD" maxPlayers={8} t={t} canEditSelfName onSelfNameChange={() => {}} />);
    const edit = screen.getByTestId('edit-name-button');
    // Then the button is still the labelled rename control
    expect(edit).toHaveAttribute('aria-label', 'playerView.editName');
    // And it holds only the (two-line clamped) name, no icon
    expect(edit.querySelector('svg')).toBeNull();
    const name = screen.getByText('LobHost03xyz');
    expect(name.className).not.toMatch(/\btruncate\b/);
    expect(name.className).toMatch(/\bline-clamp-2\b/);
  });

  it('host: a bot seat can be removed', () => {
    render(<PlayerRoster players={room} username="Host" gameCode="ABCD" maxPlayers={8} t={t} />);
    fireEvent.click(screen.getByLabelText('hostView.removeBot'));
    expect(emit).toHaveBeenCalledWith('removeBot', { username: 'Bot1', gameCode: 'ABCD' });
  });
});
