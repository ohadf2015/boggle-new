/**
 * TabbedDailyLeaderboard — the Season tab.
 *
 * Daily play already feeds season-windowed views in the database; nothing read
 * them. The Season tab merges the Word Hunt + Word Wheel season boards into one
 * ranking, offers past seasons, and frames the board with the season's identity
 * (theme, twist, countdown) so each month feels like its own event.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

// Component types are cached per tag: a Proxy that hands out a NEW component on
// every property access remounts the whole tree on each state update, which
// detaches the element a pointer sequence (userEvent) is in the middle of clicking.
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

import TabbedDailyLeaderboard from '../TabbedDailyLeaderboard';

const t = (key: string, fallbackOrParams?: string | Record<string, string | number>) => {
  const params = typeof fallbackOrParams === 'object' ? fallbackOrParams : undefined;
  const map: Record<string, string> = {
    'wordHunt.leaderboard.title': 'Leaderboard',
    'wordHunt.leaderboard.today': 'Today',
    'wordHunt.leaderboard.season': 'Season',
    'wordHunt.leaderboard.allTime': 'All Time',
    'leaderboard.friends': 'Friends',
    'wordHunt.leaderboard.pts': 'pts',
    'wordHunt.leaderboard.you': 'YOU',
    'wordHunt.leaderboard.seasonPts': 'season pts',
    'wordHunt.leaderboard.daysPlayed': '{count} days',
    'wordHunt.leaderboard.dayPlayed': '1 day',
    'wordHunt.leaderboard.seasonNoPlayers': 'No season scores yet',
    'wordHunt.leaderboard.seasonEndsIn': 'Ends in {days}d {hours}h',
    'wordHunt.leaderboard.seasonEnded': 'Season over',
    'wordHunt.leaderboard.seasonHint': 'Every daily adds up',
    'wordHunt.leaderboard.currentSeason': 'Now',
    'wordHunt.leaderboard.allLanguages': 'All languages',
    'wordHunt.leaderboard.myLanguage': 'My language',
    'daily.playerSingular': 'player',
    'daily.playersPlural': 'players',
    'season.name': 'Season {{number}}: {{theme}}',
    'season.twist.throne-climb.title': 'Throne Climb',
    'season.twist.sound-wave.title': 'Sound Wave',
  };
  let out = map[key] ?? key;
  for (const [k, v] of Object.entries(params ?? {})) out = out.replace(`{{${k}}}`, String(v)).replace(`{${k}}`, String(v));
  return out;
};

const seasonsBody = {
  currentSeasonId: 6,
  seasons: [
    { id: 6, name: 'Season 6: Lexicon Lords', theme: 'Lexicon Lords', startDate: '2026-09-01T00:00:00Z', endDate: '2026-10-01T00:00:00Z', status: 'active', isCurrent: true },
    { id: 5, name: 'Season 5: Phonic Phenoms', theme: 'Phonic Phenoms', startDate: '2026-08-01T00:00:00Z', endDate: '2026-09-01T00:00:00Z', status: 'closed', isCurrent: false },
  ],
};

const seasonRow = (over: Record<string, unknown>) => ({
  player_id: 'p1',
  player_identifier: 'p1',
  guest_fingerprint: null,
  display_name: 'Fish',
  avatar_emoji: '🐟',
  avatar_color: '#0ff',
  avatar_image: null,
  profile_picture_url: null,
  custom_avatar: null,
  country_code: 'IL',
  season_score: 0,
  days_played: 0,
  solves: 0,
  languages: ['he'],
  last_played_at: '2026-09-07T07:00:00Z',
  rank_position: 1,
  ...over,
});

const installFetch = (respond: (url: string) => Record<string, unknown> | null) => {
  const calls: string[] = [];
  const fetchMock = vi.fn((url: string) => {
    calls.push(url);
    const body = respond(url) ?? { data: [], totalParticipants: 0, totalPlayers: 0, totalSolved: 0, guestPlayerCount: 0 };
    return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
  });
  vi.stubGlobal('fetch', fetchMock);
  return calls;
};

// Radix toggle items react to pointer events, not a bare synthetic `click`.
const openSeasonTab = async () => {
  const tab = await screen.findByRole('radio', { name: /Season/ });
  await userEvent.setup().click(tab);
};

beforeEach(() => {
  localStorage.clear();
});

describe('TabbedDailyLeaderboard — Season tab', () => {
  it('loads the season list and both season boards when the tab opens', async () => {
    const calls = installFetch(url => (url.includes('/api/daily-challenge/seasons') ? seasonsBody : null));
    render(<TabbedDailyLeaderboard puzzleDate="2026-09-07" language="en" t={t} />);
    await openSeasonTab();
    await waitFor(() => {
      expect(calls.some(u => u.endsWith('/api/daily-challenge/seasons'))).toBe(true);
      expect(calls.some(u => u.includes('/word-hunt/season-leaderboard/all?season=6'))).toBe(true);
      expect(calls.some(u => u.includes('/word-wheel/season-leaderboard/all?season=6'))).toBe(true);
    });
  });

  it('merges a player’s hunt and wheel season points into one ranked row', async () => {
    installFetch(url => {
      if (url.includes('/api/daily-challenge/seasons')) return seasonsBody;
      if (url.includes('/word-hunt/season-leaderboard')) {
        return { data: [seasonRow({ season_score: 300, days_played: 3, solves: 2 }), seasonRow({ player_id: 'p2', player_identifier: 'p2', display_name: 'Maya', season_score: 250, days_played: 2, rank_position: 2 })], totalParticipants: 2, seasonId: 6, language: 'all' };
      }
      if (url.includes('/word-wheel/season-leaderboard')) {
        return { data: [seasonRow({ season_score: 200, days_played: 2, languages: ['en'] })], totalParticipants: 1, seasonId: 6, language: 'all' };
      }
      return null;
    });
    render(<TabbedDailyLeaderboard puzzleDate="2026-09-07" language="en" currentPlayerId="p1" t={t} />);
    await openSeasonTab();

    expect(await screen.findByText('Fish')).toBeInTheDocument();
    const rows = screen.getAllByTestId('season-row');
    expect(rows[0].textContent).toContain('Fish');
    expect(rows[0].textContent).toContain('500');
    expect(rows[0].textContent).toContain('5 days');
    expect(rows[0].textContent).toContain('YOU');
    expect(rows[1].textContent).toContain('Maya');
    expect(rows[1].textContent).toContain('250');
  });

  it('frames the board with the current season’s identity', async () => {
    installFetch(url => (url.includes('/api/daily-challenge/seasons') ? seasonsBody : null));
    render(<TabbedDailyLeaderboard puzzleDate="2026-09-07" language="en" t={t} />);
    await openSeasonTab();
    expect(await screen.findByText('Season 6: Lexicon Lords')).toBeInTheDocument();
    expect(screen.getByText('Throne Climb')).toBeInTheDocument();
    expect(screen.getByTestId('daily-season-ribbon').className).toContain('season-skin-lexicon');
  });

  it('lets the player revisit a past season', async () => {
    const calls = installFetch(url => (url.includes('/api/daily-challenge/seasons') ? seasonsBody : null));
    render(<TabbedDailyLeaderboard puzzleDate="2026-09-07" language="en" t={t} />);
    await openSeasonTab();
    const past = await screen.findByRole('button', { name: /Season 5/ });
    fireEvent.click(past);
    await waitFor(() => {
      expect(calls.some(u => u.includes('/word-hunt/season-leaderboard/all?season=5'))).toBe(true);
      expect(calls.some(u => u.includes('/word-wheel/season-leaderboard/all?season=5'))).toBe(true);
    });
    expect(await screen.findByText('Season 5: Phonic Phenoms')).toBeInTheDocument();
    expect(screen.getByText('Season over')).toBeInTheDocument();
  });

  it('explains an empty season instead of showing a blank card', async () => {
    installFetch(url => (url.includes('/api/daily-challenge/seasons') ? seasonsBody : null));
    render(<TabbedDailyLeaderboard puzzleDate="2026-09-07" language="en" t={t} />);
    await openSeasonTab();
    expect(await screen.findByText('No season scores yet')).toBeInTheDocument();
  });
});
