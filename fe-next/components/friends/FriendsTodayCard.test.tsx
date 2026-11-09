import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { FriendsTodayCard } from './FriendsTodayCard';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (k: string) => k }) }));
vi.mock('@/components/Avatar', () => ({ __esModule: true, default: () => <span /> }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/utils/shareWithFallback', () => ({ shareWithFallback: vi.fn(async () => 'shared') }));
const state = vi.hoisted(() => ({ friends: [] as unknown[] }));
vi.mock('@/hooks/useFriends', () => ({ useFriends: () => ({ friends: state.friends }) }));
const get = vi.hoisted(() => vi.fn());
vi.mock('@/utils/authFetch', () => ({ getWithAuth: get }));

const entry = (name: string, total: number, flags: Record<string, boolean>) => ({
  rank: 1, key: name, name, total, avatarEmoji: null, avatarColor: null, avatarImage: null, customAvatar: null,
  byMode: {}, towerHeightM: null, playedModes: [], ...flags,
});

describe('FriendsTodayCard', () => {
  beforeEach(() => get.mockReset());

  it('renders nothing without friends and never fetches', () => {
    state.friends = [];
    const { container } = render(<FriendsTodayCard />);
    expect(container).toBeEmptyDOMElement();
    expect(get).not.toHaveBeenCalled();
  });

  it('shows friends who played and a play button when you have not', async () => {
    state.friends = [{ odUserId: 'a' }, { odUserId: 'b' }];
    get.mockResolvedValue({ ok: true, json: async () => ({ data: [entry('Dana', 500, { isFriend: true })], total: 9, countries: [] }) });
    render(<FriendsTodayCard />);
    expect(await screen.findByText('Dana')).toBeInTheDocument();
    expect(screen.getByTestId('friends-today-play')).toHaveAttribute('href', '/en/daily');
    expect(get.mock.calls[0][0]).toMatch(/friends=1/);
  });

  it('offers a share once you and a friend both played', async () => {
    state.friends = [{ odUserId: 'a' }];
    get.mockResolvedValue({ ok: true, json: async () => ({ data: [entry('Me', 600, { isYou: true }), entry('Dana', 500, { isFriend: true })], total: 9, countries: [] }) });
    render(<FriendsTodayCard />);
    await waitFor(() => expect(screen.getByTestId('friends-today-share')).toBeInTheDocument());
    expect(screen.getByTestId('friends-today-line')).toHaveTextContent('friendSocial.today.leading');
  });
  it('staggers rows in and pops the leading line, only when motion is allowed', async () => {
    state.friends = [{ odUserId: 'a' }];
    get.mockResolvedValue({ ok: true, json: async () => ({ data: [entry('Me', 600, { isYou: true }), entry('Dana', 500, { isFriend: true })], total: 9, countries: [] }) });
    render(<FriendsTodayCard />);
    const rows = await screen.findAllByRole('listitem');
    rows.forEach((r) => expect(r.className).toContain('motion-safe:animate-pop-in'));
    expect(rows[0].style.animationDelay).toBe('0ms');
    expect(rows[1].style.animationDelay).toBe('70ms');
    expect(screen.getByTestId('friends-today-line').className).toContain('motion-safe:animate-neo-pop');
  });
});
