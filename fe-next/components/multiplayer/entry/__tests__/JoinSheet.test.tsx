/**
 * JOIN (DESIGN §b.2) — an MpSheet, reached from the list or a code when the
 * player has no complete profile yet: a room ticket, the name prefilled from
 * identity, one JOIN (or WATCH when the room is full).
 */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ActiveRoom } from '@/shared/types/game';
import { bundleT } from './localeBundles';

const CFG = { bgColor: '#123456', skinColor: '#654321' };
const setStoredUsername = vi.fn();
const setStoredCustomAvatar = vi.fn();
let storedName = 'Guesty';

vi.mock('@/contexts/LanguageContext', async () => {
  const { bundleT: bt } = await import('./localeBundles');
  const t = bt('en');
  return { useLanguage: () => ({ t, language: 'en', dir: 'ltr' }) };
});
vi.mock('@/utils/profileStorage', () => ({
  getOrCreateStoredUsername: () => storedName,
  getOrCreateStoredCustomAvatar: () => CFG,
  setStoredUsername: (n: string) => setStoredUsername(n),
  setStoredCustomAvatar: (c: unknown) => setStoredCustomAvatar(c),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ updateProfile: vi.fn(() => Promise.resolve()), loading: false, profile: null }) }));
vi.mock('@/components/avatar/AvatarRenderer', () => ({ __esModule: true, default: () => <div data-testid="avatar-renderer" /> }));

import JoinRoomModal from '../../JoinRoomModal';
import { codeTicket } from '../joinTarget';

const en = bundleT('en');
const room: ActiveRoom = {
  gameCode: 'XWUCT4', roomName: 'Friday Clash', playerCount: 3, maxPlayers: 8, language: 'he',
  gameState: 'waiting', isRanked: false, createdAt: 1,
};
const props = {
  isOpen: true, onClose: vi.fn(), room, isJoining: false, onJoin: vi.fn(),
  isAuthenticated: false, displayName: null as string | null, profileAvatar: null,
};

describe('JoinSheet (via the JoinRoomModal re-export)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storedName = 'Guesty';
  });

  it('shows the room ticket', () => {
    render(<JoinRoomModal {...props} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Friday Clash').getAttribute('dir')).toBe('auto');
    expect(screen.getByTestId('join-ticket').textContent).toContain('3/8');
  });

  it('a known name means no form: the tap joins with it and stores it', () => {
    const onJoin = vi.fn();
    render(<JoinRoomModal {...props} onJoin={onJoin} />);
    expect(screen.queryByRole('textbox', { name: en('mpUi.entry.nameAria') })).toBeNull();
    expect(screen.getByText('Guesty')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('join-submit'));
    expect(onJoin).toHaveBeenCalledWith('Guesty');
    expect(setStoredUsername).toHaveBeenCalledWith('Guesty');
    expect(setStoredCustomAvatar).toHaveBeenCalledWith(CFG);
  });

  it('the name can still be changed before joining', () => {
    const onJoin = vi.fn();
    render(<JoinRoomModal {...props} onJoin={onJoin} />);
    fireEvent.click(screen.getByRole('button', { name: en('mpUi.entry.editName') }));
    fireEvent.change(screen.getByRole('textbox', { name: en('mpUi.entry.nameAria') }), { target: { value: 'Renamed' } });
    fireEvent.click(screen.getByTestId('join-submit'));
    expect(onJoin).toHaveBeenCalledWith('Renamed');
  });

  it('no usable name: the field shows and an invalid name is refused with a reason', () => {
    storedName = '';
    const onJoin = vi.fn();
    render(<JoinRoomModal {...props} onJoin={onJoin} />);
    fireEvent.change(screen.getByRole('textbox', { name: en('mpUi.entry.nameAria') }), { target: { value: ' ' } });
    fireEvent.click(screen.getByTestId('join-submit'));
    expect(onJoin).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('a full room offers WATCH', () => {
    const onSpectate = vi.fn();
    render(<JoinRoomModal {...props} room={{ ...room, playerCount: 8 }} onSpectate={onSpectate} />);
    const cta = screen.getByTestId('join-submit');
    expect(cta.textContent).toContain(en('mpUi.entry.watch'));
    fireEvent.click(cta);
    expect(onSpectate).toHaveBeenCalledWith('Guesty');
  });

  it('while joining: busy and inert', () => {
    render(<JoinRoomModal {...props} isJoining />);
    expect(screen.getByTestId('join-submit')).toBeDisabled();
  });

  it('a listed room\'s ticket carries its mode, flag, seats and host', () => {
    render(<JoinRoomModal {...props} room={{ ...room, gameMode: 'blast', hostUsername: 'Turbo Salmon' }} />);
    const ticket = screen.getByTestId('join-ticket');
    expect(ticket.textContent).toContain(en('multiplayerFlow.roomList.gameModes.blast'));
    expect(ticket.textContent).toContain('🇮🇱');
    expect(ticket.textContent).toContain('3/8');
    expect(ticket.textContent).toContain(en('mpUi.entry.hostedBy', { name: 'Turbo Salmon' }));
  });

  it('the host name truncates in its own direction box on the ticket', () => {
    render(<JoinRoomModal {...props} room={{ ...room, hostUsername: 'Cosmic Avocado' }} />);
    const name = within(screen.getByTestId('join-ticket')).getByText('Cosmic Avocado');
    expect(name.getAttribute('dir')).toBe('auto');
    expect(name.className).toMatch(/\btruncate\b/);
  });

  it('a code nobody lists is an honest ticket: the code, no seat count, no guessed flag or mode', () => {
    render(<JoinRoomModal {...props} room={codeTicket('zz9qx2', 'he')} />);
    const ticket = screen.getByTestId('join-ticket');
    expect(ticket.textContent).toContain('ZZ9QX2');
    expect(ticket.textContent).toContain(en('mpUi.entry.codeTicket'));
    expect(ticket.textContent).not.toMatch(/\d+\/\d+|(^|\D)0(\D|$)/);
    expect(ticket.textContent).not.toContain('🇮🇱');
    expect(ticket.textContent).not.toContain(en('multiplayerFlow.roomList.gameModes.classic'));
    expect(screen.getByTestId('join-submit').textContent).toContain(en('mpUi.entry.join'));
  });

  it('seats that change while the sheet is open bump (re-keyed, transform-only)', () => {
    const { rerender } = render(<JoinRoomModal {...props} />);
    const before = screen.getByTestId('join-seats');
    rerender(<JoinRoomModal {...props} room={{ ...room, playerCount: 4 }} />);
    const after = screen.getByTestId('join-seats');
    expect(after).not.toBe(before);
    expect(after.textContent).toContain('4/8');
    expect(after.className).toContain('animate-mp-bump');
  });

  it('renders nothing without a room', () => {
    render(<JoinRoomModal {...props} room={null} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
