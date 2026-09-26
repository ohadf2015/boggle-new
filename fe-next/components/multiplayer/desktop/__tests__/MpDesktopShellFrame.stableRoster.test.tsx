/**
 * Performance rule 4: a timer tick must not mint a new roster / ladder array
 * identity — that re-renders every memoized rail below the frame each second.
 * Also pins the seat-list merge that fixes the joiner's "PLAYERS 0".
 */
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MpDesktopShellFrame } from '../MpDesktopShellFrame';

const seen: Array<{ leaderboard: unknown; foundWords: unknown }> = [];
vi.mock('../StandardDesktopAdapter', () => ({
  StandardDesktopAdapter: (p: { leaderboard: unknown; foundWords: unknown }) => {
    seen.push({ leaderboard: p.leaderboard, foundWords: p.foundWords });
    return null;
  },
}));

const leaderboard = [{ username: 'me', score: 3 }];
const foundWords = [{ word: 'cat', score: 2, timestamp: 1 }];
const users = [{ username: 'me' }, { username: 'host', isHost: true }];
const base = {
  gameMode: 'classic', canvas: null, leaderboard, foundWords, users,
  meId: 'me', roomId: 'R', totalTime: 60,
};

describe('MpDesktopShellFrame', () => {
  it('keeps roster and ladder identities across 1-Hz ticks', () => {
    seen.length = 0;
    const { rerender } = render(<MpDesktopShellFrame {...base} remainingTime={60} />);
    rerender(<MpDesktopShellFrame {...base} remainingTime={59} />);
    rerender(<MpDesktopShellFrame {...base} remainingTime={58} />);
    expect(seen.length).toBe(3);
    expect(seen[1].leaderboard).toBe(seen[0].leaderboard);
    expect(seen[2].leaderboard).toBe(seen[0].leaderboard);
    expect(seen[2].foundWords).toBe(seen[0].foundWords);
  });

  it('merges seated players who have not scored into the roster', () => {
    seen.length = 0;
    render(<MpDesktopShellFrame {...base} remainingTime={60} />);
    const ids = (seen[0].leaderboard as Array<{ userId: string }>).map((p) => p.userId);
    expect(ids).toEqual(['me', 'host']);
  });
});
