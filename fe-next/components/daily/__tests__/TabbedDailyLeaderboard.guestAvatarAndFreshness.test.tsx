/**
 * Two defects that both made the daily board lie about who played.
 *
 * 1. Guest rows rendered a PERPETUAL pulsing skeleton where the avatar goes.
 *    The board's rows passed `customAvatar` but never `userId`, and a guest has
 *    no profile to join to — `custom_avatar` is NULL by construction (the view
 *    LEFT JOINs profiles on player_id). With neither prop, Avatar's `hasIdentity`
 *    is false, `shouldLoad` stays true and it returns <NeoSkeletonAvatar> forever.
 *    Avatar has always had a deterministic seeded fallback; it just needs a seed.
 *
 * 2. The board's fetches inherited the route's `Cache-Control: public, max-age=20`.
 *    A player who finished and triggered a refetch of the identical URL inside
 *    that window got the pre-submit body replayed from the HTTP cache — so they
 *    did not see themselves. `cache: 'no-store'` is what makes a post-submit
 *    refetch actually reach the server.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

vi.mock('framer-motion', () => {
  const cache = new Map<string, React.FC<React.PropsWithChildren<Record<string, unknown>>>>();
  return {
    m: new Proxy({}, {
      get: (_target, tag: string) => {
        if (!cache.has(tag)) {
          const Comp: React.FC<React.PropsWithChildren<Record<string, unknown>>> = ({ children, ...props }) => <div {...props}>{children}</div>;
          Comp.displayName = `m.${tag}`;
          cache.set(tag, Comp);
        }
        return cache.get(tag);
      },
    }),
    AnimatePresence: ({ children }: React.PropsWithChildren<Record<string, unknown>>) => <>{children}</>,
    useReducedMotion: () => false,
  };
});

vi.mock('@/utils/avatarConfig', () => ({
  AVATARS: [{ id: 'test-avatar', name: 'Test Avatar', filename: 'test-avatar.png' }],
  getAvatarPath: () => '/avatars/test.png',
  getRandomAvatar: () => ({ id: 'test-avatar', name: 'Test Avatar', filename: 'test-avatar.png' }),
}));

vi.mock('@/shared/utils', () => ({
  formatDistanceToNow: () => '5 minutes ago',
  getCountryFlag: (code: string | null | undefined) => (code ? `flag:${code.toUpperCase()}` : ''),
}));

vi.mock('@/utils/rankingStyles', () => ({
  getRankDisplay: (rank: number) => `#${rank}`,
}));

vi.mock('@/utils/dailyChallenge', () => ({
  getPuzzleNumber: () => 42,
}));

vi.mock('@/hooks/useFriends', () => ({
  useFriends: () => ({ friends: [] }),
}));

import TabbedDailyLeaderboard, { type DailyParticipant } from '../TabbedDailyLeaderboard';
import { getSeededAvatarConfig } from '@/shared/types/customAvatar';

/** A structurally valid config — AvatarRenderer throws on a hand-rolled partial. */
const realCustomAvatar = getSeededAvatarConfig(12345);

const t = (key: string, fallbackOrParams?: string | Record<string, string | number>) => {
  const params = typeof fallbackOrParams === 'object' ? fallbackOrParams : undefined;
  const map: Record<string, string> = {
    'wordHunt.leaderboard.title': 'Leaderboard',
    'wordHunt.leaderboard.today': 'Today',
    'wordHunt.leaderboard.season': 'Season',
    'wordHunt.leaderboard.allTime': 'All Time',
    'leaderboard.friends': 'Friends',
    'wordHunt.leaderboard.played': 'played',
    'wordHunt.leaderboard.solved': 'solved',
    'wordHunt.leaderboard.pts': 'pts',
    'wordHunt.leaderboard.you': 'YOU',
  };
  let out = map[key] ?? key;
  for (const [k, v] of Object.entries(params ?? {})) out = out.replace(`{{${k}}}`, String(v)).replace(`{${k}}`, String(v));
  return out;
};

const participant = (over: Partial<DailyParticipant>): DailyParticipant => ({
  player_id: 'u1',
  guest_fingerprint: null,
  display_name: 'Player',
  avatar_emoji: '🎯',
  avatar_color: '#FFE135',
  country_code: 'IL',
  language: 'he',
  score: 100,
  word_count: 5,
  time_seconds: 30,
  completed_at: '2026-09-08T07:00:00Z',
  rank_position: 1,
  ...over,
});

type FetchCall = { url: string; init?: RequestInit };

const installFetch = (respond: (url: string) => Record<string, unknown> | null) => {
  const calls: FetchCall[] = [];
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const body = respond(url) ?? { data: [], totalParticipants: 0, totalPlayers: 0, totalSolved: 0, guestPlayerCount: 0 };
    return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
  });
  vi.stubGlobal('fetch', fetchMock);
  return calls;
};

beforeEach(() => {
  localStorage.clear();
});

describe('TabbedDailyLeaderboard — guest avatars', () => {
  it('draws a seeded avatar for a guest row instead of a never-resolving skeleton', async () => {
    installFetch(url => url.includes('/word-hunt/leaderboard')
      ? {
          data: [participant({
            player_id: null,
            guest_fingerprint: 'fp-abc',
            display_name: 'Guest Player',
            custom_avatar: null,
            avatar_image: null,
          })],
          totalPlayers: 1,
          totalSolved: 1,
          guestPlayerCount: 1,
        }
      : null);

    render(<TabbedDailyLeaderboard puzzleDate="2026-09-08" language="he" t={t} />);

    expect(await screen.findByText('Guest Player')).toBeInTheDocument();

    // The skeleton renders no avatar testid at all — so its presence is the fix.
    const avatars = await screen.findAllByTestId('header-avatar');
    expect(avatars.length).toBeGreaterThan(0);
    expect(avatars.some(a => a.getAttribute('data-avatar-type') === 'generated')).toBe(true);
  });

  it('still prefers a real custom avatar for an authed row', async () => {
    installFetch(url => url.includes('/word-hunt/leaderboard')
      ? {
          data: [participant({
            player_id: 'u-real',
            display_name: 'Fish',
            custom_avatar: realCustomAvatar,
          })],
          totalPlayers: 1,
          totalSolved: 1,
        }
      : null);

    render(<TabbedDailyLeaderboard puzzleDate="2026-09-08" language="he" t={t} />);

    expect(await screen.findByText('Fish')).toBeInTheDocument();
    const avatars = await screen.findAllByTestId('header-avatar');
    expect(avatars.some(a => a.getAttribute('data-avatar-type') === 'custom')).toBe(true);
  });
});

describe('TabbedDailyLeaderboard — freshness', () => {
  it('bypasses the HTTP cache so a just-submitted row cannot be missed', async () => {
    const calls = installFetch(() => null);

    render(<TabbedDailyLeaderboard puzzleDate="2026-09-08" language="he" t={t} />);

    await waitFor(() => {
      expect(calls.some(c => c.url.includes('/leaderboard/'))).toBe(true);
    });

    const boardCalls = calls.filter(c => c.url.includes('/leaderboard/'));
    expect(boardCalls.length).toBeGreaterThan(0);
    for (const c of boardCalls) {
      expect(c.init?.cache).toBe('no-store');
    }
  });
});
