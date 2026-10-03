import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

const { fitRef, boardProps } = vi.hoisted(() => ({
  fitRef: { current: 8 },
  boardProps: { current: null as null | { topN?: number } },
}));

vi.mock('../useRowsThatFit', () => ({
  useRowsThatFit: (_ref: unknown, total: number) => Math.min(total, fitRef.current),
}));
vi.mock('@/components/education/duels/LiveClassroomLeaderboard', () => ({
  __esModule: true,
  default: (p: { topN?: number; className?: string }) => {
    boardProps.current = p;
    return <div data-testid="live-board" className={p.className} />;
  },
}));

import TvLeaderboard from '../TvLeaderboard';

const t = (k: string, params?: Record<string, string | number>) =>
  params ? `${k}:${JSON.stringify(params)}` : k;
const players = (n: number) => Array.from({ length: n }, (_, i) => ({ username: `S${i}`, score: n - i, wordCount: 0 }));

describe('TvLeaderboard — classroom rows that fit the card', () => {
  it('Given four students and room for three whole rows, Then three rows show and the fourth is counted, not clipped', () => {
    fitRef.current = 3;
    render(<TvLeaderboard players={players(4)} classroom t={t} />);
    expect(boardProps.current?.topN).toBe(3);
    expect(screen.getByTestId('tv-classroom-more')).toHaveTextContent('tvBroadcast.moreStudents:{"count":1}');
  });

  it('Given room for everyone, Then no overflow line is drawn', () => {
    fitRef.current = 8;
    render(<TvLeaderboard players={players(4)} classroom t={t} />);
    expect(boardProps.current?.topN).toBe(4);
    expect(screen.queryByTestId('tv-classroom-more')).toBeNull();
  });

  it('Given a host seat in the list, Then the overflow count only counts students', () => {
    fitRef.current = 2;
    const list = [...players(3), { username: 'Teacher', score: 0, wordCount: 0, isHost: true }];
    render(<TvLeaderboard players={list} classroom t={t} />);
    expect(screen.getByTestId('tv-classroom-more')).toHaveTextContent('{"count":1}');
  });
});
