import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { Mock } from 'vitest';

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<Record<string, unknown>>) => <>{children}</>,
  useReducedMotion: () => true,
}));
vi.mock('@/components/Avatar', () => ({ __esModule: true, default: () => <div data-testid="avatar-stub" /> }));
vi.mock('@/hooks/useFriends', () => ({ useFriends: () => ({ friends: [] }) }));
vi.mock('@/lib/supabase', () => ({ supabase: null }));

import TabbedDailyLeaderboard from '../TabbedDailyLeaderboard';

const t = (key: string) => key;

const entry = (rank: number, over: Record<string, unknown> = {}) => ({
  rank, key: `k${rank}`, name: `P${rank}`, avatarEmoji: null, avatarColor: null, avatarImage: null, customAvatar: null,
  total: 1000 - rank, byMode: { 'word-hunt': 1000 - rank, 'word-wheel': 0, 'word-tower': 0, connections: 0 },
  towerHeightM: null, playedModes: ['word-hunt'], ...over,
});

let urls: string[] = [];
function serve(body: Record<string, unknown>) {
  urls = [];
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    urls.push(url);
    return Promise.resolve({ ok: true, json: () => Promise.resolve(url.includes('/api/daily/leaderboard') ? body : { data: [] }) });
  }));
}

describe('TabbedDailyLeaderboard — combined Today board', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads the same server-merged board as the hub teaser, all languages, with the guest id', async () => {
    serve({ data: [entry(1)], total: 1, countries: [] });
    render(<TabbedDailyLeaderboard puzzleDate="2026-10-30" language="en" currentGuestFingerprint="fp1" t={t} />);
    await screen.findByText('P1');
    const board = urls.find((u) => u.includes('/api/daily/leaderboard'))!;
    expect(board).toContain('date=2026-10-30');
    expect(board).toContain('lang=all');
    expect(board).toContain('friends=1');
    expect(board).toContain('fp=fp1');
    expect(urls.some((u) => u.includes('word-hunt/leaderboard') || u.includes('alltime'))).toBe(false);
  });

  it('explains what the score is', async () => {
    serve({ data: [entry(1)], total: 1, countries: [] });
    render(<TabbedDailyLeaderboard puzzleDate="2026-10-30" language="en" t={t} />);
    expect(await screen.findByTestId('score-explainer')).toHaveTextContent('daily.leaderboard.scoreExplainer');
  });

  it('marks the row the server matched to the viewer, with no ids in hand', async () => {
    serve({ data: [entry(1), entry(2, { isYou: true })], total: 2, countries: [] });
    render(<TabbedDailyLeaderboard puzzleDate="2026-10-30" language="en" t={t} />);
    await screen.findByText('P2');
    expect(document.querySelector('[data-viewer-row="true"]')).toHaveTextContent('P2');
  });

  function stubObserver(isIntersecting: boolean) {
    vi.stubGlobal('IntersectionObserver', class {
      constructor(private cb: (e: Array<{ isIntersecting: boolean }>) => void) {}
      observe() { this.cb([{ isIntersecting }]); }
      disconnect() {}
    });
  }

  it('pins "you: #50 of 80 · top N%" while the viewer\'s own row is scrolled off screen', async () => {
    stubObserver(false);
    const top = [1, 2, 3, 4, 5].map((r) => entry(r));
    serve({ data: [...top, entry(50, { isYou: true })], total: 80, countries: [] });
    render(<TabbedDailyLeaderboard puzzleDate="2026-10-30" language="en" maxVisible={3} t={t} />);
    expect(await screen.findByTestId('you-readout')).toBeInTheDocument();
  });

  it('hides the pin while the viewer\'s row is on screen', async () => {
    stubObserver(true);
    serve({ data: [entry(1), entry(2, { isYou: true })], total: 2, countries: [] });
    render(<TabbedDailyLeaderboard puzzleDate="2026-10-30" language="en" t={t} />);
    await screen.findByText('P2');
    expect(screen.queryByTestId('you-readout')).not.toBeInTheDocument();
  });

  it('says "be the first" when nobody has played yet', async () => {
    serve({ data: [], total: 0, countries: [] });
    render(<TabbedDailyLeaderboard puzzleDate="2026-10-30" language="en" t={t} />);
    expect(await screen.findByText('daily.beFirstToPlay')).toBeInTheDocument();
  });

  it('Friends shows friends plus you, ranked among yourselves', async () => {
    serve({
      data: [entry(1), entry(4, { isFriend: true }), entry(9, { isYou: true }), entry(31, { isFriend: true })],
      total: 40,
      countries: [],
    });
    render(<TabbedDailyLeaderboard puzzleDate="2026-10-30" language="en" t={t} />);
    await screen.findByText('P1');
    fireEvent.click(screen.getByText('leaderboard.friends'));
    await waitFor(() => expect(screen.queryByText('P1')).not.toBeInTheDocument());
    const ranks = Array.from(document.querySelectorAll('[data-rank]')).map((el) => [
      el.getAttribute('data-rank'),
      within(el as HTMLElement).getByText(/^P\d+$/).textContent,
    ]);
    expect(ranks).toEqual([['1', 'P4'], ['2', 'P9'], ['3', 'P31']]);
  });

  it('Friends with nobody to show offers an invite', async () => {
    serve({ data: [entry(1)], total: 1, countries: [] });
    render(<TabbedDailyLeaderboard puzzleDate="2026-10-30" language="en" t={t} />);
    await screen.findByText('P1');
    fireEvent.click(screen.getByText('leaderboard.friends'));
    expect(await screen.findByTestId('leaderboard-invite-friend')).toBeInTheDocument();
  });
});

describe('TabbedDailyLeaderboard — More menu', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('closes on Escape and on a click outside', async () => {
    serve({ data: [entry(1)], total: 1, countries: [] });
    render(<TabbedDailyLeaderboard puzzleDate="2026-10-30" language="en" t={t} />);
    const more = screen.getByTestId('leaderboard-more-tabs');
    fireEvent.click(more);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    fireEvent.click(more);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('ties each tab to the panel it controls', async () => {
    serve({ data: [entry(1)], total: 1, countries: [] });
    render(<TabbedDailyLeaderboard puzzleDate="2026-10-30" language="en" t={t} />);
    const today = screen.getByRole('tab', { name: /wordHunt.leaderboard.today/ });
    expect(screen.getByRole('tabpanel').id).toBe(today.getAttribute('aria-controls'));
  });
});
