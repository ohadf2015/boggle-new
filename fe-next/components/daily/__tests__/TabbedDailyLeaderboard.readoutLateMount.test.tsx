import React from 'react';
import { render, screen, act } from '@testing-library/react';

// The crossfade mounts the list only after the previous branch exits; this mock reproduces that delay.
vi.mock('framer-motion', async () => {
  const ReactActual = await vi.importActual<typeof import('react')>('react');
  return {
    m: { div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div> },
    AnimatePresence: ({ children, mode }: React.PropsWithChildren<{ mode?: string }>) => {
      const [shown, setShown] = ReactActual.useState(mode !== 'wait');
      ReactActual.useEffect(() => {
        const id = setTimeout(() => setShown(true), 50);
        return () => clearTimeout(id);
      }, []);
      return shown ? <>{children}</> : null;
    },
    useReducedMotion: () => true,
  };
});
vi.mock('@/components/Avatar', () => ({ __esModule: true, default: () => <div /> }));
vi.mock('@/hooks/useFriends', () => ({ useFriends: () => ({ friends: [] }) }));
vi.mock('@/lib/supabase', () => ({ supabase: null }));

import TabbedDailyLeaderboard from '../TabbedDailyLeaderboard';

const entry = (rank: number, over: Record<string, unknown> = {}) => ({
  rank, key: `k${rank}`, name: `P${rank}`, avatarEmoji: null, avatarColor: null, avatarImage: null, customAvatar: null,
  total: 100 - rank, byMode: { 'word-hunt': 100 - rank, 'word-wheel': 0, 'word-tower': 0, connections: 0 },
  towerHeightM: null, playedModes: ['word-hunt'], ...over,
});

describe('TabbedDailyLeaderboard — pinned readout after a late list mount', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('does not pin "you" when your row turns out to be on screen once the list appears', async () => {
    vi.stubGlobal('IntersectionObserver', class {
      constructor(private cb: (e: Array<{ isIntersecting: boolean }>) => void) {}
      observe() { this.cb([{ isIntersecting: true }]); }
      disconnect() {}
    });
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: [entry(1), entry(2, { isYou: true })], total: 2, countries: [] }),
    })));
    render(<TabbedDailyLeaderboard puzzleDate="2026-10-30" language="en" t={(k: string) => k} />);
    await screen.findByText('P2', undefined, { timeout: 2000 });
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(screen.queryByTestId('you-readout')).not.toBeInTheDocument();
  });
});
