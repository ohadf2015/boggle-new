import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FriendInviteList, orderForInvite } from './FriendInviteList';
import type { Friend } from '@/utils/friendsTypes';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (k: string) => k }) }));
vi.mock('@/components/Avatar', () => ({ __esModule: true, default: () => <span /> }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }));

const state = vi.hoisted(() => ({ friends: [] as unknown[] }));
vi.mock('@/hooks/useFriends', () => ({ useFriends: () => ({ friends: state.friends, isLoading: false }) }));
vi.mock('@/utils/SocketContext', () => ({ useSocketOptional: () => ({ socket: {}, isConnected: true }) }));
const send = vi.hoisted(() => vi.fn(async () => ({ ok: true, data: { challengeId: 'c', roomCode: 'ABCD' } })));
vi.mock('@/lib/friends/sendChallengeWithAck', () => ({ sendChallengeWithAck: send }));

const f = (id: string, isOnline: boolean, lastSeenAt?: string): Friend => ({
  id: `row-${id}`, odUserId: id, username: id, avatarEmoji: '', avatarColor: '', status: 'accepted' as Friend['status'], isOnline, lastSeenAt,
});

describe('orderForInvite', () => {
  it('puts online friends first, then the most recently seen', () => {
    const order = orderForInvite([f('a', false, '2026-01-01'), f('b', true), f('c', false, '2026-02-01')]).map((x) => x.odUserId);
    expect(order).toEqual(['b', 'c', 'a']);
  });
});

describe('FriendInviteList', () => {
  it('points players with no friends to the leaderboard', () => {
    state.friends = [];
    render(<FriendInviteList gameCode="ABCD" />);
    expect(screen.getByTestId('friend-invite-empty')).toHaveAttribute('href', '/en/leaderboard');
  });

  it('invites a friend to this room with a join_room challenge', async () => {
    state.friends = [f('pal', true)];
    render(<FriendInviteList gameCode="ABCD" />);
    fireEvent.click(screen.getByRole('button', { name: 'friendSocial.inviteName' }));
    await waitFor(() => expect(send).toHaveBeenCalledWith({}, { friendUserId: 'pal', challengeType: 'join_room', roomCode: 'ABCD' }));
    expect(await screen.findByText('friendSocial.invited')).toBeInTheDocument();
  });
});
