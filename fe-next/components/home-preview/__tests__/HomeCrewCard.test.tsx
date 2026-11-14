import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const NOW = Date.now();
const ago = (ms: number) => new Date(NOW - ms).toISOString();

const h = vi.hoisted(() => ({
  home: { data: null as unknown, error: false, loading: false, refresh: vi.fn() },
  acceptRequest: vi.fn(),
  sendRequest: vi.fn(),
  track: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'me' }, isAuthenticated: true, profile: { username: 'me user' } }) }));
vi.mock('@/hooks/friends/useFriendsHome', () => ({ useFriendsHome: () => h.home }));
vi.mock('@/hooks/useFriends', () => ({ useFriends: () => ({ acceptRequest: h.acceptRequest, sendRequest: h.sendRequest }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: (...a: unknown[]) => h.track(...a) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

vi.mock('@/components/rivals/RivalPingButton', () => ({
  RivalPingButton: ({ targetUserId, context }: { targetUserId: string; context: string }) => (
    <button type="button" data-testid="crew-ping" data-target={targetUserId} data-context={context}>ping</button>
  ),
}));

import { HomeCrewCard } from '../HomeCrewCard';

const t = (k: string, p?: Record<string, unknown>) => (p && Object.keys(p).length ? `${k}:${JSON.stringify(p)}` : k);
const friend = (userId: string, seenMsAgo: number, wins = 0, losses = 0) => ({ userId, name: userId.toUpperCase(), avatarImage: null, customAvatar: null, lastSeenAt: ago(seenMsAgo), wins, losses });
const data = (over: Record<string, unknown> = {}) => ({
  friends: [friend('old', 86_400_000 * 2, 3, 1), friend('on', 60_000), friend('lob', 3_600_000, 1, 2)],
  friendCount: 3,
  incoming: { count: 0, first: [] },
  suggestions: [],
  canAddFriends: true,
  presence: [{ userId: 'lob', status: 'in_lobby', gameCode: 'ROOM1' }],
  ...over,
});

describe('HomeCrewCard', () => {
  beforeEach(() => {
    h.home = { data: data(), error: false, loading: false, refresh: vi.fn().mockResolvedValue(undefined) };
    h.acceptRequest.mockReset().mockResolvedValue({ success: true });
    h.sendRequest.mockReset().mockResolvedValue({ success: true });
    h.track.mockReset();
  });

  it('Given friends, Then the one in a lobby comes first with Join, online gets Invite, offline gets a Ping', () => {
    render(<HomeCrewCard lang="en" t={t} />);
    const rows = screen.getAllByTestId('crew-row');
    expect(rows.map((r) => r.getAttribute('data-user'))).toEqual(['lob', 'on', 'old']);
    expect(within(rows[0]).getByRole('link', { name: /homePlay\.crew\.join/ }).getAttribute('href')).toBe('/en/multiplayer?room=ROOM1');
    expect(within(rows[1]).getByRole('link', { name: /homePlay\.crew\.invite/ }).getAttribute('href')).toBe('/en/multiplayer?invite=on');
    expect(within(rows[2]).queryByRole('link')).toBeNull();
    expect(within(rows[2]).getByTestId('crew-ping').getAttribute('data-context')).toBe('friendFree');
    expect(within(rows[0]).getByText(/homePlay\.crew\.inLobby/)).toBeTruthy();
    expect(within(rows[2]).getByText(/homePlay\.crew\.youLead/)).toBeTruthy();
  });

  it('Given a pending request, When Accept is tapped, Then it is accepted, tracked with the source, and the crew refetched', async () => {
    h.home.data = data({ incoming: { count: 1, first: [{ requestId: 'r1', userId: 'asker', name: 'ASKER', avatarImage: null, customAvatar: null }] } });
    render(<HomeCrewCard lang="en" t={t} />);
    fireEvent.click(screen.getByRole('button', { name: /friends\.acceptRequest/ }));
    await waitFor(() => expect(h.acceptRequest).toHaveBeenCalledWith('r1'));
    expect(h.track).toHaveBeenCalledWith('friend_request_accepted', expect.objectContaining({ source: 'home_crew' }));
    await waitFor(() => expect(h.home.refresh).toHaveBeenCalled());
  });

  it('Given fewer than 3 friends, Then recent opponents and the invite link show', () => {
    h.home.data = data({ friends: [friend('on', 60_000)], friendCount: 1, suggestions: [friend('opp', 1, 0, 1)] });
    render(<HomeCrewCard lang="en" t={t} />);
    expect(screen.getByTestId('recent-opponents')).toBeTruthy();
    expect(screen.getByRole('button', { name: /friends\.copyInviteLink/ })).toBeTruthy();
  });

  it('Given an account that may not add friends, Then no suggestions and no invite link', () => {
    h.home.data = data({ friends: [], friendCount: 0, suggestions: [], canAddFriends: false, incoming: { count: 1, first: [{ requestId: 'r1', userId: 'asker', name: 'ASKER', avatarImage: null, customAvatar: null }] } });
    render(<HomeCrewCard lang="en" t={t} />);
    expect(screen.queryByRole('button', { name: /friends\.copyInviteLink/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /friends\.acceptRequest/ })).toBeNull();
  });

  it('Given loading, Then a fixed skeleton; given an error, Then a retry that refetches', () => {
    h.home = { ...h.home, data: null, loading: true };
    const { rerender } = render(<HomeCrewCard lang="en" t={t} />);
    expect(screen.getByTestId('crew-skeleton')).toBeTruthy();
    h.home = { ...h.home, loading: false, error: true };
    rerender(<HomeCrewCard lang="en" t={t} />);
    fireEvent.click(screen.getByRole('button', { name: /homePlay\.crew\.retry/ }));
    expect(h.home.refresh).toHaveBeenCalled();
  });

  it('Given a friend in a private game, Then a Ping with in-game lines', () => {
    h.home.data = data({ friends: [friend('busy', 60_000)], presence: [{ userId: 'busy', status: 'private' }] });
    render(<HomeCrewCard lang="en" t={t} />);
    expect(screen.getByTestId('crew-ping').getAttribute('data-context')).toBe('friendPlaying');
  });

  it('Given friends gone for weeks next to active ones, Then only the active ones show on home', () => {
    h.home.data = data({ friends: [friend('fresh', 3_600_000), friend('gone', 86_400_000 * 40)], presence: [] });
    render(<HomeCrewCard lang="en" t={t} />);
    expect(screen.getAllByTestId('crew-row').map((r) => r.getAttribute('data-user'))).toEqual(['fresh']);
  });

  it('Given six active friends, Then four show and See more reveals the rest', () => {
    h.home.data = data({ friends: Array.from({ length: 6 }, (_, i) => friend(`f${i}`, (i + 1) * 3_600_000)), friendCount: 6, presence: [] });
    render(<HomeCrewCard lang="en" t={t} />);
    expect(screen.getAllByTestId('crew-row')).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: /homePlay\.crew\.seeMore/ }));
    expect(screen.getAllByTestId('crew-row')).toHaveLength(6);
    expect(screen.queryByRole('button', { name: /homePlay\.crew\.seeMore/ })).toBeNull();
  });

  it('Always links to the friends page', () => {
    render(<HomeCrewCard lang="en" t={t} />);
    expect(screen.getByRole('link', { name: /homePlay\.crew\.allFriends/ }).getAttribute('href')).toBe('/en/friends');
  });

  it('Given a friend and a requester with no public name, Then a generic label shows, never a raw username', () => {
    h.home.data = data({
      friends: [{ ...friend('on', 60_000), name: null }],
      friendCount: 1,
      incoming: { count: 1, first: [{ requestId: 'r1', userId: 'asker', name: null, avatarImage: null, customAvatar: null }] },
    });
    render(<HomeCrewCard lang="en" t={t} />);
    expect(within(screen.getByTestId('crew-row')).getByText('friends.aPlayer')).toBeTruthy();
    expect(screen.getByText(/homePlay\.crew\.wantsToBeFriends:\{"name":"friends\.aPlayer"\}/)).toBeTruthy();
  });
});
