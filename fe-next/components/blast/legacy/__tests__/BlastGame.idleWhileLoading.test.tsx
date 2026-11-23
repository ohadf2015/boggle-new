import React from 'react';
import { render, act } from '@testing-library/react';

type CoachArgs = { mode: string; active: boolean; wordsFound: number; grid?: unknown; deadTime?: { enabled: boolean; thresholdMs: number } };
const { coachArgs } = vi.hoisted(() => ({ coachArgs: [] as CoachArgs[] }));

vi.mock('@/contexts/MusicContext', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const api = new Proxy({}, { get: () => () => {} });
  return { ...actual, useMusic: () => api, useMusicSafe: () => api };
});
vi.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({ checkWord: () => false, isLoaded: false, retry: () => {} }),
}));
vi.mock('@/hooks/useStuckCoach', () => ({
  useStuckCoach: (opts: CoachArgs) => {
    coachArgs.push(opts);
    const noop = () => {};
    return { mode: 'blast', stage: 'none', visible: false, exampleWord: null, markActivity: noop, markTap: noop, markDragStart: noop, markSubmit: noop, dismiss: noop };
  },
}));
vi.mock('@/contexts/AdMobContext', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const api = new Proxy({}, { get: (_t, k) => (k === 'isNative' || k === 'isReady' ? false : () => {}) });
  return { ...actual, useAdMobContext: () => api };
});

import { BlastGame } from '../BlastGame';

const GRID = [
  ['C', 'A', 'T', 'S', 'D', 'O'],
  ['G', 'E', 'R', 'A', 'T', 'E'],
  ['B', 'I', 'R', 'D', 'L', 'M'],
  ['N', 'O', 'P', 'Q', 'U', 'S'],
  ['T', 'A', 'R', 'E', 'S', 'L'],
  ['M', 'I', 'N', 'E', 'D', 'O'],
];

function renderBlast(serverGrid: string[][] | undefined, pendingDiscovery: string | null = null) {
    const noop = () => {};
    render(
      <BlastGame
        config={{ gridSize: 6, specialTileChance: 0.12, language: 'es' as never, boardClearMode: 'shrink' }}
        mode="multiplayer"
        serverGrid={serverGrid as never}
        pendingDiscovery={pendingDiscovery as never}
        blastSeed={1}
        remainingTime={50}
        totalTime={60}
        username="you"
        leaderboard={[{ username: 'you', score: 0 }]}
        onWordWithComboType={noop}
        onMPDeadEnd={noop}
        onMPBoardCleared={noop}
        onGameEnd={noop}
        onQuit={noop}
      />,
    );
    act(() => {});
}

describe('Blast stuck coach + dead-time telemetry', () => {
  beforeEach(() => { coachArgs.length = 0; });

  it('given the board is still loading, both stay off so loading is not reported as dead time', () => {
    // MP no longer waits on the client dictionary; the board is "loading" until the server grid arrives.
    renderBlast(undefined);
    expect(coachArgs.length).toBeGreaterThan(0);
    expect(coachArgs.every((a) => a.active === false && a.deadTime?.enabled === false)).toBe(true);
  });

  it('given a live board, coaches as blast on that grid and keeps the 15s dead-time signal', () => {
    renderBlast(GRID);
    const last = coachArgs.at(-1)!;
    expect(last.mode).toBe('blast');
    expect(last.active).toBe(true);
    expect(last.grid).toEqual(GRID);
    expect(last.deadTime).toEqual(expect.objectContaining({ enabled: true, thresholdMs: 15000 }));
  });

  it('holds the coach while a new-tile discovery card has the board paused', () => {
    renderBlast(GRID, 'bomb');
    expect(coachArgs.at(-1)!.active).toBe(false);
  });
});
