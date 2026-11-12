import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  auth: { isAuthenticated: true, profile: { username: 'me user' } } as Record<string, unknown>,
  home: { data: null as unknown, error: false, loading: false, refresh: vi.fn() },
  sendRequest: vi.fn(),
  track: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => h.auth }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k) }),
}));
vi.mock('@/hooks/friends/useFriendsHome', () => ({ useFriendsHome: (enabled: boolean, opts: unknown) => ({ ...h.home, enabled, opts }) }));
vi.mock('@/hooks/useFriends', () => ({ useFriends: () => ({ sendRequest: h.sendRequest }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: (...a: unknown[]) => h.track(...a) }));
vi.mock('@/components/Avatar', () => ({ default: ({ userId }: { userId?: string }) => <div data-testid={`avatar-${userId}`} /> }));

import { RecentOpponents } from '../RecentOpponents';

const opp = (userId: string, wins = 0, losses = 0) => ({ userId, name: userId.toUpperCase(), avatarImage: null, customAvatar: null, lastSeenAt: null, wins, losses });
const data = (suggestions: unknown[], canAddFriends = true) => ({ friends: [], friendCount: 0, incoming: { count: 0, first: [] }, suggestions, canAddFriends, presence: [] });

describe('RecentOpponents', () => {
  beforeEach(() => {
    h.auth = { isAuthenticated: true, profile: { username: 'me user' } };
    h.home = { data: data([opp('bea', 1, 2), opp('cal')]), error: false, loading: false, refresh: vi.fn().mockResolvedValue(undefined) };
    h.sendRequest.mockReset().mockResolvedValue({ success: true });
    h.track.mockReset();
  });

  it('Given recent opponents, Then each shows with a record line and an Add button', () => {
    render(<RecentOpponents source="friends_recent" />);
    expect(screen.getByText('BEA')).toBeTruthy();
    expect(screen.getByText(/homePlay\.crew\.theyLead/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /friends\.recent\.add/ })).toHaveLength(2);
  });

  it('Given Add is tapped, Then a request goes out, it is tracked with the source, and the row reads sent', async () => {
    render(<RecentOpponents source="friends_recent" />);
    fireEvent.click(screen.getAllByRole('button', { name: /friends\.recent\.add/ })[0]);
    await waitFor(() => expect(h.sendRequest).toHaveBeenCalledWith('bea'));
    expect(h.track).toHaveBeenCalledWith('friend_request_sent', expect.objectContaining({ source: 'friends_recent' }));
    await waitFor(() => expect(screen.getByText('friends.recent.sent')).toBeTruthy());
  });

  it('Given a failed request, Then nothing is tracked and Add stays', async () => {
    h.sendRequest.mockResolvedValue({ success: false });
    render(<RecentOpponents source="friends_recent" />);
    fireEvent.click(screen.getAllByRole('button', { name: /friends\.recent\.add/ })[0]);
    await waitFor(() => expect(h.sendRequest).toHaveBeenCalled());
    expect(h.track).not.toHaveBeenCalled();
    expect(screen.getAllByRole('button', { name: /friends\.recent\.add/ })).toHaveLength(2);
  });

  it('Given no opponents, a guest, or an account that may not add friends, Then nothing renders', () => {
    h.home = { ...h.home, data: data([]) };
    const { container, rerender } = render(<RecentOpponents source="x" />);
    expect(container.innerHTML).toBe('');
    h.home = { ...h.home, data: data([opp('bea')], false) };
    rerender(<RecentOpponents source="x" />);
    expect(container.innerHTML).toBe('');
    h.auth = { isAuthenticated: false, profile: null };
    h.home = { ...h.home, data: data([opp('bea')]) };
    rerender(<RecentOpponents source="x" />);
    expect(container.innerHTML).toBe('');
  });
});
