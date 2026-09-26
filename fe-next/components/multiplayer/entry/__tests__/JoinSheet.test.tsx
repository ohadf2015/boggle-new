/**
 * JOIN (DESIGN §b.2) — an MpSheet, reached from the list or a code when the
 * player has no complete profile yet: a room ticket, the name prefilled from
 * identity, one JOIN (or WATCH when the room is full).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('prefills the identity name; JOIN joins and stores it', () => {
    const onJoin = vi.fn();
    render(<JoinRoomModal {...props} onJoin={onJoin} />);
    expect((screen.getByRole('textbox', { name: en('mpUi.entry.nameAria') }) as HTMLInputElement).value).toBe('Guesty');
    fireEvent.click(screen.getByTestId('join-submit'));
    expect(onJoin).toHaveBeenCalledWith('Guesty');
    expect(setStoredUsername).toHaveBeenCalledWith('Guesty');
    expect(setStoredCustomAvatar).toHaveBeenCalledWith(CFG);
  });

  it('refuses an invalid name and says why', () => {
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

  it('renders nothing without a room', () => {
    render(<JoinRoomModal {...props} room={null} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
