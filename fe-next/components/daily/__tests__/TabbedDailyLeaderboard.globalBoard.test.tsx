/**
 * TabbedDailyLeaderboard — the "everyone who played today" board.
 *
 * Root cause of "I don't see myself": the hub mounted the board with the UI
 * locale, while the player had played today's HEBREW puzzles. The board was
 * per-language, so their own solved row never came back. The board now asks the
 * server for the cross-language board (`/all`) by default, shows each row's
 * language, lists the countries on the board, and lets the player narrow to
 * their own language with one tap.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

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

import TabbedDailyLeaderboard, { type DailyParticipant } from '../TabbedDailyLeaderboard';

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
    'wordHunt.leaderboard.failed': 'Failed',
    'wordHunt.leaderboard.seeWords': 'See words',
    'wordHunt.leaderboard.allLanguages': 'All languages',
    'wordHunt.leaderboard.myLanguage': 'My language',
    'wordHunt.leaderboard.countries': '{count} countries',
    'wordHunt.leaderboard.countrySingular': '1 country',
    'wordHunt.leaderboard.live': 'Live',
    'wordHunt.leaderboard.movedUp': 'Up {count}',
    'wordHunt.leaderboard.movedDown': 'Down {count}',
    'wordHunt.leaderboard.newEntry': 'New',
    'wordWheel.viewWordsYouMissed': 'View words you missed',
    'wordWheel.viewSubmittedWords': 'View words',
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
  avatar_color: '#000',
  country_code: 'IL',
  language: 'he',
  score: 100,
  word_count: 5,
  time_seconds: 30,
  completed_at: '2026-09-07T07:00:00Z',
  rank_position: 1,
  ...over,
});

type Responder = (url: string) => Record<string, unknown> | null;

const installFetch = (respond: Responder) => {
  const calls: string[] = [];
  const fetchMock = vi.fn((url: string) => {
    calls.push(url);
    const body = respond(url) ?? { data: [], totalParticipants: 0, totalPlayers: 0, totalSolved: 0, guestPlayerCount: 0 };
    return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
  });
  vi.stubGlobal('fetch', fetchMock);
  return calls;
};

beforeEach(() => {
  localStorage.clear();
});

describe('TabbedDailyLeaderboard — cross-language board', () => {
  it('asks the server for the all-language board by default, not the UI locale', async () => {
    const calls = installFetch(() => null);
    render(<TabbedDailyLeaderboard puzzleDate="2026-09-07" language="en" t={t} />);
    await waitFor(() => {
      expect(calls.some(u => u.includes('/word-hunt/leaderboard/2026-09-07/all'))).toBe(true);
      expect(calls.some(u => u.includes('/word-wheel/leaderboard/2026-09-07/all'))).toBe(true);
    });
    expect(calls.some(u => u.includes('/leaderboard/2026-09-07/en'))).toBe(false);
  });

  it('shows the player who solved in Hebrew even when the hub is in English', async () => {
    installFetch(url => url.includes('/word-hunt/leaderboard')
      ? { data: [participant({ player_id: 'me', display_name: 'Fish', language: 'he', solved: true, attempts_used: 3, efficiency_score: 967 })], totalPlayers: 1, totalSolved: 1, guestPlayerCount: 0 }
      : null);
    render(<TabbedDailyLeaderboard puzzleDate="2026-09-07" language="en" currentPlayerId="me" t={t} />);
    expect(await screen.findByText('Fish')).toBeInTheDocument();
    expect(screen.getByText('YOU')).toBeInTheDocument();
  });
  it('shows attempts used for unsolved rows instead of a literal X placeholder', async () => {
    installFetch(url => url.includes('/word-hunt/leaderboard')
      ? { data: [participant({ player_id: 'a', display_name: 'Aviv', language: 'he', solved: false, attempts_used: 4, efficiency_score: 0 })], totalPlayers: 1, totalSolved: 0 }
      : null);
    render(<TabbedDailyLeaderboard puzzleDate="2026-09-07" language="en" currentPlayerId="me" t={t} />);
    expect(await screen.findByText('Aviv')).toBeInTheDocument();
    expect(screen.getByText(/✗ 4\/10/)).toBeInTheDocument();
    expect(screen.queryByText('X/10')).not.toBeInTheDocument();
  });


  it('tags every row with the language it was played in', async () => {
    installFetch(url => url.includes('/word-hunt/leaderboard')
      ? { data: [participant({ player_id: 'a', display_name: 'Aviv', language: 'he' }), participant({ player_id: 'b', display_name: 'Bo', language: 'sv', rank_position: 2 })], totalPlayers: 2, totalSolved: 2 }
      : null);
    render(<TabbedDailyLeaderboard puzzleDate="2026-09-07" language="en" t={t} />);
    await screen.findByText('Aviv');
    const chips = screen.getAllByTestId('row-language');
    expect(chips.map(c => c.getAttribute('data-language'))).toEqual(['he', 'sv']);
  });

  it('lists the countries represented on today’s board', async () => {
    installFetch(url => url.includes('/word-hunt/leaderboard')
      ? { data: [
          participant({ player_id: 'a', display_name: 'A', country_code: 'IL' }),
          participant({ player_id: 'b', display_name: 'B', country_code: 'US', rank_position: 2 }),
          participant({ player_id: 'c', display_name: 'C', country_code: 'IL', rank_position: 3 }),
          participant({ player_id: 'd', display_name: 'D', country_code: null, rank_position: 4 }),
        ], totalPlayers: 4, totalSolved: 4 }
      : null);
    render(<TabbedDailyLeaderboard puzzleDate="2026-09-07" language="en" t={t} />);
    expect(await screen.findByText('2 countries')).toBeInTheDocument();
    const strip = screen.getByTestId('countries-strip');
    expect(strip.textContent).toContain('flag:IL');
    expect(strip.textContent).toContain('flag:US');
  });

  it('narrows to the player’s language on request and remembers the choice', async () => {
    const calls = installFetch(() => null);
    render(<TabbedDailyLeaderboard puzzleDate="2026-09-07" language="he" t={t} />);
    await waitFor(() => expect(calls.some(u => u.includes('/word-hunt/leaderboard/2026-09-07/all'))).toBe(true));

    fireEvent.click(screen.getByRole('button', { name: /All languages/ }));

    await waitFor(() => expect(calls.some(u => u.includes('/word-hunt/leaderboard/2026-09-07/he'))).toBe(true));
    expect(screen.getByRole('button', { name: /My language/ })).toBeInTheDocument();
    expect(localStorage.getItem('lexiclash_daily_lb_language_scope')).toBe('mine');
  });

  it('only offers the words-you-missed diff for players who played the same puzzle language', async () => {
    installFetch(url => url.includes('/word-wheel/leaderboard')
      ? { data: [
          participant({ player_id: 'same', display_name: 'Same', language: 'he', score: 80 }),
          participant({ player_id: 'other', display_name: 'Other', language: 'en', score: 70, rank_position: 2 }),
        ], totalParticipants: 2, totalSolved: 2, guestPlayerCount: 0 }
      : null);
    render(
      <TabbedDailyLeaderboard puzzleDate="2026-09-07" language="he" scope="word-wheel" currentPlayerId="me" myWheelWordsFound={['abc']} t={t} />,
    );
    await screen.findByText('Same');
    const buttons = screen.getAllByRole('button', { name: /View words/ });
    expect(buttons).toHaveLength(1);
  });

  it('shows who climbed and who dropped between refreshes', async () => {
    let round = 0;
    installFetch(url => {
      if (!url.includes('/word-hunt/leaderboard')) return null;
      round += 1;
      return round === 1
        ? { data: [participant({ player_id: 'a', display_name: 'Ada', rank_position: 1 }), participant({ player_id: 'b', display_name: 'Ben', rank_position: 2, score: 90 })], totalPlayers: 2, totalSolved: 2 }
        : { data: [participant({ player_id: 'b', display_name: 'Ben', rank_position: 1, score: 150 }), participant({ player_id: 'a', display_name: 'Ada', rank_position: 2 }), participant({ player_id: 'c', display_name: 'Cy', rank_position: 3, score: 10 })], totalPlayers: 3, totalSolved: 3 };
    });
    render(<TabbedDailyLeaderboard puzzleDate="2026-09-07" language="en" t={t} />);
    await screen.findByText('Ada');
    expect(screen.queryByLabelText('Up 1')).not.toBeInTheDocument();

    // A visibility flip is the component's own "refresh now" signal.
    await act(async () => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(await screen.findByLabelText('Up 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Down 1')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
  });
});
