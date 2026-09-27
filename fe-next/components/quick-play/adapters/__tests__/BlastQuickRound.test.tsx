import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BlastQuickRound } from '../BlastQuickRound';
import type { QuickRoundConfig } from '../../types';

const lastBlastGameProps = { current: null as any };

vi.mock('@/components/blast/legacy/BlastGame', () => ({
  BlastGame: (props: any) => {
    lastBlastGameProps.current = props;
    return <div data-testid="mock-blast-game">mock</div>;
  },
}));

const config: QuickRoundConfig = {
  mode: 'blast',
  seed: 's-1',
  language: 'en',
  durationSec: 60,
  grid: [
    ['A', 'B'],
    ['C', 'D'],
  ],
  totalWords: 5,
  perfectScore: 100,
};

// Regression test: Quick Play's Blast round is meant to be a bounded "bare
// board" — words clear and STAY cleared, the board shrinks toward empty.
// Sibling multiplayer implementations (BlastView.tsx, useBlastMultiplayerBridge)
// both set boardClearMode: 'shrink' for this exact scenario. Without it, the
// engine defaults to 'refill' — every cleared tile is replaced by a new one
// falling from the top, so the board never empties and looks like tiles
// "keep showing up instead of disappearing".
describe('BlastQuickRound', () => {
  beforeEach(() => {
    lastBlastGameProps.current = null;
  });

  it('configures the engine to shrink the board instead of refilling it', async () => {
    render(<BlastQuickRound config={config} onDone={vi.fn()} onQuit={vi.fn()} />);
    await waitFor(() => expect(lastBlastGameProps.current).not.toBeNull());
    expect(lastBlastGameProps.current.config.boardClearMode).toBe('shrink');
  });

  it('passes totalTime so the MP HUD countdown is visible', async () => {
    render(<BlastQuickRound config={config} onDone={vi.fn()} onQuit={vi.fn()} />);
    await waitFor(() => expect(lastBlastGameProps.current).not.toBeNull());
    expect(lastBlastGameProps.current.totalTime).toBe(60);
    expect(lastBlastGameProps.current.remainingTime).toBe(60);
  });

  it('feeds a synthetic solo leaderboard so HUD score is not stuck at 0', async () => {
    render(<BlastQuickRound config={config} onDone={vi.fn()} onQuit={vi.fn()} />);
    await waitFor(() => expect(lastBlastGameProps.current).not.toBeNull());
    expect(lastBlastGameProps.current.username).toBe('you');
    expect(lastBlastGameProps.current.leaderboard).toEqual([
      expect.objectContaining({ username: 'you', score: 0, wordCount: 0 }),
    ]);
  });
});

// Blast renders its live standings strip (BlastMPLeaderboard) whenever a
// leaderboard is present, and the closest-rivals gap once there are 2+ rows —
// so ghosts race here through the same prop the real MP bridge uses.
describe('BlastQuickRound — ghost rivals', () => {
  const withGhosts: QuickRoundConfig = {
    ...config,
    ghosts: [
      { userId: 'u1', name: 'Ada', customAvatar: null, scorePct: 50 },
      { userId: 'u2', name: 'Bo', customAvatar: null, scorePct: 100 },
    ],
  };

  beforeEach(() => {
    lastBlastGameProps.current = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('puts the rivals on the same leaderboard the strip already reads', async () => {
    render(<BlastQuickRound config={withGhosts} onDone={vi.fn()} onQuit={vi.fn()} />);
    await waitFor(() => expect(lastBlastGameProps.current).not.toBeNull());
    const names = lastBlastGameProps.current.leaderboard.map((e: { username: string }) => e.username);
    expect(names).toEqual(['you', 'Ada', 'Bo']);
  });

  it('climbs the rivals as the round clock ticks down', async () => {
    vi.useFakeTimers();
    render(<BlastQuickRound config={withGhosts} onDone={vi.fn()} onQuit={vi.fn()} />);
    const boScore = () =>
      lastBlastGameProps.current.leaderboard.find(
        (e: { username: string }) => e.username === 'Bo'
      ).score;

    expect(boScore()).toBe(0);
    await vi.advanceTimersByTimeAsync(30_000);
    const mid = boScore();
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(config.perfectScore);
  });
});
