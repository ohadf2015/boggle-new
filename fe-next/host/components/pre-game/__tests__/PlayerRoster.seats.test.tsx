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

  it('host: a bot seat can be removed', () => {
    render(<PlayerRoster players={room} username="Host" gameCode="ABCD" maxPlayers={8} t={t} />);
    fireEvent.click(screen.getByLabelText('hostView.removeBot'));
    expect(emit).toHaveBeenCalledWith('removeBot', { username: 'Bot1', gameCode: 'ABCD' });
  });
});
