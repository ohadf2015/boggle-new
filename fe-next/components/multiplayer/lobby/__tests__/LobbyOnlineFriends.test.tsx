import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Friend } from '@/utils/friendsTypes';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${Object.values(p).join(',')}` : k) }),
}));
vi.mock('@/components/Avatar', () => ({ __esModule: true, default: () => <span data-testid="avatar" /> }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
const auth = vi.hoisted(() => ({ isAuthenticated: true }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
const state = vi.hoisted(() => ({ friends: [] as unknown[] }));
vi.mock('@/hooks/useFriends', () => ({ useFriends: () => ({ friends: state.friends, isLoading: false }) }));
vi.mock('@/utils/SocketContext', () => ({ useSocketOptional: () => ({ socket: {}, isConnected: true }) }));
const send = vi.hoisted(() => vi.fn(async () => ({ ok: true, data: { challengeId: 'c', roomCode: 'ABCD' } })));
vi.mock('@/lib/friends/sendChallengeWithAck', () => ({ sendChallengeWithAck: send }));

import { LobbyOnlineFriends } from '../LobbyOnlineFriends';
import { trackGrowthEvent } from '@/utils/growthTracking';

const f = (id: string, isOnline: boolean): Friend => ({
  id: `row-${id}`, odUserId: id, username: id, avatarEmoji: '', avatarColor: '', status: 'accepted' as Friend['status'], isOnline,
});

beforeEach(() => {
  vi.clearAllMocks();
  auth.isAuthenticated = true;
});

describe('LobbyOnlineFriends', () => {
  it('Given 5 online friends, Then shows 3 with one-tap Invite and a +2 that opens the sheet', () => {
    state.friends = ['a', 'b', 'c', 'd', 'e'].map((id) => f(id, true)).concat(f('off', false));
    const onMore = vi.fn();
    render(<LobbyOnlineFriends gameCode="ABCD" onMore={onMore} />);
    expect(screen.getAllByRole('button', { name: /friendSocial.inviteName/ })).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'friendSocial.moreOnline|2' }));
    expect(onMore).toHaveBeenCalled();
  });

  it('Given a tap on Invite, Then sends the same join_room invite as the sheet, tagged with this surface', async () => {
    state.friends = [f('pal', true)];
    render(<LobbyOnlineFriends gameCode="ABCD" onMore={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /moreOnline/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'friendSocial.inviteName|pal' }));
    await waitFor(() => expect(send).toHaveBeenCalledWith({}, { friendUserId: 'pal', challengeType: 'join_room', roomCode: 'ABCD' }));
    await waitFor(() => expect(trackGrowthEvent).toHaveBeenCalledWith('friend_invite_sent', { surface: 'room_lobby_strip', online: true }));
  });

  it('Given no friend online, Then renders nothing', () => {
    state.friends = [f('off', false)];
    const { container } = render(<LobbyOnlineFriends gameCode="ABCD" onMore={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('Given a guest, Then renders nothing', () => {
    auth.isAuthenticated = false;
    state.friends = [f('pal', true)];
    const { container } = render(<LobbyOnlineFriends gameCode="ABCD" onMore={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });
});
