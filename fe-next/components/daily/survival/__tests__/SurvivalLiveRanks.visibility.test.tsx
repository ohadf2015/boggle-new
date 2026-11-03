import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse, delay } from 'msw';
import { server } from '@/test/msw/server';

vi.mock('@/components/Avatar', () => ({ default: () => <div /> }));
vi.mock('@/utils/rankingStyles', () => ({ getRankDisplay: (rank: number) => `#${rank}` }));
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, ...dom } = props;
      void initial; void animate; void exit; void transition;
      return <div {...dom}>{children}</div>;
    },
  },
  AdaptiveAnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));
vi.mock('@/components/ui/PlayerProfileTooltip', () => ({
  default: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

import { SurvivalLiveRanks, type SurvivalLiveRanksProps } from '../SurvivalLiveRanks';

const props: SurvivalLiveRanksProps = {
  puzzleDate: '2026-02-07',
  language: 'en',
  currentPlayerId: null,
  currentGuestFingerprint: null,
  t: (k: string) => k,
};

const row = (name: string) => ({ data: [{ rank_position: 1, display_name: name, efficiency_score: 1, solved: false }], totalPlayers: 1 });

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });
}

afterEach(() => {
  delete (document as unknown as Record<string, unknown>).hidden;
  delete (document as unknown as Record<string, unknown>).visibilityState;
  vi.useRealTimers();
});

describe('SurvivalLiveRanks polling', () => {
  it('Given the tab is hidden, When the poll interval passes, Then no request is made; When it shows again, Then it refetches at once', async () => {
    let calls = 0;
    server.use(http.get('*/api/daily-challenge/word-hunt/leaderboard/*', () => { calls += 1; return HttpResponse.json(row('Alice')); }));
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    render(<SurvivalLiveRanks {...props} />);
    await waitFor(() => expect(calls).toBe(1));

    setHidden(true);
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    act(() => { vi.advanceTimersByTime(30000 * 3); });
    await new Promise((r) => setTimeout(r, 20));
    expect(calls).toBe(1);
    vi.useRealTimers();

    setHidden(false);
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    await waitFor(() => expect(calls).toBe(2));
  });

  it('Given the puzzle changes while an older request is in flight, When the old one lands last, Then the new board is kept', async () => {
    server.use(http.get('*/api/daily-challenge/word-hunt/leaderboard/:date/:lang', async ({ params }) => {
      if (params.date === '2026-02-07') {
        await delay(80);
        return HttpResponse.json(row('Old'));
      }
      return HttpResponse.json(row('New'));
    }));
    const { rerender } = render(<SurvivalLiveRanks {...props} />);
    rerender(<SurvivalLiveRanks {...props} puzzleDate="2026-02-08" />);
    await screen.findByText('New');
    await new Promise((r) => setTimeout(r, 150));
    expect(screen.queryByText('Old')).toBeNull();
    expect(screen.queryByText('New')).not.toBeNull();
  });
});
